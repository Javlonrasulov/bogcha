'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Boxes, PackageSearch, TriangleAlert } from 'lucide-react';
import { Permission } from '@bogcha/shared';
import { useAppData, useViewer } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { formatDate, formatMoney, formatNumber, formatQuantity } from '../../../lib/utils';
import { MOVEMENT_TYPE_TONE } from '../../../lib/tones';
import { Badge, HealthDot } from '../../../components/ui/badge';
import { Card, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, Progress } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { StatCard } from '../../../components/ui/stat-card';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { SearchField, ToggleFilter } from '../../../components/ui/filters';
import { MovementForm } from './movement-form';

export function InventoryView() {
  const t = useT();
  const viewer = useViewer();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const lowStockOnly = searchParams.get('lowStockOnly') === 'true';
  const canManage = viewer.can(Permission.STOCK_MANAGE);
  const units = t.products.units as unknown as Record<string, string>;
  const branchId = data.branchId ?? viewer.requiredBranchId;

  const stockItems = useMemo(() => {
    return data.stock.items.filter((row) => {
      if (lowStockOnly && row.quantity > row.minQuantity) return false;
      if (search) {
        const hay = `${row.productName} ${row.categoryName}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    });
  }, [data.stock.items, search, lowStockOnly]);

  const movements = data.stockMovements;
  const filteredValue = stockItems.reduce((sum, row) => sum + row.totalValue, 0);
  const lowStockCount = stockItems.filter((row) => row.quantity <= row.minQuantity).length;

  const critical = stockItems.filter((row) => row.quantity <= row.minQuantity);
  const soon = stockItems.filter(
    (row) => row.quantity > row.minQuantity && row.daysRemaining > 0 && row.daysRemaining <= 5,
  );
  const todayOut = movements
    .filter((movement) => movement.type === 'OUT' && movement.date === movements[0]?.date)
    .reduce((sum, movement) => sum + movement.totalCost, 0);

  return (
    <>
      <PageHeader
        title={t.inventory.title}
        subtitle={t.inventory.subtitle}
        actions={
          canManage && branchId ? (
            <MovementForm
              branchId={branchId}
              products={data.products.map((product) => ({
                id: product.id,
                name: product.name,
                unit: product.unit,
                unitCost: product.unitCost,
              }))}
              units={units}
            />
          ) : null
        }
      >
        <FilterBar>
          <SearchField placeholder={t.products.title} />
          <ToggleFilter paramName="lowStockOnly" label={t.inventory.lowStockOnly} />
        </FilterBar>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.inventory.stockValue}
          value={formatMoney(search || lowStockOnly ? filteredValue : data.stock.totalValue)}
          hint={`${formatNumber(stockItems.length)} ${t.products.title.toLowerCase()}`}
          icon="inventory"
          tone="brand"
        />
        <StatCard
          label={t.dashboard.lowStock}
          value={formatNumber(search || lowStockOnly ? lowStockCount : data.stock.lowStockCount)}
          hint={t.inventory.minQuantity}
          icon="alert"
          tone={(search || lowStockOnly ? lowStockCount : data.stock.lowStockCount) > 0 ? 'danger' : 'success'}
          invertDelta
        />
        <StatCard
          label={t.inventory.critical}
          value={formatNumber(critical.length)}
          hint={`${formatNumber(soon.length)} · ${t.inventory.warning}`}
          icon="alert"
          tone={critical.length > 0 ? 'danger' : 'success'}
        />
        <StatCard
          label={t.dashboard.todayConsumption}
          value={formatMoney(todayOut)}
          hint={t.inventory.movements}
          icon="trendingDown"
          tone="accent"
        />
      </div>

      <Card>
        <CardHeader
          title={t.inventory.currentStock}
          subtitle={`${formatNumber(stockItems.length)} ${t.common.rows} · ${formatMoney(
            search || lowStockOnly ? filteredValue : data.stock.totalValue,
          )}`}
          action={
            (search || lowStockOnly ? lowStockCount : data.stock.lowStockCount) > 0 ? (
              <Badge tone="danger" dot>
                <TriangleAlert className="size-3.5" />
                {formatNumber(search || lowStockOnly ? lowStockCount : data.stock.lowStockCount)}
              </Badge>
            ) : (
              <Badge tone="success" dot>
                {t.inventory.healthy}
              </Badge>
            )
          }
        />
        {stockItems.length === 0 ? (
          <EmptyState
            title={t.common.empty}
            hint={t.common.emptyHint}
            icon={<Boxes className="size-5" />}
          />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{t.common.product}</Th>
                <Th>{t.common.category}</Th>
                <Th align="right">{t.inventory.currentStock}</Th>
                <Th align="right">{t.inventory.minQuantity}</Th>
                <Th align="right">{t.inventory.unitCost}</Th>
                <Th align="right">{t.inventory.totalValue}</Th>
                <Th align="right">{t.inventory.daysLeft}</Th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((row) => {
                const level =
                  row.quantity <= row.minQuantity
                    ? 'BAD'
                    : row.daysRemaining > 0 && row.daysRemaining <= 5
                      ? 'WARNING'
                      : 'GOOD';
                const fill =
                  row.maxQuantity > 0
                    ? Math.min(100, (row.quantity / row.maxQuantity) * 100)
                    : Math.min(100, (row.quantity / Math.max(1, row.minQuantity * 3)) * 100);
                return (
                  <Tr key={row.productId}>
                    <Td>
                      <span className="flex items-center gap-2">
                        <HealthDot level={level} pulse={level === 'BAD'} />
                        <span className="font-medium text-content">{row.productName}</span>
                      </span>
                    </Td>
                    <Td className="text-xs text-content-muted">{row.categoryName}</Td>
                    <Td align="right">
                      <span className="tabular font-medium text-content">
                        {formatQuantity(row.quantity, row.unit, units)}
                      </span>
                      <Progress
                        value={fill}
                        size="sm"
                        tone={level === 'BAD' ? 'danger' : level === 'WARNING' ? 'warning' : 'success'}
                        className="mt-1 ml-auto w-20"
                      />
                    </Td>
                    <Td align="right" className="tabular text-content-muted">
                      {formatQuantity(row.minQuantity, row.unit, units)}
                    </Td>
                    <Td align="right" className="tabular">
                      {formatMoney(row.unitCost)}
                    </Td>
                    <Td align="right" className="tabular font-medium">
                      {formatMoney(row.totalValue)}
                    </Td>
                    <Td align="right" className="tabular">
                      {row.daysRemaining > 0 ? (
                        <span
                          className={
                            row.daysRemaining <= 3
                              ? 'text-danger'
                              : row.daysRemaining <= 7
                                ? 'text-warning'
                                : 'text-content-secondary'
                          }
                        >
                          {formatNumber(row.daysRemaining)} {t.inventory.days}
                        </span>
                      ) : (
                        '—'
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>

      <Card>
        <CardHeader
          title={t.inventory.movements}
          subtitle={`${formatNumber(movements.length)} ${t.common.rows}`}
        />
        {movements.length === 0 ? (
          <EmptyState title={t.common.empty} icon={<PackageSearch className="size-5" />} />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>{t.common.date}</Th>
                <Th>{t.common.product}</Th>
                <Th>{t.common.status}</Th>
                <Th align="right">{t.common.quantity}</Th>
                <Th align="right">{t.inventory.balanceAfter}</Th>
                <Th align="right">{t.common.amount}</Th>
                <Th>{t.inventory.source}</Th>
              </tr>
            </thead>
            <tbody>
              {movements.map((movement) => (
                <Tr key={movement.id}>
                  <Td className="whitespace-nowrap">
                    <span className="tabular block text-content">{formatDate(movement.date)}</span>
                    {movement.documentNumber ? (
                      <span className="tabular block text-xs text-content-muted">
                        {movement.documentNumber}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="font-medium text-content">{movement.product.name}</Td>
                  <Td>
                    <Badge tone={MOVEMENT_TYPE_TONE[movement.type] ?? 'neutral'}>
                      {t.inventory.types[movement.type]}
                    </Badge>
                  </Td>
                  <Td align="right" className="tabular font-medium">
                    <span
                      className={
                        movement.type === 'IN' || movement.type === 'RETURN'
                          ? 'text-success'
                          : 'text-danger'
                      }
                    >
                      {movement.type === 'IN' || movement.type === 'RETURN' ? '+' : '−'}
                      {formatQuantity(movement.quantity, movement.product.unit, units)}
                    </span>
                  </Td>
                  <Td align="right" className="tabular text-content-secondary">
                    {formatQuantity(movement.balanceAfter, movement.product.unit, units)}
                  </Td>
                  <Td align="right" className="tabular">
                    {formatMoney(movement.totalCost)}
                  </Td>
                  <Td>
                    <span className="text-xs text-content-muted">
                      {t.inventory.sources[movement.source] ?? movement.source}
                    </span>
                    {movement.reason ? (
                      <span className="block max-w-[16rem] truncate text-xs text-content-muted">
                        {movement.reason}
                      </span>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
