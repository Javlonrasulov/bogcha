import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NotificationSeverity } from '../domain/enums';
import {
  DEFAULT_ANOMALY_THRESHOLDS,
  daysOfStockRemaining,
  detectAttendanceDrop,
  detectBudgetOverrun,
  detectDebtAlert,
  detectFoodExpenseSpike,
  detectLowStock,
  detectOverConsumption,
  detectPriceSpike,
} from './anomaly';

/** TZ §22: har bir qoida chegaradan oshganda ogohlantirish beradi. */
describe('detectFoodExpenseSpike', () => {
  it('chegaradan oshsa ogohlantiradi', () => {
    const anomaly = detectFoodExpenseSpike({
      date: '2026-08-11',
      todayFoodExpense: 1_300_000,
      averageFoodExpense: 1_000_000,
    });

    assert.equal(anomaly?.severity, NotificationSeverity.WARNING);
    assert.equal(anomaly?.dedupeKey, 'food_expense_spike:2026-08-11');
    assert.equal(anomaly?.metric?.deviationPercent, 30);
  });

  it('chegaraning ikki barobaridan oshsa kritik bo\'ladi', () => {
    const anomaly = detectFoodExpenseSpike({
      date: '2026-08-11',
      todayFoodExpense: 1_500_000,
      averageFoodExpense: 1_000_000,
    });

    assert.equal(anomaly?.severity, NotificationSeverity.CRITICAL);
  });

  it('normal sarfda ogohlantirish bermaydi', () => {
    assert.equal(
      detectFoodExpenseSpike({
        date: '2026-08-11',
        todayFoodExpense: 1_050_000,
        averageFoodExpense: 1_000_000,
      }),
      null,
    );
  });
});

describe('detectOverConsumption', () => {
  it('normadan ko\'p sarfni aniqlaydi', () => {
    const anomaly = detectOverConsumption({
      date: '2026-08-11',
      productId: 'meat',
      productName: "Go'sht",
      plannedQuantity: 10,
      actualQuantity: 12,
    });

    assert.equal(anomaly?.dedupeKey, 'over_consumption:meat:2026-08-11');
    assert.equal(anomaly?.entity?.id, 'meat');
  });

  it('tejamkor sarfda jim turadi', () => {
    assert.equal(
      detectOverConsumption({
        date: '2026-08-11',
        productId: 'meat',
        productName: "Go'sht",
        plannedQuantity: 10,
        actualQuantity: 9.8,
      }),
      null,
    );
  });
});

describe('detectBudgetOverrun', () => {
  it('budjetdan oshib ketishni aniqlaydi', () => {
    const anomaly = detectBudgetOverrun({
      period: '2026-08',
      categoryId: 'food',
      categoryName: 'Oziq-ovqat',
      budget: 35_000_000,
      actual: 38_500_000,
    });

    assert.equal(anomaly?.metric?.deviationPercent, 10);
    assert.equal(anomaly?.dedupeKey, 'budget_overrun:food:2026-08');
  });

  it('budjet belgilanmagan bo\'lsa tekshirmaydi', () => {
    assert.equal(
      detectBudgetOverrun({
        period: '2026-08',
        categoryId: 'food',
        categoryName: 'Oziq-ovqat',
        budget: 0,
        actual: 38_500_000,
      }),
      null,
    );
  });
});

describe('detectLowStock', () => {
  const product = {
    productId: 'meat',
    productName: "Go'sht",
    minQuantity: 10,
    unitLabel: 'kg',
  };

  it('minimal qoldiqqa yetganda kritik ogohlantiradi', () => {
    const anomaly = detectLowStock({ ...product, currentQuantity: 8 });
    assert.equal(anomaly?.severity, NotificationSeverity.CRITICAL);
  });

  it('minimal qoldiqqa yaqinlashganda ogohlantiradi', () => {
    const anomaly = detectLowStock({ ...product, currentQuantity: 11 });
    assert.equal(anomaly?.severity, NotificationSeverity.WARNING);
  });

  it('zaxira yetarli bo\'lsa jim turadi', () => {
    assert.equal(detectLowStock({ ...product, currentQuantity: 30 }), null);
  });

  it('minimal qoldiq belgilanmagan mahsulotni tekshirmaydi', () => {
    assert.equal(detectLowStock({ ...product, minQuantity: 0, currentQuantity: 0 }), null);
  });
});

describe('detectDebtAlert', () => {
  it('qarz ulushi chegaradan oshsa ogohlantiradi', () => {
    const anomaly = detectDebtAlert({
      period: '2026-08',
      outstandingDebt: 30_000_000,
      expectedPayments: 180_000_000,
    });

    assert.equal(anomaly?.metric?.deviationPercent, 16.67);
    assert.equal(anomaly?.dedupeKey, 'debt_alert:2026-08');
  });

  it('chegaradan past qarzda jim turadi', () => {
    assert.equal(
      detectDebtAlert({
        period: '2026-08',
        outstandingDebt: 24_000_000,
        expectedPayments: 180_000_000,
      }),
      null,
    );
  });
});

describe('detectAttendanceDrop', () => {
  it('davomat keskin pasayishini aniqlaydi', () => {
    const anomaly = detectAttendanceDrop({ date: '2026-08-11', todayRate: 70, averageRate: 90 });

    assert.equal(anomaly?.dedupeKey, 'attendance_drop:2026-08-11');
    assert.equal(anomaly?.metric?.deviationPercent, -22.22);
  });

  it('davomat oshsa ogohlantirish bermaydi', () => {
    assert.equal(
      detectAttendanceDrop({ date: '2026-08-11', todayRate: 95, averageRate: 90 }),
      null,
    );
  });
});

describe('detectPriceSpike', () => {
  it('xarid narxi keskin oshsa ogohlantiradi', () => {
    const anomaly = detectPriceSpike({
      productId: 'meat',
      productName: "Go'sht",
      newPrice: 105_000,
      previousPrice: 85_000,
    });

    assert.equal(anomaly?.severity, NotificationSeverity.CRITICAL);
    assert.equal(anomaly?.dedupeKey, 'price_spike:meat:105000');
  });

  it('kichik o\'zgarishda jim turadi', () => {
    assert.equal(
      detectPriceSpike({
        productId: 'meat',
        productName: "Go'sht",
        newPrice: 86_000,
        previousPrice: 85_000,
      }),
      null,
    );
  });
});

describe('daysOfStockRemaining', () => {
  it('qoldiq necha kunga yetishini hisoblaydi', () => {
    assert.equal(daysOfStockRemaining(52, 10), 5);
  });

  it('sarf bo\'lmasa cheksiz deb qaraydi', () => {
    assert.equal(daysOfStockRemaining(52, 0), Number.POSITIVE_INFINITY);
  });
});

describe('DEFAULT_ANOMALY_THRESHOLDS', () => {
  it('barcha qoidalar uchun chegara belgilangan', () => {
    for (const [key, value] of Object.entries(DEFAULT_ANOMALY_THRESHOLDS)) {
      assert.ok(value > 0, `${key} chegarasi musbat bo'lishi kerak`);
    }
  });
});
