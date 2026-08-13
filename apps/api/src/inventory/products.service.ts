import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { CreateProductInput, ProductQuery, UpdateProductInput } from '@bogcha/shared';
import { IsNull, Repository } from 'typeorm';
import { requireTenant, type RequestScope } from '../common/scope/request-scope';
import { toNumber } from '../common/utils/decimal.util';
import { orderBy, paginate, paginated } from '../common/utils/pagination.util';
import { AuditAction, Unit } from '../entities/enums';
import { Product } from '../entities/product.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { AuditService } from '../audit/audit.service';

const SORTABLE = ['name', 'unitCost', 'minQuantity', 'createdAt'] as const;

function sortPair(
  query: Pick<ProductQuery, 'sortBy' | 'sortDir'>,
  allowed: readonly string[],
  fallback: string,
): { field: string; dir: 'ASC' | 'DESC' } {
  const sort = orderBy(
    query,
    allowed as readonly (typeof SORTABLE)[number][],
    fallback as (typeof SORTABLE)[number],
  );
  const field = Object.keys(sort)[0] ?? fallback;
  const dir = (sort as Record<string, 'asc' | 'desc'>)[field] === 'asc' ? 'ASC' : 'DESC';
  return { field, dir };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductCategory) private readonly categories: Repository<ProductCategory>,
    private readonly auditService: AuditService,
  ) {}

  async list(scope: RequestScope, query: Partial<ProductQuery>) {
    const tenantId = requireTenant(scope);
    const pageQuery = { page: query.page ?? 1, limit: query.limit ?? 25 };
    const { skip, take } = paginate(pageQuery);
    const { field, dir } = sortPair(
      { sortBy: query.sortBy, sortDir: query.sortDir ?? 'desc' },
      SORTABLE,
      'name',
    );

    const qb = this.products
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.defaultSupplier', 'defaultSupplier')
      .leftJoinAndSelect(
        'product.stockItems',
        'stockItems',
        query.branchId ? 'stockItems.branchId = :stockBranchId' : undefined,
        query.branchId ? { stockBranchId: query.branchId } : {},
      )
      .where('product.tenantId = :tenantId', { tenantId })
      .andWhere('product.deletedAt IS NULL')
      .orderBy(`product.${field}`, dir)
      .skip(skip)
      .take(take);

    if (query.categoryId) qb.andWhere('product.categoryId = :categoryId', { categoryId: query.categoryId });
    if (query.isActive !== undefined) qb.andWhere('product.isActive = :isActive', { isActive: query.isActive });
    if (query.search) qb.andWhere('product.name ILIKE :search', { search: `%${query.search}%` });

    const [items, total] = await qb.getManyAndCount();

    const enriched = items.map((product) => {
      const stockItems = (product.stockItems ?? []).map((item) => ({
        branchId: item.branchId,
        quantity: item.quantity,
        unitCost: item.unitCost,
        totalValue: item.totalValue,
      }));
      const totalQuantity = stockItems.reduce((acc, item) => acc + toNumber(item.quantity), 0);
      const minQuantity = toNumber(product.minQuantity);
      return {
        ...product,
        category: product.category
          ? { id: product.category.id, name: product.category.name }
          : null,
        defaultSupplier: product.defaultSupplier
          ? { id: product.defaultSupplier.id, name: product.defaultSupplier.name }
          : null,
        stockItems,
        totalQuantity,
        totalValue: stockItems.reduce((acc, item) => acc + toNumber(item.totalValue), 0),
        isLow: minQuantity > 0 && totalQuantity <= minQuantity,
      };
    });

    return paginated(
      query.lowStockOnly ? enriched.filter((product) => product.isLow) : enriched,
      total,
      pageQuery,
    );
  }

  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const product = await this.products.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: {
        category: true,
        defaultSupplier: true,
        stockItems: { branch: true },
        supplierPrices: { supplier: true },
      },
      order: { supplierPrices: { date: 'DESC' } },
    });
    if (!product) throw new NotFoundException('Mahsulot topilmadi');

    return {
      ...product,
      defaultSupplier: product.defaultSupplier
        ? {
            id: product.defaultSupplier.id,
            name: product.defaultSupplier.name,
            phone: product.defaultSupplier.phone,
          }
        : null,
      stockItems: (product.stockItems ?? []).map((item) => ({
        ...item,
        branch: item.branch ? { id: item.branch.id, name: item.branch.name } : null,
      })),
      supplierPrices: (product.supplierPrices ?? []).slice(0, 20).map((row) => ({
        ...row,
        supplier: row.supplier ? { id: row.supplier.id, name: row.supplier.name } : null,
      })),
    };
  }

  async create(scope: RequestScope, input: Partial<CreateProductInput> & Pick<CreateProductInput, 'name' | 'unit' | 'unitCost'>) {
    const tenantId = requireTenant(scope);

    const entity = this.products.create({
      tenantId,
      name: input.name,
      unit: input.unit as Unit,
      unitCost: input.unitCost,
      categoryId: input.categoryId ?? null,
      maxQuantity: input.maxQuantity ?? null,
      packageSize: input.packageSize ?? null,
      shelfLifeDays: input.shelfLifeDays ?? null,
      defaultSupplierId: input.defaultSupplierId ?? null,
      barcode: input.barcode ?? null,
      minQuantity: input.minQuantity ?? 0,
      isActive: input.isActive ?? true,
    });
    const product = await this.products.save(entity);

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Product',
      entityId: product.id,
      summary: `Yangi mahsulot: ${product.name}`,
      newValue: product,
    });

    return product;
  }

  async update(scope: RequestScope, id: string, input: UpdateProductInput) {
    const tenantId = requireTenant(scope);

    const before = await this.products.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Mahsulot topilmadi');

    await this.products.update({ id }, { ...input } as Record<string, unknown>);
    const product = await this.products.findOneOrFail({ where: { id } });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Product',
      entityId: id,
      summary: `Mahsulot o'zgartirildi: ${product.name}`,
      oldValue: before,
      newValue: product,
    });

    return product;
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const before = await this.products.findOne({ where: { id, tenantId, deletedAt: IsNull() } });
    if (!before) throw new NotFoundException('Mahsulot topilmadi');

    await this.products.update({ id }, { deletedAt: new Date(), isActive: false });

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Product',
      entityId: id,
      summary: `Mahsulot o'chirildi: ${before.name}`,
      oldValue: before,
    });

    return { success: true };
  }

  async listCategories(scope: RequestScope) {
    const tenantId = requireTenant(scope);
    const rows = await this.categories
      .createQueryBuilder('c')
      .loadRelationCountAndMap(
        'c._productsCount',
        'c.products',
        'p',
        (qb) => qb.andWhere('p.deletedAt IS NULL'),
      )
      .where('c.tenantId = :tenantId', { tenantId })
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('c.name', 'ASC')
      .getMany();

    return rows.map((row) => ({
      ...row,
      _count: { products: (row as ProductCategory & { _productsCount?: number })._productsCount ?? 0 },
    }));
  }

  async createCategory(scope: RequestScope, input: { name: string; sortOrder?: number }) {
    const tenantId = requireTenant(scope);
    return this.categories.save(
      this.categories.create({
        tenantId,
        name: input.name,
        sortOrder: input.sortOrder ?? 0,
      }),
    );
  }
}
