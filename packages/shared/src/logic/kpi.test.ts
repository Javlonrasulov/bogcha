import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HealthLevel } from '../domain/enums';
import { comparePlanFact, healthFromThresholds } from './kpi';

describe('comparePlanFact', () => {
  it('xarajat rejadan oshganda ogohlantiradi', () => {
    const result = comparePlanFact({
      label: "Oziq-ovqat",
      plan: 100,
      fact: 108,
      kind: 'COST',
    });
    assert.equal(result.variance, 8);
    assert.equal(result.health, HealthLevel.WARNING);
  });

  it('xarajat keskin oshganda yomon', () => {
    const result = comparePlanFact({
      label: "Oziq-ovqat",
      plan: 100,
      fact: 120,
      kind: 'COST',
    });
    assert.equal(result.health, HealthLevel.BAD);
  });

  it('reja ichida yaxshi', () => {
    const result = comparePlanFact({
      label: "Oziq-ovqat",
      plan: 100,
      fact: 102,
      kind: 'COST',
    });
    assert.equal(result.health, HealthLevel.GOOD);
  });

  it('daromadda kam bajarish yomon, ortiqcha yaxshi', () => {
    const under = comparePlanFact({ label: 'Daromad', plan: 100, fact: 80, kind: 'REVENUE' });
    const over = comparePlanFact({ label: 'Daromad', plan: 100, fact: 130, kind: 'REVENUE' });
    assert.equal(under.health, HealthLevel.BAD);
    assert.equal(over.health, HealthLevel.GOOD);
  });
});

describe('healthFromThresholds', () => {
  it('yuqori yaxshiroq ko‘rsatkichlar', () => {
    const params = { warningAt: 85, criticalAt: 70, direction: 'HIGHER_IS_BETTER' as const };
    assert.equal(healthFromThresholds({ ...params, value: 95 }), HealthLevel.GOOD);
    assert.equal(healthFromThresholds({ ...params, value: 80 }), HealthLevel.WARNING);
    assert.equal(healthFromThresholds({ ...params, value: 70 }), HealthLevel.BAD);
  });

  it('pastroq yaxshiroq ko‘rsatkichlar', () => {
    const params = { warningAt: 10, criticalAt: 20, direction: 'LOWER_IS_BETTER' as const };
    assert.equal(healthFromThresholds({ ...params, value: 5 }), HealthLevel.GOOD);
    assert.equal(healthFromThresholds({ ...params, value: 12 }), HealthLevel.WARNING);
    assert.equal(healthFromThresholds({ ...params, value: 25 }), HealthLevel.BAD);
  });
});
