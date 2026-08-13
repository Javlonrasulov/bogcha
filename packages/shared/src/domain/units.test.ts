import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { UNIT_LABELS, Unit, areUnitsCompatible, convertQuantity } from './units';

/** TZ §12: retseptda gramm, omborda kg bo'lishi mumkin. */
describe('convertQuantity', () => {
  it('gramm va kg orasida o\'giradi', () => {
    assert.equal(convertQuantity(2000, Unit.GRAM, Unit.KG), 2);
    assert.equal(convertQuantity(2, Unit.KG, Unit.GRAM), 2000);
  });

  it('millilitr va litr orasida o\'giradi', () => {
    assert.equal(convertQuantity(500, Unit.MILLILITER, Unit.LITER), 0.5);
    assert.equal(convertQuantity(1.5, Unit.LITER, Unit.MILLILITER), 1500);
  });

  it('bir xil birlikda qiymatni o\'zgartirmaydi', () => {
    assert.equal(convertQuantity(7.25, Unit.PIECE, Unit.PIECE), 7.25);
  });

  it('mos kelmaydigan birliklarda xato beradi', () => {
    assert.throws(() => convertQuantity(1, Unit.KG, Unit.PIECE), /Birliklar mos emas/);
    assert.throws(() => convertQuantity(1, Unit.LITER, Unit.KG), /Birliklar mos emas/);
  });
});

describe('areUnitsCompatible', () => {
  it('bir xil bazaviy birlikdagilarni mos deb biladi', () => {
    assert.equal(areUnitsCompatible(Unit.GRAM, Unit.KG), true);
    assert.equal(areUnitsCompatible(Unit.MILLILITER, Unit.LITER), true);
    assert.equal(areUnitsCompatible(Unit.KG, Unit.LITER), false);
    assert.equal(areUnitsCompatible(Unit.BOX, Unit.PACK), false);
  });
});

describe('UNIT_LABELS', () => {
  it('har bir birlik uchun ko\'rinadigan nom bor', () => {
    for (const unit of Object.values(Unit)) {
      assert.ok(UNIT_LABELS[unit]?.length > 0, `${unit} uchun nom yo'q`);
    }
  });
});
