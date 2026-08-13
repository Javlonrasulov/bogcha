import { Ionicons } from '@expo/vector-icons';
import { AttendanceStatus, InvoiceStatus, type ChildProfile } from '@bogcha/shared';
import { Linking, Pressable } from 'react-native';
import { useResource } from '../hooks/use-resource';
import { useI18n } from '../i18n/provider';
import { useTheme } from '../theme/provider';
import { spacing, type ToneName } from '../theme/tokens';
import {
  Card,
  Column,
  Divider,
  Row,
  AppText,
  Avatar,
  Badge,
} from '../ui/primitives';
import { RingStat } from '../ui/charts';
import {
  ErrorState,
  KeyValue,
  ListCard,
  ListRow,
  MiniStat,
  Screen,
  SectionHeader,
  SkeletonList,
} from '../ui/components';
import { ATTENDANCE_STATUS_META, CHILD_STATUS_TONE } from '../ui/status-meta';
import { clockTime, fullMoney, shortDate } from '../utils/format';

const INVOICE_TONE: Record<InvoiceStatus, ToneName> = {
  [InvoiceStatus.DRAFT]: 'neutral',
  [InvoiceStatus.ISSUED]: 'info',
  [InvoiceStatus.PARTIALLY_PAID]: 'warning',
  [InvoiceStatus.PAID]: 'success',
  [InvoiceStatus.OVERDUE]: 'danger',
  [InvoiceStatus.CANCELLED]: 'neutral',
};

/**
 * Bola profili — Admin va Tarbiyachi ilovalarida umumiy (TZ §6).
 * Moliyaviy tarix faqat ruxsati bor foydalanuvchiga ko'rsatiladi.
 */
export function ChildProfileScreen({
  childId,
  showFinance = false,
}: {
  childId: string | undefined;
  showFinance?: boolean;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const child = useResource<ChildProfile>(
    childId ? `/children/${childId}` : null,
    `child.${childId}`,
  );

  if (child.loading && !child.data) {
    return (
      <Screen>
        <SkeletonList rows={6} />
      </Screen>
    );
  }

  if (!child.data) {
    return (
      <Screen>
        <ErrorState
          message={child.error ?? t.common.loadFailed}
          onRetry={child.refresh}
          retryLabel={t.common.retry}
        />
      </Screen>
    );
  }

  const profile = child.data;
  const history = profile.attendanceHistory.slice(0, 14);
  const invoices = profile.invoices.slice(0, 6);

  return (
    <Screen refreshing={child.refreshing} onRefresh={child.refresh}>
      {child.stale ? <Badge tone="neutral" label={t.sync.staleData} /> : null}

      <Card>
        <Column gap={spacing.lg}>
          <Row gap={spacing.md}>
            <Avatar name={profile.fullName} size={56} tone={CHILD_STATUS_TONE[profile.status]} />
            <Column gap={spacing.xs} style={{ flex: 1 }}>
              <AppText variant="heading" numberOfLines={2}>
                {profile.fullName}
              </AppText>
              <Row gap={spacing.xs} wrap>
                <Badge
                  tone={CHILD_STATUS_TONE[profile.status]}
                  dot
                  label={t.children.statuses[profile.status]}
                />
                {profile.group ? <Badge tone="brand" label={profile.group.name} /> : null}
              </Row>
            </Column>
          </Row>

          <Divider />

          <Row gap={spacing.lg} align="center">
            <RingStat
              percent={profile.statistics.attendanceRate90d}
              label={t.children.attendanceRate30d}
              size={84}
            />
            <Column gap={spacing.sm} style={{ flex: 1 }}>
              <Row gap={spacing.sm}>
                <MiniStat
                  label={t.attendance.present}
                  value={String(profile.statistics.presentDays)}
                  tone="success"
                />
                <MiniStat
                  label={t.attendance.absent}
                  value={String(profile.statistics.absentDays)}
                  tone="danger"
                />
              </Row>
            </Column>
          </Row>
        </Column>
      </Card>

      <Card>
        <Column gap={spacing.md}>
          <KeyValue label={t.children.birthDate} value={shortDate(profile.birthDate)} />
          <KeyValue label={t.children.age} value={`${profile.age} ${t.children.age}`} />
          <KeyValue label={t.children.enrolledAt} value={shortDate(profile.enrolledAt)} />
          <KeyValue label={t.children.monthlyFee} value={fullMoney(profile.netMonthlyFee)} />
          {profile.discountPercent > 0 || profile.discountAmount > 0 ? (
            <KeyValue
              label={t.children.discount}
              value={
                profile.discountPercent > 0
                  ? `${profile.discountPercent}%`
                  : fullMoney(profile.discountAmount)
              }
              tone="success"
            />
          ) : null}
          <KeyValue
            label={t.children.debt}
            value={
              profile.statistics.outstandingDebt > 0
                ? fullMoney(profile.statistics.outstandingDebt)
                : t.children.noDebt
            }
            tone={profile.statistics.outstandingDebt > 0 ? 'danger' : 'success'}
          />
          {profile.medicalNotes ? (
            <>
              <Divider />
              <Column gap={spacing.xs}>
                <AppText variant="caption" tone="muted">
                  {t.common.note}
                </AppText>
                <AppText variant="label">{profile.medicalNotes}</AppText>
              </Column>
            </>
          ) : null}
        </Column>
      </Card>

      <SectionHeader title={t.children.parents} />
      <ListCard>
        {profile.guardians.map((guardian, index) => (
          <ListRow
            key={guardian.id}
            title={guardian.fullName}
            subtitle={`${guardian.relation} · ${guardian.phone}`}
            leading={<Avatar name={guardian.fullName} size={38} tone="neutral" />}
            trailing={
              <Pressable
                onPress={() => void Linking.openURL(`tel:${guardian.phone}`)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t.common.phone}
              >
                <Ionicons name="call-outline" size={20} color={colors.brand} />
              </Pressable>
            }
            last={index === profile.guardians.length - 1}
          />
        ))}
      </ListCard>

      {showFinance && invoices.length > 0 ? (
        <>
          <SectionHeader title={t.finance.payments} />
          <ListCard>
            {invoices.map((invoice, index) => (
              <ListRow
                key={invoice.id}
                title={invoice.period}
                subtitle={`${t.finance.collected}: ${fullMoney(invoice.paidAmount)}`}
                meta={fullMoney(invoice.balance)}
                metaTone={INVOICE_TONE[invoice.status]}
                last={index === invoices.length - 1}
              />
            ))}
          </ListCard>
        </>
      ) : null}

      <SectionHeader title={t.children.history} />
      <ListCard>
        {history.map((record, index) => (
          <ListRow
            key={record.date}
            title={shortDate(record.date)}
            subtitle={
              record.status === AttendanceStatus.PRESENT && record.arrivedAt
                ? `${clockTime(record.arrivedAt)} — ${clockTime(record.leftAt)}`
                : (record.note ?? undefined)
            }
            meta={t.attendance.statuses[record.status]}
            metaTone={ATTENDANCE_STATUS_META[record.status].tone}
            last={index === history.length - 1}
          />
        ))}
      </ListCard>
    </Screen>
  );
}
