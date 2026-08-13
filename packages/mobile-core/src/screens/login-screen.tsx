import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState, type ComponentProps } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../api/auth-context';
import { useI18n } from '../i18n/provider';
import { useTheme } from '../theme/provider';
import { brandGradient, spacing } from '../theme/tokens';
import { Field } from '../ui/components';
import { LocaleSwitcher } from '../ui/locale-switcher';
import { AppText, Button, Column, IconButton, Row } from '../ui/primitives';

/**
 * Kirish ekrani — Lider Manager uslubi (monogram, gradient CTA, soft inputs).
 * Klaviatura ochilganda forma yuqoriga suriladi — inputlar yopilib qolmaydi.
 */
export function LoginScreen({
  icon: _icon = 'school',
  version,
}: {
  icon?: ComponentProps<typeof Ionicons>['name'];
  version?: string;
}) {
  const { signIn } = useAuth();
  const { t } = useI18n();
  const { colors, elevation, scheme, setMode, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const scrollFormIntoView = () => {
    // Klaviatura animatsiyasidan keyin forma pastki qismini ko'rsatish.
    requestAnimationFrame(() => {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, Platform.OS === 'ios' ? 50 : 120);
    });
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn(identifier, password);
    if (!result.ok) setError(result.error);
    setBusy(false);
  };

  const toggleTheme = () => {
    setMode(scheme === 'dark' ? 'light' : 'dark');
  };

  const keyboardOpen = keyboardHeight > 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.canvas }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
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
        ref={scrollRef}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: keyboardOpen ? 'flex-start' : 'center',
          paddingHorizontal: Math.max(spacing.xl, insets.left + spacing.lg),
          paddingTop: insets.top + (keyboardOpen ? 48 : 56),
          paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing['2xl'] + (keyboardOpen ? 24 : 0),
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ width: '100%', maxWidth: 400, alignSelf: 'center', gap: spacing.xl }}>
          {!keyboardOpen ? (
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
          ) : (
            <AppText variant="heading" align="center">
              {t.common.appName}
            </AppText>
          )}

          <Column gap={spacing.lg}>
            <Field
              label={t.auth.identifier}
              value={identifier}
              onChangeText={setIdentifier}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="phone-pad"
              textContentType="telephoneNumber"
              placeholder="+998 90 123 45 67"
              returnKeyType="next"
              blurOnSubmit={false}
              onFocus={scrollFormIntoView}
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <Field
              ref={passwordRef}
              label={t.auth.password}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secure}
              autoCapitalize="none"
              textContentType="password"
              placeholder="••••••••"
              returnKeyType="go"
              onFocus={scrollFormIntoView}
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

          {version && !keyboardOpen ? (
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
