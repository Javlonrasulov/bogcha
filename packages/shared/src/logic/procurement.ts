import { roundMoney } from './money';

/** Yetkazib beruvchi narx tarixidan o'zgarish tendensiyasini chiqaradi (TZ §16). */
export interface PriceHistoryPoint {
  date: string;
  price: number;
}

export interface PriceTrend {
  currentPrice: number;
  previousPrice: number;
  changePercent: number;
  direction: 'UP' | 'DOWN' | 'STABLE';
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
}

export function analyzePriceTrend(history: readonly PriceHistoryPoint[]): PriceTrend | null {
  if (history.length === 0) return null;

  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  const current = sorted[sorted.length - 1]?.price ?? 0;
  const previous = sorted.length > 1 ? (sorted[sorted.length - 2]?.price ?? current) : current;
  const prices = sorted.map((point) => point.price);
  const changePercent = previous ? roundMoney(((current - previous) / previous) * 100) : 0;

  return {
    currentPrice: current,
    previousPrice: previous,
    changePercent,
    direction: changePercent > 0.5 ? 'UP' : changePercent < -0.5 ? 'DOWN' : 'STABLE',
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices),
    averagePrice: roundMoney(prices.reduce((acc, price) => acc + price, 0) / prices.length),
  };
}

/**
 * O'rtacha tortilgan tannarx (weighted average cost). Har kirimda mahsulot
 * tannarxi qayta hisoblanadi, shunda sarf xarajati haqiqiy narxda yoziladi.
 */
export function weightedAverageCost(params: {
  currentQuantity: number;
  currentUnitCost: number;
  incomingQuantity: number;
  incomingUnitCost: number;
}): number {
  const totalQuantity = params.currentQuantity + params.incomingQuantity;
  if (totalQuantity <= 0) return roundMoney(params.incomingUnitCost);

  const totalValue =
    params.currentQuantity * params.currentUnitCost +
    params.incomingQuantity * params.incomingUnitCost;
  return roundMoney(totalValue / totalQuantity);
}
