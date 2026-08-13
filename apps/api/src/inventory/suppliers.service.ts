import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  analyzePriceTrend,
  type CreateSupplierInput,
  type PaginationQuery,
  type UpdateSupplierInput,
} from '@bogcha/shared';
import { IsNull, Repository } from 'typeorm';
import { requireTenant, type RequestScope } from '../common/scope/request-scope';
import { toNumber } from '../common/utils/decimal.util';
import { orderBy, paginate, paginated } from '../common/utils/pagination.util';
import { AuditAction } from '../entities/enums';
import { Supplier } from '../entities/supplier.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { AuditService } from '../audit/audit.service';

const SORTABLE = ['name', 'balance', 'createdAt'] as const;

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(SupplierPrice) private readonly supplierPrices: Repository<SupplierPrice>,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: RequestScope, query: Partial<PaginationQuery>) {
    const tenantId = requireTenant(scope);
    const pageQuery = { page: query.page ?? 1, limit: query.limit ?? 25 };
    const { skip, take } = paginate(pageQuery);
    const sort = orderBy(
      { sortBy: query.sortBy, sortDir: query.sortDir ?? 'desc' },
      SORTABLE,
      'name',
    );
    const field = Object.keys(sort)[0] ?? 'name';
    const dir = (sort as Record<string, 'asc' | 'desc'>)[field] === 'asc' ? 'ASC' : 'DESC';

    const qb = this.suppliers
      .createQueryBuilder('supplier')
      .loadRelationCountAndMap('supplier._productsCount', 'supplier.products')
      .where('supplier.tenantId = :tenantId', { tenantId })
      .andWhere('supplier.deletedAt IS NULL')
      .orderBy(`supplier.${field}`, dir)
      .skip(skip)
      .take(take);

    if (query.search) {
      qb.andWhere(
        '(supplier.name ILIKE :search OR supplier.phone ILIKE :search OR supplier.contactPerson ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return paginated(
      items.map((supplier) => {
        const withCounts = supplier as Supplier & {
          _productsCount?: number;
        };
        return {
          ...supplier,
          _count: {
            products: withCounts._productsCount ?? 0,
          },
        };
      }),
      total,
      pageQuery,
    );
  }

  /** Yetkazib beruvchi kartochkasi: xarid tarixi va narx tendensiyasi (TZ §16). */
  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const supplier = await this.suppliers.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: {
        products: true,
      },
    });
    if (!supplier) throw new NotFoundException('Yetkazib beruvchi topilmadi');

    const products = (supplier.products ?? [])
      .filter((product) => product.deletedAt == null)
      .map((product) => ({ id: product.id, name: product.name, unit: product.unit }));

    const prices = await this.supplierPrices.find({
      where: { supplierId: id },
      order: { date: 'ASC' },
      relations: { product: true },
    });

    const byProduct = new Map<
      string,
      { name: string; unit: string; points: { date: string; price: number }[] }
    >();
    for (const row of prices) {
      const entry = byProduct.get(row.productId) ?? {
        name: row.product.name,
        unit: row.product.unit,
        points: [],
      };
      entry.points.push({
        date: row.date.toISOString().slice(0, 10),
        price: toNumber(row.price),
      });
      byProduct.set(row.productId, entry);
    }

    const priceTrends = [...byProduct.entries()].map(([productId, entry]) => ({
      productId,
      productName: entry.name,
      unit: entry.unit,
      history: entry.points,
      trend: analyzePriceTrend(entry.points),
    }));

    return { ...supplier, products, priceTrends };
  }

  async create(scope: RequestScope, input: Partial<CreateSupplierInput> & Pick<CreateSupplierInput, 'name' | 'phone'>) {
    const tenantId = requireTenant(scope);
    const supplier = await this.suppliers.save(
      this.suppliers.create({
        name: input.name,
        phone: input.phone,
        tenantId,
        contactPerson: input.contactPerson ?? null,
        address: input.address ?? null,
        inn: input.inn ?? null,
        bankAccount: input.bankAccount ?? null,
        note: input.note ?? null,
        isActive: input.isActive ?? true,
      }),
    );

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Supplier',
      entityId: supplier.id,
      summary: `Yangi yetkazib beruvchi: ${supplier.name}`,
      newValue: supplier,
    });

    return supplier;
  }

  async update(scope: RequestScope, id: string, input: UpdateSupplierInput) {
    const tenantId = requireTenant(scope);

    const before = await this.suppliers.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Yetkazib beruvchi topilmadi');

    await this.suppliers.update({ id }, { ...input } as Record<string, unknown>);
    const supplier = await this.suppliers.findOneOrFail({ where: { id } });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Supplier',
      entityId: id,
      summary: `Yetkazib beruvchi o'zgartirildi: ${supplier.name}`,
      oldValue: before,
      newValue: supplier,
    });

    return supplier;
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const before = await this.suppliers.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Yetkazib beruvchi topilmadi');

    await this.suppliers.update({ id }, { deletedAt: new Date(), isActive: false });

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Supplier',
      entityId: id,
      summary: `Yetkazib beruvchi o'chirildi: ${before.name}`,
      oldValue: before,
    });

    return { success: true };
  }
}
