'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChefHat, Flame } from 'lucide-react';
import { MealType } from '@bogcha/shared';
import { useAppData } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatQuantity,
} from '../../../lib/utils';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, MiniStat } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { FilterSelect, SearchField } from '../../../components/ui/filters';
import { RecipeScaler } from './recipe-scaler';

export function RecipesView() {
  const t = useT();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const mealType = searchParams.get('mealType') ?? '';
  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const selectedId = searchParams.get('recipeId');

  const recipes = useMemo(() => {
    return data.recipes.filter((recipe) => {
      if (mealType && recipe.mealType !== mealType) return false;
      if (search && !recipe.name.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [data.recipes, mealType, search]);

  const selected = recipes.find((recipe) => recipe.id === selectedId) ?? recipes[0] ?? null;
  const averageCost =
    recipes.length > 0
      ? recipes.reduce((sum, recipe) => sum + recipe.costPerChild, 0) / recipes.length
      : 0;
  const units = t.products.units as unknown as Record<string, string>;

  return (
    <>
      <PageHeader title={t.recipes.title} subtitle={t.recipes.subtitle}>
        <FilterBar>
          <SearchField placeholder={t.common.search} />
          <FilterSelect
            paramName="mealType"
            placeholder={t.recipes.mealType}
            options={Object.values(MealType).map((meal) => ({
              value: meal,
              label: t.menu.meals[meal],
            }))}
          />
        </FilterBar>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MiniStat label={t.recipes.title} value={formatNumber(recipes.length)} />
        <MiniStat label={`${t.common.average} · ${t.common.perChild}`} value={formatMoney(averageCost)} />
        <MiniStat
          label={t.menu.meals.LUNCH}
          value={formatNumber(
            recipes.filter((recipe) => recipe.mealType === MealType.LUNCH).length,
          )}
        />
        <MiniStat
          label={t.recipes.baseHeadcount}
          value={formatNumber(recipes[0]?.baseHeadcount ?? 100)}
        />
      </div>

      {recipes.length === 0 ? (
        <Card>
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<ChefHat className="size-5" />}
          />
        </Card>
      ) : (
        <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader
              title={t.recipes.title}
              subtitle={`${formatNumber(recipes.length)} ${t.common.rows}`}
            />
            <TableWrap>
              <thead>
                <tr>
                  <Th>{t.common.name}</Th>
                  <Th>{t.recipes.mealType}</Th>
                  <Th align="right">{t.common.perChild}</Th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <Tr key={recipe.id} className={recipe.id === selected?.id ? 'bg-brand-soft/40' : undefined}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <Link
                          href={`/recipes?recipeId=${recipe.id}`}
                          className={
                            recipe.id === selected?.id
                              ? 'font-semibold text-brand-strong'
                              : 'font-medium text-content transition-colors hover:text-brand-strong'
                          }
                        >
                          {recipe.name}
                        </Link>
                        {!recipe.isActive ? (
                          <Badge tone="neutral">{t.common.no}</Badge>
                        ) : null}
                      </span>
                      <span className="block text-xs text-content-muted">
                        {formatNumber(recipe.items.length)} {t.nutrition.products.toLowerCase()}
                        {recipe.caloriesPerPortion
                          ? ` · ${formatNumber(recipe.caloriesPerPortion)} kcal`
                          : ''}
                      </span>
                    </Td>
                    <Td>
                      <Badge tone="info">{t.menu.meals[recipe.mealType]}</Badge>
                    </Td>
                    <Td align="right" className="tabular font-medium">
                      {formatMoney(recipe.costPerChild)}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </TableWrap>
          </Card>

          {selected ? (
            <Card>
              <CardHeader
                title={selected.name}
                subtitle={`${t.menu.meals[selected.mealType]} · ${t.recipes.baseHeadcount}: ${formatNumber(
                  selected.baseHeadcount,
                )}`}
                action={
                  <>
                    {selected.caloriesPerPortion ? (
                      <Badge tone="warning">
                        <Flame className="size-3.5" />
                        {formatNumber(selected.caloriesPerPortion)} kcal
                      </Badge>
                    ) : null}
                    <Badge tone="brand">{formatMoney(selected.costPerChild)}</Badge>
                  </>
                }
              />
              <CardBody className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat label={t.common.total} value={formatMoney(selected.totalCost)} />
                  <MiniStat label={t.common.perChild} value={formatMoney(selected.costPerChild)} />
                  <MiniStat
                    label={t.recipes.wastePercent}
                    value={formatPercent(selected.wastePercent, 0)}
                  />
                  <MiniStat
                    label={t.recipes.ingredients}
                    value={formatNumber(selected.items.length)}
                  />
                </div>

                <RecipeScaler
                  recipeId={selected.id}
                  baseHeadcount={selected.baseHeadcount}
                  items={selected.items.map((item) => ({
                    productId: item.productId,
                    name: item.product.name,
                    unit: item.unit,
                    quantity: item.quantity,
                    unitCost: item.product.unitCost,
                  }))}
                  wastePercent={selected.wastePercent}
                  units={units}
                />

                {selected.instructions ? (
                  <div className="rounded-xl bg-surface-muted px-4 py-3">
                    <p className="text-[0.7rem] font-medium uppercase tracking-wide text-content-muted">
                      {t.recipes.instructions}
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-content-secondary">
                      {selected.instructions}
                    </p>
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-content-muted">
                    {t.recipes.ingredients} · {formatNumber(selected.baseHeadcount)}{' '}
                    {t.children.title.toLowerCase()}
                  </p>
                  <ul className="divide-y divide-line/60 rounded-xl border border-line">
                    {selected.items.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate text-content">{item.product.name}</span>
                        <span className="flex shrink-0 items-center gap-4">
                          <span className="tabular text-content-secondary">
                            {formatQuantity(item.quantity, item.unit, units)}
                          </span>
                          <span className="tabular w-24 text-right text-content-muted">
                            {formatMoney(item.quantity * item.product.unitCost)}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}
