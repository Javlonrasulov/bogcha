import { Ionicons } from '@expo/vector-icons';
import {
  ATTENDANCE_STATUS_META,
  ATTENDANCE_STATUS_ORDER,
  AppText,
  Avatar,
  Button,
  Column,
  Divider,
  Field,
  Row,
  nowClock,
  radius,
  spacing,
  toneColors,
  typography,
  useI18n,
  useTheme,
} from '@bogcha/mobile-core';
import { AttendanceStatus } from '@bogcha/shared';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { DraftEntry } from '../hooks/use-attendance-draft';

export interface StatusSheetTarget {
  childId: string;
  fullName: string;
  entry: DraftEntry | undefined;
}

/**
 * Bola holatini batafsil belgilash: status, kelish/ketish vaqti va izoh.
 * Asosiy ro'yxatda bir tegish bilan belgilash mumkin — bu oyna faqat
 * qo'shimcha ma'lumot kerak bo'lganda ochiladi (TZ §34).
 */
export function StatusSheet({
  target,
  onClose,
  onSave,
}: {
  target: StatusSheetTarget | null;
  onClose: () => void;
  onSave: (childId: string, entry: DraftEntry) => void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const [status, setStatus] = useState<AttendanceStatus>(AttendanceStatus.PRESENT);
  const [arrivedAt, setArrivedAt] = useState('');
  const [leftAt, setLeftAt] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!target) return;
    setStatus(target.entry?.status ?? AttendanceStatus.PRESENT);
    setArrivedAt(target.entry?.arrivedAt ?? '');
    setLeftAt(target.entry?.leftAt ?? '');
    setNote(target.entry?.note ?? '');
  }, [target]);

  if (!target) return null;

  const isPresent = status === AttendanceStatus.PRESENT;
  const timeValid = (value: string) => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  const canSave = timeValid(arrivedAt) && timeValid(leftAt);

  const save = () => {
    onSave(target.childId, {
      status,
      arrivedAt: isPresent && arrivedAt ? arrivedAt : undefined,
      leftAt: isPresent && leftAt ? leftAt : undefined,
      note: note.trim() ? note.trim() : undefined,
    });
    onClose();
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: colors.overlay }} onPress={onClose} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius['2xl'],
          borderTopRightRadius: radius['2xl'],
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.lg,
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
          maxHeight: '88%',
        }}
      >
        <Row gap={spacing.md}>
          <Avatar name={target.fullName} size={44} />
          <Column gap={2} style={{ flex: 1 }}>
            <AppText variant="heading" numberOfLines={1}>
              {target.fullName}
            </AppText>
            <AppText variant="caption" tone="muted">
              {t.attendance.title}
            </AppText>
          </Column>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t.common.close}>
            <Ionicons name="close" size={22} color={colors.contentMuted} />
          </Pressable>
        </Row>

        <Divider />

        <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 420 }}>
          <Column gap={spacing.md}>
            <Column gap={spacing.sm}>
              {ATTENDANCE_STATUS_ORDER.map((value) => {
                const meta = ATTENDANCE_STATUS_META[value];
                const accent = toneColors(colors, meta.tone);
                const active = status === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setStatus(value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      backgroundColor: active ? accent.bg : colors.surfaceMuted,
                      borderWidth: active ? 1.5 : StyleSheet.hairlineWidth,
                      borderColor: active ? accent.fg : colors.line,
                    }}
                  >
                    <Ionicons name={meta.icon} size={20} color={accent.fg} />
                    <Text
                      style={[
                        typography.label,
                        { flex: 1, color: colors.content, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {t.attendance.statuses[value]}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark-circle" size={20} color={accent.fg} />
                    ) : null}
                  </Pressable>
                );
              })}
            </Column>

            {isPresent ? (
              <Row gap={spacing.md} align="flex-start">
                <View style={{ flex: 1 }}>
                  <Field
                    label={t.attendance.arrived}
                    value={arrivedAt}
                    onChangeText={setArrivedAt}
                    placeholder="08:30"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    error={timeValid(arrivedAt) ? undefined : 'HH:mm'}
                    trailing={
                      <Pressable
                        onPress={() => setArrivedAt(nowClock())}
                        hitSlop={8}
                        accessibilityLabel={t.attendance.setArrival}
                      >
                        <Ionicons name="time-outline" size={18} color={colors.brand} />
                      </Pressable>
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label={t.attendance.left}
                    value={leftAt}
                    onChangeText={setLeftAt}
                    placeholder="17:30"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                    error={timeValid(leftAt) ? undefined : 'HH:mm'}
                    trailing={
                      <Pressable
                        onPress={() => setLeftAt(nowClock())}
                        hitSlop={8}
                        accessibilityLabel={t.attendance.setDeparture}
                      >
                        <Ionicons name="time-outline" size={18} color={colors.brand} />
                      </Pressable>
                    }
                  />
                </View>
              </Row>
            ) : null}

            <Field
              label={t.common.note}
              value={note}
              onChangeText={setNote}
              placeholder={t.common.note}
              maxLength={300}
            />
          </Column>
        </ScrollView>

        <Button label={t.common.save} onPress={save} disabled={!canSave} size="lg" fullWidth />
      </View>
    </Modal>
  );
}
