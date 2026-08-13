import { z } from 'zod';
import { ChildStatus, Gender } from '../domain/enums';
import {
  dateOnlySchema,
  moneySchema,
  paginationSchema,
  percentSchema,
  phoneSchema,
  uuidSchema,
} from './common.dto';

export const guardianSchema = z.object({
  fullName: z.string().trim().min(3).max(150),
  relation: z.string().trim().min(2).max(50),
  phone: phoneSchema,
  secondaryPhone: phoneSchema.optional(),
  /** Asosiy aloqa qiluvchi ota-ona. */
  isPrimary: z.boolean().default(false),
  workplace: z.string().trim().max(150).optional(),
});
export type GuardianInput = z.infer<typeof guardianSchema>;

export const createChildSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  middleName: z.string().trim().max(60).optional(),
  birthDate: dateOnlySchema,
  gender: z.nativeEnum(Gender),
  branchId: uuidSchema,
  groupId: uuidSchema.optional(),
  enrolledAt: dateOnlySchema,
  status: z.nativeEnum(ChildStatus).default(ChildStatus.ACTIVE),
  /** Oylik to'lov summasi (chegirmadan oldin). */
  monthlyFee: moneySchema,
  discountPercent: percentSchema.default(0),
  discountAmount: moneySchema.default(0),
  discountReason: z.string().trim().max(200).optional(),
  guardians: z.array(guardianSchema).min(1, "Kamida bitta ota-ona ma'lumoti kerak"),
  address: z.string().trim().max(250).optional(),
  medicalNotes: z.string().trim().max(1000).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type CreateChildInput = z.infer<typeof createChildSchema>;

export const updateChildSchema = createChildSchema.partial();
export type UpdateChildInput = z.infer<typeof updateChildSchema>;

export const childQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  groupId: uuidSchema.optional(),
  status: z.nativeEnum(ChildStatus).optional(),
  gender: z.nativeEnum(Gender).optional(),
  /** Faqat qarzdor bolalar. */
  hasDebt: z.coerce.boolean().optional(),
});
export type ChildQuery = z.infer<typeof childQuerySchema>;

export const createGroupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  branchId: uuidSchema,
  /** Yosh kategoriyasi, masalan "3-4 yosh". */
  ageFrom: z.coerce.number().int().min(0).max(10),
  ageTo: z.coerce.number().int().min(0).max(10),
  capacity: z.coerce.number().int().min(1).max(100),
  teacherIds: z.array(uuidSchema).default([]),
  colorToken: z.string().trim().max(30).optional(),
  isActive: z.boolean().default(true),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = createGroupSchema.partial();
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

/** Guruh kartochkasi: 25 / 30 bola (TZ §7). */
export interface GroupSummary {
  id: string;
  name: string;
  branchId: string;
  branchName: string;
  ageFrom: number;
  ageTo: number;
  capacity: number;
  childrenCount: number;
  activeChildrenCount: number;
  occupancyPercent: number;
  teachers: { id: string; fullName: string }[];
  todayPresent: number;
  todayAbsent: number;
  attendanceRate30d: number;
}
