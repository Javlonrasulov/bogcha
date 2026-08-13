import { z } from 'zod';
import { Unit } from '../domain/units';
import { dateOnlySchema, quantitySchema, uuidSchema } from './common.dto';

export const createProductDailyNormSchema = z.object({
  branchId: uuidSchema,
  productId: uuidSchema,
  quantityPerChild: quantitySchema.refine((value) => value > 0, {
    message: "Me'yor 0 dan katta bo'lishi kerak",
  }),
  unit: z.nativeEnum(Unit),
  effectiveFrom: dateOnlySchema,
  note: z.string().trim().max(300).optional(),
});
export type CreateProductDailyNormInput = z.infer<typeof createProductDailyNormSchema>;

export const foodConsumptionRangeSchema = z.object({
  branchId: uuidSchema,
  from: dateOnlySchema,
  to: dateOnlySchema,
});
export type FoodConsumptionRangeQuery = z.infer<typeof foodConsumptionRangeSchema>;

export const upsertFoodActualSchema = z.object({
  branchId: uuidSchema,
  date: dateOnlySchema,
  lines: z
    .array(
      z.object({
        productId: uuidSchema,
        actualQuantity: quantitySchema,
      }),
    )
    .min(1),
});
export type UpsertFoodActualInput = z.infer<typeof upsertFoodActualSchema>;

export const upsertFoodStockCheckSchema = z.object({
  branchId: uuidSchema,
  checkDate: dateOnlySchema,
  lines: z
    .array(
      z.object({
        productId: uuidSchema,
        countedQuantity: quantitySchema,
        note: z.string().trim().max(300).optional(),
      }),
    )
    .min(1),
});
export type UpsertFoodStockCheckInput = z.infer<typeof upsertFoodStockCheckSchema>;

export interface FoodNormRow {
  id: string;
  productId: string;
  productName: string;
  quantityPerChild: number;
  unit: Unit;
  stockUnit: Unit;
  effectiveFrom: string;
  note: string | null;
}

export interface FoodDayProductCell {
  productId: string;
  plannedQuantity: number;
  actualQuantity: number | null;
  variance: number | null;
  unit: Unit;
}

export interface FoodDayRow {
  date: string;
  presentCount: number;
  products: FoodDayProductCell[];
}

export interface FoodProductColumn {
  productId: string;
  productName: string;
  unit: Unit;
  quantityPerChild: number;
  normUnit: Unit;
}

export interface FoodStockReconcileRow {
  productId: string;
  productName: string;
  unit: Unit;
  openingQuantity: number;
  inboundQuantity: number;
  normConsumption: number;
  actualConsumption: number;
  expectedByNorm: number;
  expectedByActual: number;
  currentStock: number;
  countedQuantity: number | null;
  varianceByNorm: number | null;
  varianceByActual: number | null;
}

export interface FoodConsumptionReport {
  from: string;
  to: string;
  branchId: string;
  products: FoodProductColumn[];
  days: FoodDayRow[];
  totals: {
    presentCount: number;
    plannedByProduct: Record<string, number>;
    actualByProduct: Record<string, number>;
    varianceByProduct: Record<string, number | null>;
  };
  kpis: {
    presentCount: number;
    normConsumptionFilledDays: number;
    actualFilledCells: number;
    actualTotalCells: number;
    stockShortageCount: number;
    stockSurplusCount: number;
    stockMatchedCount: number;
  };
  stock: FoodStockReconcileRow[];
  norms: FoodNormRow[];
}
