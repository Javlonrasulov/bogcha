import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { Unit } from '../domain/units';
import { calculateNorm, mergeNormResults, scaleQuantity } from './nutrition';

const BASE = {
  baseHeadcount: 100,
  wastePercent: 0,
  roundingStep: 0,
  roundingMode: 'NONE' as const,
  staffMealFactor: 0,
};

/**
 * TZ §9/§13 dagi asosiy misol: 100 bola uchun 10 kg go'sht belgilangan,
 * 98 bola kelsa 9.8 kg sarflanadi, 0.2 kg tejaladi.
 */
describe('scaleQuantity', () => {
  it('normani kelgan bolalar soniga proporsional hisoblaydi', () => {
    assert.equal(scaleQuantity(10, 98, { ...BASE, baseHeadcount: 100 }), 9.8);
    assert.equal(scaleQuantity(10, 100, { ...BASE, baseHeadcount: 100 }), 10);
    assert.equal(scaleQuantity(10, 0, { ...BASE, baseHeadcount: 100 }), 0);
  });

  it('isrof ustamasini qo\'shadi', () => {
    assert.equal(scaleQuantity(10, 100, { ...BASE, baseHeadcount: 100, wastePercent: 5 }), 10.5);
  });

  it('xodimlar ovqati koeffitsientini hisobga oladi', () => {
    assert.equal(
      scaleQuantity(10, 100, { ...BASE, baseHeadcount: 100, staffMealFactor: 0.1 }),
      11,
    );
  });

  it('yaxlitlash qadamini qo\'llaydi', () => {
    const config = { ...BASE, baseHeadcount: 100, roundingStep: 0.5, roundingMode: 'UP' as const };
    assert.equal(scaleQuantity(10, 98, config), 10);
    assert.equal(
      scaleQuantity(10, 98, { ...config, roundingMode: 'NEAREST' as const }),
      10,
    );
  });

  it('bazaviy son 0 bo\'lsa 0 qaytaradi (nolga bo\'lish yo\'q)', () => {
    assert.equal(scaleQuantity(10, 98, { ...BASE, baseHeadcount: 0 }), 0);
  });
});

describe('calculateNorm', () => {
  const items = [
    { productId: 'meat', baseQuantity: 10, unit: Unit.KG, unitCost: 90_000 },
    { productId: 'rice', baseQuantity: 5, unit: Unit.KG, unitCost: 12_000 },
  ];

  it('reja, haqiqiy sarf va tejalgan miqdorni chiqaradi', () => {
    const result = calculateNorm({ items, plannedHeadcount: 100, actualHeadcount: 98 });
    const meat = result.lines.find((line) => line.productId === 'meat');

    assert.equal(meat?.plannedQuantity, 10);
    assert.equal(meat?.actualQuantity, 9.8);
    assert.equal(meat?.savedQuantity, 0.2);
    assert.equal(meat?.savedCost, 18_000);
  });

  it('umumiy xarajat va 1 bolaga xarajatni hisoblaydi', () => {
    const result = calculateNorm({ items, plannedHeadcount: 100, actualHeadcount: 98 });

    assert.equal(result.totalPlannedCost, 960_000);
    assert.equal(result.totalActualCost, 940_800);
    assert.equal(result.totalSavedCost, 19_200);
    assert.equal(result.savingsPercent, 2);
    assert.equal(result.costPerChild, 9600);
  });

  it('retsept grammda, ombor kg bo\'lsa birlikni o\'giradi', () => {
    const result = calculateNorm({
      items: [
        {
          productId: 'butter',
          baseQuantity: 2000,
          unit: Unit.GRAM,
          stockUnit: Unit.KG,
          unitCost: 60_000,
        },
      ],
      plannedHeadcount: 100,
      actualHeadcount: 50,
    });

    assert.equal(result.lines[0]?.unit, Unit.KG);
    assert.equal(result.lines[0]?.plannedQuantity, 2);
    assert.equal(result.lines[0]?.actualQuantity, 1);
  });

  it('hech kim kelmasa haqiqiy sarf 0, 1 bolaga xarajat 0', () => {
    const result = calculateNorm({ items, plannedHeadcount: 100, actualHeadcount: 0 });

    assert.equal(result.totalActualCost, 0);
    assert.equal(result.costPerChild, 0);
    assert.equal(result.savingsPercent, 100);
  });
});

describe('mergeNormResults', () => {
  it('nonushta/tushlik/poldnik sarfini mahsulot bo\'yicha jamlaydi', () => {
    const breakfast = calculateNorm({
      items: [{ productId: 'rice', baseQuantity: 3, unit: Unit.KG, unitCost: 12_000 }],
      plannedHeadcount: 100,
      actualHeadcount: 100,
    });
    const lunch = calculateNorm({
      items: [{ productId: 'rice', baseQuantity: 5, unit: Unit.KG, unitCost: 12_000 }],
      plannedHeadcount: 100,
      actualHeadcount: 100,
    });

    const merged = mergeNormResults([breakfast, lunch]);

    assert.equal(merged.length, 1);
    assert.equal(merged[0]?.actualQuantity, 8);
    assert.equal(merged[0]?.actualCost, 96_000);
  });
});
