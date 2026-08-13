'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, Minus, Phone, Truck } from 'lucide-react';
import { useAppData } from '../../../lib/app-data';
import { useT } from '../../../i18n/client';
import { formatMoney, formatNumber, formatPercent } from '../../../lib/utils';
import type { Supplier } from '../../../lib/types';
import { Badge } from '../../../components/ui/badge';
import { Card, CardBody, CardHeader } from '../../../components/ui/card';
import { EmptyState, FilterBar, MiniStat, Pagination } from '../../../components/ui/misc';
import { PageHeader } from '../../../components/ui/page-header';
import { TableWrap, Td, Th, Tr } from '../../../components/ui/table';
import { SearchField } from '../../../components/ui/filters';
import { Sparkline } from '../../../components/charts/charts';
import { Skeleton } from '../../../components/ui/skeleton';

const PAGE_SIZE = 20;

interface PriceTrend {
  productId: string;
  productName: string;
  unit: string;
  history: Array<{ date: string; price: number }>;
  trend: {
    currentPrice: number;
    previousPrice: number;
    changePercent: number;
    direction: 'UP' | 'DOWN' | 'STABLE';
    minPrice: number;
    maxPrice: number;
    averagePrice: number;
  } | null;
}

interface SupplierDetail extends Omit<Supplier, '_count'> {
  products: Array<{ id: string; name: string; unit: string }>;
  priceTrends: PriceTrend[];
}

export function SuppliersView() {
  const t = useT();
  const { data } = useAppData();
  const searchParams = useSearchParams();

  const search = (searchParams.get('search') ?? '').trim().toLowerCase();
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1);
  const supplierId = searchParams.get('supplierId');

  const filtered = useMemo(() => {
    if (!search) return data.suppliers;
    return data.suppliers.filter((supplier) => {
      const hay = [supplier.name, supplier.contactPerson ?? '', supplier.phone ?? '']
        .join(' ')
        .toLowerCase();
      return hay.includes(search);
    });
  }, [data.suppliers, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const items = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const activeId = supplierId ?? items[0]?.id ?? filtered[0]?.id ?? null;

  const [detail, setDetail] = useState<SupplierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!activeId) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/api/suppliers/${encodeURIComponent(activeId)}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          if (!cancelled) setDetail(null);
          return;
        }
        const payload = (await response.json()) as SupplierDetail;
        if (!cancelled) setDetail(payload);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const totalDebt = filtered.reduce((sum, supplier) => sum + supplier.balance, 0);
  const risingPrices = (detail?.priceTrends ?? []).filter(
    (row) => row.trend?.direction === 'UP',
  ).length;

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const q = params.toString();
    return q ? `?${q}` : '';
  }, [searchParams]);

  return (
    <>
      <PageHeader title={t.suppliers.title} subtitle={t.suppliers.subtitle}>
        <FilterBar>
          <SearchField placeholder={t.suppliers.title} />
        </FilterBar>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <MiniStat label={t.suppliers.title} value={formatNumber(filtered.length)} />
        <MiniStat
          label={t.suppliers.balance}
          value={formatMoney(totalDebt)}
          tone={totalDebt > 0 ? 'danger' : 'success'}
        />
        <MiniStat
          label={t.suppliers.priceUp}
          value={formatNumber(risingPrices)}
          tone={risingPrices > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.3fr]">
        <Card>
          <CardHeader
            title={t.suppliers.title}
            subtitle={`${formatNumber(filtered.length)} ${t.common.rows}`}
          />
          {items.length === 0 ? (
            <EmptyState
              title={t.common.empty}
              hint={t.common.emptyHint}
              icon={<Truck className="size-5" />}
            />
          ) : (
            <>
              <TableWrap className="min-w-0">
                <thead>
                  <tr>
                    <Th>{t.common.name}</Th>
                    <Th align="right">{t.products.title}</Th>
                    <Th align="right">{t.suppliers.balance}</Th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((supplier) => (
                    <Tr
                      key={supplier.id}
                      className={supplier.id === activeId ? 'bg-brand-soft/40' : undefined}
                    >
                      <Td>
                        <Link
                          href={`/suppliers?supplierId=${supplier.id}`}
                          className={
                            supplier.id === activeId
                              ? 'font-semibold text-brand-strong'
                              : 'font-medium text-content transition-colors hover:text-brand-strong'
                          }
                        >
                          {supplier.name}
                        </Link>
                        <span className="block text-xs text-content-muted">
                          {supplier.contactPerson ?? supplier.phone ?? '—'}
                        </span>
                      </Td>
                      <Td align="right" className="tabular">
                        {formatNumber(supplier._count.products)}
                      </Td>
                      <Td align="right" className="tabular">
                        {supplier.balance > 0 ? (
                          <span className="font-medium text-danger">
                            {formatMoney(supplier.balance)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                total={filtered.length}
                baseQuery={baseQuery}
                labels={t.common}
              />
            </>
          )}
        </Card>

        {detailLoading && !detail ? (
          <Card>
            <CardBody className="space-y-3">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </CardBody>
          </Card>
        ) : detail ? (
          <div className="space-y-3">
            <Card>
              <CardHeader
                title={detail.name}
                subtitle={`${formatNumber(detail.products.length)} ${t.products.title.toLowerCase()}`}
                action={
                  detail.phone ? (
                    <a
                      href={`tel:${detail.phone}`}
                      className="tabular inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-content-secondary transition-colors hover:bg-brand-soft hover:text-brand-strong"
                    >
                      <Phone className="size-3.5" />
                      {detail.phone}
                    </a>
                  ) : null
                }
              />
              <CardBody className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat
                  label={t.suppliers.balance}
                  value={formatMoney(detail.balance)}
                  tone={detail.balance > 0 ? 'danger' : 'success'}
                />
                <MiniStat label={t.suppliers.inn} value={detail.inn ?? '—'} />
                <MiniStat label={t.common.address} value={detail.address ?? '—'} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader title={t.suppliers.priceTrend} subtitle={t.products.priceHistory} />
              {detail.priceTrends.length === 0 ? (
                <EmptyState title={t.common.empty} className="py-8" />
              ) : (
                <TableWrap className="min-w-0">
                  <thead>
                    <tr>
                      <Th>{t.common.product}</Th>
                      <Th align="right">{t.common.price}</Th>
                      <Th align="right">{t.common.growth}</Th>
                      <Th align="right">{t.products.priceHistory}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.priceTrends.map((row) => {
                      const direction = row.trend?.direction ?? 'STABLE';
                      return (
                        <Tr key={row.productId}>
                          <Td className="font-medium text-content">{row.productName}</Td>
                          <Td align="right" className="tabular">
                            <span className="block font-medium text-content">
                              {formatMoney(row.trend?.currentPrice ?? 0)}
                            </span>
                            <span className="block text-xs text-content-muted">
                              {formatMoney(row.trend?.previousPrice ?? 0)}
                            </span>
                          </Td>
                          <Td align="right">
                            <Badge
                              tone={
                                direction === 'UP'
                                  ? 'danger'
                                  : direction === 'DOWN'
                                    ? 'success'
                                    : 'neutral'
                              }
                            >
                              {direction === 'UP' ? (
                                <ArrowUpRight className="size-3.5" />
                              ) : direction === 'DOWN' ? (
                                <ArrowDownRight className="size-3.5" />
                              ) : (
                                <Minus className="size-3.5" />
                              )}
                              {formatPercent(Math.abs(row.trend?.changePercent ?? 0), 1)}
                            </Badge>
                          </Td>
                          <Td align="right">
                            <span className="ml-auto block w-24">
                              <Sparkline
                                data={row.history.map((point) => ({ value: point.price }))}
                                tone={direction === 'UP' ? 'danger' : 'success'}
                              />
                            </span>
                          </Td>
                        </Tr>
                      );
                    })}
                  </tbody>
                </TableWrap>
              )}
            </Card>
          </div>
        ) : null}
      </div>
    </>
  );
}
