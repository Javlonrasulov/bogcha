import { NotificationKind, NotificationSeverity } from '../domain/enums';
import { growthPercent, percentage, roundMoney, safeDivide } from './money';

/**
 * G'ayritabiiy holatlarni aniqlash (TZ §22). Har bir qoida sof funksiya —
 * backend rejalashtiruvchisi ham, dashboard ham bir xil natijani oladi.
 */

export interface AnomalyRuleThresholds {
  /** Kunlik oziq-ovqat xarajati o'rtachadan shu foizdan ko'p oshsa — ogohlantirish. */
  foodExpenseSpikePercent: number;
  /** Mahsulot sarfi normadan shu foizdan ko'p oshsa. */
  overConsumptionPercent: number;
  /** Budjetdan oshib ketish foizi. */
  budgetOverrunPercent: number;
  /** Ombor qoldig'i minimal darajadan shu foizga yaqinlashsa. */
  lowStockBufferPercent: number;
  /** Qarzdorlik kutilgan to'lovning shu foizidan oshsa. */
  debtRatioPercent: number;
  /** Davomat o'rtachadan shu foizdan ko'p pasaysa. */
  attendanceDropPercent: number;
  /** Xarid narxi oxirgi narxdan shu foizdan ko'p oshsa. */
  priceSpikePercent: number;
}

export const DEFAULT_ANOMALY_THRESHOLDS: AnomalyRuleThresholds = {
  foodExpenseSpikePercent: 20,
  overConsumptionPercent: 10,
  budgetOverrunPercent: 5,
  lowStockBufferPercent: 20,
  debtRatioPercent: 15,
  attendanceDropPercent: 15,
  priceSpikePercent: 10,
};

export interface Anomaly {
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  message: string;
  /** Ogohlantirishni takrorlamaslik uchun barqaror kalit. */
  dedupeKey: string;
  metric?: { value: number; baseline: number; deviationPercent: number };
  entity?: { type: string; id: string; name?: string };
}

function severityFor(deviation: number, threshold: number): NotificationSeverity {
  return deviation >= threshold * 2 ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING;
}

export function detectFoodExpenseSpike(params: {
  date: string;
  todayFoodExpense: number;
  averageFoodExpense: number;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const threshold = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.foodExpenseSpikePercent;
  const deviation = growthPercent(params.todayFoodExpense, params.averageFoodExpense);
  if (deviation < threshold) return null;

  return {
    kind: NotificationKind.EXPENSE_SPIKE,
    severity: severityFor(deviation, threshold),
    title: "Oziq-ovqat xarajati odatdagidan oshdi",
    message: `Bugungi oziq-ovqat xarajati o'rtachadan ${deviation.toFixed(1)}% ko'p.`,
    dedupeKey: `food_expense_spike:${params.date}`,
    metric: {
      value: params.todayFoodExpense,
      baseline: params.averageFoodExpense,
      deviationPercent: deviation,
    },
  };
}

export function detectOverConsumption(params: {
  date: string;
  productId: string;
  productName: string;
  plannedQuantity: number;
  actualQuantity: number;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const threshold = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.overConsumptionPercent;
  const deviation = growthPercent(params.actualQuantity, params.plannedQuantity);
  if (deviation < threshold) return null;

  return {
    kind: NotificationKind.ABNORMAL_CONSUMPTION,
    severity: severityFor(deviation, threshold),
    title: `${params.productName} me'yoridan ko'p sarflandi`,
    message: `Reja ${params.plannedQuantity}, haqiqiy sarf ${params.actualQuantity} (+${deviation.toFixed(1)}%).`,
    dedupeKey: `over_consumption:${params.productId}:${params.date}`,
    metric: {
      value: params.actualQuantity,
      baseline: params.plannedQuantity,
      deviationPercent: deviation,
    },
    entity: { type: 'product', id: params.productId, name: params.productName },
  };
}

export function detectBudgetOverrun(params: {
  period: string;
  categoryId: string;
  categoryName: string;
  budget: number;
  actual: number;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const threshold = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.budgetOverrunPercent;
  if (params.budget <= 0) return null;
  const deviation = growthPercent(params.actual, params.budget);
  if (deviation < threshold) return null;

  return {
    kind: NotificationKind.BUDGET_EXCEEDED,
    severity: severityFor(deviation, threshold),
    title: `${params.categoryName}: budjet oshib ketdi`,
    message: `Reja ${params.budget.toLocaleString('uz-UZ')}, fakt ${params.actual.toLocaleString('uz-UZ')} so'm (+${deviation.toFixed(1)}%).`,
    dedupeKey: `budget_overrun:${params.categoryId}:${params.period}`,
    metric: { value: params.actual, baseline: params.budget, deviationPercent: deviation },
    entity: { type: 'expense_category', id: params.categoryId, name: params.categoryName },
  };
}

export function detectLowStock(params: {
  productId: string;
  productName: string;
  currentQuantity: number;
  minQuantity: number;
  unitLabel: string;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const buffer = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.lowStockBufferPercent;
  if (params.minQuantity <= 0) return null;

  const warnAt = params.minQuantity * (1 + buffer / 100);
  if (params.currentQuantity > warnAt) return null;

  const critical = params.currentQuantity <= params.minQuantity;
  return {
    kind: NotificationKind.LOW_STOCK,
    severity: critical ? NotificationSeverity.CRITICAL : NotificationSeverity.WARNING,
    title: `${params.productName} kamayib qoldi`,
    message: `Qoldiq ${params.currentQuantity} ${params.unitLabel}, minimal ${params.minQuantity} ${params.unitLabel}.`,
    dedupeKey: `low_stock:${params.productId}`,
    metric: {
      value: params.currentQuantity,
      baseline: params.minQuantity,
      deviationPercent: percentage(params.currentQuantity - params.minQuantity, params.minQuantity),
    },
    entity: { type: 'product', id: params.productId, name: params.productName },
  };
}

export function detectDebtAlert(params: {
  period: string;
  outstandingDebt: number;
  expectedPayments: number;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const threshold = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.debtRatioPercent;
  const ratio = percentage(params.outstandingDebt, params.expectedPayments);
  if (ratio < threshold) return null;

  return {
    kind: NotificationKind.DEBT_ALERT,
    severity: severityFor(ratio, threshold),
    title: 'Qarzdorlik oshdi',
    message: `Qarzdorlik kutilgan to'lovlarning ${ratio.toFixed(1)}%ini tashkil qilmoqda.`,
    dedupeKey: `debt_alert:${params.period}`,
    metric: {
      value: params.outstandingDebt,
      baseline: params.expectedPayments,
      deviationPercent: ratio,
    },
  };
}

export function detectAttendanceDrop(params: {
  date: string;
  todayRate: number;
  averageRate: number;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const threshold = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.attendanceDropPercent;
  const drop = -growthPercent(params.todayRate, params.averageRate);
  if (drop < threshold) return null;

  return {
    kind: NotificationKind.ATTENDANCE_DROP,
    severity: severityFor(drop, threshold),
    title: 'Davomat keskin pasaydi',
    message: `Bugungi davomat ${params.todayRate.toFixed(1)}%, o'rtacha ${params.averageRate.toFixed(1)}%.`,
    dedupeKey: `attendance_drop:${params.date}`,
    metric: { value: params.todayRate, baseline: params.averageRate, deviationPercent: -drop },
  };
}

export function detectPriceSpike(params: {
  productId: string;
  productName: string;
  newPrice: number;
  previousPrice: number;
  thresholds?: Partial<AnomalyRuleThresholds>;
}): Anomaly | null {
  const threshold = {
    ...DEFAULT_ANOMALY_THRESHOLDS,
    ...params.thresholds,
  }.priceSpikePercent;
  const deviation = growthPercent(params.newPrice, params.previousPrice);
  if (deviation < threshold) return null;

  return {
    kind: NotificationKind.PRICE_SPIKE,
    severity: severityFor(deviation, threshold),
    title: `${params.productName} narxi oshdi`,
    message: `${params.previousPrice.toLocaleString('uz-UZ')} → ${params.newPrice.toLocaleString('uz-UZ')} so'm (+${deviation.toFixed(1)}%).`,
    dedupeKey: `price_spike:${params.productId}:${roundMoney(params.newPrice)}`,
    metric: {
      value: params.newPrice,
      baseline: params.previousPrice,
      deviationPercent: deviation,
    },
    entity: { type: 'product', id: params.productId, name: params.productName },
  };
}

/** Ombordagi mahsulot yana necha kunga yetadi. */
export function daysOfStockRemaining(currentQuantity: number, averageDailyUsage: number): number {
  if (averageDailyUsage <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor(safeDivide(currentQuantity, averageDailyUsage));
}
