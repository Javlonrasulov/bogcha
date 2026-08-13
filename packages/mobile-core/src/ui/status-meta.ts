import type { Ionicons } from '@expo/vector-icons';
import { AttendanceStatus, ChildStatus } from '@bogcha/shared';
import type { ComponentProps } from 'react';
import type { ToneName } from '../theme/tokens';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Davomat holatlari uchun rang va ikonka (TZ §34). */
export const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  { tone: ToneName; icon: IconName }
> = {
  [AttendanceStatus.PRESENT]: { tone: 'success', icon: 'checkmark-circle-outline' },
  [AttendanceStatus.ABSENT_EXCUSED]: { tone: 'warning', icon: 'document-text-outline' },
  [AttendanceStatus.ABSENT_UNEXCUSED]: { tone: 'danger', icon: 'close-circle-outline' },
  [AttendanceStatus.SICK]: { tone: 'info', icon: 'medkit-outline' },
  [AttendanceStatus.ON_VACATION]: { tone: 'accent', icon: 'sunny-outline' },
};

/** Tarbiyachi ekranida holatlar shu tartibda ko'rsatiladi. */
export const ATTENDANCE_STATUS_ORDER: readonly AttendanceStatus[] = [
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT_EXCUSED,
  AttendanceStatus.ABSENT_UNEXCUSED,
  AttendanceStatus.SICK,
  AttendanceStatus.ON_VACATION,
];

export const CHILD_STATUS_TONE: Record<ChildStatus, ToneName> = {
  [ChildStatus.ACTIVE]: 'success',
  [ChildStatus.ON_VACATION]: 'info',
  [ChildStatus.TEMPORARILY_ABSENT]: 'warning',
  [ChildStatus.WITHDRAWN]: 'danger',
};
