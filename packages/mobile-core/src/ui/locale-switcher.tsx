import { Ionicons } from '@expo/vector-icons';
import { Locale } from '@bogcha/shared';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LOCALE_OPTIONS } from '../i18n/dictionary';
import { useI18n } from '../i18n/provider';
import { useTheme } from '../theme/provider';
import { radius, spacing } from '../theme/tokens';
import { AppText, Row } from './primitives';

/**
 * Til almashtirgich — desktop Lider Manager uslubi:
 * Globe + qisqa kod (UZ / ЎЗ / RU) + pastga ochiladigan ro‘yxat.
 */
export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();
  const { colors, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = LOCALE_OPTIONS.find((option) => option.value === locale);

  const select = (value: Locale) => {
    setLocale(value);
    setOpen(false);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t.settings.language}
        style={({ pressed }) => ({
          height: 36,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.line,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="globe-outline" size={16} color={colors.contentSecondary} />
        <AppText variant="caption" tone="secondary">
          {current?.shortLabel ?? locale}
        </AppText>
        <Ionicons name="chevron-down" size={14} color={colors.contentMuted} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={{ flex: 1, backgroundColor: colors.overlay }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View
            style={{
              position: 'absolute',
              top: insets.top + spacing.lg,
              right: Math.max(spacing.lg, insets.right + spacing.sm),
              minWidth: 200,
              borderRadius: radius.lg,
              backgroundColor: colors.surfaceRaised,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.line,
              overflow: 'hidden',
              ...elevation.md,
            }}
          >
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: colors.line,
              }}
            >
              <AppText variant="caption" tone="muted">
                {t.settings.language.toUpperCase()}
              </AppText>
            </View>

            {LOCALE_OPTIONS.map((option) => {
              const active = option.value === locale;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => select(option.value)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: active }}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.md,
                    paddingVertical: spacing.md,
                    backgroundColor: active
                      ? colors.brandSoft
                      : pressed
                        ? colors.surfaceMuted
                        : 'transparent',
                  })}
                >
                  <Row justify="space-between" align="center">
                    <AppText
                      variant="body"
                      tone={active ? 'brand' : 'default'}
                      weight={active ? '600' : '500'}
                      style={{ flex: 1 }}
                    >
                      {option.label}
                    </AppText>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.brand} />
                    ) : null}
                  </Row>
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
