import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  convertQuantity,
  roundQuantity,
  type FoodConsumptionReport,
  type FoodNormRow,
} from '@bogcha/shared';
import { Between, In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { AttendanceService } from '../attendance/attendance.service';
import {
  assertBranchAllowed,
  requireTenant,
  type RequestScope,
} from '../common/scope/request-scope';
import {
  addDays,
  formatDateOnly,
  toDateOnly,
} from '../common/utils/date.util';
import { FoodConsumptionActual } from '../entities/food-consumption-actual.entity';
import { FoodStockCheck } from '../entities/food-stock-check.entity';
import { Product } from '../entities/product.entity';
import { ProductDailyNorm } from '../entities/product-daily-norm.entity';
import { StockItem } from '../entities/stock-item.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { StockMovementType, Unit } from '../entities/enums';
import type {
  CreateProductDailyNormDto,
  UpsertFoodActualDto,
  UpsertFoodStockCheckDto,
} from './dto/food-consumption.dto';

const INBOUND_TYPES = new Set<StockMovementType>([
  StockMovementType.IN,
  StockMovementType.RETURN,
  StockMovementType.TRANSFER_IN,
]);

const OUTBOUND_TYPES = new Set<StockMovementType>([
  StockMovementType.OUT,
  StockMovementType.WRITE_OFF,
  StockMovementType.TRANSFER_OUT,
]);

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return Number(value ?? 0);
}

function safeConvert(quantity: number, from: Unit, to: Unit): number {
  if (from === to) return roundQuantity(quantity);
  try {
    return roundQuantity(convertQuantity(quantity, from, to));
  } catch {
    return roundQuantity(quantity);
  }
}

@Injectable()
export class FoodConsumptionService {
  constructor(
    @InjectRepository(ProductDailyNorm)
    private readonly norms: Repository<ProductDailyNorm>,
    @InjectRepository(FoodConsumptionActual)
    private readonly actuals: Repository<FoodConsumptionActual>,
    @InjectRepository(FoodStockCheck)
    private readonly stockChecks: Repository<FoodStockCheck>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(StockItem) private readonly stockItems: Repository<StockItem>,
    @InjectRepository(StockMovement)
    private readonly stockMovements: Repository<StockMovement>,
    private readonly attendanceService: AttendanceService,
  ) {}

  async listNorms(scope: RequestScope, branchId: string): Promise<FoodNormRow[]> {
    const tenantId = requireTenant(scope);
    assertBranchAllowed(scope, branchId);

    const rows = await this.norms.find({
      where: { tenantId, branchId },
      relations: { product: true },
      order: { product: { name: 'ASC' }, effectiveFrom: 'DESC' },
    });

    return rows.map((row) => this.mapNorm(row));
  }

  /** Yangi me'yor versiyasi — oldingi qatorlar tarixda qoladi. */
  async createNorm(scope: RequestScope, input: CreateProductDailyNormDto): Promise<FoodNormRow> {
    const tenantId = requireTenant(scope);
    assertBranchAllowed(scope, input.branchId);

    const product = await this.products.findOne({
      where: { id: input.productId, tenantId, deletedAt: IsNull() },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    const saved = await this.norms.save(
      this.norms.create({
        tenantId,
        branchId: input.branchId,
        productId: input.productId,
        quantityPerChild: input.quantityPerChild,
        unit: input.unit,
        effectiveFrom: toDateOnly(input.effectiveFrom),
        note: input.note?.trim() || null,
      }),
    );

    saved.product = product;
    return this.mapNorm(saved);
  }

  async report(
    scope: RequestScope,
    params: { branchId: string; from: string; to: string },
  ): Promise<FoodConsumptionReport> {
    const tenantId = requireTenant(scope);
    assertBranchAllowed(scope, params.branchId);

    const from = toDateOnly(params.from);
    const to = toDateOnly(params.to);
    if (from > to) throw new BadRequestException("Sana oralig'i noto'g'ri");

    const dates = eachDateInclusive(from, to);
    const fromStr = formatDateOnly(from);
    const toStr = formatDateOnly(to);

    const [trend, allNorms, actualRows, stockRows, movements, checks] = await Promise.all([
      this.attendanceService.trend(scope, {
        from: fromStr,
        to: toStr,
        branchId: params.branchId,
      }),
      this.norms.find({
        where: { tenantId, branchId: params.branchId, effectiveFrom: LessThanOrEqual(to) },
        relations: { product: true },
        order: { effectiveFrom: 'ASC' },
      }),
      this.actuals.find({
        where: {
          tenantId,
          branchId: params.branchId,
          date: Between(from, to),
        },
      }),
      this.stockItems.find({
        where: { tenantId, branchId: params.branchId },
        relations: { product: true },
      }),
      this.stockMovements.find({
        where: {
          tenantId,
          branchId: params.branchId,
          date: Between(from, to),
        },
      }),
      this.stockChecks.find({
        where: {
          tenantId,
          branchId: params.branchId,
          checkDate: to,
        },
      }),
    ]);

    const presentByDate = new Map(trend.map((point) => [point.date, point.present]));

    // Har bir mahsulot uchun effectiveFrom bo'yicha me'yor tarixi.
    const normsByProduct = new Map<string, ProductDailyNorm[]>();
    for (const norm of allNorms) {
      if (!norm.product || norm.product.deletedAt) continue;
      const list = normsByProduct.get(norm.productId) ?? [];
      list.push(norm);
      normsByProduct.set(norm.productId, list);
    }

    const productIds = [...normsByProduct.keys()];
    const productMeta = new Map<
      string,
      { name: string; unit: Unit; quantityPerChild: number; normUnit: Unit }
    >();

    for (const productId of productIds) {
      const history = normsByProduct.get(productId) ?? [];
      const latest = [...history].sort((a, b) =>
        formatDateOnly(b.effectiveFrom).localeCompare(formatDateOnly(a.effectiveFrom)),
      )[0];
      if (!latest?.product) continue;
      productMeta.set(productId, {
        name: latest.product.name,
        unit: latest.product.unit,
        quantityPerChild: toNumber(latest.quantityPerChild),
        normUnit: latest.unit,
      });
    }

    const columns = [...productMeta.entries()]
      .map(([productId, meta]) => ({
        productId,
        productName: meta.name,
        unit: meta.unit,
        quantityPerChild: meta.quantityPerChild,
        normUnit: meta.normUnit,
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'uz'));

    const actualMap = new Map<string, number>();
    for (const row of actualRows) {
      actualMap.set(
        `${formatDateOnly(row.date)}:${row.productId}`,
        toNumber(row.actualQuantity),
      );
    }

    const plannedByProduct: Record<string, number> = {};
    const actualByProduct: Record<string, number> = {};
    const varianceByProduct: Record<string, number | null> = {};
    for (const col of columns) {
      plannedByProduct[col.productId] = 0;
      actualByProduct[col.productId] = 0;
      varianceByProduct[col.productId] = null;
    }

    let presentTotal = 0;
    let actualFilledCells = 0;
    let actualTotalCells = 0;
    let normConsumptionFilledDays = 0;

    const days = dates.map((date) => {
      const dateStr = formatDateOnly(date);
      const presentCount = presentByDate.get(dateStr) ?? 0;
      presentTotal += presentCount;
      if (presentCount > 0 && columns.length > 0) normConsumptionFilledDays += 1;

      const products = columns.map((col) => {
        const norm = this.resolveNorm(normsByProduct.get(col.productId) ?? [], dateStr);
        const stockUnit = productMeta.get(col.productId)?.unit ?? col.unit;
        const plannedRaw = norm
          ? presentCount * toNumber(norm.quantityPerChild)
          : 0;
        const plannedQuantity = norm
          ? safeConvert(plannedRaw, norm.unit, stockUnit)
          : 0;

        const actualKey = `${dateStr}:${col.productId}`;
        const hasActual = actualMap.has(actualKey);
        const actualQuantity = hasActual ? (actualMap.get(actualKey) ?? 0) : null;
        if (columns.length > 0) actualTotalCells += 1;
        if (hasActual) actualFilledCells += 1;

        plannedByProduct[col.productId] = roundQuantity(
          (plannedByProduct[col.productId] ?? 0) + plannedQuantity,
        );
        if (actualQuantity != null) {
          actualByProduct[col.productId] = roundQuantity(
            (actualByProduct[col.productId] ?? 0) + actualQuantity,
          );
        }

        return {
          productId: col.productId,
          plannedQuantity,
          actualQuantity,
          variance: actualQuantity == null ? null : roundQuantity(actualQuantity - plannedQuantity),
          unit: stockUnit,
        };
      });

      return { date: dateStr, presentCount, products };
    });

    for (const col of columns) {
      const planned = plannedByProduct[col.productId] ?? 0;
      const hasAnyActual = days.some((day) =>
        day.products.some((cell) => cell.productId === col.productId && cell.actualQuantity != null),
      );
      varianceByProduct[col.productId] = hasAnyActual
        ? roundQuantity((actualByProduct[col.productId] ?? 0) - planned)
        : null;
    }

    const inboundByProduct = new Map<string, number>();
    const outboundByProduct = new Map<string, number>();
    for (const movement of movements) {
      const qty = toNumber(movement.quantity);
      if (INBOUND_TYPES.has(movement.type)) {
        inboundByProduct.set(
          movement.productId,
          roundQuantity((inboundByProduct.get(movement.productId) ?? 0) + qty),
        );
      } else if (OUTBOUND_TYPES.has(movement.type)) {
        outboundByProduct.set(
          movement.productId,
          roundQuantity((outboundByProduct.get(movement.productId) ?? 0) + qty),
        );
      } else if (movement.type === StockMovementType.ADJUSTMENT) {
        // ADJUSTMENT signed quantity — musbat kirim, manfiy chiqim sifatida.
        if (qty >= 0) {
          inboundByProduct.set(
            movement.productId,
            roundQuantity((inboundByProduct.get(movement.productId) ?? 0) + qty),
          );
        } else {
          outboundByProduct.set(
            movement.productId,
            roundQuantity((outboundByProduct.get(movement.productId) ?? 0) + Math.abs(qty)),
          );
        }
      }
    }

    const currentByProduct = new Map(
      stockRows.map((row) => [row.productId, toNumber(row.quantity)] as const),
    );
    const countedByProduct = new Map(
      checks.map((row) => [row.productId, toNumber(row.countedQuantity)] as const),
    );

    let stockShortageCount = 0;
    let stockSurplusCount = 0;
    let stockMatchedCount = 0;

    const stock = columns.map((col) => {
      const currentStock = currentByProduct.get(col.productId) ?? 0;
      const inboundQuantity = inboundByProduct.get(col.productId) ?? 0;
      const outboundQuantity = outboundByProduct.get(col.productId) ?? 0;
      const openingQuantity = roundQuantity(currentStock - inboundQuantity + outboundQuantity);
      const normConsumption = plannedByProduct[col.productId] ?? 0;
      const actualConsumption = actualByProduct[col.productId] ?? 0;
      const expectedByNorm = roundQuantity(openingQuantity + inboundQuantity - normConsumption);
      const expectedByActual = roundQuantity(openingQuantity + inboundQuantity - actualConsumption);
      const countedQuantity = countedByProduct.has(col.productId)
        ? (countedByProduct.get(col.productId) ?? 0)
        : null;
      const compareAgainst = countedQuantity ?? currentStock;
      const varianceByNorm = roundQuantity(expectedByNorm - compareAgainst);
      const varianceByActual = roundQuantity(expectedByActual - compareAgainst);

      if (Math.abs(varianceByNorm) < 0.001) stockMatchedCount += 1;
      else if (varianceByNorm > 0) stockShortageCount += 1;
      else stockSurplusCount += 1;

      return {
        productId: col.productId,
        productName: col.productName,
        unit: col.unit,
        openingQuantity,
        inboundQuantity,
        normConsumption,
        actualConsumption,
        expectedByNorm,
        expectedByActual,
        currentStock,
        countedQuantity,
        varianceByNorm,
        varianceByActual,
      };
    });

    const currentNorms = await this.currentNorms(tenantId, params.branchId, toStr);

    return {
      from: fromStr,
      to: toStr,
      branchId: params.branchId,
      products: columns,
      days,
      totals: {
        presentCount: presentTotal,
        plannedByProduct,
        actualByProduct,
        varianceByProduct,
      },
      kpis: {
        presentCount: presentTotal,
        normConsumptionFilledDays,
        actualFilledCells,
        actualTotalCells,
        stockShortageCount,
        stockSurplusCount,
        stockMatchedCount,
      },
      stock,
      norms: currentNorms,
    };
  }

  async upsertActual(scope: RequestScope, input: UpsertFoodActualDto) {
    const tenantId = requireTenant(scope);
    assertBranchAllowed(scope, input.branchId);
    const date = toDateOnly(input.date);

    const productIds = input.lines.map((line) => line.productId);
    const products = await this.products.find({
      where: { id: In(productIds), tenantId, deletedAt: IsNull() },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException("Ba'zi mahsulotlar topilmadi");
    }
    const unitByProduct = new Map(products.map((p) => [p.id, p.unit]));

    const existing = await this.actuals.find({
      where: {
        tenantId,
        branchId: input.branchId,
        date,
        productId: In(productIds),
      },
    });
    const byProduct = new Map(existing.map((row) => [row.productId, row]));

    const saved = await this.actuals.save(
      input.lines.map((line) => {
        const current = byProduct.get(line.productId);
        if (current) {
          current.actualQuantity = line.actualQuantity;
          current.unit = unitByProduct.get(line.productId) ?? current.unit;
          return current;
        }
        return this.actuals.create({
          tenantId,
          branchId: input.branchId,
          productId: line.productId,
          date,
          actualQuantity: line.actualQuantity,
          unit: unitByProduct.get(line.productId) ?? Unit.KG,
        });
      }),
    );

    return { ok: true, count: saved.length };
  }

  async upsertStockCheck(scope: RequestScope, input: UpsertFoodStockCheckDto) {
    const tenantId = requireTenant(scope);
    assertBranchAllowed(scope, input.branchId);
    const checkDate = toDateOnly(input.checkDate);

    const productIds = input.lines.map((line) => line.productId);
    const products = await this.products.find({
      where: { id: In(productIds), tenantId, deletedAt: IsNull() },
    });
    if (products.length !== productIds.length) {
      throw new BadRequestException("Ba'zi mahsulotlar topilmadi");
    }
    const unitByProduct = new Map(products.map((p) => [p.id, p.unit]));

    const existing = await this.stockChecks.find({
      where: {
        tenantId,
        branchId: input.branchId,
        checkDate,
        productId: In(productIds),
      },
    });
    const byProduct = new Map(existing.map((row) => [row.productId, row]));

    const saved = await this.stockChecks.save(
      input.lines.map((line) => {
        const current = byProduct.get(line.productId);
        if (current) {
          current.countedQuantity = line.countedQuantity;
          current.unit = unitByProduct.get(line.productId) ?? current.unit;
          current.note = line.note?.trim() || null;
          return current;
        }
        return this.stockChecks.create({
          tenantId,
          branchId: input.branchId,
          productId: line.productId,
          checkDate,
          countedQuantity: line.countedQuantity,
          unit: unitByProduct.get(line.productId) ?? Unit.KG,
          note: line.note?.trim() || null,
        });
      }),
    );

    return { ok: true, count: saved.length };
  }

  private async currentNorms(
    tenantId: string,
    branchId: string,
    asOf: string,
  ): Promise<FoodNormRow[]> {
    const rows = await this.norms.find({
      where: {
        tenantId,
        branchId,
        effectiveFrom: LessThanOrEqual(toDateOnly(asOf)),
      },
      relations: { product: true },
      order: { effectiveFrom: 'DESC' },
    });

    const latest = new Map<string, ProductDailyNorm>();
    for (const row of rows) {
      if (!latest.has(row.productId)) latest.set(row.productId, row);
    }

    return [...latest.values()]
      .filter((row) => row.product && !row.product.deletedAt)
      .map((row) => this.mapNorm(row))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'uz'));
  }

  private resolveNorm(history: ProductDailyNorm[], date: string): ProductDailyNorm | null {
    const eligible = history.filter((row) => formatDateOnly(row.effectiveFrom) <= date);
    if (eligible.length === 0) return null;
    return eligible.reduce((best, row) =>
      formatDateOnly(row.effectiveFrom) >= formatDateOnly(best.effectiveFrom) ? row : best,
    );
  }

  private mapNorm(row: ProductDailyNorm): FoodNormRow {
    return {
      id: row.id,
      productId: row.productId,
      productName: row.product?.name ?? '',
      quantityPerChild: toNumber(row.quantityPerChild),
      unit: row.unit,
      stockUnit: row.product?.unit ?? row.unit,
      effectiveFrom: formatDateOnly(row.effectiveFrom),
      note: row.note,
    };
  }
}

/** Sana oralig'idagi har bir kun (UTC). */
function eachDateInclusive(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  let cursor = toDateOnly(from);
  const end = toDateOnly(to);
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}
