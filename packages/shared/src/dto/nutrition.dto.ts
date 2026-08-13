import { z } from 'zod';
import { MealType, Weekday } from '../domain/enums';
import { Unit } from '../domain/units';
import {
  dateOnlySchema,
  paginationSchema,
  percentSchema,
  quantitySchema,
  uuidSchema,
} from './common.dto';

export const recipeItemSchema = z.object({
  productId: uuidSchema,
  /** Bazaviy bolalar soni uchun miqdor. */
  quantity: quantitySchema.refine((value) => value > 0, {
    message: "Miqdor 0 dan katta bo'lishi kerak",
  }),
  unit: z.nativeEnum(Unit),
});
export type RecipeItemInput = z.infer<typeof recipeItemSchema>;

export const createRecipeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  mealType: z.nativeEnum(MealType),
  /** Retsept necha bola uchun yozilgan (masalan 100). */
  baseHeadcount: z.coerce.number().int().min(1).max(10_000).default(100),
  items: z.array(recipeItemSchema).min(1, 'Kamida bitta mahsulot kerak'),
  /** Texnologik yo'qotish ustamasi. */
  wastePercent: percentSchema.default(0),
  caloriesPerPortion: z.coerce.number().min(0).max(5000).optional(),
  instructions: z.string().trim().max(2000).optional(),
  isActive: z.boolean().default(true),
});
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export const updateRecipeSchema = createRecipeSchema.partial();
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;

export const menuSlotSchema = z.object({
  weekday: z.nativeEnum(Weekday),
  mealType: z.nativeEnum(MealType),
  recipeIds: z.array(uuidSchema).min(1),
});
export type MenuSlotInput = z.infer<typeof menuSlotSchema>;

export const upsertMenuSchema = z.object({
  branchId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  /** Haftalik menyu shu sanadan boshlab kuchga kiradi. */
  validFrom: dateOnlySchema,
  validTo: dateOnlySchema.optional(),
  slots: z.array(menuSlotSchema).min(1),
  isActive: z.boolean().default(true),
});
export type UpsertMenuInput = z.infer<typeof upsertMenuSchema>;

/**
 * Kunlik oziqlanish hisobini yopish: davomat asosida haqiqiy sarf hisoblanadi,
 * ombordan chiqim qilinadi va xarajat yoziladi (TZ §13, §47).
 */
export const closeNutritionDaySchema = z.object({
  branchId: uuidSchema,
  date: dateOnlySchema,
  /** Kelgan bolalar sonini qo'lda o'zgartirish (sabab talab qilinadi). */
  headcountOverride: z.coerce.number().int().min(0).max(10_000).optional(),
  overrideReason: z.string().trim().max(300).optional(),
  /** Alohida mahsulot bo'yicha haqiqiy sarfni qo'lda tuzatish. */
  lineOverrides: z
    .array(
      z.object({
        productId: uuidSchema,
        actualQuantity: quantitySchema,
        reason: z.string().trim().min(3).max(300),
      }),
    )
    .default([]),
});
export type CloseNutritionDayInput = z.infer<typeof closeNutritionDaySchema>;

export const nutritionQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});
export type NutritionQuery = z.infer<typeof nutritionQuerySchema>;

export const normConfigSchema = z.object({
  branchId: uuidSchema.optional(),
  baseHeadcount: z.coerce.number().int().min(1).max(10_000),
  wastePercent: percentSchema,
  roundingStep: quantitySchema,
  roundingMode: z.enum(['NONE', 'UP', 'NEAREST']),
  /** Xodimlar ovqati uchun ustama (0.05 = 5%). */
  staffMealFactor: z.coerce.number().min(0).max(1),
});
export type NormConfigInput = z.infer<typeof normConfigSchema>;

export interface NutritionDayReport {
  date: string;
  branchId: string;
  branchName: string;
  plannedHeadcount: number;
  actualHeadcount: number;
  isClosed: boolean;
  closedAt: string | null;
  totalPlannedCost: number;
  totalActualCost: number;
  totalSavedCost: number;
  savingsPercent: number;
  costPerChild: number;
  lines: {
    productId: string;
    productName: string;
    unit: Unit;
    plannedQuantity: number;
    actualQuantity: number;
    savedQuantity: number;
    plannedCost: number;
    actualCost: number;
    wasOverridden: boolean;
  }[];
}
