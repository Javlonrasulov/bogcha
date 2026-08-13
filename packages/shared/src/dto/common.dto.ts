import { z } from 'zod';

export const uuidSchema = z.string().uuid();

/** Sana `YYYY-MM-DD` shaklida uzatiladi — vaqt zonasi muammosini oldini oladi. */
export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Sana YYYY-MM-DD shaklida bo'lishi kerak");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  search: z.string().trim().max(200).optional(),
  sortBy: z.string().trim().max(60).optional(),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});
export type PaginationQuery = z.infer<typeof paginationSchema>;

export const dateRangeSchema = z
  .object({
    from: dateOnlySchema,
    to: dateOnlySchema,
  })
  .refine((value) => value.from <= value.to, {
    message: "Boshlanish sanasi tugash sanasidan keyin bo'lishi mumkin emas",
    path: ['from'],
  });
export type DateRange = z.infer<typeof dateRangeSchema>;

export const branchScopeSchema = z.object({
  /** Berilmasa — foydalanuvchining barcha ruxsat etilgan filiallari. */
  branchId: uuidSchema.optional(),
});

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?998\d{9}$/, "Telefon +998XXXXXXXXX shaklida bo'lishi kerak");

export const moneySchema = z.coerce.number().min(0).max(1_000_000_000_000);
export const quantitySchema = z.coerce.number().min(0).max(10_000_000);
export const percentSchema = z.coerce.number().min(0).max(100);

export const exportFormatSchema = z.enum(['xlsx', 'csv', 'pdf']);
export type ExportFormat = z.infer<typeof exportFormatSchema>;
