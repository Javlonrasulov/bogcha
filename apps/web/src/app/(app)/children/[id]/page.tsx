import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Phone, Stethoscope, Wallet } from 'lucide-react';
import { ApiError, apiFetch } from '../../../../lib/api';
import { getT } from '../../../../i18n/server';
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  formatPeriod,
  formatTime,
} from '../../../../lib/utils';
import type { ChildProfile } from '../../../../lib/types';
import {
  ATTENDANCE_STATUS_TONE,
  CHILD_STATUS_TONE,
  INVOICE_STATUS_TONE,
} from '../../../../lib/tones';
import { Badge } from '../../../../components/ui/badge';
import { Card, CardBody, CardHeader } from '../../../../components/ui/card';
import { Avatar, EmptyState, MiniStat, Progress } from '../../../../components/ui/misc';
import { TableWrap, Td, Th, Tr } from '../../../../components/ui/table';

export const metadata: Metadata = { title: 'Bola profili' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ChildProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getT();

  if (!UUID_RE.test(id)) notFound();

  let child: ChildProfile;
  try {
    child = await apiFetch<ChildProfile>(`/children/${id}`);
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403 || error.status === 400)) {
      notFound();
    }
    throw error;
  }

  const stats = child.statistics;

  return (
    <>
      <Link
        href="/children"
        className="inline-flex items-center gap-1.5 text-sm text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="size-4" />
        {t.children.title}
      </Link>

      {/* Profil sarlavhasi */}
      <Card>
        <CardBody className="flex flex-wrap items-start gap-5">
          <Avatar name={child.fullName} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-content">
                {child.fullName}
              </h1>
              <Badge tone={CHILD_STATUS_TONE[child.status] ?? 'neutral'} dot>
                {t.children.statuses[child.status]}
              </Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-content-secondary">
              <span>
                {formatDate(child.birthDate)} · {child.age} {t.children.years}
              </span>
              <span>{child.gender === 'MALE' ? t.children.male : t.children.female}</span>
              <span>
                {child.group ? (
                  <Link href="/groups" className="text-brand-strong hover:underline">
                    {child.group.name}
                  </Link>
                ) : (
                  t.children.noGroup
                )}
              </span>
              <span>{child.branch.name}</span>
              <span>
                {t.children.enrolledAt}: {formatDate(child.enrolledAt)}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label={t.children.netFee}
              value={formatMoney(child.netMonthlyFee)}
              hint={
                child.discountPercent > 0 || child.discountAmount > 0
                  ? `${t.children.discount}: ${
                      child.discountPercent > 0
                        ? formatPercent(child.discountPercent, 0)
                        : formatMoney(child.discountAmount)
                    }`
                  : undefined
              }
            />
            <MiniStat
              label={t.children.debt}
              value={formatMoney(stats.outstandingDebt)}
              tone={stats.outstandingDebt > 0 ? 'danger' : 'success'}
            />
            <MiniStat
              label={t.children.attendanceRate30}
              value={formatPercent(stats.attendanceRate90d)}
              tone={stats.attendanceRate90d >= 85 ? 'success' : 'warning'}
            />
            <MiniStat label={t.payments.collected} value={formatMoney(stats.totalPaid)} />
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-3 xl:grid-cols-[1fr_1.3fr]">
        <div className="space-y-3">
          {/* Ota-onalar */}
          <Card>
            <CardHeader title={t.children.guardians} />
            {child.guardians.length === 0 ? (
              <EmptyState title={t.common.empty} className="py-8" />
            ) : (
              <ul className="divide-y divide-line/60">
                {child.guardians.map((guardian) => (
                  <li key={guardian.id} className="flex items-start gap-3 px-5 py-3.5">
                    <Avatar name={guardian.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-content">
                        <span className="truncate">{guardian.fullName}</span>
                        {guardian.isPrimary ? (
                          <Badge tone="brand">{t.children.primaryGuardian}</Badge>
                        ) : null}
                      </p>
                      <p className="text-xs text-content-muted">
                        {guardian.relation}
                        {guardian.workplace ? ` · ${guardian.workplace}` : ''}
                      </p>
                    </div>
                    <a
                      href={`tel:${guardian.phone}`}
                      className="tabular inline-flex items-center gap-1.5 rounded-lg bg-surface-muted px-2.5 py-1.5 text-xs text-content-secondary transition-colors hover:bg-brand-soft hover:text-brand-strong"
                    >
                      <Phone className="size-3.5" />
                      {guardian.phone}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Qo'shimcha ma'lumot */}
          <Card>
            <CardHeader title={t.common.details} />
            <CardBody className="space-y-3 text-sm">
              <Row label={t.common.address} value={child.address ?? '—'} />
              <Row
                label={t.children.monthlyFee}
                value={formatMoney(child.monthlyFee)}
                icon={<Wallet className="size-3.5" />}
              />
              <Row
                label={t.children.discount}
                value={
                  child.discountPercent > 0
                    ? formatPercent(child.discountPercent, 0)
                    : formatMoney(child.discountAmount)
                }
              />
              {child.discountReason ? (
                <Row label={t.common.reason} value={child.discountReason} />
              ) : null}
              <Row
                label={t.children.medicalNotes}
                value={child.medicalNotes ?? '—'}
                icon={<Stethoscope className="size-3.5" />}
              />
              <Row label={t.common.note} value={child.note ?? '—'} />
              <Row
                label={t.children.attendanceHistory}
                value={`${formatNumber(stats.presentDays)} / ${formatNumber(
                  stats.presentDays + stats.absentDays,
                )} ${t.inventory.days}`}
                icon={<CalendarDays className="size-3.5" />}
              />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-3">
          {/* To'lov tarixi */}
          <Card>
            <CardHeader
              title={t.children.paymentHistory}
              subtitle={`${t.payments.invoices}: ${formatNumber(child.invoices.length)}`}
            />
            {child.invoices.length === 0 ? (
              <EmptyState title={t.common.empty} className="py-8" />
            ) : (
              <TableWrap className="max-h-96 overflow-y-auto">
                <thead>
                  <tr>
                    <Th>{t.payroll.period}</Th>
                    <Th align="right">{t.payments.baseAmount}</Th>
                    <Th align="right">{t.payments.paidAmount}</Th>
                    <Th align="right">{t.payments.balance}</Th>
                    <Th>{t.common.status}</Th>
                  </tr>
                </thead>
                <tbody>
                  {child.invoices.map((invoice) => (
                    <Tr key={invoice.id}>
                      <Td className="whitespace-nowrap font-medium text-content">
                        {formatPeriod(invoice.period)}
                      </Td>
                      <Td align="right" className="tabular">
                        {formatMoney(invoice.totalAmount)}
                      </Td>
                      <Td align="right" className="tabular">
                        {formatMoney(invoice.paidAmount)}
                      </Td>
                      <Td align="right" className="tabular">
                        {invoice.balance > 0 ? (
                          <span className="font-medium text-danger">
                            {formatMoney(invoice.balance)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td>
                        <Badge tone={INVOICE_STATUS_TONE[invoice.status] ?? 'neutral'}>
                          {t.payments.statuses[invoice.status]}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            )}
          </Card>

          {/* Davomat tarixi */}
          <Card>
            <CardHeader
              title={t.children.attendanceHistory}
              subtitle={`90 ${t.inventory.days} · ${formatPercent(stats.attendanceRate90d)}`}
            />
            <CardBody className="space-y-4">
              <Progress
                value={stats.attendanceRate90d}
                tone={stats.attendanceRate90d >= 85 ? 'success' : 'warning'}
              />
              <div className="flex flex-wrap gap-2">
                {stats.byStatus.map((row) => (
                  <Badge key={row.status} tone={ATTENDANCE_STATUS_TONE[row.status] ?? 'neutral'}>
                    {t.attendance.statuses[row.status]}: {formatNumber(row.count)}
                  </Badge>
                ))}
              </div>
              <div className="max-h-72 overflow-y-auto">
                <ul className="divide-y divide-line/60">
                  {child.attendanceHistory.slice(0, 30).map((record) => (
                    <li
                      key={record.date}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span className="tabular text-content-secondary">
                        {formatDate(record.date)}
                      </span>
                      <span className="flex items-center gap-3">
                        {record.arrivedAt ? (
                          <span className="tabular text-xs text-content-muted">
                            {formatTime(record.arrivedAt)} – {formatTime(record.leftAt)}
                          </span>
                        ) : null}
                        <Badge tone={ATTENDANCE_STATUS_TONE[record.status] ?? 'neutral'}>
                          {t.attendance.statuses[record.status]}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="flex items-center gap-1.5 text-content-muted">
        {icon}
        {label}
      </span>
      <span className="max-w-[60%] text-right text-content">{value}</span>
    </div>
  );
}
