import type { Tone } from '../components/ui/badge';

/** Status → vizual rang xaritalari (TZ §34). */

export const CHILD_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'success',
  ON_VACATION: 'info',
  TEMPORARILY_ABSENT: 'warning',
  WITHDRAWN: 'neutral',
};

export const ATTENDANCE_STATUS_TONE: Record<string, Tone> = {
  PRESENT: 'success',
  ABSENT_EXCUSED: 'warning',
  ABSENT_UNEXCUSED: 'danger',
  ON_VACATION: 'info',
  SICK: 'accent',
};

export const INVOICE_STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  ISSUED: 'info',
  PARTIALLY_PAID: 'warning',
  PAID: 'success',
  OVERDUE: 'danger',
  CANCELLED: 'neutral',
};

export const PURCHASE_STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  PENDING_APPROVAL: 'warning',
  APPROVED: 'info',
  REJECTED: 'danger',
  ORDERED: 'accent',
  RECEIVED: 'success',
  CANCELLED: 'neutral',
};

export const PAYROLL_STATUS_TONE: Record<string, Tone> = {
  DRAFT: 'neutral',
  APPROVED: 'info',
  PAID: 'success',
};

export const EMPLOYMENT_STATUS_TONE: Record<string, Tone> = {
  ACTIVE: 'success',
  ON_LEAVE: 'info',
  SUSPENDED: 'warning',
  TERMINATED: 'neutral',
};

export const MOVEMENT_TYPE_TONE: Record<string, Tone> = {
  IN: 'success',
  OUT: 'danger',
  RETURN: 'info',
  ADJUSTMENT: 'warning',
  WRITE_OFF: 'danger',
};

export const SEVERITY_TONE: Record<string, Tone> = {
  INFO: 'info',
  WARNING: 'warning',
  CRITICAL: 'danger',
};

export const AUDIT_ACTION_TONE: Record<string, Tone> = {
  CREATE: 'success',
  UPDATE: 'info',
  DELETE: 'danger',
  LOGIN: 'neutral',
  LOGOUT: 'neutral',
  APPROVE: 'success',
  REJECT: 'danger',
  EXPORT: 'accent',
};
