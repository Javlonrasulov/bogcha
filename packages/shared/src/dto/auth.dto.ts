import { z } from 'zod';
import { Role } from '../domain/roles';
import { Permission } from '../domain/permissions';
import { Locale } from '../domain/enums';
import { phoneSchema, uuidSchema } from './common.dto';

export const loginSchema = z.object({
  /** Login sifatida email yoki telefon ishlatiladi. */
  identifier: z.string().trim().min(3).max(120),
  password: z.string().min(8).max(128),
  /** Mobil ilovalarda qurilmani ajratish uchun. */
  deviceId: z.string().trim().max(120).optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z
      .string()
      .min(8, "Parol kamida 8 belgidan iborat bo'lishi kerak")
      .max(128)
      .regex(/[a-z]/, 'Kamida bitta kichik harf kerak')
      .regex(/[A-Z]/, 'Kamida bitta bosh harf kerak')
      .regex(/\d/, 'Kamida bitta raqam kerak'),
  })
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Yangi parol eskisidan farq qilishi kerak",
    path: ['newPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createUserSchema = z.object({
  fullName: z.string().trim().min(3).max(150),
  email: z.string().trim().email().optional(),
  phone: phoneSchema,
  password: z.string().min(8).max(128),
  roles: z.array(z.nativeEnum(Role)).min(1),
  /** Foydalanuvchi ishlaydigan filiallar. Bo'sh — tashkilotning barcha filiallari. */
  branchIds: z.array(uuidSchema).default([]),
  /** Tarbiyachi uchun biriktirilgan guruhlar. */
  groupIds: z.array(uuidSchema).default([]),
  locale: z.nativeEnum(Locale).default(Locale.UZ_LATN),
  isActive: z.boolean().default(true),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = createUserSchema.partial().omit({ password: true });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

/** JWT access token ichidagi ma'lumot. */
export interface AuthTokenPayload {
  sub: string;
  tenantId: string | null;
  roles: Role[];
  /** Ruxsat etilgan filiallar; bo'sh massiv — tashkilotdagi hammasi. */
  branchIds: string[];
  groupIds: string[];
  tokenVersion: number;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  fullName: string;
  email: string | null;
  phone: string;
  roles: Role[];
  permissions: Permission[];
  branchIds: string[];
  groupIds: string[];
  locale: Locale;
  avatarUrl: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthenticatedUser;
}
