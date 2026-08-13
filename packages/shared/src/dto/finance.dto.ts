import { z } from 'zod';
import {
  ExpenseCategoryKind,
  IncomeCategoryKind,
  InvoiceStatus,
  PaymentMethod,
} from '../domain/enums';
import {
  dateOnlySchema,
  moneySchema,
  paginationSchema,
  percentSchema,
  uuidSchema,
} from './common.dto';

/** Davr `YYYY-MM` shaklida — oylik to'lov va hisobotlar shu kalitga bog'lanadi. */
export const periodSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Davr YYYY-MM shaklida bo'lishi kerak");

export const createExpenseSchema = z.object({
  branchId: uuidSchema,
  categoryId: uuidSchema,
  amount: moneySchema.refine((value) => value > 0, { message: "Summa 0 dan katta bo'lishi kerak" }),
  date: dateOnlySchema,
  description: z.string().trim().max(500).optional(),
  supplierId: uuidSchema.optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  attachmentUrl: z.string().url().max(500).optional(),
});
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export const updateExpenseSchema = createExpenseSchema.partial();
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const createIncomeSchema = z.object({
  branchId: uuidSchema,
  categoryId: uuidSchema,
  amount: moneySchema.refine((value) => value > 0, { message: "Summa 0 dan katta bo'lishi kerak" }),
  date: dateOnlySchema,
  description: z.string().trim().max(500).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
});
export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;

export const financeQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  categoryId: uuidSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
});
export type FinanceQuery = z.infer<typeof financeQuerySchema>;

export const createExpenseCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.nativeEnum(ExpenseCategoryKind),
  /** Oylik budjet — reja vs fakt taqqoslash uchun (TZ §21). */
  monthlyBudget: moneySchema.optional(),
  isActive: z.boolean().default(true),
});
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;

export const createIncomeCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.nativeEnum(IncomeCategoryKind),
  isActive: z.boolean().default(true),
});
export type CreateIncomeCategoryInput = z.infer<typeof createIncomeCategorySchema>;

/** Bolaning oylik hisob-fakturasi. */
export const generateInvoicesSchema = z.object({
  branchId: uuidSchema.optional(),
  period: periodSchema,
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  /** Davomatga qarab hisoblash: kelmagan kunlar chegirmasi. */
  prorateByAttendance: z.boolean().default(false),
});
export type GenerateInvoicesInput = z.infer<typeof generateInvoicesSchema>;

export const recordPaymentSchema = z.object({
  childId: uuidSchema,
  amount: moneySchema.refine((value) => value > 0, { message: "Summa 0 dan katta bo'lishi kerak" }),
  date: dateOnlySchema,
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  /** Aniq hisob-faktura ko'rsatilmasa — eng qadimgi qarzdan boshlab yopiladi. */
  invoiceId: uuidSchema.optional(),
  note: z.string().trim().max(300).optional(),
  receiptNumber: z.string().trim().max(60).optional(),
  idempotencyKey: z.string().trim().min(8).max(120).optional(),
});
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;

export const paymentQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  childId: uuidSchema.optional(),
  groupId: uuidSchema.optional(),
  period: periodSchema.optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
});
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;

export const debtQuerySchema = paginationSchema.extend({
  branchId: uuidSchema.optional(),
  groupId: uuidSchema.optional(),
  /** Kechikish kunlari bo'yicha filtr. */
  minDaysOverdue: z.coerce.number().int().min(0).max(365).optional(),
  minAmount: moneySchema.optional(),
});
export type DebtQuery = z.infer<typeof debtQuerySchema>;

export const setBudgetSchema = z.object({
  branchId: uuidSchema,
  period: periodSchema,
  lines: z
    .array(
      z.object({
        categoryId: uuidSchema,
        plannedAmount: moneySchema,
      }),
    )
    .min(1),
  plannedRevenue: moneySchema.optional(),
  plannedChildren: z.coerce.number().int().min(0).max(10_000).optional(),
});
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;

export const applyDiscountSchema = z.object({
  childId: uuidSchema,
  discountPercent: percentSchema.default(0),
  discountAmount: moneySchema.default(0),
  reason: z.string().trim().min(3).max(200),
  validFrom: dateOnlySchema,
  validTo: dateOnlySchema.optional(),
});
export type ApplyDiscountInput = z.infer<typeof applyDiscountSchema>;

export interface FinancialSummary {
  period: string;
  revenue: number;
  expense: number;
  netProfit: number;
  profitMargin: number;
  expenseByCategory: { categoryId: string; categoryName: string; kind: string; amount: number; share: number }[];
  revenueByCategory: { categoryId: string; categoryName: string; amount: number; share: number }[];
  previousPeriod: { revenue: number; expense: number; netProfit: number } | null;
  revenueGrowth: number;
  expenseGrowth: number;
  profitGrowth: number;
}

export interface DebtorRow {
  childId: string;
  childFullName: string;
  groupName: string | null;
  branchName: string;
  guardianPhone: string | null;
  totalDue: number;
  totalPaid: number;
  outstanding: number;
  oldestDueDate: string | null;
  daysOverdue: number;
}
