export const Unit = {
  KG: 'KG',
  GRAM: 'GRAM',
  LITER: 'LITER',
  MILLILITER: 'MILLILITER',
  PIECE: 'PIECE',
  BOX: 'BOX',
  PACK: 'PACK',
  BUNDLE: 'BUNDLE',
  OTHER: 'OTHER',
} as const;
export type Unit = (typeof Unit)[keyof typeof Unit];

/**
 * Har bir birlikning bazaviy birlikka nisbati. Retseptda gramm, omborda kg
 * bo'lishi mumkin — sarf hisoblanganda hammasi bazaviy birlikka keltiriladi.
 */
const BASE_UNIT: Readonly<Record<Unit, { base: Unit; factor: number }>> = {
  [Unit.KG]: { base: Unit.KG, factor: 1 },
  [Unit.GRAM]: { base: Unit.KG, factor: 0.001 },
  [Unit.LITER]: { base: Unit.LITER, factor: 1 },
  [Unit.MILLILITER]: { base: Unit.LITER, factor: 0.001 },
  [Unit.PIECE]: { base: Unit.PIECE, factor: 1 },
  [Unit.BOX]: { base: Unit.BOX, factor: 1 },
  [Unit.PACK]: { base: Unit.PACK, factor: 1 },
  [Unit.BUNDLE]: { base: Unit.BUNDLE, factor: 1 },
  [Unit.OTHER]: { base: Unit.OTHER, factor: 1 },
};

export function areUnitsCompatible(from: Unit, to: Unit): boolean {
  return BASE_UNIT[from].base === BASE_UNIT[to].base;
}

/**
 * Miqdorni bir birlikdan boshqasiga o'giradi.
 * @throws mos kelmaydigan birliklar uchun (kg → dona kabi).
 */
export function convertQuantity(quantity: number, from: Unit, to: Unit): number {
  if (from === to) return quantity;
  if (!areUnitsCompatible(from, to)) {
    throw new Error(`Birliklar mos emas: ${from} → ${to}`);
  }
  return (quantity * BASE_UNIT[from].factor) / BASE_UNIT[to].factor;
}

export const UNIT_LABELS: Readonly<Record<Unit, string>> = {
  [Unit.KG]: 'kg',
  [Unit.GRAM]: 'g',
  [Unit.LITER]: 'l',
  [Unit.MILLILITER]: 'ml',
  [Unit.PIECE]: 'dona',
  [Unit.BOX]: 'quti',
  [Unit.PACK]: 'paket',
  [Unit.BUNDLE]: "bog'lam",
  [Unit.OTHER]: 'birlik',
};
