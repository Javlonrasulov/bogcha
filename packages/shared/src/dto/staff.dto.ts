import { z } from 'zod';
import { EmploymentStatus, PayrollStatus, StaffPosition } from '../domain/enums';
import {
  dateOnlySchema,
  moneySchema,
  paginationSchema,
  percentSchema,
  phoneSchema,
  uuidSchema,
} from './common.dto';
import { periodSchema } from './finance.dto';

export const createStaffSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  middleName: z.string().trim().max(60).optional(),
  position: z.nativeEnum(StaffPosition),
  branchId: uuidSchema,
  phone: phoneSchema,
  birthDate: dateOnlySchema.optional(),
  hiredAt: dateOnlySchema,
  baseSalary: moneySchema,
  /** Har oyda takrorlanadigan bonus. */
  monthlyBonus: moneySchema.default(0),
  status: z.nativeEnum(EmploymentStatus).default(EmploymentStatus.ACTIVE),
  /** Ilovaga kirish uchun foydalanuvchi yaratilsinmi. */
  createLogin: z.boolean().default(false),
  groupIds: z.array(uuidSchema).default([]),
  passportNumber: z.string().trim().max(20).optional(),
  address: z.string().trim().max(250).optional(),
  note: z.string().trim().max(500).optional(),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export const updateStaffSchema = createStaffSchema.partial().omit({ createLogin: true });
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;

export const staffQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  position: z.nativeEnum(StaffPosition).optional(),
  status: z.nativeEnum(EmploymentStatus).optional(),
});
export type StaffQuery = z.infer<typeof staffQuerySchema>;

export const payrollComponentSchema = z.object({
  label: z.string().trim().min(2).max(80),
  amount: moneySchema,
});

export const generatePayrollSchema = z.object({
  branchId: uuidSchema.optional(),
  period: periodSchema,
  /** Xodim davomatiga qarab maoshni proporsional hisoblash (TZ §24, §25). */
  prorateByAttendance: z.boolean().default(false),
  taxPercent: percentSchema.default(0),
});
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;

export const updatePayrollItemSchema = z.object({
  bonuses: z.array(payrollComponentSchema).default([]),
  allowances: z.array(payrollComponentSchema).default([]),
  deductions: z.array(payrollComponentSchema).default([]),
  note: z.string().trim().max(300).optional(),
});
export type UpdatePayrollItemInput = z.infer<typeof updatePayrollItemSchema>;

export const payrollQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  period: periodSchema.optional(),
  status: z.nativeEnum(PayrollStatus).optional(),
});
export type PayrollQuery = z.infer<typeof payrollQuerySchema>;

export interface StaffAttendanceSummary {
  staffId: string;
  fullName: string;
  position: StaffPosition;
  workedDays: number;
  expectedDays: number;
  totalHours: number;
  lateCount: number;
  totalLateMinutes: number;
  attendanceRate: number;
}
