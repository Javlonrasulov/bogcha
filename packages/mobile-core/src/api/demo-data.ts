import {
  AttendanceStatus,
  ChildStatus,
  Gender,
  HealthLevel,
  Locale,
  PaymentMethod,
  Role,
  StaffPosition,
  Unit,
  permissionsForRoles,
  type AuthenticatedUser,
  type Paginated,
} from '@bogcha/shared';

export type DemoProfile = 'admin' | 'teacher';

export const DEMO_IDS = {
  tenant: '00000000-0000-4000-8000-000000000001',
  branchNavoiy: '00000000-0000-4000-8000-000000000011',
  branchKarmana: '00000000-0000-4000-8000-000000000012',
  groupSmall: '00000000-0000-4000-8000-000000000021',
  adminUser: '00000000-0000-4000-8000-000000000031',
  teacherUser: '00000000-0000-4000-8000-000000000032',
} as const;

const today = () => new Date().toISOString().slice(0, 10);
const period = () => today().slice(0, 7);

function paginated<T>(items: T[], limit = 25): Paginated<T> {
  return { items, total: items.length, page: 1, limit, totalPages: 1 };
}

export function createDemoUser(profile: DemoProfile): AuthenticatedUser {
  if (profile === 'teacher') {
    return {
      id: DEMO_IDS.teacherUser,
      tenantId: DEMO_IDS.tenant,
      fullName: 'Karimova Dilnoza',
      email: null,
      phone: '+998901110011',
      roles: [Role.TEACHER],
      permissions: permissionsForRoles([Role.TEACHER]),
      branchIds: [DEMO_IDS.branchNavoiy],
      groupIds: [DEMO_IDS.groupSmall],
      locale: Locale.UZ_LATN,
      avatarUrl: null,
    };
  }

  return {
    id: DEMO_IDS.adminUser,
    tenantId: DEMO_IDS.tenant,
    fullName: 'Abdullayev Sardor',
    email: 'admin@demo.bogcha.uz',
    phone: '+998901110002',
    roles: [Role.ADMINISTRATOR],
    permissions: permissionsForRoles([Role.ADMINISTRATOR]),
    branchIds: [],
    groupIds: [],
    locale: Locale.UZ_LATN,
    avatarUrl: null,
  };
}

function pathOnly(fullPath: string): string {
  const q = fullPath.indexOf('?');
  return q >= 0 ? fullPath.slice(0, q) : fullPath;
}

function demoChildren() {
  const names = [
    ['Aliyev', 'Jasur'],
    ['Karimova', 'Madina'],
    ['Toshmatov', 'Bobur'],
    ['Rahimova', 'Nilufar'],
    ['Saidov', 'Timur'],
    ['Yusupova', 'Dilnoza'],
  ];
  return names.map(([lastName, firstName], index) => ({
    id: `00000000-0000-4000-8000-0000000001${index}`,
    branchId: DEMO_IDS.branchNavoiy,
    groupId: DEMO_IDS.groupSmall,
    firstName,
    lastName,
    middleName: null,
    fullName: `${lastName} ${firstName}`,
    birthDate: '2021-03-15',
    gender: index % 2 === 0 ? Gender.MALE : Gender.FEMALE,
    avatarUrl: null,
    enrolledAt: '2024-09-01',
    withdrawnAt: null,
    status: ChildStatus.ACTIVE,
    monthlyFee: 1_200_000,
    discountPercent: 0,
    discountAmount: 0,
    netMonthlyFee: 1_200_000,
    outstandingDebt: index === 1 ? 450_000 : 0,
    age: 4,
    address: 'Navoiy sh.',
    group: { id: DEMO_IDS.groupSmall, name: 'Kichik guruh' },
    branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
    primaryGuardian: {
      fullName: `${lastName} Ota-ona`,
      phone: '+998901234567',
      relation: 'ota',
    },
  }));
}

/** Demo rejimida API so'rovlariga javob — backend kerak emas. */
export function resolveDemoResponse(
  fullPath: string,
  method: string,
  profile: DemoProfile,
): unknown {
  const path = pathOnly(fullPath);
  const m = method.toUpperCase();

  if (path === '/auth/me') return createDemoUser(profile);

  if (m !== 'GET') {
    if (path === '/staff/check') {
      return {
        staffId: DEMO_IDS.teacherUser,
        position: StaffPosition.TEACHER,
        date: today(),
        checkInAt: new Date().toISOString(),
        checkOutAt: null,
        workedHours: 0,
        lateMinutes: 0,
      };
    }
    return { success: true };
  }

  if (path === '/branches') {
    return [
      {
        id: DEMO_IDS.branchNavoiy,
        name: 'Navoiy filiali',
        code: 'NAV',
        address: "Navoiy sh., Amir Temur ko'chasi 12",
        phone: '+998612255000',
        managerName: 'Sardor Abdullayev',
        capacity: 120,
        isActive: true,
        groupCount: 4,
        staffCount: 14,
        childrenCount: 95,
        occupancyPercent: 79,
      },
      {
        id: DEMO_IDS.branchKarmana,
        name: 'Karmana filiali',
        code: 'KAR',
        address: 'Karmana t., Bog\'cha ko\'chasi 5',
        phone: '+998612255001',
        managerName: 'Nodira Karimova',
        capacity: 80,
        isActive: true,
        groupCount: 3,
        staffCount: 10,
        childrenCount: 65,
        occupancyPercent: 81,
      },
    ];
  }

  if (path === '/groups/my') {
    return [
      {
        id: DEMO_IDS.groupSmall,
        name: 'Kichik guruh',
        branchId: DEMO_IDS.branchNavoiy,
        capacity: 25,
        ageFrom: 3,
        ageTo: 4,
        isActive: true,
        branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
        _count: { children: 22 },
      },
    ];
  }

  if (path === '/attendance/board') {
    const children = demoChildren().slice(0, 6).map((child, index) => ({
      id: child.id,
      fullName: child.fullName,
      avatarUrl: null,
      status:
        index < 4
          ? AttendanceStatus.PRESENT
          : index === 4
            ? AttendanceStatus.SICK
            : AttendanceStatus.ABSENT_EXCUSED,
      arrivedAt: index < 4 ? '08:30' : null,
      leftAt: null,
      note: null,
    }));
    return {
      date: today(),
      group: { id: DEMO_IDS.groupSmall, name: 'Kichik guruh', capacity: 25 },
      summary: {
        date: today(),
        total: 22,
        expected: 21,
        present: 18,
        absent: 3,
        excused: 2,
        unexcused: 1,
        onVacation: 1,
        sick: 1,
        attendanceRate: 85.71,
      },
      isSubmitted: false,
      submittedAt: null,
      children,
    };
  }

  if (path === '/staff/attendance/me') {
    return {
      staffId: DEMO_IDS.teacherUser,
      position: StaffPosition.TEACHER,
      date: today(),
      checkInAt: `${today()}T03:30:00.000Z`,
      checkOutAt: null,
      workedHours: 4.5,
      lateMinutes: 0,
    };
  }

  if (path === '/dashboard/overview') {
    return {
      period: period(),
      date: today(),
      today: {
        totalChildren: 95,
        expected: 90,
        present: 78,
        absent: 12,
        onVacation: 5,
        marked: 90,
        attendanceRate: 86.7,
        staffCount: 14,
        income: 12_500_000,
        expense: 8_200_000,
        foodCost: 2_100_000,
        foodSaved: 180_000,
        profit: 4_300_000,
      },
      finance: {
        revenue: 105_000_000,
        expense: 82_000_000,
        netProfit: 23_000_000,
        profitMargin: 21.9,
        revenueGrowth: 5.2,
        expenseGrowth: 3.1,
        expectedPayments: 98_000_000,
        collectedPayments: 87_500_000,
        outstandingDebt: 8_400_000,
        debtorCount: 12,
        collectionRate: 89.3,
      },
      inventory: {
        totalValue: 18_500_000,
        lowStockCount: 3,
        lowStockItems: [
          { productName: 'Guruch', quantity: 12, minQuantity: 20, unit: Unit.KG },
          { productName: 'Yog\'', quantity: 8, minQuantity: 15, unit: Unit.KG },
        ],
        todayConsumption: 450_000,
        weekConsumption: 2_800_000,
      },
      kpi: {
        netProfit: 23_000_000,
        profitMargin: 21.9,
        costPerChild: 863_158,
        foodCostPerChild: 221_053,
        profitPerChild: 242_105,
        revenuePerChild: 1_105_263,
        attendanceRate: 86.7,
        collectionRate: 89.3,
        foodSavingsRate: 7.9,
        staffCostRatio: 38.5,
        foodCostRatio: 20.0,
        debtRatio: 8.6,
        childrenPerStaff: 6.8,
        averageDailyExpense: 2_733_333,
        averageDailyRevenue: 3_500_000,
        occupancyBasis: 78,
      },
      health: {
        attendance: HealthLevel.GOOD,
        collection: HealthLevel.GOOD,
        foodCostRatio: HealthLevel.GOOD,
        staffCostRatio: HealthLevel.WARNING,
        debt: HealthLevel.WARNING,
        profitMargin: HealthLevel.GOOD,
      },
    };
  }

  if (path === '/dashboard/charts') {
    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (13 - index));
      const key = date.toISOString().slice(0, 10);
      return {
        date: key,
        present: 70 + (index % 5),
        total: 90,
        rate: 78 + (index % 4),
        income: 3_000_000 + index * 120_000,
        expense: 2_400_000 + index * 90_000,
        profit: 600_000 + index * 30_000,
        plannedCost: 400_000,
        actualCost: 380_000 + (index % 3) * 10_000,
        headcount: 75 + (index % 3),
      };
    });
    return {
      attendance: days.map(({ date, present, total, rate }) => ({ date, present, total, rate })),
      cashflow: days.map(({ date, income, expense, profit }) => ({ date, income, expense, profit })),
      nutrition: days.map(({ date, plannedCost, actualCost, headcount }) => ({
        date,
        plannedCost,
        actualCost,
        headcount,
      })),
    };
  }

  if (path === '/dashboard/branches') {
    return [
      {
        branchId: DEMO_IDS.branchNavoiy,
        branchName: 'Navoiy filiali',
        children: 95,
        revenue: 62_000_000,
        expense: 48_000_000,
        netProfit: 14_000_000,
        profitMargin: 22.6,
        attendanceRate: 87,
        collectionRate: 91,
        foodCostPerChild: 215_000,
        rank: 1,
      },
      {
        branchId: DEMO_IDS.branchKarmana,
        branchName: 'Karmana filiali',
        children: 65,
        revenue: 43_000_000,
        expense: 34_000_000,
        netProfit: 9_000_000,
        profitMargin: 20.9,
        attendanceRate: 84,
        collectionRate: 86,
        foodCostPerChild: 228_000,
        rank: 2,
      },
    ];
  }

  if (path.startsWith('/notifications')) {
    return {
      ...paginated([
        {
          id: '00000000-0000-4000-8000-000000000091',
          kind: 'LOW_STOCK',
          severity: 'WARNING',
          title: 'Guruch zaxirasi kam',
          message: 'Navoiy filialida guruch qoldig\'i minimal chegaradan past.',
          createdAt: new Date().toISOString(),
          readAt: null,
          entityType: 'Product',
          entityId: null,
        },
        {
          id: '00000000-0000-4000-8000-000000000092',
          kind: 'PAYMENT_DUE',
          severity: 'INFO',
          title: 'To\'lov muddati yaqinlashmoqda',
          message: '12 ta bola uchun oylik to\'lov 3 kun ichida.',
          createdAt: new Date(Date.now() - 86_400_000).toISOString(),
          readAt: null,
          entityType: null,
          entityId: null,
        },
      ]),
      unreadCount: 2,
    };
  }

  if (path === '/attendance/summary') {
    return {
      date: today(),
      total: 95,
      expected: 90,
      present: 78,
      absent: 12,
      excused: 7,
      unexcused: 5,
      onVacation: 5,
      sick: 3,
      attendanceRate: 86.7,
    };
  }

  if (path === '/attendance/trend') {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (13 - index));
      return {
        date: date.toISOString().slice(0, 10),
        present: 72 + (index % 6),
        total: 90,
        attendanceRate: 80 + (index % 5),
      };
    });
  }

  if (path === '/groups') {
    return [
      {
        id: DEMO_IDS.groupSmall,
        name: 'Kichik guruh',
        branchId: DEMO_IDS.branchNavoiy,
        branchName: 'Navoiy filiali',
        ageFrom: 3,
        ageTo: 4,
        capacity: 25,
        childrenCount: 22,
        activeChildrenCount: 21,
        occupancyPercent: 88,
        teachers: [{ id: DEMO_IDS.teacherUser, fullName: 'Karimova Dilnoza' }],
        todayPresent: 18,
        todayAbsent: 4,
        attendanceRate30d: 87.5,
      },
    ];
  }

  if (path === '/children') return paginated(demoChildren(), 100);

  if (path === '/finance/summary') {
    return {
      period: period(),
      revenue: 105_000_000,
      expense: 82_000_000,
      netProfit: 23_000_000,
      profitMargin: 21.9,
      expenseByCategory: [
        { categoryId: '1', categoryName: 'Oziq-ovqat', kind: 'FOOD', amount: 21_000_000, share: 25.6 },
        { categoryId: '2', categoryName: 'Ish haqi', kind: 'PAYROLL', amount: 31_500_000, share: 38.4 },
      ],
      revenueByCategory: [
        { categoryId: '1', categoryName: 'Oylik to\'lov', amount: 98_000_000, share: 93.3 },
      ],
      previousPeriod: { revenue: 99_800_000, expense: 79_500_000, netProfit: 20_300_000 },
      revenueGrowth: 5.2,
      expenseGrowth: 3.1,
      profitGrowth: 13.3,
    };
  }

  if (path === '/finance/plan-vs-fact') {
    return {
      period: period(),
      hasBudget: true,
      revenue: {
        label: 'Daromad',
        plan: 100_000_000,
        fact: 105_000_000,
        variance: 5_000_000,
        variancePercent: 5,
        health: HealthLevel.GOOD,
      },
      expenseLines: [
        {
          label: 'Oziq-ovqat',
          plan: 20_000_000,
          fact: 21_000_000,
          variance: 1_000_000,
          variancePercent: 5,
          health: HealthLevel.WARNING,
        },
      ],
      totalPlan: 95_000_000,
      totalFact: 82_000_000,
    };
  }

  if (path === '/payments/summary') {
    return {
      period: period(),
      expected: 98_000_000,
      collected: 87_500_000,
      outstanding: 10_500_000,
      collectionRate: 89.3,
      invoiceCount: 95,
      totalDebt: 8_400_000,
      overdueInvoiceCount: 5,
      debtorCount: 12,
    };
  }

  if (path === '/payments') {
    const child = demoChildren()[0]!;
    return paginated([
      {
        id: '00000000-0000-4000-8000-000000000081',
        branchId: DEMO_IDS.branchNavoiy,
        childId: child.id,
        amount: 1_200_000,
        date: today(),
        method: PaymentMethod.CASH,
        receiptNumber: 'CHK-1042',
        note: null,
        childFullName: child.fullName,
        child: {
          id: child.id,
          firstName: child.firstName,
          lastName: child.lastName,
          middleName: null,
          group: child.group,
        },
        branch: child.branch,
      },
    ]);
  }

  if (path === '/debts') {
    const child = demoChildren()[1]!;
    return {
      ...paginated([
        {
          childId: child.id,
          childFullName: child.fullName,
          groupName: child.group?.name ?? null,
          branchName: child.branch.name,
          guardianPhone: child.primaryGuardian?.phone ?? null,
          totalDue: 1_200_000,
          totalPaid: 750_000,
          outstanding: 450_000,
          oldestDueDate: period() + '-10',
          daysOverdue: 2,
        },
      ]),
      totalOutstanding: 450_000,
    };
  }

  if (path === '/stock') {
    return {
      items: [
        {
          productId: '00000000-0000-4000-8000-000000000061',
          productName: 'Guruch',
          categoryName: 'Don mahsulotlari',
          unit: Unit.KG,
          quantity: 12,
          unitCost: 14_000,
          totalValue: 168_000,
          minQuantity: 20,
          maxQuantity: 100,
          averageDailyUsage: 3.5,
          daysRemaining: 3,
          isLow: true,
        },
        {
          productId: '00000000-0000-4000-8000-000000000062',
          productName: 'Sabzi',
          categoryName: 'Sabzavotlar',
          unit: Unit.KG,
          quantity: 45,
          unitCost: 6_500,
          totalValue: 292_500,
          minQuantity: 15,
          maxQuantity: 80,
          averageDailyUsage: 8,
          daysRemaining: 5,
          isLow: false,
        },
      ],
      totalValue: 18_500_000,
      lowStockCount: 1,
    };
  }

  if (path === '/stock/movements') {
    return paginated([
      {
        id: '00000000-0000-4000-8000-000000000071',
        productId: '00000000-0000-4000-8000-000000000061',
        type: 'IN',
        source: 'PURCHASE',
        quantity: 50,
        unitCost: 14_000,
        totalCost: 700_000,
        balanceAfter: 62,
        date: today(),
        reason: 'Haftalik xarid',
        documentNumber: 'PO-104',
        product: { id: '00000000-0000-4000-8000-000000000061', name: 'Guruch', unit: Unit.KG },
        supplier: { id: '00000000-0000-4000-8000-000000000051', name: 'O\'zbekiston Don' },
        branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
      },
    ]);
  }

  if (path === '/purchases') {
    return paginated([
      {
        id: '00000000-0000-4000-8000-000000000041',
        number: 'PO-2026-104',
        status: 'APPROVED',
        totalAmount: 2_450_000,
        isPaid: false,
        branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
        supplier: { id: '00000000-0000-4000-8000-000000000051', name: 'O\'zbekiston Don' },
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  if (path === '/procurement/plan') {
    return {
      fromDate: today(),
      toDate: today(),
      lines: [
        {
          productId: '00000000-0000-4000-8000-000000000061',
          productName: 'Guruch',
          unit: Unit.KG,
          requiredQuantity: 35,
          currentQuantity: 12,
          toOrder: 23,
          estimatedCost: 322_000,
        },
      ],
    };
  }

  if (path === '/staff/attendance/today') {
    return {
      date: today(),
      totalStaff: 14,
      checkedIn: 11,
      lateCount: 1,
      records: [
        {
          id: '00000000-0000-4000-8000-000000000101',
          staffId: DEMO_IDS.teacherUser,
          date: today(),
          checkInAt: `${today()}T03:30:00.000Z`,
          checkOutAt: null,
          workedHours: 4.5,
          lateMinutes: 0,
          staff: {
            id: DEMO_IDS.teacherUser,
            firstName: 'Dilnoza',
            lastName: 'Karimova',
            position: StaffPosition.TEACHER,
          },
        },
      ],
    };
  }

  if (path === '/staff') {
    return paginated([
      {
        id: DEMO_IDS.teacherUser,
        firstName: 'Dilnoza',
        lastName: 'Karimova',
        middleName: null,
        position: StaffPosition.TEACHER,
        phone: '+998901110011',
        status: 'ACTIVE',
        baseSalary: 4_500_000,
        hiredAt: '2023-09-01',
        note: null,
        avatarUrl: null,
        branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
        user: { id: DEMO_IDS.teacherUser, roles: [Role.TEACHER], isActive: true, lastLoginAt: null },
      },
    ]);
  }

  if (path === '/nutrition/preview') {
    return {
      date: today(),
      branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
      plannedHeadcount: 78,
      actualHeadcount: 75,
      meals: [
        { mealType: 'BREAKFAST', recipes: [{ id: '1', name: 'Sutli jo\'xori', headcount: 75 }] },
        { mealType: 'LUNCH', recipes: [{ id: '2', name: 'Sho\'rva', headcount: 75 }] },
      ],
      lines: [
        { productName: 'Guruch', unit: Unit.KG, plannedQuantity: 12, actualQuantity: 11.5 },
        { productName: 'Sabzi', unit: Unit.KG, plannedQuantity: 8, actualQuantity: 7.8 },
      ],
      totalPlannedCost: 1_250_000,
      totalActualCost: 1_180_000,
      totalSavedCost: 70_000,
      costPerChild: 15_733,
    };
  }

  if (path === '/food-consumption/report') {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 6);
    const fromIso = from.toISOString().slice(0, 10);
    const toIso = today();
    const catalog = [
      { id: '00000000-0000-4000-8000-000000000061', name: 'Banan', unit: Unit.KG, perChild: 0.02 },
      { id: '00000000-0000-4000-8000-000000000062', name: 'Bulochka', unit: Unit.PIECE, perChild: 1 },
      { id: '00000000-0000-4000-8000-000000000063', name: 'Karam', unit: Unit.KG, perChild: 0.03 },
      { id: '00000000-0000-4000-8000-000000000064', name: 'Pechene', unit: Unit.KG, perChild: 0.015 },
      { id: '00000000-0000-4000-8000-000000000065', name: 'Sut', unit: Unit.LITER, perChild: 0.2 },
      {
        id: '00000000-0000-4000-8000-000000000066',
        name: "O'simlik yog'i",
        unit: Unit.LITER,
        perChild: 0.01,
      },
    ];
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (6 - index));
      // Dam olish kunlarida 0 — webdagi "sarf kunlari" ga o'xshash.
      const presentCount = index === 5 || index === 6 ? 0 : 50 + (index % 4) * 3;
      return {
        date: date.toISOString().slice(0, 10),
        presentCount,
        products: catalog.map((product) => ({
          productId: product.id,
          plannedQuantity: Number((presentCount * product.perChild).toFixed(3)),
          actualQuantity: null,
          variance: null,
          unit: product.unit,
        })),
      };
    });
    const presentTotal = days.reduce((sum, day) => sum + day.presentCount, 0);
    const spendDays = days.filter((d) => d.presentCount > 0).length;
    return {
      from: fromIso,
      to: toIso,
      branchId: DEMO_IDS.branchNavoiy,
      products: catalog.map((product) => ({
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantityPerChild: product.perChild,
        normUnit: product.unit,
      })),
      days,
      totals: {
        presentCount: presentTotal,
        plannedByProduct: Object.fromEntries(
          catalog.map((product) => [
            product.id,
            Number((presentTotal * product.perChild).toFixed(3)),
          ]),
        ),
        actualByProduct: {},
        varianceByProduct: Object.fromEntries(catalog.map((product) => [product.id, null])),
      },
      kpis: {
        presentCount: presentTotal,
        normConsumptionFilledDays: spendDays,
        actualFilledCells: 0,
        actualTotalCells: days.length * catalog.length,
        stockShortageCount: 1,
        stockSurplusCount: 0,
        stockMatchedCount: catalog.length - 1,
      },
      stock: catalog.map((product, index) => {
        const opening = 20 + index * 8;
        const inbound = index % 2 === 0 ? 10 : 5;
        const normConsumption = Number((presentTotal * product.perChild).toFixed(3));
        return {
          productId: product.id,
          productName: product.name,
          unit: product.unit,
          openingQuantity: opening,
          inboundQuantity: inbound,
          normConsumption,
          actualConsumption: 0,
          expectedByNorm: Number((opening + inbound - normConsumption).toFixed(3)),
          expectedByActual: opening + inbound,
          currentStock: opening,
          countedQuantity: null,
          varianceByNorm: null,
          varianceByActual: null,
        };
      }),
      norms: catalog.map((product, index) => ({
        id: `00000000-0000-4000-8000-00000000008${index}`,
        productId: product.id,
        productName: product.name,
        quantityPerChild: product.perChild,
        unit: product.unit,
        stockUnit: product.unit,
        effectiveFrom: fromIso,
        note: null,
      })),
    };
  }

  if (path === '/products') {
    return paginated([
      {
        id: '00000000-0000-4000-8000-000000000061',
        categoryId: '00000000-0000-4000-8000-000000000050',
        name: 'Banan',
        unit: Unit.KG,
        unitCost: 12_000,
        minQuantity: 10,
        maxQuantity: 100,
        shelfLifeDays: 7,
        barcode: null,
        isActive: true,
        category: { id: '00000000-0000-4000-8000-000000000050', name: 'Meva' },
        defaultSupplier: null,
        totalQuantity: 40,
        totalValue: 480_000,
        isLow: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000062',
        categoryId: '00000000-0000-4000-8000-000000000051',
        name: 'Bulochka',
        unit: Unit.PIECE,
        unitCost: 2_000,
        minQuantity: 50,
        maxQuantity: 500,
        shelfLifeDays: 3,
        barcode: null,
        isActive: true,
        category: { id: '00000000-0000-4000-8000-000000000051', name: 'Non' },
        defaultSupplier: null,
        totalQuantity: 120,
        totalValue: 240_000,
        isLow: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000065',
        categoryId: '00000000-0000-4000-8000-000000000052',
        name: 'Sut',
        unit: Unit.LITER,
        unitCost: 9_000,
        minQuantity: 20,
        maxQuantity: 200,
        shelfLifeDays: 5,
        barcode: null,
        isActive: true,
        category: { id: '00000000-0000-4000-8000-000000000052', name: 'Sut mahsulotlari' },
        defaultSupplier: null,
        totalQuantity: 60,
        totalValue: 540_000,
        isLow: false,
      },
    ]);
  }

  if (path === '/nutrition/cost-trend') {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (13 - index));
      return {
        date: date.toISOString().slice(0, 10),
        headcount: 72 + (index % 4),
        plannedCost: 1_200_000,
        actualCost: 1_150_000 + index * 5_000,
        savedCost: 50_000,
        costPerChild: 15_500,
      };
    });
  }

  if (path === '/nutrition/days') {
    return [
      {
        id: '00000000-0000-4000-8000-000000000111',
        branchId: DEMO_IDS.branchNavoiy,
        date: today(),
        plannedHeadcount: 78,
        actualHeadcount: 75,
        totalPlannedCost: 1_250_000,
        totalActualCost: 1_180_000,
        totalSavedCost: 70_000,
        costPerChild: 15_733,
        isClosed: false,
        closedAt: null,
        branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
      },
    ];
  }

  if (path === '/reports/daily') {
    return {
      date: today(),
      attendance: {
        enrolled: 95,
        expected: 90,
        marked: 90,
        present: 78,
        absentExcused: 7,
        absentUnexcused: 5,
        sick: 3,
        onVacation: 5,
        attendanceRate: 86.7,
      },
      finance: { income: 12_500_000, expense: 8_200_000, profit: 4_300_000 },
      nutrition: { headcount: 75, actualCost: 1_180_000, costPerChild: 15_733 },
    };
  }

  if (path === '/reports/monthly') {
    return {
      period: period(),
      from: `${period()}-01`,
      to: `${period()}-28`,
      children: 95,
      staffCount: 14,
      finance: {
        presentMarks: 1_650,
        totalMarks: 1_900,
        revenue: 105_000_000,
        expense: 82_000_000,
        netProfit: 23_000_000,
        collectionRate: 89.3,
      },
      attendance: { rate: 86.7, present: 78, expected: 90 },
      nutrition: { actualCost: 21_000_000, costPerChild: 221_053 },
    };
  }

  if (path.startsWith('/groups/') && path !== '/groups/my') {
    const child = demoChildren()[0]!;
    return {
      id: DEMO_IDS.groupSmall,
      name: 'Kichik guruh',
      branchId: DEMO_IDS.branchNavoiy,
      ageFrom: 3,
      ageTo: 4,
      capacity: 25,
      colorToken: 'sky',
      isActive: true,
      branch: { id: DEMO_IDS.branchNavoiy, name: 'Navoiy filiali' },
      teachers: [
        {
          userId: DEMO_IDS.teacherUser,
          isPrimary: true,
          user: { id: DEMO_IDS.teacherUser, fullName: 'Karimova Dilnoza', phone: '+998901110011' },
        },
      ],
      children: demoChildren().slice(0, 6).map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        middleName: c.middleName,
        birthDate: c.birthDate,
        gender: c.gender,
        status: c.status,
        avatarUrl: null,
      })),
    };
  }

  return profile === 'teacher' ? [] : {};
}
