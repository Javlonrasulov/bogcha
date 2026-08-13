import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ComponentProps } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../api/auth-context';
import { useI18n } from '../i18n/provider';
import { useTheme } from '../theme/provider';
import { brandGradient, spacing } from '../theme/tokens';
import { Field } from '../ui/components';
import { LocaleSwitcher } from '../ui/locale-switcher';
import { AppText, Button, Card, Column, IconButton, Row } from '../ui/primitives';

/**
 * Kirish ekrani — Lider Manager uslubi (monogram, gradient CTA, soft inputs).
 * Til/tema: yuqori o‘ngda (desktop manager kabi), forma markazda.
 */
export function LoginScreen({
  icon: _icon = 'school',
  version,
  allowDemo = true,
}: {
  icon?: ComponentProps<typeof Ionicons>['name'];
  version?: string;
  /** Demo rejim tugmasi — admin APK da o‘chiriladi. */
  allowDemo?: boolean;
}) {
  const { signIn, signInDemo } = useAuth();
  const { t } = useI18n();
  const { colors, elevation, scheme, setMode, mode } = useTheme();
  const insets = useSafeAreaInsets();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn(identifier, password);
    if (!result.ok) setError(result.error);
    setBusy(false);
  };

  const enterDemo = async () => {
    if (!allowDemo || demoBusy || busy) return;
    setDemoBusy(true);
    setError(null);
    await signInDemo();
    setDemoBusy(false);
  };

  const toggleTheme = () => {
    setMode(scheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: insets.top + spacing.sm,
          right: Math.max(spacing.lg, insets.right + spacing.sm),
          zIndex: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
        }}
      >
        <IconButton
          accessibilityLabel={t.settings.theme}
          onPress={toggleTheme}
          size={36}
        >
          <AppText variant="label">{scheme === 'dark' ? '☀' : '☾'}</AppText>
        </IconButton>
        <LocaleSwitcher />
      </View>

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: Math.max(spacing.xl, insets.left + spacing.lg),
          paddingTop: insets.top + 56,
          paddingBottom: insets.bottom + spacing['2xl'],
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center', gap: spacing.xl }}>
          <Column gap={spacing.md} style={{ alignItems: 'center' }}>
            <View style={[{ borderRadius: 22, overflow: 'hidden' }, elevation.brand]}>
              <LinearGradient
                colors={[...brandGradient, '#9B59B6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText
                  weight="900"
                  style={{
                    color: '#FFFFFF',
                    fontSize: 32,
                  }}
                >
                  B
                </AppText>
              </LinearGradient>
            </View>
            <AppText variant="display" align="center">
              {t.common.appName}
            </AppText>
            <AppText variant="label" tone="muted" align="center">
              {t.auth.subtitle}
            </AppText>
          </Column>

          <Column gap={spacing.lg}>
            <Field
              label={t.auth.identifier}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="+998 90 123 45 67"
              returnKeyType="next"
            />

            <Field
              label={t.auth.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              autoCapitalize="none"
              placeholder="••••••••"
              returnKeyType="go"
              onSubmitEditing={submit}
              error={error ?? undefined}
              trailing={
                <IconButton
                  accessibilityLabel={t.auth.password}
                  onPress={() => setSecure((value) => !value)}
                >
                  <Ionicons
                    name={secure ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.contentMuted}
                  />
                </IconButton>
              }
            />

            <Button
              label={busy ? t.auth.signingIn : t.auth.signIn}
              onPress={submit}
              loading={busy}
              disabled={identifier.trim().length < 3 || password.length < 8}
              size="lg"
              fullWidth
            />
          </Column>

          {allowDemo ? (
            <Card surface="muted" style={{ gap: spacing.md }}>
              <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                <Ionicons name="color-palette-outline" size={20} color={colors.brand} />
                <Column gap={spacing.xs} style={{ flex: 1 }}>
                  <AppText variant="label">{t.auth.demoMode}</AppText>
                  <AppText variant="caption" tone="muted">
                    {t.auth.demoHint}
                  </AppText>
                </Column>
              </Row>
              <Button
                label={demoBusy ? t.auth.signingIn : t.auth.demoEnter}
                onPress={enterDemo}
                loading={demoBusy}
                variant="secondary"
                size="lg"
                fullWidth
              />
            </Card>
          ) : null}

          {version ? (
            <Row justify="center">
              <AppText variant="caption" tone="muted">
                {t.settings.version} {version} · {mode}
              </AppText>
            </Row>
          ) : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
