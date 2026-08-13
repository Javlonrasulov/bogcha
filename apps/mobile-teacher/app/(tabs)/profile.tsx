import { Ionicons } from '@expo/vector-icons';
import {
  AppText,
  Avatar,
  Badge,
  Banner,
  Button,
  Card,
  Column,
  ListRow,
  Row,
  Screen,
  Segmented,
  clearQueue,
  relativeTime,
  spacing,
  useAuth,
  useI18n,
  useSync,
  useTheme,
  type ThemeMode,
} from '@bogcha/mobile-core';
import { Locale } from '@bogcha/shared';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_VERSION } from '../../src/config';

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { mode, setMode, colors } = useTheme();
  const { pending, online, sync, lastSyncedAt } = useSync();
  const insets = useSafeAreaInsets();

  const confirmSignOut = () => {
    Alert.alert(t.auth.signOut, t.auth.signOutConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.auth.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const confirmClearCache = () => {
    Alert.alert(t.settings.clearCache, t.sync.pending, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.clearCache,
        style: 'destructive',
        onPress: () => void clearQueue(),
      },
    ]);
  };

  const themeOptions: ReadonlyArray<{ value: ThemeMode; label: string }> = [
    { value: 'system', label: t.settings.themeSystem },
    { value: 'light', label: t.settings.themeLight },
    { value: 'dark', label: t.settings.themeDark },
  ];

  const localeOptions = [
    { value: Locale.UZ_LATN, label: "O'zbek" },
    { value: Locale.UZ_CYRL, label: 'Ўзбек' },
    { value: Locale.RU, label: 'Русский' },
  ] as const;

  return (
    <Screen style={{ paddingTop: insets.top + spacing.lg }}>
      <Card>
        <Row gap={spacing.md}>
          <Avatar name={user?.fullName ?? '—'} size={54} />
          <Column gap={spacing.xs} style={{ flex: 1 }}>
            <AppText variant="heading" numberOfLines={1}>
              {user?.fullName}
            </AppText>
            <AppText variant="caption" tone="muted">
              {user?.phone}
            </AppText>
            <Row gap={spacing.xs} wrap>
              {(user?.roles ?? []).map((role) => (
                <Badge key={role} tone="brand" label={role} />
              ))}
            </Row>
          </Column>
        </Row>
      </Card>

      {pending > 0 ? (
        <Banner
          tone={online ? 'info' : 'warning'}
          icon="☁️"
          title={`${pending} ${t.sync.pending.toLowerCase()}`}
          description={online ? undefined : t.sync.queuedHint}
          action={
            online ? (
              <Button label={t.sync.syncNow} size="sm" variant="secondary" onPress={() => void sync()} />
            ) : undefined
          }
        />
      ) : null}

      <Card>
        <Column gap={spacing.md}>
          <AppText variant="heading">{t.settings.title}</AppText>

          <Column gap={spacing.sm}>
            <AppText variant="caption" tone="muted">
              {t.settings.theme}
            </AppText>
            <Segmented options={themeOptions} value={mode} onChange={setMode} />
          </Column>

          <Column gap={spacing.sm}>
            <AppText variant="caption" tone="muted">
              {t.settings.language}
            </AppText>
            <Segmented options={localeOptions} value={locale} onChange={setLocale} />
          </Column>
        </Column>
      </Card>

      <Card padded={false}>
        <ListRow
          title={t.settings.offlineData}
          subtitle={
            lastSyncedAt ? `${t.sync.lastSynced}: ${relativeTime(lastSyncedAt)}` : t.sync.online
          }
          meta={pending > 0 ? String(pending) : undefined}
          metaTone="warning"
          leading={<Ionicons name="cloud-outline" size={20} color={colors.contentSecondary} />}
        />
        <ListRow
          title={t.settings.clearCache}
          leading={<Ionicons name="trash-outline" size={20} color={colors.contentSecondary} />}
          onPress={confirmClearCache}
        />
        <ListRow
          title={t.settings.version}
          meta={APP_VERSION}
          leading={
            <Ionicons name="information-circle-outline" size={20} color={colors.contentSecondary} />
          }
          last
        />
      </Card>

      <Button
        label={t.auth.signOut}
        variant="danger"
        fullWidth
        onPress={confirmSignOut}
        icon={<Ionicons name="log-out-outline" size={18} color="#ffffff" />}
      />
    </Screen>
  );
}
