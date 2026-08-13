import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyDiscount,
  clamp,
  formatCompactMoney,
  growthPercent,
  percentage,
  roundMoney,
  roundQuantity,
  safeDivide,
  sumMoney,
} from './money';

describe('roundMoney', () => {
  it('tiyinga yaxlitlaydi', () => {
    assert.equal(roundMoney(1234.567), 1234.57);
    assert.equal(roundMoney(0.005), 0.01);
  });

  it('suzuvchi nuqta xatolarini yo\'qotadi', () => {
    assert.equal(roundMoney(0.1 + 0.2), 0.3);
    assert.equal(sumMoney([0.1, 0.2, 0.3]), 0.6);
  });
});

describe('roundQuantity', () => {
  it('miqdorni uch xonaga yaxlitlaydi', () => {
    assert.equal(roundQuantity(9.80001), 9.8);
    assert.equal(roundQuantity(0.0004), 0);
  });
});

describe('safeDivide', () => {
  it('nolga bo\'lishda 0 qaytaradi', () => {
    assert.equal(safeDivide(10, 0), 0);
    assert.equal(safeDivide(10, Number.NaN), 0);
    assert.equal(safeDivide(10, 4), 2.5);
  });
});

describe('percentage', () => {
  it('ulushni foizga o\'giradi', () => {
    assert.equal(percentage(141, 160), 88.13);
    assert.equal(percentage(0, 0), 0);
  });
});

describe('growthPercent', () => {
  it('o\'tgan davrga nisbatan o\'zgarishni beradi', () => {
    assert.equal(growthPercent(92_000, 85_000), 8.24);
    assert.equal(growthPercent(80, 100), -20);
  });

  it('oldingi davr 0 bo\'lsa mantiqiy natija beradi', () => {
    assert.equal(growthPercent(50, 0), 100);
    assert.equal(growthPercent(0, 0), 0);
  });
});

describe('applyDiscount', () => {
  it('foizli va summali chegirmani birga qo\'llaydi', () => {
    assert.equal(applyDiscount(1_000_000, 10), 900_000);
    assert.equal(applyDiscount(1_000_000, 10, 50_000), 850_000);
  });

  it('chegirma summadan oshsa 0 beradi', () => {
    assert.equal(applyDiscount(100_000, 0, 500_000), 0);
  });

  it('foizni 0-100 oralig\'ida cheklaydi', () => {
    assert.equal(applyDiscount(1_000_000, 150), 0);
    assert.equal(applyDiscount(1_000_000, -50), 1_000_000);
  });
});

describe('clamp', () => {
  it('qiymatni chegarada ushlaydi', () => {
    assert.equal(clamp(5, 0, 100), 5);
    assert.equal(clamp(-5, 0, 100), 0);
    assert.equal(clamp(500, 0, 100), 100);
  });
});

describe('formatCompactMoney', () => {
  it('katta summalarni qisqartiradi', () => {
    assert.match(formatCompactMoney(55_000_000), /55 mln/);
    assert.match(formatCompactMoney(1_200_000_000), /1,2 mlrd|1.2 mlrd/);
    assert.match(formatCompactMoney(680_000), /680 ming/);
    assert.equal(formatCompactMoney(750), '750');
  });
});
