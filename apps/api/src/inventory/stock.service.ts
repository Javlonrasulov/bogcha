import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DEFAULT_ANOMALY_THRESHOLDS,
  UNIT_LABELS,
  daysOfStockRemaining,
  detectLowStock,
  roundMoney,
  roundQuantity,
  weightedAverageCost,
  type StockSnapshot,
} from '@bogcha/shared';
import {
  Between,
  DataSource,
  EntityManager,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import {
  assertBranchInTenant,
  requireTenant,
  resolveBranchFilter,
  type RequestScope,
} from '../common/scope/request-scope';
import { toNumber } from '../common/utils/decimal.util';
import { addDays, toDateOnly, todayDateOnly } from '../common/utils/date.util';
import { AuditAction, StockMovementSource, StockMovementType, Unit } from '../entities/enums';
import { Branch } from '../entities/branch.entity';
import { Product } from '../entities/product.entity';
import { StockItem } from '../entities/stock-item.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeEvent, RealtimeGateway } from '../realtime/realtime.gateway';

export interface MovementParams {
  tenantId: string;
  branchId: string;
  productId: string;
  type: StockMovementType;
  source?: StockMovementSource;
  /** Har doim musbat miqdor; yo'nalish `type` bilan aniqlanadi. */
  quantity: number;
  unitCost?: number;
  date: Date;
  reason?: string | null;
  documentNumber?: string | null;
  attachmentUrl?: string | null;
  supplierId?: string | null;
  purchaseOrderId?: string | null;
  nutritionDayId?: string | null;
  expenseId?: string | null;
  createdById?: string | null;
  /** Qoldiq manfiy bo'lishiga ruxsat (avtomatik oziq-ovqat sarfida kerak). */
  allowNegative?: boolean;
}

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(StockItem) private readonly stockItems: Repository<StockItem>,
    @InjectRepository(StockMovement) private readonly stockMovements: Repository<StockMovement>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Ombor harakatini transaksiya ichida qo'llaydi: qoldiqni yangilaydi,
   * kirimda o'rtacha tortilgan tannarxni qayta hisoblaydi va harakat tarixini yozadi.
   */
  async applyMovement(manager: EntityManager, params: MovementParams) {
    const products = manager.getRepository(Product);
    const stockItems = manager.getRepository(StockItem);
    const stockMovements = manager.getRepository(StockMovement);

    const product = await products.findOne({
      where: { id: params.productId, tenantId: params.tenantId, deletedAt: IsNull() },
      select: { id: true, name: true, unit: true, unitCost: true, minQuantity: true },
    });
    if (!product) throw new BadRequestException('Mahsulot topilmadi');

    const existing = await stockItems.findOne({
      where: { branchId: params.branchId, productId: params.productId },
    });

    const currentQuantity = existing ? toNumber(existing.quantity) : 0;
    const currentUnitCost = existing ? toNumber(existing.unitCost) : toNumber(product.unitCost);

    const isInbound =
      params.type === StockMovementType.IN ||
      params.type === StockMovementType.RETURN ||
      params.type === StockMovementType.TRANSFER_IN;
    const signedQuantity = isInbound ? params.quantity : -params.quantity;
    const nextQuantity = roundQuantity(currentQuantity + signedQuantity);

    if (nextQuantity < 0 && !params.allowNegative) {
      throw new BadRequestException(
        `${product.name}: omborda yetarli emas. Qoldiq ${currentQuantity} ${UNIT_LABELS[product.unit as Unit]}, so'ralgan ${params.quantity}.`,
      );
    }

    // Kirimda tannarx o'rtachalashadi, chiqimda joriy tannarx saqlanadi.
    const movementUnitCost = params.unitCost ?? currentUnitCost;
    const nextUnitCost = isInbound
      ? weightedAverageCost({
          currentQuantity: Math.max(0, currentQuantity),
          currentUnitCost,
          incomingQuantity: params.quantity,
          incomingUnitCost: movementUnitCost,
        })
      : currentUnitCost;

    const stockPayload = {
      tenantId: params.tenantId,
      branchId: params.branchId,
      productId: params.productId,
      quantity: nextQuantity,
      unitCost: nextUnitCost,
      totalValue: roundMoney(nextQuantity * nextUnitCost),
      lastMovementAt: new Date(),
    };

    let stockItem: StockItem;
    if (existing) {
      await stockItems.update({ id: existing.id }, stockPayload);
      stockItem = { ...existing, ...stockPayload };
    } else {
      stockItem = await stockItems.save(stockItems.create(stockPayload));
    }

    const movement = await stockMovements.save(
      stockMovements.create({
        tenantId: params.tenantId,
        branchId: params.branchId,
        productId: params.productId,
        type: params.type,
        source: params.source ?? StockMovementSource.MANUAL,
        quantity: params.quantity,
        unitCost: movementUnitCost,
        totalCost: roundMoney(params.quantity * movementUnitCost),
        balanceAfter: nextQuantity,
        date: params.date,
        reason: params.reason ?? null,
        documentNumber: params.documentNumber ?? null,
        attachmentUrl: params.attachmentUrl ?? null,
        supplierId: params.supplierId ?? null,
        purchaseOrderId: params.purchaseOrderId ?? null,
        nutritionDayId: params.nutritionDayId ?? null,
        expenseId: params.expenseId ?? null,
        createdById: params.createdById ?? null,
      }),
    );

    // Kirimda mahsulotning bazaviy tannarxi ham yangilanadi — retsept xarajati
    // haqiqiy narxda hisoblanishi uchun.
    if (isInbound && params.unitCost !== undefined) {
      await products.update({ id: params.productId }, { unitCost: nextUnitCost });
    }

    return {
      movement,
      stockItem,
      product,
      previousQuantity: currentQuantity,
      nextQuantity,
    };
  }

  /** Qo'lda kirim/chiqim (omborchi uchun). Har qanday qo'lda o'zgartirish auditga tushadi. */
  async createMovement(
    scope: RequestScope,
    input: {
      branchId: string;
      productId: string;
      type: StockMovementType;
      quantity: number;
      unitCost?: number;
      date: string;
      supplierId?: string;
      reason?: string;
      documentNumber?: string;
      attachmentUrl?: string;
    },
  ) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const result = await this.dataSource.transaction((manager) =>
      this.applyMovement(manager, {
        tenantId,
        branchId: input.branchId,
        productId: input.productId,
        type: input.type,
        source: StockMovementSource.MANUAL,
        quantity: input.quantity,
        unitCost: input.unitCost,
        date: toDateOnly(input.date),
        reason: input.reason,
        documentNumber: input.documentNumber,
        attachmentUrl: input.attachmentUrl,
        supplierId: input.supplierId,
        createdById: scope.userId,
      }),
    );

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'StockItem',
      entityId: result.stockItem.id,
      summary: `${result.product.name}: ${result.previousQuantity} → ${result.nextQuantity} ${UNIT_LABELS[result.product.unit as Unit]} (${input.type})`,
      reason: input.reason,
      oldValue: { quantity: result.previousQuantity },
      newValue: { quantity: result.nextQuantity },
    });

    await this.checkLowStock(tenantId, input.branchId, input.productId);
    this.realtime.emitToBranch(input.branchId, RealtimeEvent.STOCK_UPDATED, {
      productId: input.productId,
      quantity: result.nextQuantity,
    });

    return result.movement;
  }

  /**
   * Inventarizatsiya: haqiqiy qoldiq kiritiladi, farq tuzatish harakati sifatida yoziladi.
   */
  async adjust(
    scope: RequestScope,
    input: {
      branchId: string;
      productId: string;
      countedQuantity: number;
      date: string;
      reason: string;
    },
  ) {
    const tenantId = requireTenant(scope);
    await assertBranchInTenant(this.branches, scope, input.branchId);

    const existing = await this.stockItems.findOne({
      where: { branchId: input.branchId, productId: input.productId },
    });
    const current = existing ? toNumber(existing.quantity) : 0;
    const difference = roundQuantity(input.countedQuantity - current);

    if (difference === 0) {
      return { success: true, message: "Qoldiq to'g'ri, o'zgarish kiritilmadi" };
    }

    const result = await this.dataSource.transaction((manager) =>
      this.applyMovement(manager, {
        tenantId,
        branchId: input.branchId,
        productId: input.productId,
        type: difference > 0 ? StockMovementType.IN : StockMovementType.WRITE_OFF,
        source: StockMovementSource.INVENTORY_COUNT,
        quantity: Math.abs(difference),
        date: toDateOnly(input.date),
        reason: input.reason,
        createdById: scope.userId,
        allowNegative: true,
      }),
    );

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'StockItem',
      entityId: result.stockItem.id,
      summary: `Inventarizatsiya — ${result.product.name}: ${current} → ${input.countedQuantity}`,
      reason: input.reason,
      oldValue: { quantity: current },
      newValue: { quantity: input.countedQuantity },
    });

    return { success: true, difference, movement: result.movement };
  }

  /**
   * Filiallararo transfer: chiqim + kirim bitta transaksiyada, bir xil documentNumber.
   */
  async transfer(
    scope: RequestScope,
    input: {
      fromBranchId: string;
      toBranchId: string;
      productId: string;
      quantity: number;
      date: string;
      reason?: string;
    },
  ) {
    const tenantId = requireTenant(scope);
    if (input.fromBranchId === input.toBranchId) {
      throw new BadRequestException("Bir xil filialga transfer qilib bo'lmaydi");
    }
    await assertBranchInTenant(this.branches, scope, input.fromBranchId);
    await assertBranchInTenant(this.branches, scope, input.toBranchId);

    const documentNumber = `TR-${Date.now().toString(36).toUpperCase()}`;
    const date = toDateOnly(input.date);

    const result = await this.dataSource.transaction(async (manager) => {
      const out = await this.applyMovement(manager, {
        tenantId,
        branchId: input.fromBranchId,
        productId: input.productId,
        type: StockMovementType.TRANSFER_OUT,
        source: StockMovementSource.TRANSFER,
        quantity: input.quantity,
        date,
        reason: input.reason ?? `Transfer → ${input.toBranchId}`,
        documentNumber,
        createdById: scope.userId,
      });

      const inbound = await this.applyMovement(manager, {
        tenantId,
        branchId: input.toBranchId,
        productId: input.productId,
        type: StockMovementType.TRANSFER_IN,
        source: StockMovementSource.TRANSFER,
        quantity: input.quantity,
        unitCost: toNumber(out.movement.unitCost),
        date,
        reason: input.reason ?? `Transfer ← ${input.fromBranchId}`,
        documentNumber,
        createdById: scope.userId,
      });

      return { out, inbound, documentNumber };
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'StockItem',
      entityId: result.out.stockItem.id,
      summary: `Transfer ${result.out.product.name}: ${input.quantity} (${input.fromBranchId.slice(0, 8)} → ${input.toBranchId.slice(0, 8)})`,
      reason: input.reason,
    });

    this.realtime.emitToBranch(input.fromBranchId, RealtimeEvent.STOCK_UPDATED, {
      productId: input.productId,
    });
    this.realtime.emitToBranch(input.toBranchId, RealtimeEvent.STOCK_UPDATED, {
      productId: input.productId,
    });

    return result;
  }

  /** Ombor holati: qoldiq, qiymat, o'rtacha kunlik sarf, necha kunga yetadi. */
  async snapshot(
    scope: RequestScope,
    params: { branchId?: string; lowStockOnly?: boolean; search?: string },
  ): Promise<{ items: StockSnapshot[]; totalValue: number; lowStockCount: number }> {
    const tenantId = requireTenant(scope);
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const qb = this.stockItems
      .createQueryBuilder('stock')
      .innerJoinAndSelect('stock.product', 'product')
      .leftJoinAndSelect('product.category', 'category')
      .where({ tenantId, ...branchWhere })
      .andWhere('product.deletedAt IS NULL')
      .andWhere('product.isActive = true')
      .orderBy('product.name', 'ASC');

    if (params.search) {
      qb.andWhere('product.name ILIKE :search', { search: `%${params.search}%` });
    }

    const stockItems = await qb.getMany();

    // O'rtacha kunlik sarfni oxirgi 30 kunlik chiqimlardan hisoblaymiz.
    const thirtyDaysAgo = addDays(todayDateOnly(), -30);
    const usageRows = await this.stockMovements
      .createQueryBuilder('m')
      .select('m.productId', 'productId')
      .addSelect('COALESCE(SUM(m.quantity), 0)', 'total')
      .where({ tenantId, ...branchWhere })
      .andWhere('m.type IN (:...types)', {
        types: [StockMovementType.OUT, StockMovementType.WRITE_OFF],
      })
      .andWhere('m.date >= :from', { from: thirtyDaysAgo })
      .groupBy('m.productId')
      .getRawMany<{ productId: string; total: string }>();

    const usageMap = new Map(usageRows.map((row) => [row.productId, toNumber(row.total) / 30]));

    const items: StockSnapshot[] = stockItems.map((item) => {
      const quantity = toNumber(item.quantity);
      const minQuantity = toNumber(item.product.minQuantity);
      const averageDailyUsage = roundQuantity(usageMap.get(item.productId) ?? 0);
      const daysRemaining = daysOfStockRemaining(quantity, averageDailyUsage);

      return {
        productId: item.productId,
        productName: item.product.name,
        categoryName: item.product.category?.name ?? null,
        unit: item.product.unit,
        quantity,
        unitCost: toNumber(item.unitCost),
        totalValue: toNumber(item.totalValue),
        minQuantity,
        maxQuantity: item.product.maxQuantity != null ? toNumber(item.product.maxQuantity) : null,
        averageDailyUsage,
        daysRemaining: Number.isFinite(daysRemaining) ? daysRemaining : null,
        isLow: minQuantity > 0 && quantity <= minQuantity,
      };
    });

    const filtered = params.lowStockOnly ? items.filter((item) => item.isLow) : items;

    return {
      items: filtered,
      totalValue: roundMoney(items.reduce((acc, item) => acc + item.totalValue, 0)),
      lowStockCount: items.filter((item) => item.isLow).length,
    };
  }

  async movements(
    scope: RequestScope,
    params: { branchId?: string; productId?: string; from?: string; to?: string; limit?: number },
  ) {
    const tenantId = requireTenant(scope);
    const branchWhere = await resolveBranchFilter(this.branches, scope, params.branchId);

    const dateWhere =
      params.from && params.to
        ? { date: Between(toDateOnly(params.from), toDateOnly(params.to)) }
        : params.from
          ? { date: MoreThanOrEqual(toDateOnly(params.from)) }
          : params.to
            ? { date: LessThanOrEqual(toDateOnly(params.to)) }
            : {};

    const rows = await this.stockMovements.find({
      where: {
        tenantId,
        ...branchWhere,
        ...(params.productId ? { productId: params.productId } : {}),
        ...dateWhere,
      },
      order: { date: 'DESC', createdAt: 'DESC' },
      take: Math.min(500, params.limit ?? 100),
      relations: { product: true, supplier: true, branch: true },
    });

    return rows.map((row) => ({
      ...row,
      product: row.product
        ? { id: row.product.id, name: row.product.name, unit: row.product.unit }
        : null,
      supplier: row.supplier ? { id: row.supplier.id, name: row.supplier.name } : null,
      branch: row.branch ? { id: row.branch.id, name: row.branch.name } : null,
    }));
  }

  /** Qoldiq minimal darajaga tushsa ogohlantirish yaratadi (TZ §22, §30). */
  async checkLowStock(tenantId: string, branchId: string, productId: string): Promise<void> {
    const item = await this.stockItems.findOne({
      where: { branchId, productId },
      relations: { product: true },
    });
    if (!item?.product) return;

    const anomaly = detectLowStock({
      productId,
      productName: item.product.name,
      currentQuantity: toNumber(item.quantity),
      minQuantity: toNumber(item.product.minQuantity),
      unitLabel: UNIT_LABELS[item.product.unit as Unit],
      thresholds: DEFAULT_ANOMALY_THRESHOLDS,
    });

    if (anomaly) await this.notifications.publishAnomalies(tenantId, branchId, [anomaly]);
  }

  /** Filialdagi barcha mahsulotlar bo'yicha kam qoldiqni tekshiradi. */
  async checkAllLowStock(tenantId: string, branchId: string): Promise<number> {
    const items = await this.stockItems.find({
      where: { tenantId, branchId, product: { isActive: true, deletedAt: IsNull() } },
      relations: { product: true },
    });

    const anomalies = items
      .map((item) =>
        detectLowStock({
          productId: item.productId,
          productName: item.product.name,
          currentQuantity: toNumber(item.quantity),
          minQuantity: toNumber(item.product.minQuantity),
          unitLabel: UNIT_LABELS[item.product.unit as Unit],
          thresholds: DEFAULT_ANOMALY_THRESHOLDS,
        }),
      )
      .filter((anomaly): anomaly is NonNullable<typeof anomaly> => anomaly !== null);

    return this.notifications.publishAnomalies(tenantId, branchId, anomalies);
  }
}
