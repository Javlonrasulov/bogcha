import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  calculateNorm,
  roundMoney,
  type CreateRecipeInput,
  type PaginationQuery,
  type UpdateRecipeInput,
} from '@bogcha/shared';
import { DataSource, IsNull, Repository } from 'typeorm';
import { requireTenant, type RequestScope } from '../common/scope/request-scope';
import { toNumber } from '../common/utils/decimal.util';
import { orderBy, paginate, paginated } from '../common/utils/pagination.util';
import { AuditAction, MealType, Unit } from '../entities/enums';
import { Recipe } from '../entities/recipe.entity';
import { RecipeItem } from '../entities/recipe-item.entity';
import { AuditService } from '../audit/audit.service';

const SORTABLE = ['name', 'baseHeadcount', 'createdAt'] as const;

type RecipeWithItems = Recipe & {
  items: (RecipeItem & {
    product: { id: string; name: string; unit: string; unitCost: number };
  })[];
};

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe) private readonly recipes: Repository<Recipe>,
    @InjectRepository(RecipeItem) private readonly recipeItems: Repository<RecipeItem>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  private mapRecipe(recipe: Recipe): RecipeWithItems {
    return {
      ...recipe,
      items: (recipe.items ?? []).map((item) => ({
        ...item,
        product: item.product
          ? {
              id: item.product.id,
              name: item.product.name,
              unit: item.product.unit,
              unitCost: item.product.unitCost,
            }
          : (null as never),
      })),
    } as RecipeWithItems;
  }

  async list(scope: RequestScope, query: Partial<PaginationQuery> & { mealType?: string }) {
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

    const qb = this.recipes
      .createQueryBuilder('recipe')
      .leftJoinAndSelect('recipe.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('recipe.tenantId = :tenantId', { tenantId })
      .andWhere('recipe.deletedAt IS NULL')
      .orderBy(`recipe.${field}`, dir)
      .skip(skip)
      .take(take);

    if (query.mealType) {
      qb.andWhere('recipe.mealType = :mealType', { mealType: query.mealType as MealType });
    }
    if (query.search) {
      qb.andWhere('recipe.name ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, total] = await qb.getManyAndCount();
    return paginated(
      items.map((recipe) => this.withCost(this.mapRecipe(recipe))),
      total,
      pageQuery,
    );
  }

  async findOne(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);
    const recipe = await this.recipes.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: { items: { product: true } },
    });
    if (!recipe) throw new NotFoundException('Retsept topilmadi');
    return this.withCost(this.mapRecipe(recipe));
  }

  /** Retseptni berilgan bolalar soniga moslab hisoblab beradi (TZ §11). */
  async scale(scope: RequestScope, id: string, headcount: number) {
    const recipe = await this.findOne(scope, id);

    const result = calculateNorm({
      items: recipe.items.map((item) => ({
        productId: item.productId,
        productName: item.product.name,
        baseQuantity: toNumber(item.quantity),
        unit: item.unit,
        stockUnit: item.product.unit,
        unitCost: toNumber(item.product.unitCost),
      })),
      plannedHeadcount: headcount,
      actualHeadcount: headcount,
      config: {
        baseHeadcount: recipe.baseHeadcount,
        wastePercent: toNumber(recipe.wastePercent),
        roundingStep: 0,
        roundingMode: 'NONE',
        staffMealFactor: 0,
      },
    });

    return {
      recipeId: recipe.id,
      recipeName: recipe.name,
      baseHeadcount: recipe.baseHeadcount,
      headcount,
      lines: result.lines,
      totalCost: result.totalActualCost,
      costPerChild: result.costPerChild,
    };
  }

  async create(
    scope: RequestScope,
    input: Partial<CreateRecipeInput> & Pick<CreateRecipeInput, 'name' | 'mealType' | 'items'>,
  ) {
    const tenantId = requireTenant(scope);
    const { items, ...rest } = input;

    const recipe = await this.dataSource.transaction(async (manager) => {
      const recipes = manager.getRepository(Recipe);
      const recipeItems = manager.getRepository(RecipeItem);

      const entity = recipes.create({
        name: rest.name,
        mealType: rest.mealType as MealType,
        tenantId,
        wastePercent: rest.wastePercent ?? 0,
        baseHeadcount: rest.baseHeadcount ?? 100,
        caloriesPerPortion: rest.caloriesPerPortion ?? null,
        instructions: rest.instructions ?? null,
        isActive: rest.isActive ?? true,
      });
      const saved = await recipes.save(entity);

      const itemEntities = items.map((item) =>
        recipeItems.create({
          recipeId: saved.id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit as Unit,
        }),
      );
      await recipeItems.save(itemEntities);

      return recipes.findOneOrFail({
        where: { id: saved.id },
        relations: { items: { product: true } },
      });
    });

    await this.auditService.record(scope, {
      action: AuditAction.CREATE,
      entityType: 'Recipe',
      entityId: recipe.id,
      summary: `Yangi retsept: ${recipe.name} (${recipe.baseHeadcount} bola uchun)`,
      newValue: recipe,
    });

    return this.withCost(this.mapRecipe(recipe));
  }

  async update(scope: RequestScope, id: string, input: UpdateRecipeInput) {
    const tenantId = requireTenant(scope);

    const before = await this.recipes.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
      relations: { items: { product: true } },
    });
    if (!before) throw new NotFoundException('Retsept topilmadi');

    const { items, ...rest } = input;

    const recipe = await this.dataSource.transaction(async (manager) => {
      const recipes = manager.getRepository(Recipe);
      const recipeItems = manager.getRepository(RecipeItem);

      if (items) {
        await recipeItems.delete({ recipeId: id });
        const itemEntities = items.map((item) =>
          recipeItems.create({
            recipeId: id,
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit as Unit,
          }),
        );
        await recipeItems.save(itemEntities);
      }

      if (Object.keys(rest).length > 0) {
        await recipes.update({ id }, { ...rest } as Record<string, unknown>);
      }

      return recipes.findOneOrFail({
        where: { id },
        relations: { items: { product: true } },
      });
    });

    await this.auditService.record(scope, {
      action: AuditAction.UPDATE,
      entityType: 'Recipe',
      entityId: id,
      summary: `Retsept o'zgartirildi: ${recipe.name}`,
      oldValue: before,
      newValue: recipe,
    });

    return this.withCost(this.mapRecipe(recipe));
  }

  async remove(scope: RequestScope, id: string) {
    const tenantId = requireTenant(scope);

    const before = await this.recipes.findOne({
      where: { id, tenantId, deletedAt: IsNull() },
    });
    if (!before) throw new NotFoundException('Retsept topilmadi');

    await this.recipes.update({ id }, { deletedAt: new Date(), isActive: false });

    await this.auditService.record(scope, {
      action: AuditAction.DELETE,
      entityType: 'Recipe',
      entityId: id,
      summary: `Retsept o'chirildi: ${before.name}`,
      oldValue: before,
    });

    return { success: true };
  }

  /** Retseptning bazaviy tannarxi va 1 bola uchun narxi. */
  private withCost(recipe: RecipeWithItems) {
    const totalCost = roundMoney(
      recipe.items.reduce(
        (acc, item) => acc + toNumber(item.quantity) * toNumber(item.product.unitCost),
        0,
      ),
    );

    return {
      ...recipe,
      totalCost,
      costPerChild: roundMoney(totalCost / Math.max(1, recipe.baseHeadcount)),
    };
  }
}
