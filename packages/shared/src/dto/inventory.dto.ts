import { z } from 'zod';
import { PurchaseRequestStatus, StockMovementType } from '../domain/enums';
import { Unit } from '../domain/units';
import {
  dateOnlySchema,
  moneySchema,
  paginationSchema,
  phoneSchema,
  quantitySchema,
  uuidSchema,
} from './common.dto';

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  categoryId: uuidSchema.optional(),
  unit: z.nativeEnum(Unit),
  /** Joriy tannarx; kirimlarda o'rtacha tortilgan qiymat bilan yangilanadi. */
  unitCost: moneySchema,
  minQuantity: quantitySchema.default(0),
  maxQuantity: quantitySchema.optional(),
  /** Yetkazib beruvchining minimal partiyasi. */
  packageSize: quantitySchema.optional(),
  /** Buzilib qolishi mumkin bo'lgan mahsulot uchun saqlash muddati (kun). */
  shelfLifeDays: z.coerce.number().int().min(0).max(3650).optional(),
  defaultSupplierId: uuidSchema.optional(),
  barcode: z.string().trim().max(60).optional(),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const productQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  /** Faqat minimal qoldiqdan kam mahsulotlar. */
  lowStockOnly: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

export const stockMovementSchema = z.object({
  branchId: uuidSchema,
  productId: uuidSchema,
  type: z.nativeEnum(StockMovementType),
  quantity: quantitySchema.refine((value) => value > 0, { message: "Miqdor 0 dan katta bo'lishi kerak" }),
  unitCost: moneySchema.optional(),
  date: dateOnlySchema,
  supplierId: uuidSchema.optional(),
  /** Qo'lda kiritilgan tuzatish uchun sabab majburiy — audit logga tushadi (TZ §13, §29). */
  reason: z.string().trim().max(300).optional(),
  documentNumber: z.string().trim().max(60).optional(),
  attachmentUrl: z.string().url().max(500).optional(),
});
export type StockMovementInput = z.infer<typeof stockMovementSchema>;

export const stockAdjustmentSchema = stockMovementSchema
  .extend({
    type: z.literal(StockMovementType.ADJUSTMENT),
    /** Inventarizatsiyadan keyingi haqiqiy qoldiq. */
    countedQuantity: quantitySchema,
    reason: z.string().trim().min(5).max(300),
  })
  .omit({ quantity: true });
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;

export const stockTransferSchema = z.object({
  fromBranchId: uuidSchema,
  toBranchId: uuidSchema,
  productId: uuidSchema,
  quantity: quantitySchema.refine((value) => value > 0, { message: "Miqdor 0 dan katta bo'lishi kerak" }),
  date: dateOnlySchema,
  reason: z.string().trim().max(300).optional(),
});
export type StockTransferInput = z.infer<typeof stockTransferSchema>;

export const createSupplierSchema = z.object({
  name: z.string().trim().min(2).max(150),
  phone: phoneSchema,
  contactPerson: z.string().trim().max(120).optional(),
  address: z.string().trim().max(250).optional(),
  inn: z.string().trim().max(20).optional(),
  bankAccount: z.string().trim().max(40).optional(),
  note: z.string().trim().max(500).optional(),
  isActive: z.boolean().default(true),
});
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export const updateSupplierSchema = createSupplierSchema.partial();
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const purchaseItemSchema = z.object({
  productId: uuidSchema,
  quantity: quantitySchema.refine((value) => value > 0, { message: "Miqdor 0 dan katta bo'lishi kerak" }),
  unitPrice: moneySchema,
  note: z.string().trim().max(200).optional(),
});
export type PurchaseItemInput = z.infer<typeof purchaseItemSchema>;

export const createPurchaseRequestSchema = z.object({
  branchId: uuidSchema,
  neededBy: dateOnlySchema,
  items: z.array(purchaseItemSchema).min(1),
  supplierId: uuidSchema.optional(),
  note: z.string().trim().max(500).optional(),
  /** Avtomatik xarid ro'yxatidan yaratilganini belgilaydi. */
  generatedFromPlan: z.boolean().default(false),
});
export type CreatePurchaseRequestInput = z.infer<typeof createPurchaseRequestSchema>;

export const approvePurchaseSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().trim().max(500).optional(),
});
export type ApprovePurchaseInput = z.infer<typeof approvePurchaseSchema>;

export const receivePurchaseSchema = z.object({
  date: dateOnlySchema,
  supplierId: uuidSchema,
  documentNumber: z.string().trim().max(60).optional(),
  receiptImageUrl: z.string().url().max(500).optional(),
  items: z
    .array(
      purchaseItemSchema.extend({
        /** Haqiqatda qabul qilingan miqdor so'rovdan farq qilishi mumkin. */
        receivedQuantity: quantitySchema,
      }),
    )
    .min(1),
  /** to'langan deb belgilash (yetkazib beruvchi qarzi yopiladi); oziq-ovqat xarajati faqat kun yopilganda (COGS) yoziladi */
  markAsPaid: z.boolean().default(true),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});
export type ReceivePurchaseInput = z.infer<typeof receivePurchaseSchema>;

export const purchaseQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  status: z.nativeEnum(PurchaseRequestStatus).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
});
export type PurchaseQuery = z.infer<typeof purchaseQuerySchema>;

export const procurementPlanQuerySchema = z.object({
  branchId: uuidSchema,
  /** Necha kun oldinga rejalashtirish (TZ §15). */
  days: z.coerce.number().int().min(1).max(60).default(7),
  includeSafetyStock: z.coerce.boolean().default(true),
});
export type ProcurementPlanQuery = z.infer<typeof procurementPlanQuerySchema>;

export interface StockSnapshot {
  productId: string;
  productName: string;
  categoryName: string | null;
  unit: Unit;
  quantity: number;
  unitCost: number;
  totalValue: number;
  minQuantity: number;
  maxQuantity: number | null;
  averageDailyUsage: number;
  daysRemaining: number | null;
  isLow: boolean;
}
