import { Unit, convertQuantity } from '../domain/units';
import { roundMoney, roundQuantity, safeDivide, sum } from './money';

/**
 * Oziq-ovqat normasi hisoblash — tizimning markaziy biznes logikasi (TZ §9, §11, §13).
 *
 * Retsept ma'lum bazaviy bolalar soni uchun yoziladi (masalan 100 bola uchun 10 kg go'sht).
 * Reja kutilgan bolalar soniga, haqiqiy sarf esa davomatdan kelgan bolalar soniga
 * proporsional hisoblanadi. Ikkisi orasidagi farq — tejalgan miqdor.
 */

export const DEFAULT_NORM_CONFIG: NormConfig = {
  baseHeadcount: 100,
  wastePercent: 0,
  roundingStep: 0,
  roundingMode: 'NONE',
  staffMealFactor: 0,
};

export type RoundingMode = 'NONE' | 'UP' | 'NEAREST';

export interface NormConfig {
  /** Retsept/norma necha bola uchun belgilangan. */
  baseHeadcount: number;
  /** Texnologik yo'qotish/isrof ustamasi, foizda (0-100). */
  wastePercent: number;
  /** Yakuniy miqdorni shu qadamga yaxlitlash (masalan 0.5 kg). 0 — yaxlitlamaslik. */
  roundingStep: number;
  roundingMode: RoundingMode;
  /**
   * Xodimlar ovqatini hisobga olish koeffitsienti: bolalar sonining ustiga
   * qo'shiladigan "shartli bola" ulushi (masalan 0.05 — 5%).
   */
  staffMealFactor: number;
}

export interface NormItem {
  productId: string;
  productName?: string;
  /** Bazaviy bolalar soni uchun belgilangan miqdor. */
  baseQuantity: number;
  /** Normadagi birlik (retseptda gramm bo'lishi mumkin). */
  unit: Unit;
  /** Omborda saqlanadigan birlik — sarf shu birlikda yozib qo'yiladi. */
  stockUnit?: Unit;
  /** Birlik narxi (stockUnit bo'yicha), xarajatni hisoblash uchun. */
  unitCost?: number;
}

export interface NormLineResult {
  productId: string;
  productName?: string;
  unit: Unit;
  /** Kutilgan bolalar soni uchun reja miqdori. */
  plannedQuantity: number;
  /** Haqiqatda kelgan bolalar soni uchun sarf miqdori. */
  actualQuantity: number;
  /** Reja − haqiqiy (musbat bo'lsa tejaldi). */
  savedQuantity: number;
  savingsPercent: number;
  plannedCost: number;
  actualCost: number;
  savedCost: number;
}

export interface NormCalculationResult {
  plannedHeadcount: number;
  actualHeadcount: number;
  /** Norma hisobida ishlatilgan effektiv "og'iz" soni (xodimlar ustamasi bilan). */
  effectivePlannedHeadcount: number;
  effectiveActualHeadcount: number;
  lines: NormLineResult[];
  totalPlannedCost: number;
  totalActualCost: number;
  totalSavedCost: number;
  savingsPercent: number;
  /** 1 bola uchun oziq-ovqat xarajati. */
  costPerChild: number;
}

function applyRounding(value: number, config: NormConfig): number {
  const { roundingStep, roundingMode } = config;
  if (roundingMode === 'NONE' || roundingStep <= 0) return roundQuantity(value);
  const steps = value / roundingStep;
  const rounded = roundingMode === 'UP' ? Math.ceil(steps) : Math.round(steps);
  return roundQuantity(rounded * roundingStep);
}

/** Xodimlar ovqatini hisobga olgan effektiv bolalar soni. */
export function effectiveHeadcount(headcount: number, config: NormConfig): number {
  const factor = 1 + Math.max(0, config.staffMealFactor);
  return headcount * factor;
}

/**
 * Bitta mahsulot uchun kerakli miqdorni bolalar soniga moslab hisoblaydi.
 * 100 bola uchun 10 kg → 98 bola uchun 9.8 kg.
 */
export function scaleQuantity(
  baseQuantity: number,
  headcount: number,
  config: NormConfig = DEFAULT_NORM_CONFIG,
): number {
  if (config.baseHeadcount <= 0) return 0;
  const perChild = baseQuantity / config.baseHeadcount;
  const raw = perChild * effectiveHeadcount(headcount, config);
  const withWaste = raw * (1 + Math.max(0, config.wastePercent) / 100);
  return applyRounding(withWaste, config);
}

/**
 * Reja va haqiqiy sarfni birgalikda hisoblaydi.
 *
 * @param plannedHeadcount kutilgan bolalar soni (ro'yxatdagi faol bolalar)
 * @param actualHeadcount davomat bo'yicha kelgan bolalar soni
 */
export function calculateNorm(params: {
  items: readonly NormItem[];
  plannedHeadcount: number;
  actualHeadcount: number;
  config?: Partial<NormConfig>;
}): NormCalculationResult {
  const config: NormConfig = { ...DEFAULT_NORM_CONFIG, ...params.config };
  const { plannedHeadcount, actualHeadcount } = params;

  const lines: NormLineResult[] = params.items.map((item) => {
    const targetUnit = item.stockUnit ?? item.unit;
    const plannedInNormUnit = scaleQuantity(item.baseQuantity, plannedHeadcount, config);
    const actualInNormUnit = scaleQuantity(item.baseQuantity, actualHeadcount, config);

    const plannedQuantity = roundQuantity(
      convertQuantity(plannedInNormUnit, item.unit, targetUnit),
    );
    const actualQuantity = roundQuantity(convertQuantity(actualInNormUnit, item.unit, targetUnit));
    const savedQuantity = roundQuantity(plannedQuantity - actualQuantity);

    const unitCost = item.unitCost ?? 0;
    const plannedCost = roundMoney(plannedQuantity * unitCost);
    const actualCost = roundMoney(actualQuantity * unitCost);

    return {
      productId: item.productId,
      productName: item.productName,
      unit: targetUnit,
      plannedQuantity,
      actualQuantity,
      savedQuantity,
      savingsPercent: roundMoney(safeDivide(savedQuantity, plannedQuantity) * 100),
      plannedCost,
      actualCost,
      savedCost: roundMoney(plannedCost - actualCost),
    };
  });

  const totalPlannedCost = roundMoney(sum(lines.map((line) => line.plannedCost)));
  const totalActualCost = roundMoney(sum(lines.map((line) => line.actualCost)));

  return {
    plannedHeadcount,
    actualHeadcount,
    effectivePlannedHeadcount: roundQuantity(effectiveHeadcount(plannedHeadcount, config)),
    effectiveActualHeadcount: roundQuantity(effectiveHeadcount(actualHeadcount, config)),
    lines,
    totalPlannedCost,
    totalActualCost,
    totalSavedCost: roundMoney(totalPlannedCost - totalActualCost),
    savingsPercent: roundMoney(
      safeDivide(totalPlannedCost - totalActualCost, totalPlannedCost) * 100,
    ),
    costPerChild: roundMoney(safeDivide(totalActualCost, actualHeadcount)),
  };
}

/**
 * Bir necha ovqat (nonushta/tushlik/poldnik) normalarini bitta mahsulot bo'yicha jamlaydi —
 * kunlik umumiy sarf shu yerda chiqadi.
 */
export function mergeNormResults(results: readonly NormCalculationResult[]): NormLineResult[] {
  const merged = new Map<string, NormLineResult>();

  for (const result of results) {
    for (const line of result.lines) {
      const key = `${line.productId}:${line.unit}`;
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, { ...line });
        continue;
      }
      existing.plannedQuantity = roundQuantity(existing.plannedQuantity + line.plannedQuantity);
      existing.actualQuantity = roundQuantity(existing.actualQuantity + line.actualQuantity);
      existing.savedQuantity = roundQuantity(existing.savedQuantity + line.savedQuantity);
      existing.plannedCost = roundMoney(existing.plannedCost + line.plannedCost);
      existing.actualCost = roundMoney(existing.actualCost + line.actualCost);
      existing.savedCost = roundMoney(existing.savedCost + line.savedCost);
      existing.savingsPercent = roundMoney(
        safeDivide(existing.savedQuantity, existing.plannedQuantity) * 100,
      );
    }
  }

  return [...merged.values()];
}
