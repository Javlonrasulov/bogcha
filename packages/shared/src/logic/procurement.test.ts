import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { analyzePriceTrend, weightedAverageCost } from './procurement';

describe('analyzePriceTrend', () => {
  it('narx oshishini aniqlaydi', () => {
    const trend = analyzePriceTrend([
      { date: '2026-07-01', price: 80_000 },
      { date: '2026-08-01', price: 92_000 },
    ]);
    assert.ok(trend);
    assert.equal(trend.direction, 'UP');
    assert.equal(trend.currentPrice, 92_000);
    assert.equal(trend.previousPrice, 80_000);
  });

  it('narx tushishini aniqlaydi', () => {
    const trend = analyzePriceTrend([
      { date: '2026-07-01', price: 100_000 },
      { date: '2026-08-01', price: 90_000 },
    ]);
    assert.ok(trend);
    assert.equal(trend.direction, 'DOWN');
  });

  it('kichik o‘zgarishni barqaror deb hisoblaydi', () => {
    assert.equal(
      analyzePriceTrend([
        { date: '2026-07-01', price: 100_000 },
        { date: '2026-08-01', price: 100_300 },
      ])?.direction,
      'STABLE',
    );
    assert.equal(
      analyzePriceTrend([
        { date: '2026-07-01', price: 100_000 },
        { date: '2026-08-01', price: 99_700 },
      ])?.direction,
      'STABLE',
    );
  });

  it('bitta nuqta uchun ham ishlaydi', () => {
    const trend = analyzePriceTrend([{ date: '2026-08-01', price: 50_000 }]);
    assert.ok(trend);
    assert.equal(trend.direction, 'STABLE');
    assert.equal(trend.currentPrice, 50_000);
  });

  it('bo‘sh tarixda null qaytaradi', () => {
    assert.equal(analyzePriceTrend([]), null);
  });
});

describe('weightedAverageCost', () => {
  it('mavjud qoldiq va kirimni o‘rtacha tortadi', () => {
    const cost = weightedAverageCost({
      currentQuantity: 10,
      currentUnitCost: 100,
      incomingQuantity: 10,
      incomingUnitCost: 120,
    });
    assert.equal(cost, 110);
  });

  it('qoldiq nol bo‘lsa yangi narxni oladi', () => {
    const cost = weightedAverageCost({
      currentQuantity: 0,
      currentUnitCost: 100,
      incomingQuantity: 5,
      incomingUnitCost: 80,
    });
    assert.equal(cost, 80);
  });
});
