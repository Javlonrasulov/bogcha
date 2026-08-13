import { HealthLevel } from '../domain/enums';
import { percentage, roundMoney } from './money';

/** Reja vs Fakt taqqoslash (TZ §21). */
export interface PlanFactComparison {
  label: string;
  plan: number;
  fact: number;
  variance: number;
  variancePercent: number;
  /** Xarajat uchun ortiqcha sarf yomon, daromad uchun esa aksincha. */
  health: HealthLevel;
}

export function comparePlanFact(params: {
  label: string;
  plan: number;
  fact: number;
  /** `COST` — fakt rejadan oshsa yomon; `REVENUE` — fakt rejadan kam bo'lsa yomon. */
  kind: 'COST' | 'REVENUE';
  warningThresholdPercent?: number;
  criticalThresholdPercent?: number;
}): PlanFactComparison {
  const warning = params.warningThresholdPercent ?? 5;
  const critical = params.criticalThresholdPercent ?? 15;
  const variance = roundMoney(params.fact - params.plan);
  const variancePercent = percentage(variance, params.plan);

  /** Salbiy og'ish darajasi: xarajatda oshib ketish, daromadda kam bajarish. */
  const adverse = params.kind === 'COST' ? variancePercent : -variancePercent;

  let health: HealthLevel = HealthLevel.GOOD;
  if (adverse >= critical) health = HealthLevel.BAD;
  else if (adverse >= warning) health = HealthLevel.WARNING;

  return { label: params.label, plan: params.plan, fact: params.fact, variance, variancePercent, health };
}

/** Ko'rsatkichni yashil/sariq/qizil indikatorga o'giradi (TZ §34). */
export function healthFromThresholds(params: {
  value: number;
  warningAt: number;
  criticalAt: number;
  /** `HIGHER_IS_BETTER` — davomat, to'lov yig'ilishi; `LOWER_IS_BETTER` — xarajat ulushi, qarz. */
  direction: 'HIGHER_IS_BETTER' | 'LOWER_IS_BETTER';
}): HealthLevel {
  const { value, warningAt, criticalAt, direction } = params;
  if (direction === 'HIGHER_IS_BETTER') {
    if (value <= criticalAt) return HealthLevel.BAD;
    if (value <= warningAt) return HealthLevel.WARNING;
    return HealthLevel.GOOD;
  }
  if (value >= criticalAt) return HealthLevel.BAD;
  if (value >= warningAt) return HealthLevel.WARNING;
  return HealthLevel.GOOD;
}
