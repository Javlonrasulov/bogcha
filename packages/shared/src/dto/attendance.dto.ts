import { z } from 'zod';
import { AttendanceStatus, StaffAttendanceEvent } from '../domain/enums';
import { dateOnlySchema, uuidSchema } from './common.dto';

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Vaqt HH:mm shaklida bo'lishi kerak");

export const attendanceEntrySchema = z.object({
  childId: uuidSchema,
  status: z.nativeEnum(AttendanceStatus),
  arrivedAt: timeSchema.optional(),
  leftAt: timeSchema.optional(),
  note: z.string().trim().max(300).optional(),
});
export type AttendanceEntryInput = z.infer<typeof attendanceEntrySchema>;

/**
 * Davomat guruh bo'yicha bir marta yuboriladi (upsert). Tarbiyachi offline
 * bo'lganda `clientRecordedAt` va `idempotencyKey` bilan navbatga qo'yiladi (TZ §41).
 */
export const markAttendanceSchema = z.object({
  groupId: uuidSchema,
  date: dateOnlySchema,
  entries: z.array(attendanceEntrySchema).min(1),
  clientRecordedAt: z.string().datetime().optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});
export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const attendanceQuerySchema = z.object({
  date: dateOnlySchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  groupId: uuidSchema.optional(),
  branchId: uuidSchema.optional(),
  childId: uuidSchema.optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
});
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;

export interface AttendanceDaySummary {
  date: string;
  /** Ro'yxatdagi bolalar (chiqarilganlar hisobga olinmaydi). */
  total: number;
  /** Kelishi kutilgan bolalar: total − ta'tildagilar. Davomat foizi shu songa nisbatan. */
  expected: number;
  present: number;
  absent: number;
  excused: number;
  unexcused: number;
  onVacation: number;
  sick: number;
  attendanceRate: number;
}

export interface AttendanceTrendPoint {
  date: string;
  present: number;
  total: number;
  attendanceRate: number;
}

/** Tarbiyachi ilovasining asosiy ekrani uchun ma'lumot (TZ §32). */
export interface TeacherDailyBoard {
  date: string;
  group: { id: string; name: string; capacity: number };
  summary: AttendanceDaySummary;
  /** Davomat allaqachon yuborilganmi. */
  isSubmitted: boolean;
  submittedAt: string | null;
  children: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
    status: AttendanceStatus | null;
    arrivedAt: string | null;
    leftAt: string | null;
    note: string | null;
  }[];
}

export const staffCheckSchema = z.object({
  event: z.nativeEnum(StaffAttendanceEvent),
  /** Kelajakda geolokatsiya bilan tasdiqlash uchun (TZ §24). */
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  deviceId: z.string().trim().max(120).optional(),
  clientRecordedAt: z.string().datetime().optional(),
});
export type StaffCheckInput = z.infer<typeof staffCheckSchema>;
