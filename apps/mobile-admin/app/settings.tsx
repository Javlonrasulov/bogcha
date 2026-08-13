import {
  AppText,
  Badge,
  Button,
  Card,
  Column,
  KeyValue,
  LocaleSwitcher,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  clearCache,
  spacing,
  useAuth,
  useI18n,
  useSync,
  useTheme,
  type ThemeMode,
} from '@bogcha/mobile-core';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { APP_VERSION } from '../src/config';

/** Sozlamalar: tema, til, offline ma'lumot va akkaunt (TZ §36, §37). */
export default function SettingsScreen() {
  const { t } = useI18n();
  const { mode, setMode, colors } = useTheme();
  const { user, signOut } = useAuth();
  const { pending, online } = useSync();
  const [cleared, setCleared] = useState(false);

  const confirmSignOut = () => {
    Alert.alert(t.auth.signOut, t.auth.signOutConfirm, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.auth.signOut, style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  const handleClearCache = async () => {
    await clearCache();
    setCleared(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvas }}>
      <Screen>
        <SectionHeader title={t.settings.theme} />
        <Card>
          <Segmented
            options={[
              { value: 'system' as ThemeMode, label: t.settings.themeSystem },
              { value: 'light' as ThemeMode, label: t.settings.themeLight },
              { value: 'dark' as ThemeMode, label: t.settings.themeDark },
            ]}
            value={mode}
            onChange={setMode}
          />
        </Card>

        <SectionHeader title={t.settings.language} />
        <Card>
          <Row justify="flex-start">
            <LocaleSwitcher />
          </Row>
        </Card>

        <SectionHeader title={t.settings.offlineData} />
        <Card>
          <Column gap={spacing.md}>
            <Row justify="space-between" align="center">
              <AppText variant="label">{online ? t.sync.online : t.sync.offline}</AppText>
              <Badge
                tone={online ? 'success' : 'warning'}
                dot
                label={online ? t.sync.online : t.sync.offline}
              />
            </Row>
            <KeyValue
              label={t.sync.pending}
              value={String(pending)}
              tone={pending > 0 ? 'warning' : 'success'}
            />
            <Button
              label={cleared ? t.common.saved : t.settings.clearCache}
              variant="secondary"
              onPress={() => void handleClearCache()}
              disabled={cleared}
            />
          </Column>
        </Card>

        <SectionHeader title={t.settings.account} />
        <Card>
          <Column gap={spacing.md}>
            <KeyValue label={t.common.appName} value={user?.fullName ?? '—'} />
            <KeyValue label={t.common.phone} value={user?.phone ?? '—'} />
            <KeyValue label={t.settings.version} value={APP_VERSION} />
            <Button label={t.auth.signOut} variant="danger" onPress={confirmSignOut} />
          </Column>
        </Card>
      </Screen>
    </View>
  );
}
