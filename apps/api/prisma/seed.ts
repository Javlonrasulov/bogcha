/**
 * Realistik demo ma'lumotlar generatori.
 *
 * Seed TZ §47 dagi asosiy oqimni to'liq simulyatsiya qiladi:
 *   bolalar → davomat → kelgan bolalar → oziq-ovqat normasi → haqiqiy sarf →
 *   ombor → xarajat → daromad → foyda → KPI.
 *
 * Ya'ni raqamlar tasodifiy emas: har bir xarajat, ombor harakati va hisob-faktura
 * kunlik davomatdan kelib chiqadi. Shu sababli dashboard va hisobotlar bir-biriga mos.
 */

import { randomUUID } from 'node:crypto';
import { Algorithm, hash } from '@node-rs/argon2';
import {
  AttendanceStatus,
  AuditAction,
  ChildStatus,
  EmploymentStatus,
  ExpenseCategoryKind,
  Gender,
  IncomeCategoryKind,
  InvoiceStatus,
  MealType,
  NotificationKind,
  NotificationSeverity,
  PaymentMethod,
  PayrollStatus,
  PlanTier,
  Prisma,
  PrismaClient,
  PurchaseOrderStatus,
  Role,
  StaffPosition,
  StockMovementSource,
  StockMovementType,
  TenantStatus,
  Unit,
  Weekday,
} from '@prisma/client';
import {
  BOY_NAMES,
  FATHER_NAMES,
  GIRL_NAMES,
  KARMANA_GROUPS,
  KARMANA_STAFF,
  MOTHER_NAMES,
  NAVOIY_GROUPS,
  NAVOIY_STAFF,
  PRODUCTS,
  PRODUCT_CATEGORIES,
  RECIPES,
  SUPPLIERS,
  SURNAMES,
  WEEKLY_MENU,
  WORKPLACES,
  type GroupSeed,
  type StaffSeed,
} from './seed-data';

const prisma = new PrismaClient();

const TENANT_SLUG = 'navoiy-nur';
const DEFAULT_PASSWORD = 'Bogcha2026!';
const SUPER_ADMIN_PHONE = '+998900000000';
/** Simulyatsiya uzunligi (kalendar kun). */
const SIMULATION_DAYS = 84;
const TZ_OFFSET_HOURS = 5; // Asia/Tashkent

// ─────────────────────────────────────────────────────────────
// Yordamchi funksiyalar
// ─────────────────────────────────────────────────────────────

/** Deterministik RNG — seed har ishga tushganda bir xil natija beradi. */
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = createRng(20260811);

const randInt = (min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;
const pick = <T>(items: readonly T[]): T => items[Math.floor(rng() * items.length)]!;
const chance = (percent: number) => rng() * 100 < percent;

const money = (value: number) => Math.round(value * 100) / 100;
const qty = (value: number) => Math.round(value * 1000) / 1000;

/** Sana-only maydonlar UTC yarim tunda saqlanadi — vaqt zonasi siljishini oldini oladi. */
const dateOnly = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const ymd = (year: number, month: number, day: number) => new Date(Date.UTC(year, month, day));

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

/** Mahalliy vaqtdagi soatni UTC timestampga aylantiradi. */
const atLocal = (date: Date, hours: number, minutes: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      hours - TZ_OFFSET_HOURS,
      minutes,
    ),
  );

/** Yakshanba dam olish kuni; dushanba–shanba ish kuni (TZ §10). */
const isWorkday = (date: Date) => date.getUTCDay() !== 0;

const WEEKDAY_BY_INDEX: Record<number, Weekday> = {
  1: Weekday.MONDAY,
  2: Weekday.TUESDAY,
  3: Weekday.WEDNESDAY,
  4: Weekday.THURSDAY,
  5: Weekday.FRIDAY,
  6: Weekday.SATURDAY,
  0: Weekday.SUNDAY,
};

const periodOf = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const monthStart = (date: Date) => ymd(date.getUTCFullYear(), date.getUTCMonth(), 1);
const monthEnd = (date: Date) => ymd(date.getUTCFullYear(), date.getUTCMonth() + 1, 0);
const addMonths = (date: Date, months: number) =>
  ymd(date.getUTCFullYear(), date.getUTCMonth() + months, 1);

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
}

const hashPassword = (plain: string) =>
  hash(plain, { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });

// ─────────────────────────────────────────────────────────────
// Simulyatsiya uchun ichki turlar
// ─────────────────────────────────────────────────────────────

interface ChildState {
  id: string;
  branchId: string;
  groupId: string;
  firstName: string;
  lastName: string;
  status: ChildStatus;
  enrolledAt: Date;
  withdrawnAt: Date | null;
  monthlyFee: number;
  discountPercent: number;
  discountAmount: number;
  /** Bolaning davomat "xarakteri" — kasal bo'lish ehtimoli. */
  absenceRate: number;
}

interface GroupState {
  id: string;
  branchId: string;
  name: string;
  teacherUserId: string | null;
  children: ChildState[];
}

interface BranchState {
  id: string;
  name: string;
  code: string;
  groups: GroupState[];
  menuId: string;
  adminUserId: string;
  storekeeperUserId: string;
  cookUserId: string;
  monthlyFee: number;
  rent: number;
  utilities: number;
}

interface StockCell {
  quantity: number;
  unitCost: number;
  lastMovementAt: Date | null;
}

// ─────────────────────────────────────────────────────────────
// Asosiy seed
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🌱 Seed boshlandi...');
  const today = dateOnly(new Date());

  await resetDemoData();

  const plans = await seedPlans();
  const tenant = await seedTenant(plans.pro.id);
  const { owner, superAdmin } = await seedPlatformUsers(tenant.id);

  const branchRows = await seedBranches(tenant.id);
  const { categories: expenseCategories } = await seedExpenseCategories(tenant.id);
  const incomeCategories = await seedIncomeCategories(tenant.id);

  const suppliers = await seedSuppliers(tenant.id);
  const products = await seedProducts(tenant.id, suppliers);
  await seedSupplierPriceHistory(tenant.id, suppliers, products, today);

  const recipes = await seedRecipes(tenant.id, products);

  const branches: BranchState[] = [];
  const allStaff: Array<{ staffId: string; branchId: string; seed: StaffSeed; hiredAt: Date }> = [];

  for (const [index, branchRow] of branchRows.entries()) {
    const groupSeeds: GroupSeed[] = index === 0 ? NAVOIY_GROUPS : KARMANA_GROUPS;
    const staffSeeds: StaffSeed[] = index === 0 ? NAVOIY_STAFF : KARMANA_STAFF;
    const monthlyFee = index === 0 ? 1_350_000 : 1_150_000;

    const groups = await seedGroups(tenant.id, branchRow.id, groupSeeds);
    const { staffByRole, staffRows } = await seedStaff(
      tenant.id,
      branchRow.id,
      staffSeeds,
      groups,
      today,
    );
    allStaff.push(...staffRows);

    const children = await seedChildren(tenant.id, branchRow.id, groups, groupSeeds, monthlyFee, today);
    for (const group of groups) {
      group.children = children.filter((child) => child.groupId === group.id);
    }

    const menuId = await seedMenu(tenant.id, branchRow.id, branchRow.name, recipes, today);

    branches.push({
      id: branchRow.id,
      name: branchRow.name,
      code: branchRow.code,
      groups,
      menuId,
      adminUserId: staffByRole.ADMINISTRATOR ?? owner.id,
      storekeeperUserId: staffByRole.STOREKEEPER ?? owner.id,
      cookUserId: staffByRole.COOK ?? owner.id,
      monthlyFee,
      rent: index === 0 ? 12_000_000 : 8_000_000,
      utilities: index === 0 ? 3_400_000 : 2_100_000,
    });
  }

  await seedOperations({
    tenant,
    today,
    branches,
    products,
    recipes,
    suppliers,
    expenseCategories,
    incomeCategories,
    ownerId: owner.id,
    staff: allStaff,
  });

  await seedNotificationsAndAudit({
    tenantId: tenant.id,
    branches,
    products,
    ownerId: owner.id,
    superAdminId: superAdmin.id,
    today,
  });

  await printSummary(tenant.id);
}

// ─────────────────────────────────────────────────────────────
// 1. Tozalash / tariflar / tenant
// ─────────────────────────────────────────────────────────────

/**
 * Demo bazani tozalaydi. Ba'zi bog'lanishlar ataylab `onDelete: Restrict`
 * (masalan, mahsulot xarid tarixiga bog'langan bo'lsa o'chmaydi), shu sababli
 * tenantni o'chirish yetarli emas — barcha jadval `TRUNCATE ... CASCADE` bilan
 * tozalanadi. Migratsiya tarixi saqlanadi.
 */
async function resetDemoData() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE '\\_prisma%'
  `;

  if (tables.length === 0) return;

  const identifiers = tables.map((table) => `"public"."${table.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${identifiers} CASCADE`);
}

async function seedPlans() {
  const definitions = [
    {
      tier: PlanTier.TRIAL,
      name: 'Sinov (14 kun)',
      monthlyPrice: 0,
      maxBranches: 1,
      maxChildren: 40,
      maxUsers: 5,
      features: { reports: 'basic', support: 'email' },
    },
    {
      tier: PlanTier.BASIC,
      name: 'Boshlang\'ich',
      monthlyPrice: 490_000,
      maxBranches: 1,
      maxChildren: 120,
      maxUsers: 15,
      features: { reports: 'standard', support: 'email', export: true },
    },
    {
      tier: PlanTier.PRO,
      name: 'Professional',
      monthlyPrice: 1_290_000,
      maxBranches: 5,
      maxChildren: 600,
      maxUsers: 60,
      features: { reports: 'advanced', support: 'telegram', export: true, kpi: true, anomaly: true },
    },
    {
      tier: PlanTier.ENTERPRISE,
      name: 'Korporativ',
      monthlyPrice: 3_490_000,
      maxBranches: 50,
      maxChildren: 5_000,
      maxUsers: 500,
      features: { reports: 'advanced', support: 'dedicated', export: true, kpi: true, anomaly: true, api: true },
    },
  ];

  const result: Record<string, { id: string }> = {};
  for (const definition of definitions) {
    const plan = await prisma.plan.upsert({
      where: { tier: definition.tier },
      update: definition,
      create: definition,
    });
    result[definition.tier.toLowerCase()] = plan;
  }
  return result as { trial: { id: string }; basic: { id: string }; pro: { id: string }; enterprise: { id: string } };
}

async function seedTenant(planId: string) {
  const tenant = await prisma.tenant.create({
    data: {
      name: '"Nur Bolajonlari" bolalar bog\'chasi',
      slug: TENANT_SLUG,
      status: TenantStatus.ACTIVE,
      planId,
      planEndsAt: addMonths(dateOnly(new Date()), 8),
      ownerFullName: 'Jahongir Rasulov',
      contactPhone: '+998 90 111 00 01',
      contactEmail: 'info@nurbolajonlari.uz',
      timezone: 'Asia/Tashkent',
      currency: 'UZS',
      locale: 'uz',
      settings: {
        create: {
          normBaseHeadcount: 100,
          normWastePercent: 3,
          normRoundingStep: 0.05,
          normRoundingMode: 'UP',
          staffMealFactor: 0.08,
          anomalyThresholds: {
            foodExpenseSpikePercent: 20,
            overConsumptionPercent: 12,
            budgetOverrunPercent: 8,
            lowStockRatio: 1,
            debtRatioPercent: 15,
            attendanceDropPercent: 15,
            priceSpikePercent: 12,
          },
          payrollTaxPercent: 12,
          invoiceDueDay: 10,
          workdays: [1, 2, 3, 4, 5, 6],
          shiftStart: '08:00',
          shiftEnd: '18:00',
          lateGraceMinutes: 10,
        },
      },
    },
  });
  return tenant;
}

async function seedPlatformUsers(tenantId: string) {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);

  const superAdmin = await prisma.user.create({
    data: {
      tenantId: null,
      fullName: 'Platforma administratori',
      email: 'super@bogcha.uz',
      phone: SUPER_ADMIN_PHONE,
      passwordHash,
      roles: [Role.SUPER_ADMIN],
      locale: 'uz',
    },
  });

  const owner = await prisma.user.create({
    data: {
      tenantId,
      fullName: 'Jahongir Rasulov',
      email: 'owner@nurbolajonlari.uz',
      phone: '+998901110001',
      passwordHash,
      roles: [Role.OWNER],
      locale: 'uz',
      lastLoginAt: new Date(),
    },
  });

  return { superAdmin, owner };
}

async function seedBranches(tenantId: string) {
  const definitions = [
    {
      name: 'Navoiy filiali',
      code: 'NV',
      address: "Navoiy sh., Islom Karimov ko'chasi 42",
      phone: '+998 79 223 14 25',
      managerName: 'Nodira Saidova',
      latitude: 40.084217,
      longitude: 65.379135,
      capacity: 130,
      openedAt: ymd(2021, 7, 15),
    },
    {
      name: 'Karmana filiali',
      code: 'KR',
      address: "Karmana tumani, Navoiy ko'chasi 8",
      phone: '+998 79 445 62 10',
      managerName: 'Shahnoza Abdullayeva',
      latitude: 40.145812,
      longitude: 65.361204,
      capacity: 90,
      openedAt: ymd(2023, 8, 1),
    },
  ];

  const branches = [];
  for (const definition of definitions) {
    branches.push(await prisma.branch.create({ data: { tenantId, ...definition } }));
  }
  return branches;
}

// ─────────────────────────────────────────────────────────────
// 2. Moliya kategoriyalari
// ─────────────────────────────────────────────────────────────

async function seedExpenseCategories(tenantId: string) {
  const definitions: Array<{ name: string; kind: ExpenseCategoryKind; isSystem?: boolean }> = [
    { name: 'Oziq-ovqat', kind: ExpenseCategoryKind.FOOD, isSystem: true },
    { name: 'Ish haqi', kind: ExpenseCategoryKind.PAYROLL, isSystem: true },
    { name: 'Ijara', kind: ExpenseCategoryKind.RENT },
    { name: 'Kommunal xizmatlar', kind: ExpenseCategoryKind.UTILITIES },
    { name: 'Transport', kind: ExpenseCategoryKind.TRANSPORT },
    { name: 'Kantselyariya', kind: ExpenseCategoryKind.STATIONERY },
    { name: "Ta'mirlash", kind: ExpenseCategoryKind.REPAIR },
    { name: 'Dori-darmon', kind: ExpenseCategoryKind.MEDICINE },
    { name: 'Soliq va yig\'imlar', kind: ExpenseCategoryKind.TAX },
    { name: 'Marketing', kind: ExpenseCategoryKind.MARKETING },
    { name: 'Boshqa xarajatlar', kind: ExpenseCategoryKind.OTHER },
  ];

  const categories = new Map<ExpenseCategoryKind, string>();
  for (const definition of definitions) {
    const created = await prisma.expenseCategory.create({ data: { tenantId, ...definition } });
    categories.set(definition.kind, created.id);
  }
  return { categories };
}

async function seedIncomeCategories(tenantId: string) {
  const definitions: Array<{ name: string; kind: IncomeCategoryKind; isSystem?: boolean }> = [
    { name: "Bolalar to'lovi", kind: IncomeCategoryKind.TUITION, isSystem: true },
    { name: "Qo'shimcha xizmatlar", kind: IncomeCategoryKind.EXTRA_SERVICE },
    { name: "Qabul to'lovi", kind: IncomeCategoryKind.ENROLLMENT_FEE },
    { name: 'Boshqa daromad', kind: IncomeCategoryKind.OTHER },
  ];

  const categories = new Map<IncomeCategoryKind, string>();
  for (const definition of definitions) {
    const created = await prisma.incomeCategory.create({ data: { tenantId, ...definition } });
    categories.set(definition.kind, created.id);
  }
  return categories;
}

// ─────────────────────────────────────────────────────────────
// 3. Yetkazib beruvchilar, mahsulotlar, narx tarixi
// ─────────────────────────────────────────────────────────────

async function seedSuppliers(tenantId: string) {
  const suppliers = new Map<string, { id: string; name: string; categories: string[]; drift: number }>();

  for (const definition of SUPPLIERS) {
    const created = await prisma.supplier.create({
      data: {
        tenantId,
        name: definition.name,
        phone: definition.phone,
        contactPerson: definition.contactPerson,
        address: definition.address,
        inn: definition.inn,
        note: `Asosiy yo'nalish: ${definition.categories.join(', ')}`,
      },
    });
    suppliers.set(created.id, {
      id: created.id,
      name: definition.name,
      categories: [...definition.categories],
      drift: definition.monthlyDrift,
    });
  }

  return [...suppliers.values()];
}

type SupplierState = Awaited<ReturnType<typeof seedSuppliers>>[number];

interface ProductState {
  id: string;
  name: string;
  unit: Unit;
  unitCost: number;
  minQuantity: number;
  category: string;
  supplierId: string;
  supplierDrift: number;
}

async function seedProducts(tenantId: string, suppliers: SupplierState[]): Promise<ProductState[]> {
  const categoryIds = new Map<string, string>();
  for (const [index, name] of PRODUCT_CATEGORIES.entries()) {
    const created = await prisma.productCategory.create({
      data: { tenantId, name, sortOrder: index },
    });
    categoryIds.set(name, created.id);
  }

  const products: ProductState[] = [];
  for (const definition of PRODUCTS) {
    const supplier = suppliers.find((item) => item.categories.includes(definition.category))!;
    const created = await prisma.product.create({
      data: {
        tenantId,
        categoryId: categoryIds.get(definition.category)!,
        name: definition.name,
        unit: definition.unit,
        unitCost: definition.unitCost,
        minQuantity: definition.minQuantity,
        maxQuantity: definition.maxQuantity ?? null,
        shelfLifeDays: definition.shelfLifeDays ?? null,
        defaultSupplierId: supplier.id,
      },
    });

    products.push({
      id: created.id,
      name: definition.name,
      unit: definition.unit,
      unitCost: definition.unitCost,
      minQuantity: definition.minQuantity,
      category: definition.category,
      supplierId: supplier.id,
      supplierDrift: supplier.drift,
    });
  }

  return products;
}

/** Narx tarixi: oxirgi 4 oy uchun oylik narx nuqtalari (TZ §16 — narx oshishi ko'rinsin). */
async function seedSupplierPriceHistory(
  tenantId: string,
  suppliers: SupplierState[],
  products: ProductState[],
  today: Date,
) {
  const rows: Prisma.SupplierPriceCreateManyInput[] = [];

  for (const product of products) {
    for (let monthsAgo = 3; monthsAgo >= 0; monthsAgo -= 1) {
      const factor = (1 + product.supplierDrift / 100) ** monthsAgo;
      const jitter = 1 + (rng() - 0.5) * 0.02;
      const base = monthStart(addMonths(today, -monthsAgo));
      rows.push({
        tenantId,
        supplierId: product.supplierId,
        productId: product.id,
        price: money((product.unitCost / factor) * jitter),
        date: ymd(base.getUTCFullYear(), base.getUTCMonth(), randInt(2, 6)),
      });
    }
  }

  await prisma.supplierPrice.createMany({ data: rows });
  return suppliers;
}

// ─────────────────────────────────────────────────────────────
// 4. Retseptlar va menyu
// ─────────────────────────────────────────────────────────────

interface RecipeState {
  id: string;
  name: string;
  mealType: MealType;
  baseHeadcount: number;
  wastePercent: number;
  items: Array<{ productId: string; productName: string; quantity: number; unit: Unit }>;
}

async function seedRecipes(tenantId: string, products: ProductState[]): Promise<RecipeState[]> {
  const productByName = new Map(products.map((product) => [product.name, product]));
  const recipes: RecipeState[] = [];

  for (const definition of RECIPES) {
    const items = definition.items.map((item) => {
      const product = productByName.get(item.product);
      if (!product) throw new Error(`Retseptdagi mahsulot topilmadi: ${item.product}`);
      return { productId: product.id, productName: product.name, quantity: item.quantity, unit: item.unit };
    });

    const created = await prisma.recipe.create({
      data: {
        tenantId,
        name: definition.name,
        mealType: definition.mealType,
        baseHeadcount: 100,
        wastePercent: definition.wastePercent,
        caloriesPerPortion: definition.caloriesPerPortion,
        instructions: definition.instructions,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        },
      },
    });

    recipes.push({
      id: created.id,
      name: definition.name,
      mealType: definition.mealType,
      baseHeadcount: 100,
      wastePercent: definition.wastePercent,
      items,
    });
  }

  return recipes;
}

async function seedMenu(
  tenantId: string,
  branchId: string,
  branchName: string,
  recipes: RecipeState[],
  today: Date,
) {
  const byName = new Map(recipes.map((recipe) => [recipe.name, recipe]));

  const menu = await prisma.menu.create({
    data: {
      tenantId,
      branchId,
      name: `${branchName} — asosiy haftalik menyu`,
      validFrom: addMonths(today, -6),
      isActive: true,
    },
  });

  for (const day of WEEKLY_MENU) {
    for (const [mealType, recipeName] of [
      [MealType.BREAKFAST, day.breakfast],
      [MealType.LUNCH, day.lunch],
      [MealType.SNACK, day.snack],
    ] as Array<[MealType, string]>) {
      await prisma.menuSlot.create({
        data: {
          menuId: menu.id,
          weekday: day.weekday,
          mealType,
          recipes: { create: [{ recipeId: byName.get(recipeName)!.id }] },
        },
      });
    }
  }

  return menu.id;
}

// ─────────────────────────────────────────────────────────────
// 5. Guruhlar, xodimlar, bolalar
// ─────────────────────────────────────────────────────────────

async function seedGroups(
  tenantId: string,
  branchId: string,
  groupSeeds: GroupSeed[],
): Promise<GroupState[]> {
  const groups: GroupState[] = [];
  for (const definition of groupSeeds) {
    const created = await prisma.group.create({
      data: {
        tenantId,
        branchId,
        name: definition.name,
        ageFrom: definition.ageFrom,
        ageTo: definition.ageTo,
        capacity: definition.capacity,
        colorToken: definition.colorToken,
      },
    });
    groups.push({ id: created.id, branchId, name: definition.name, teacherUserId: null, children: [] });
  }
  return groups;
}

const ROLE_BY_STAFF_ROLE: Record<NonNullable<StaffSeed['role']>, Role> = {
  ADMINISTRATOR: Role.ADMINISTRATOR,
  TEACHER: Role.TEACHER,
  COOK: Role.COOK,
  STOREKEEPER: Role.STOREKEEPER,
  ACCOUNTANT: Role.ACCOUNTANT,
};

async function seedStaff(
  tenantId: string,
  branchId: string,
  staffSeeds: StaffSeed[],
  groups: GroupState[],
  today: Date,
) {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const staffByRole: Partial<Record<NonNullable<StaffSeed['role']>, string>> = {};
  const staffRows: Array<{ staffId: string; branchId: string; seed: StaffSeed; hiredAt: Date }> = [];

  for (const definition of staffSeeds) {
    const hiredAt = ymd(2021 + randInt(0, 4), randInt(0, 11), randInt(1, 28));
    let userId: string | null = null;

    if (definition.login && definition.role) {
      const user = await prisma.user.create({
        data: {
          tenantId,
          fullName: `${definition.lastName} ${definition.firstName}`,
          phone: definition.login,
          email: null,
          passwordHash,
          roles: [ROLE_BY_STAFF_ROLE[definition.role]],
          locale: 'uz',
          lastLoginAt: addDays(new Date(), -randInt(0, 3)),
          branches: { create: [{ branchId }] },
          ...(definition.groupIndex !== undefined && groups[definition.groupIndex]
            ? {
                groups: {
                  create: [
                    {
                      groupId: groups[definition.groupIndex]!.id,
                      isPrimary: definition.isPrimaryTeacher ?? false,
                    },
                  ],
                },
              }
            : {}),
        },
      });

      userId = user.id;
      staffByRole[definition.role] = user.id;
      if (definition.groupIndex !== undefined && groups[definition.groupIndex]) {
        groups[definition.groupIndex]!.teacherUserId = user.id;
      }
    }

    const staff = await prisma.staff.create({
      data: {
        tenantId,
        branchId,
        userId,
        firstName: definition.firstName,
        lastName: definition.lastName,
        middleName: definition.middleName,
        position: definition.position,
        phone: definition.login ?? `+99893${randInt(1000000, 9999999)}`,
        birthDate: ymd(randInt(1978, 1999), randInt(0, 11), randInt(1, 28)),
        hiredAt,
        baseSalary: definition.baseSalary,
        monthlyBonus: definition.monthlyBonus,
        status: EmploymentStatus.ACTIVE,
        address: pick(['Navoiy sh.', 'Karmana t.', 'Zarafshon sh.']) + `, ${randInt(1, 90)}-uy`,
      },
    });

    staffRows.push({ staffId: staff.id, branchId, seed: definition, hiredAt });
  }

  // Ishdan bo'shagan bitta xodim — tarix real ko'rinishi uchun.
  if (staffSeeds.length > 6) {
    await prisma.staff.create({
      data: {
        tenantId,
        branchId,
        firstName: 'Barno',
        lastName: 'Rasulova',
        middleName: 'Umar qizi',
        position: StaffPosition.ASSISTANT,
        phone: `+99890${randInt(1000000, 9999999)}`,
        hiredAt: ymd(2022, 8, 12),
        firedAt: addDays(today, -randInt(40, 120)),
        baseSalary: 2_600_000,
        status: EmploymentStatus.TERMINATED,
        note: "Shaxsiy sabablarga ko'ra ishdan bo'shadi",
      },
    });
  }

  return { staffByRole, staffRows };
}

async function seedChildren(
  tenantId: string,
  branchId: string,
  groups: GroupState[],
  groupSeeds: GroupSeed[],
  monthlyFee: number,
  today: Date,
): Promise<ChildState[]> {
  const children: ChildState[] = [];
  const childRows: Prisma.ChildCreateManyInput[] = [];
  const guardianRows: Prisma.GuardianCreateManyInput[] = [];

  for (const [groupIndex, group] of groups.entries()) {
    const definition = groupSeeds[groupIndex]!;

    for (let i = 0; i < definition.fill; i += 1) {
      const gender = chance(52) ? Gender.MALE : Gender.FEMALE;
      const firstName = gender === Gender.MALE ? pick(BOY_NAMES) : pick(GIRL_NAMES);
      const surnameBase = pick(SURNAMES);
      const lastName = gender === Gender.FEMALE ? `${surnameBase}a` : surnameBase;
      const fatherName = pick(FATHER_NAMES);

      const ageYears = definition.ageFrom + rng() * (definition.ageTo - definition.ageFrom);
      const birthDate = addDays(today, -Math.round(ageYears * 365 + randInt(0, 200)));
      const enrolledAt = addDays(today, -randInt(45, 700));

      // Chegirmalar: aka-uka/opa-singil va ijtimoiy chegirmalar.
      let discountPercent = 0;
      let discountAmount = 0;
      let discountReason: string | null = null;
      if (chance(12)) {
        discountPercent = 10;
        discountReason = 'Aka-uka/opa-singil chegirmasi';
      } else if (chance(5)) {
        discountPercent = 15;
        discountReason = 'Ijtimoiy chegirma';
      } else if (chance(4)) {
        discountAmount = 150_000;
        discountReason = 'Xodim farzandi';
      }

      let status: ChildStatus = ChildStatus.ACTIVE;
      let withdrawnAt: Date | null = null;
      const roll = rng() * 100;
      if (roll < 2.5) status = ChildStatus.ON_VACATION;
      else if (roll < 4) status = ChildStatus.TEMPORARILY_ABSENT;
      else if (roll < 6) {
        status = ChildStatus.WITHDRAWN;
        withdrawnAt = addDays(today, -randInt(10, 60));
      }

      const child: ChildState = {
        id: randomUUID(),
        branchId,
        groupId: group.id,
        firstName,
        lastName,
        status,
        enrolledAt,
        withdrawnAt,
        monthlyFee,
        discountPercent,
        discountAmount,
        absenceRate: 4 + rng() * 12,
      };

      children.push(child);
      childRows.push({
        id: child.id,
        tenantId,
        branchId,
        groupId: group.id,
        firstName,
        lastName,
        middleName: gender === Gender.MALE ? `${fatherName} o'g'li` : `${fatherName} qizi`,
        birthDate,
        gender,
        enrolledAt,
        withdrawnAt,
        status,
        monthlyFee,
        discountPercent,
        discountAmount,
        discountReason,
        address: `${pick(['Navoiy sh.', 'Karmana t.', 'Zarafshon sh.'])}, ${pick(['Yoshlik', 'Bunyodkor', 'Do\'stlik', 'Navbahor'])} ko'chasi ${randInt(1, 120)}-uy`,
        medicalNotes: chance(12) ? pick(['Sut mahsulotlariga allergiya', 'Yong\'oqqa allergiya', 'Astma — inhalyator bor']) : null,
        note: chance(8) ? 'Kechqurun buvisi olib ketadi' : null,
      });

      const fatherPhone = `+9989${randInt(0, 9)}${randInt(1000000, 9999999)}`;
      guardianRows.push({
        tenantId,
        childId: child.id,
        fullName: `${surnameBase} ${fatherName}`,
        relation: 'Ota',
        phone: fatherPhone,
        workplace: pick(WORKPLACES),
        isPrimary: true,
      });

      if (chance(75)) {
        guardianRows.push({
          tenantId,
          childId: child.id,
          fullName: `${surnameBase}a ${pick(MOTHER_NAMES)}`,
          relation: 'Ona',
          phone: `+9989${randInt(0, 9)}${randInt(1000000, 9999999)}`,
          secondaryPhone: chance(20) ? fatherPhone : null,
          workplace: pick(WORKPLACES),
          isPrimary: false,
        });
      }
    }
  }

  for (const batch of chunk(childRows, 500)) await prisma.child.createMany({ data: batch });
  for (const batch of chunk(guardianRows, 500)) await prisma.guardian.createMany({ data: batch });

  return children;
}

// ─────────────────────────────────────────────────────────────
// 6. Kunlik operatsiyalar simulyatsiyasi
// ─────────────────────────────────────────────────────────────

interface OperationsContext {
  tenant: { id: string };
  today: Date;
  branches: BranchState[];
  products: ProductState[];
  recipes: RecipeState[];
  suppliers: SupplierState[];
  expenseCategories: Map<ExpenseCategoryKind, string>;
  incomeCategories: Map<IncomeCategoryKind, string>;
  ownerId: string;
  staff: Array<{ staffId: string; branchId: string; seed: StaffSeed; hiredAt: Date }>;
}

async function seedOperations(ctx: OperationsContext) {
  const { tenant, today, branches, products, recipes, expenseCategories, incomeCategories } = ctx;
  const tenantId = tenant.id;
  const productById = new Map(products.map((product) => [product.id, product]));
  const recipeByName = new Map(recipes.map((recipe) => [recipe.name, recipe]));

  const stock = new Map<string, StockCell>();
  const stockKey = (branchId: string, productId: string) => `${branchId}|${productId}`;

  const movementRows: Prisma.StockMovementCreateManyInput[] = [];
  const batchRows: Prisma.AttendanceBatchCreateManyInput[] = [];
  const attendanceRows: Prisma.AttendanceRecordCreateManyInput[] = [];
  const nutritionDayRows: Prisma.NutritionDayCreateManyInput[] = [];
  const nutritionLineRows: Prisma.NutritionDayLineCreateManyInput[] = [];
  const expenseRows: Prisma.ExpenseCreateManyInput[] = [];
  const purchaseOrderRows: Prisma.PurchaseOrderCreateManyInput[] = [];
  const purchaseItemRows: Prisma.PurchaseOrderItemCreateManyInput[] = [];
  const supplierPriceRows: Prisma.SupplierPriceCreateManyInput[] = [];
  const staffAttendanceRows: Prisma.StaffAttendanceCreateManyInput[] = [];

  const supplierBalances = new Map<string, number>();
  let purchaseSequence = 0;

  const foodCategoryId = expenseCategories.get(ExpenseCategoryKind.FOOD)!;

  /** Omborga kirim — tannarx o'rtacha tortilgan usulda yangilanadi. */
  function receiveStock(
    branchId: string,
    productId: string,
    quantity: number,
    unitPrice: number,
    date: Date,
    meta: Partial<Prisma.StockMovementCreateManyInput>,
  ) {
    const key = stockKey(branchId, productId);
    const cell = stock.get(key) ?? { quantity: 0, unitCost: unitPrice, lastMovementAt: null };
    const totalValue = cell.quantity * cell.unitCost + quantity * unitPrice;
    const nextQuantity = qty(cell.quantity + quantity);
    const nextCost = nextQuantity > 0 ? money(totalValue / nextQuantity) : unitPrice;

    stock.set(key, { quantity: nextQuantity, unitCost: nextCost, lastMovementAt: date });

    movementRows.push({
      tenantId,
      branchId,
      productId,
      type: StockMovementType.IN,
      source: StockMovementSource.PURCHASE,
      quantity,
      unitCost: unitPrice,
      totalCost: money(quantity * unitPrice),
      balanceAfter: nextQuantity,
      date,
      ...meta,
    });
  }

  /** Ombordan chiqim — oziqlanish sarfi yoki qo'lda chiqim. */
  function issueStock(
    branchId: string,
    productId: string,
    quantity: number,
    date: Date,
    meta: Partial<Prisma.StockMovementCreateManyInput>,
  ) {
    const key = stockKey(branchId, productId);
    const cell = stock.get(key) ?? { quantity: 0, unitCost: 0, lastMovementAt: null };
    const issued = Math.min(quantity, cell.quantity);
    const nextQuantity = qty(cell.quantity - issued);

    stock.set(key, { quantity: nextQuantity, unitCost: cell.unitCost, lastMovementAt: date });

    movementRows.push({
      tenantId,
      branchId,
      productId,
      type: StockMovementType.OUT,
      source: StockMovementSource.NUTRITION_CONSUMPTION,
      quantity: issued,
      unitCost: cell.unitCost,
      totalCost: money(issued * cell.unitCost),
      balanceAfter: nextQuantity,
      date,
      ...meta,
    });

    return { quantity: issued, unitCost: cell.unitCost };
  }

  /** Bir kunlik menyu bo'yicha mahsulot normasi (TZ §9). */
  function dailyNorm(headcount: number, weekday: Weekday) {
    const day = WEEKLY_MENU.find((item) => item.weekday === weekday);
    const demand = new Map<string, number>();
    if (!day || headcount <= 0) return demand;

    for (const recipeName of [day.breakfast, day.lunch, day.snack]) {
      const recipe = recipeByName.get(recipeName);
      if (!recipe) continue;

      for (const item of recipe.items) {
        const scaled =
          (item.quantity * headcount) / recipe.baseHeadcount * (1 + recipe.wastePercent / 100);
        demand.set(item.productId, qty((demand.get(item.productId) ?? 0) + scaled));
      }
    }
    return demand;
  }

  const startDate = addDays(today, -SIMULATION_DAYS);

  const activeOn = (child: ChildState, date: Date) =>
    child.enrolledAt <= date &&
    (child.withdrawnAt === null || date < child.withdrawnAt) &&
    child.status !== ChildStatus.WITHDRAWN;

  const headcountOn = (branch: BranchState, date: Date) =>
    branch.groups.reduce(
      (total, group) => total + group.children.filter((child) => activeOn(child, date)).length,
      0,
    );

  // Boshlang'ich ombor to'ldirish: simulyatsiya boshlanishidan 2 kun oldin.
  for (const branch of branches) {
    const openingDate = addDays(startDate, -2);
    const headcount = headcountOn(branch, openingDate);
    const weekDemand = new Map<string, number>();

    for (let i = 0; i < 6; i += 1) {
      const weekday = WEEKDAY_BY_INDEX[((i + 1) % 7) as number]!;
      for (const [productId, quantity] of dailyNorm(headcount, weekday)) {
        weekDemand.set(productId, qty((weekDemand.get(productId) ?? 0) + quantity));
      }
    }

    purchaseSequence = await createPurchase({
      branch,
      date: openingDate,
      demand: weekDemand,
      multiplier: 2.2,
      note: "Boshlang'ich ombor qoldig'i",
      sequence: purchaseSequence,
      status: PurchaseOrderStatus.RECEIVED,
      isPaid: true,
    });

    // Xo'jalik mollari — oziqlanishga bog'liq emas, oyda bir marta olinadi.
    const householdDemand = new Map<string, number>();
    for (const product of products.filter((item) => item.category === "Xo'jalik mollari")) {
      householdDemand.set(product.id, product.minQuantity * 2);
    }
    purchaseSequence = await createPurchase({
      branch,
      date: openingDate,
      demand: householdDemand,
      multiplier: 1,
      note: "Xo'jalik mollari",
      sequence: purchaseSequence,
      status: PurchaseOrderStatus.RECEIVED,
      isPaid: true,
    });
  }

  interface CreatePurchaseArgs {
    branch: BranchState;
    date: Date;
    demand: Map<string, number>;
    multiplier: number;
    note: string;
    sequence: number;
    status: PurchaseOrderStatus;
    isPaid: boolean;
    /** RECEIVED bo'lmaganda omborga kirim qilinmaydi. */
  }

  /** Xarid: har bir yetkazib beruvchi uchun alohida hujjat yaratiladi (TZ §14). */
  async function createPurchase(args: CreatePurchaseArgs): Promise<number> {
    const { branch, date, demand, multiplier, note, status, isPaid } = args;
    let sequence = args.sequence;

    const bySupplier = new Map<string, Array<{ product: ProductState; quantity: number }>>();
    for (const [productId, quantity] of demand) {
      const product = productById.get(productId)!;
      const needed = qty(quantity * multiplier);
      if (needed <= 0) continue;
      const list = bySupplier.get(product.supplierId) ?? [];
      list.push({ product, quantity: needed });
      bySupplier.set(product.supplierId, list);
    }

    for (const [supplierId, items] of bySupplier) {
      sequence += 1;
      const orderId = randomUUID();
      const orderNumber = `XR-${date.getUTCFullYear()}-${String(sequence).padStart(4, '0')}`;
      let total = 0;

      for (const item of items) {
        // Narx yetkazib beruvchi inflyatsiyasi bilan sanaga moslanadi.
        const monthsAgo = Math.max(
          0,
          (today.getUTCFullYear() - date.getUTCFullYear()) * 12 +
            (today.getUTCMonth() - date.getUTCMonth()),
        );
        const unitPrice = money(
          (item.product.unitCost / (1 + item.product.supplierDrift / 100) ** monthsAgo) *
            (1 + (rng() - 0.5) * 0.03),
        );
        const lineTotal = money(item.quantity * unitPrice);
        total = money(total + lineTotal);

        purchaseItemRows.push({
          purchaseOrderId: orderId,
          productId: item.product.id,
          quantity: item.quantity,
          receivedQuantity: status === PurchaseOrderStatus.RECEIVED ? item.quantity : null,
          unitPrice,
          totalPrice: lineTotal,
        });

        if (status === PurchaseOrderStatus.RECEIVED) {
          receiveStock(branch.id, item.product.id, item.quantity, unitPrice, date, {
            supplierId,
            purchaseOrderId: orderId,
            documentNumber: orderNumber,
            reason: note,
            createdById: branch.storekeeperUserId,
          });

          supplierPriceRows.push({
            tenantId,
            supplierId,
            productId: item.product.id,
            price: unitPrice,
            date,
          });
        }
      }

      purchaseOrderRows.push({
        id: orderId,
        tenantId,
        branchId: branch.id,
        number: orderNumber,
        status,
        supplierId,
        neededBy: date,
        orderedAt: status === PurchaseOrderStatus.RECEIVED ? date : null,
        receivedAt: status === PurchaseOrderStatus.RECEIVED ? date : null,
        totalAmount: total,
        isPaid,
        generatedFromPlan: status !== PurchaseOrderStatus.RECEIVED,
        createdById: branch.storekeeperUserId,
        approvedById: status === PurchaseOrderStatus.RECEIVED ? branch.adminUserId : null,
        approvedAt: status === PurchaseOrderStatus.RECEIVED ? atLocal(date, 9, 30) : null,
        documentNumber: `NAK-${randInt(10000, 99999)}`,
        note,
      });

      if (!isPaid) {
        supplierBalances.set(supplierId, money((supplierBalances.get(supplierId) ?? 0) + total));
      }
    }

    return sequence;
  }

  // ── Kunlik tsikl: davomat → norma → sarf → xarajat
  for (let offset = 0; offset <= SIMULATION_DAYS; offset += 1) {
    const date = addDays(startDate, offset);
    if (!isWorkday(date)) continue;

    const weekday = WEEKDAY_BY_INDEX[date.getUTCDay()]!;
    const isMonday = date.getUTCDay() === 1;

    for (const branch of branches) {
      // Dushanba — haftalik xarid (keyingi 6 kunlik ehtiyoj + zaxira).
      if (isMonday) {
        const expected = Math.round(headcountOn(branch, date) * 0.93);
        const weekDemand = new Map<string, number>();
        for (let i = 0; i < 6; i += 1) {
          const dayOfWeek = WEEKDAY_BY_INDEX[((i + 1) % 7) as number]!;
          for (const [productId, quantity] of dailyNorm(expected, dayOfWeek)) {
            weekDemand.set(productId, qty((weekDemand.get(productId) ?? 0) + quantity));
          }
        }

        purchaseSequence = await createPurchase({
          branch,
          date,
          demand: weekDemand,
          multiplier: 1.08,
          note: 'Haftalik oziq-ovqat xaridi',
          sequence: purchaseSequence,
          status: PurchaseOrderStatus.RECEIVED,
          // Oxirgi 10 kunlik xaridlar hali to'lanmagan — supplier qarzdorligi ko'rinadi.
          isPaid: offset < SIMULATION_DAYS - 10,
        });
      }

      // ── Davomat (TZ §8)
      let branchPresent = 0;
      let branchTotal = 0;

      for (const group of branch.groups) {
        const roster = group.children.filter((child) => activeOn(child, date));
        if (roster.length === 0) continue;

        const batchId = randomUUID();
        let present = 0;
        let absent = 0;

        for (const child of roster) {
          let status: AttendanceStatus;
          if (child.status === ChildStatus.ON_VACATION) status = AttendanceStatus.ON_VACATION;
          else if (child.status === ChildStatus.TEMPORARILY_ABSENT && chance(70))
            status = AttendanceStatus.ABSENT_EXCUSED;
          else {
            const roll = rng() * 100;
            if (roll < child.absenceRate * 0.45) status = AttendanceStatus.SICK;
            else if (roll < child.absenceRate * 0.8) status = AttendanceStatus.ABSENT_EXCUSED;
            else if (roll < child.absenceRate) status = AttendanceStatus.ABSENT_UNEXCUSED;
            else status = AttendanceStatus.PRESENT;
          }

          const isPresent = status === AttendanceStatus.PRESENT;
          if (isPresent) present += 1;
          else absent += 1;

          attendanceRows.push({
            tenantId,
            childId: child.id,
            groupId: group.id,
            batchId,
            date,
            status,
            arrivedAt: isPresent ? atLocal(date, 7, randInt(30, 59)) : null,
            leftAt: isPresent ? atLocal(date, 17, randInt(0, 55)) : null,
            note:
              status === AttendanceStatus.SICK
                ? pick(['Shamollash', 'Isitma', 'Tomoq og\'rigi'])
                : status === AttendanceStatus.ABSENT_EXCUSED
                  ? pick(['Ota-ona xabar berdi', 'Shifokorga bordi', 'Oilaviy sabab'])
                  : null,
          });
        }

        batchRows.push({
          id: batchId,
          tenantId,
          branchId: branch.id,
          groupId: group.id,
          date,
          submittedById: group.teacherUserId,
          submittedAt: atLocal(date, 9, randInt(0, 25)),
          clientRecordedAt: atLocal(date, 8, randInt(40, 59)),
          syncedFromOffline: chance(12),
          totalCount: roster.length,
          presentCount: present,
          absentCount: absent,
        });

        branchPresent += present;
        branchTotal += roster.length;
      }

      if (branchTotal === 0) continue;

      // ── Oziqlanish: reja (barcha bolalar) vs fakt (kelganlar) — TZ §13
      const plannedDemand = dailyNorm(branchTotal, weekday);
      const actualDemand = dailyNorm(branchPresent, weekday);
      if (plannedDemand.size === 0) continue;

      const nutritionDayId = randomUUID();
      const expenseId = randomUUID();
      let totalPlannedCost = 0;
      let totalActualCost = 0;

      for (const [productId, plannedQuantity] of plannedDemand) {
        const actualQuantity = actualDemand.get(productId) ?? 0;
        const issued = issueStock(branch.id, productId, actualQuantity, date, {
          nutritionDayId,
          expenseId,
          reason: `Kunlik oziqlanish — ${branchPresent} bola`,
          createdById: branch.cookUserId,
        });

        const unitCost = issued.unitCost;
        const plannedCost = money(plannedQuantity * unitCost);
        const actualCost = money(issued.quantity * unitCost);
        totalPlannedCost = money(totalPlannedCost + plannedCost);
        totalActualCost = money(totalActualCost + actualCost);

        nutritionLineRows.push({
          nutritionDayId,
          productId,
          unit: productById.get(productId)!.unit,
          plannedQuantity,
          actualQuantity: issued.quantity,
          savedQuantity: qty(plannedQuantity - issued.quantity),
          unitCost,
          plannedCost,
          actualCost,
        });
      }

      expenseRows.push({
        id: expenseId,
        tenantId,
        branchId: branch.id,
        categoryId: foodCategoryId,
        amount: totalActualCost,
        date,
        description: `Oziq-ovqat sarfi — ${branchPresent} bola (${weekday})`,
        paymentMethod: PaymentMethod.CASH,
        isAutoGenerated: true,
        createdById: branch.cookUserId,
      });

      nutritionDayRows.push({
        id: nutritionDayId,
        tenantId,
        branchId: branch.id,
        date,
        plannedHeadcount: branchTotal,
        actualHeadcount: branchPresent,
        totalPlannedCost,
        totalActualCost,
        totalSavedCost: money(totalPlannedCost - totalActualCost),
        costPerChild: branchPresent > 0 ? money(totalActualCost / branchPresent) : 0,
        isClosed: true,
        closedAt: atLocal(date, 16, randInt(0, 40)),
        closedById: branch.cookUserId,
        expenseId,
      });
    }

    // ── Xodimlar davomati (TZ §24)
    for (const staff of ctx.staff) {
      if (staff.hiredAt > date) continue;
      if (chance(6)) continue; // ta'til / kasallik

      const checkInMinutes = randInt(-25, 35);
      const checkInAt = atLocal(date, 8, 0);
      checkInAt.setUTCMinutes(checkInAt.getUTCMinutes() + checkInMinutes);
      const checkOutAt = atLocal(date, 18, randInt(-15, 45));
      const workedHours = money((checkOutAt.getTime() - checkInAt.getTime()) / 3_600_000);

      staffAttendanceRows.push({
        tenantId,
        staffId: staff.staffId,
        date,
        checkInAt,
        checkOutAt,
        workedHours,
        lateMinutes: Math.max(0, checkInMinutes - 10),
        deviceId: `mobile-${staff.staffId.slice(0, 8)}`,
      });
    }
  }

  // Tasdiqlashni kutayotgan avtomatik xarid so'rovi (TZ §15) — har filialda bittasi.
  for (const branch of branches) {
    const shortage = new Map<string, number>();
    for (const product of products) {
      const cell = stock.get(stockKey(branch.id, product.id));
      const quantity = cell?.quantity ?? 0;
      if (quantity < product.minQuantity * 1.4) {
        shortage.set(product.id, qty(product.minQuantity * 2 - quantity));
      }
    }
    if (shortage.size > 0) {
      purchaseSequence = await createPurchase({
        branch,
        date: today,
        demand: shortage,
        multiplier: 1,
        note: 'Avtomatik xarid rejasi — tasdiqlash kutilmoqda',
        sequence: purchaseSequence,
        status: PurchaseOrderStatus.PENDING_APPROVAL,
        isPaid: false,
      });
    }
  }

  console.log('  • ombor harakatlari va davomat yozuvlari yozilmoqda...');
  for (const batch of chunk(purchaseOrderRows, 200)) await prisma.purchaseOrder.createMany({ data: batch });
  for (const batch of chunk(purchaseItemRows, 1000)) await prisma.purchaseOrderItem.createMany({ data: batch });
  for (const batch of chunk(expenseRows, 500)) await prisma.expense.createMany({ data: batch });
  for (const batch of chunk(nutritionDayRows, 300)) await prisma.nutritionDay.createMany({ data: batch });
  for (const batch of chunk(nutritionLineRows, 1000)) await prisma.nutritionDayLine.createMany({ data: batch });
  for (const batch of chunk(batchRows, 500)) await prisma.attendanceBatch.createMany({ data: batch });
  for (const batch of chunk(attendanceRows, 2000)) await prisma.attendanceRecord.createMany({ data: batch });
  for (const batch of chunk(movementRows, 2000)) await prisma.stockMovement.createMany({ data: batch });
  for (const batch of chunk(supplierPriceRows, 2000)) await prisma.supplierPrice.createMany({ data: batch });
  for (const batch of chunk(staffAttendanceRows, 2000)) await prisma.staffAttendance.createMany({ data: batch });

  // Joriy qoldiq snapshoti.
  const stockItemRows: Prisma.StockItemCreateManyInput[] = [];
  for (const [key, cell] of stock) {
    const [branchId, productId] = key.split('|') as [string, string];
    stockItemRows.push({
      tenantId,
      branchId,
      productId,
      quantity: cell.quantity,
      unitCost: cell.unitCost,
      totalValue: money(cell.quantity * cell.unitCost),
      lastMovementAt: cell.lastMovementAt,
    });
  }
  for (const batch of chunk(stockItemRows, 500)) await prisma.stockItem.createMany({ data: batch });

  // Mahsulot tannarxini oxirgi o'rtacha qiymatga tekislash.
  for (const product of products) {
    const cells = [...stock.entries()].filter(([key]) => key.endsWith(`|${product.id}`));
    const totalQuantity = cells.reduce((sum, [, cell]) => sum + cell.quantity, 0);
    if (totalQuantity <= 0) continue;
    const weighted = cells.reduce((sum, [, cell]) => sum + cell.quantity * cell.unitCost, 0);
    await prisma.product.update({
      where: { id: product.id },
      data: { unitCost: money(weighted / totalQuantity) },
    });
  }

  for (const [supplierId, balance] of supplierBalances) {
    await prisma.supplier.update({ where: { id: supplierId }, data: { balance } });
  }

  await seedFinance(ctx, expenseCategories, incomeCategories);
}

// ─────────────────────────────────────────────────────────────
// 7. Moliya: hisob-fakturalar, to'lovlar, ish haqi, budjet
// ─────────────────────────────────────────────────────────────

async function seedFinance(
  ctx: OperationsContext,
  expenseCategories: Map<ExpenseCategoryKind, string>,
  incomeCategories: Map<IncomeCategoryKind, string>,
) {
  const { tenant, today, branches, ownerId } = ctx;
  const tenantId = tenant.id;

  const invoiceRows: Prisma.InvoiceCreateManyInput[] = [];
  const paymentRows: Prisma.PaymentCreateManyInput[] = [];
  const allocationRows: Prisma.PaymentAllocationCreateManyInput[] = [];
  const incomeRows: Prisma.IncomeCreateManyInput[] = [];
  const expenseRows: Prisma.ExpenseCreateManyInput[] = [];

  const periods = [addMonths(today, -2), addMonths(today, -1), monthStart(today)];

  console.log("  • hisob-fakturalar va to'lovlar...");

  for (const periodStart of periods) {
    const period = periodOf(periodStart);
    const isCurrent = period === periodOf(today);
    const dueDate = ymd(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 10);

    for (const branch of branches) {
      for (const group of branch.groups) {
        for (const child of group.children) {
          const activeInPeriod =
            child.enrolledAt <= monthEnd(periodStart) &&
            (child.withdrawnAt === null || child.withdrawnAt > periodStart);
          if (!activeInPeriod) continue;

          const baseAmount = child.monthlyFee;
          const discount = money((baseAmount * child.discountPercent) / 100 + child.discountAmount);
          const totalAmount = money(baseAmount - discount);

          const invoiceId = randomUUID();
          // O'tgan oylarda yig'ilish yuqori, joriy oyda hali to'lanmoqda.
          const roll = rng() * 100;
          let paidRatio: number;
          if (isCurrent) paidRatio = roll < 62 ? 1 : roll < 80 ? 0.5 + rng() * 0.3 : 0;
          else paidRatio = roll < 88 ? 1 : roll < 96 ? 0.4 + rng() * 0.4 : 0;

          const paidAmount = money(totalAmount * paidRatio);
          const balance = money(totalAmount - paidAmount);

          let status: InvoiceStatus;
          if (paidAmount >= totalAmount) status = InvoiceStatus.PAID;
          else if (paidAmount > 0)
            status = dueDate < today ? InvoiceStatus.OVERDUE : InvoiceStatus.PARTIALLY_PAID;
          else status = dueDate < today ? InvoiceStatus.OVERDUE : InvoiceStatus.ISSUED;

          invoiceRows.push({
            id: invoiceId,
            tenantId,
            branchId: branch.id,
            childId: child.id,
            period,
            dueDate,
            baseAmount,
            discountPercent: child.discountPercent,
            discountAmount: discount,
            totalAmount,
            paidAmount,
            balance,
            status,
          });

          if (paidAmount <= 0) continue;

          // To'lov 1 yoki 2 bo'lib amalga oshiriladi.
          const installments = paidRatio === 1 && chance(25) ? 2 : 1;
          let remaining = paidAmount;

          for (let i = 0; i < installments; i += 1) {
            const amount = i === installments - 1 ? remaining : money(paidAmount / 2);
            remaining = money(remaining - amount);
            if (amount <= 0) continue;

            const maxDay = isCurrent ? today.getUTCDate() : monthEnd(periodStart).getUTCDate();
            const paymentDate = ymd(
              periodStart.getUTCFullYear(),
              periodStart.getUTCMonth(),
              Math.min(Math.max(1, randInt(2, 25) + i * 5), maxDay),
            );
            const paymentId = randomUUID();
            const method = chance(55)
              ? PaymentMethod.CASH
              : chance(70)
                ? PaymentMethod.CARD
                : PaymentMethod.BANK_TRANSFER;

            paymentRows.push({
              id: paymentId,
              tenantId,
              branchId: branch.id,
              childId: child.id,
              amount,
              date: paymentDate,
              method,
              receiptNumber: `KV-${period.replace('-', '')}-${randInt(1000, 9999)}`,
              createdById: branch.adminUserId,
            });

            allocationRows.push({ paymentId, invoiceId, amount });

            incomeRows.push({
              tenantId,
              branchId: branch.id,
              categoryId: incomeCategories.get(IncomeCategoryKind.TUITION)!,
              amount,
              date: paymentDate,
              description: `${child.lastName} ${child.firstName} — ${period} oyi uchun to'lov`,
              paymentMethod: method,
              paymentId,
              isAutoGenerated: true,
              createdById: branch.adminUserId,
            });
          }
        }
      }

      // Qo'shimcha xizmatlar daromadi (to'garaklar).
      incomeRows.push({
        tenantId,
        branchId: branch.id,
        categoryId: incomeCategories.get(IncomeCategoryKind.EXTRA_SERVICE)!,
        amount: money(randInt(18, 34) * 250_000),
        date: ymd(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), 12),
        description: 'Ingliz tili va shaxmat to\'garaklari',
        paymentMethod: PaymentMethod.CASH,
        createdById: branch.adminUserId,
      });

      // Oylik doimiy xarajatlar (TZ §17).
      const fixed: Array<[ExpenseCategoryKind, number, string, number]> = [
        [ExpenseCategoryKind.RENT, branch.rent, 'Bino ijarasi', 3],
        [ExpenseCategoryKind.UTILITIES, branch.utilities, 'Kommunal xizmatlar (svet, gaz, suv)', 8],
        [ExpenseCategoryKind.TRANSPORT, money(randInt(9, 15) * 100_000), 'Mahsulot yetkazish transporti', 14],
        [ExpenseCategoryKind.STATIONERY, money(randInt(6, 12) * 100_000), 'Kantselyariya va o\'yinchoqlar', 18],
        [ExpenseCategoryKind.MEDICINE, money(randInt(3, 7) * 100_000), 'Dori-darmon va birinchi yordam', 20],
        [ExpenseCategoryKind.MARKETING, money(randInt(8, 20) * 100_000), 'Instagram reklama va bannerlar', 6],
      ];

      for (const [kind, amount, description, day] of fixed) {
        const date = ymd(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), day);
        if (date > today) continue;
        expenseRows.push({
          tenantId,
          branchId: branch.id,
          categoryId: expenseCategories.get(kind)!,
          amount,
          date,
          description,
          paymentMethod: chance(60) ? PaymentMethod.BANK_TRANSFER : PaymentMethod.CASH,
          createdById: branch.adminUserId,
        });
      }

      // Bir martalik ta'mirlash xarajati.
      if (chance(45)) {
        const date = ymd(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), randInt(10, 24));
        if (date <= today) {
          expenseRows.push({
            tenantId,
            branchId: branch.id,
            categoryId: expenseCategories.get(ExpenseCategoryKind.REPAIR)!,
            amount: money(randInt(15, 45) * 100_000),
            date,
            description: pick([
              'Oshxona jihozini ta\'mirlash',
              'Isitish tizimi profilaktikasi',
              'Guruh xonasi bo\'yog\'i',
            ]),
            paymentMethod: PaymentMethod.CASH,
            createdById: branch.adminUserId,
          });
        }
      }
    }
  }

  for (const batch of chunk(invoiceRows, 1000)) await prisma.invoice.createMany({ data: batch });
  for (const batch of chunk(paymentRows, 1000)) await prisma.payment.createMany({ data: batch });
  for (const batch of chunk(allocationRows, 1000)) await prisma.paymentAllocation.createMany({ data: batch });
  for (const batch of chunk(incomeRows, 1000)) await prisma.income.createMany({ data: batch });
  for (const batch of chunk(expenseRows, 1000)) await prisma.expense.createMany({ data: batch });

  await seedPayroll(ctx, expenseCategories);
  await seedBudgets(ctx, expenseCategories, ownerId);
}

async function seedPayroll(
  ctx: OperationsContext,
  expenseCategories: Map<ExpenseCategoryKind, string>,
) {
  const { tenant, today, branches, staff, ownerId } = ctx;
  const tenantId = tenant.id;
  const taxPercent = 12;

  console.log('  • ish haqi hisob-kitobi...');

  for (const periodStart of [addMonths(today, -2), addMonths(today, -1), monthStart(today)]) {
    const period = periodOf(periodStart);
    const isCurrent = period === periodOf(today);

    for (const branch of branches) {
      const branchStaff = staff.filter((item) => item.branchId === branch.id);
      if (branchStaff.length === 0) continue;

      const payrollId = randomUUID();
      const items: Prisma.PayrollItemCreateManyPayrollInput[] = [];
      let totalGross = 0;
      let totalNet = 0;
      let totalTax = 0;

      const expectedDays = 26;

      for (const member of branchStaff) {
        const workedDays = isCurrent
          ? Math.min(expectedDays, Math.max(1, today.getUTCDate() - 2))
          : randInt(23, 26);
        const baseSalary = member.seed.baseSalary;
        const proratedBase = money((baseSalary * workedDays) / expectedDays);

        const bonuses: Array<{ label: string; amount: number }> = [];
        if (member.seed.monthlyBonus > 0) {
          bonuses.push({ label: 'Oylik bonus', amount: member.seed.monthlyBonus });
        }
        if (chance(18)) {
          bonuses.push({ label: 'Ish sifati uchun ustama', amount: money(randInt(2, 6) * 100_000) });
        }

        const allowances: Array<{ label: string; amount: number }> = [];
        if (member.seed.position === StaffPosition.TEACHER && chance(35)) {
          allowances.push({ label: "Qo'shimcha guruh soati", amount: money(randInt(2, 5) * 100_000) });
        }

        const deductions: Array<{ label: string; amount: number }> = [];
        if (workedDays < 25 && !isCurrent) {
          deductions.push({
            label: `Kelmagan kunlar (${expectedDays - workedDays} kun)`,
            amount: money((baseSalary / expectedDays) * (expectedDays - workedDays) * 0.5),
          });
        }

        const bonusTotal = money(bonuses.reduce((sum, item) => sum + item.amount, 0));
        const allowanceTotal = money(allowances.reduce((sum, item) => sum + item.amount, 0));
        const deductionTotal = money(deductions.reduce((sum, item) => sum + item.amount, 0));
        const grossAmount = money(proratedBase + bonusTotal + allowanceTotal);
        const taxAmount = money((grossAmount * taxPercent) / 100);
        const netAmount = money(grossAmount - taxAmount - deductionTotal);

        totalGross = money(totalGross + grossAmount);
        totalNet = money(totalNet + netAmount);
        totalTax = money(totalTax + taxAmount);

        items.push({
          staffId: member.staffId,
          baseSalary,
          proratedBase,
          bonuses,
          allowances,
          deductions,
          bonusTotal,
          allowanceTotal,
          deductionTotal,
          taxAmount,
          grossAmount,
          netAmount,
          workedDays,
          expectedDays,
        });
      }

      const paidAt = isCurrent ? null : ymd(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, 5);

      await prisma.payroll.create({
        data: {
          id: payrollId,
          tenantId,
          branchId: branch.id,
          period,
          status: isCurrent ? PayrollStatus.DRAFT : PayrollStatus.PAID,
          totalGross,
          totalNet,
          totalTax,
          approvedById: isCurrent ? null : ownerId,
          approvedAt: isCurrent ? null : atLocal(paidAt!, 10, 15),
          paidAt: isCurrent ? null : atLocal(paidAt!, 15, 0),
          items: { createMany: { data: items } },
        },
      });

      // Ish haqi xarajati faqat to'langan oy uchun yoziladi.
      if (!isCurrent) {
        await prisma.expense.create({
          data: {
            tenantId,
            branchId: branch.id,
            categoryId: expenseCategories.get(ExpenseCategoryKind.PAYROLL)!,
            amount: totalGross,
            date: paidAt!,
            description: `${period} oyi uchun ish haqi (${items.length} xodim)`,
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            isAutoGenerated: true,
            payrollId,
            createdById: ownerId,
          },
        });
      }
    }
  }
}

async function seedBudgets(
  ctx: OperationsContext,
  expenseCategories: Map<ExpenseCategoryKind, string>,
  ownerId: string,
) {
  const { tenant, today, branches, staff } = ctx;

  console.log('  • budjet (reja vs fakt)...');

  for (const periodStart of [addMonths(today, -2), addMonths(today, -1), monthStart(today)]) {
    const period = periodOf(periodStart);

    for (const branch of branches) {
      const activeChildren = branch.groups.reduce(
        (total, group) =>
          total + group.children.filter((child) => child.status !== ChildStatus.WITHDRAWN).length,
        0,
      );
      const payrollPlan = money(
        staff
          .filter((item) => item.branchId === branch.id)
          .reduce((sum, item) => sum + item.seed.baseSalary + item.seed.monthlyBonus, 0) * 1.12,
      );

      await prisma.budget.create({
        data: {
          tenantId: tenant.id,
          branchId: branch.id,
          period,
          plannedRevenue: money(activeChildren * branch.monthlyFee * 0.96),
          plannedChildren: activeChildren,
          lines: {
            createMany: {
              data: [
                {
                  categoryId: expenseCategories.get(ExpenseCategoryKind.FOOD)!,
                  plannedAmount: money(activeChildren * 22_000 * 26),
                },
                {
                  categoryId: expenseCategories.get(ExpenseCategoryKind.PAYROLL)!,
                  plannedAmount: payrollPlan,
                },
                {
                  categoryId: expenseCategories.get(ExpenseCategoryKind.RENT)!,
                  plannedAmount: branch.rent,
                },
                {
                  categoryId: expenseCategories.get(ExpenseCategoryKind.UTILITIES)!,
                  plannedAmount: money(branch.utilities * 0.95),
                },
                {
                  categoryId: expenseCategories.get(ExpenseCategoryKind.TRANSPORT)!,
                  plannedAmount: 1_200_000,
                },
              ],
            },
          },
        },
      });
    }
  }

  void ownerId;
}

// ─────────────────────────────────────────────────────────────
// 8. Bildirishnomalar va audit log
// ─────────────────────────────────────────────────────────────

async function seedNotificationsAndAudit(args: {
  tenantId: string;
  branches: BranchState[];
  products: ProductState[];
  ownerId: string;
  superAdminId: string;
  today: Date;
}) {
  const { tenantId, branches, ownerId, today } = args;

  console.log('  • bildirishnoma va audit log...');

  const recipientIds = [ownerId, ...branches.map((branch) => branch.adminUserId)];
  const uniqueRecipients = [...new Set(recipientIds)];

  const lowStock = await prisma.stockItem.findMany({
    where: { tenantId },
    include: { product: true, branch: true },
    orderBy: { quantity: 'asc' },
    take: 40,
  });

  const critical = lowStock
    .filter((item) => Number(item.quantity) < Number(item.product.minQuantity))
    .slice(0, 4);

  const debtors = await prisma.invoice.aggregate({
    where: { tenantId, status: { in: [InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID] } },
    _sum: { balance: true },
    _count: true,
  });

  const pendingOrders = await prisma.purchaseOrder.findMany({
    where: { tenantId, status: PurchaseOrderStatus.PENDING_APPROVAL },
    include: { branch: true },
  });

  interface NotificationSeed {
    kind: NotificationKind;
    severity: NotificationSeverity;
    title: string;
    message: string;
    dedupeKey: string;
    branchId?: string | null;
    entityType?: string;
    entityId?: string;
    metric?: Prisma.InputJsonValue;
    createdAt: Date;
  }

  const notifications: NotificationSeed[] = [];

  for (const item of critical) {
    notifications.push({
      kind: NotificationKind.LOW_STOCK,
      severity: NotificationSeverity.WARNING,
      title: `Ombor: ${item.product.name} kamaydi`,
      message: `${item.branch.name} — qoldiq ${Number(item.quantity)} ${item.product.unit}, minimal ${Number(item.product.minQuantity)} ${item.product.unit}. Xarid qilish tavsiya etiladi.`,
      dedupeKey: `low-stock:${item.branchId}:${item.productId}`,
      branchId: item.branchId,
      entityType: 'Product',
      entityId: item.productId,
      metric: { quantity: Number(item.quantity), minQuantity: Number(item.product.minQuantity) },
      createdAt: atLocal(today, 8, 20),
    });
  }

  if (debtors._count > 0) {
    notifications.push({
      kind: NotificationKind.DEBT_ALERT,
      severity: NotificationSeverity.CRITICAL,
      title: 'Qarzdorlik nazoratdan chiqmoqda',
      message: `${debtors._count} ta hisob-faktura bo'yicha ${Math.round(Number(debtors._sum.balance ?? 0) / 1_000_000)} mln so'm qarzdorlik mavjud. Ota-onalar bilan bog'lanish kerak.`,
      dedupeKey: `debt-alert:${periodOf(today)}`,
      metric: { count: debtors._count, amount: Number(debtors._sum.balance ?? 0) },
      createdAt: atLocal(today, 9, 5),
    });
  }

  for (const order of pendingOrders) {
    notifications.push({
      kind: NotificationKind.PURCHASE_APPROVAL,
      severity: NotificationSeverity.INFO,
      title: `Xarid so'rovi tasdiqlash kutilmoqda: ${order.number}`,
      message: `${order.branch.name} — ${Math.round(Number(order.totalAmount) / 1000)} ming so'mlik avtomatik xarid rejasi tasdiqlashingizni kutmoqda.`,
      dedupeKey: `purchase-approval:${order.id}`,
      branchId: order.branchId,
      entityType: 'PurchaseOrder',
      entityId: order.id,
      metric: { amount: Number(order.totalAmount) },
      createdAt: atLocal(today, 10, 40),
    });
  }

  notifications.push(
    {
      kind: NotificationKind.PRICE_SPIKE,
      severity: NotificationSeverity.WARNING,
      title: "Go'sht narxi keskin oshdi",
      message: "\"Navoiy Go'sht Savdo\" bo'yicha mol go'shti narxi o'tgan oyga nisbatan 4.2% oshdi. Alternativ yetkazib beruvchini ko'rib chiqing.",
      dedupeKey: `price-spike:${periodOf(today)}:meat`,
      metric: { changePercent: 4.2 },
      createdAt: atLocal(addDays(today, -1), 14, 12),
    },
    {
      kind: NotificationKind.ATTENDANCE_DROP,
      severity: NotificationSeverity.WARNING,
      title: 'Davomat pasaydi',
      message: `${branches[1]?.name ?? 'Filial'} — bugungi davomat o'rtacha ko'rsatkichdan 11% past. Sabab: mavsumiy shamollash.`,
      dedupeKey: `attendance-drop:${branches[1]?.id ?? 'branch'}:${periodOf(today)}`,
      branchId: branches[1]?.id ?? null,
      metric: { dropPercent: 11 },
      createdAt: atLocal(today, 9, 45),
    },
    {
      kind: NotificationKind.BUDGET_EXCEEDED,
      severity: NotificationSeverity.CRITICAL,
      title: "Oziq-ovqat budjeti oshdi",
      message: `${branches[0]?.name ?? 'Filial'} — oziq-ovqat xarajati rejadan 8.4% oshdi. Norma va menyuni qayta ko'rib chiqish tavsiya etiladi.`,
      dedupeKey: `budget-exceeded:${branches[0]?.id ?? 'branch'}:${periodOf(today)}:food`,
      branchId: branches[0]?.id ?? null,
      metric: { overrunPercent: 8.4 },
      createdAt: atLocal(addDays(today, -2), 17, 30),
    },
  );

  for (const notification of notifications) {
    const { createdAt, ...rest } = notification;
    await prisma.notification.create({
      data: {
        tenantId,
        ...rest,
        createdAt,
        recipients: {
          createMany: {
            data: uniqueRecipients.map((userId, index) => ({
              userId,
              readAt: index === 0 && chance(40) ? atLocal(today, 11, 0) : null,
            })),
          },
        },
      },
    });
  }

  // Audit log namunalari (TZ §29) — eski va yangi qiymat bilan.
  const sampleNutritionDay = await prisma.nutritionDay.findFirst({
    where: { tenantId },
    orderBy: { date: 'desc' },
    include: { lines: { take: 1, include: { product: true } } },
  });

  const auditRows: Prisma.AuditLogCreateManyInput[] = [
    {
      tenantId,
      userId: ownerId,
      action: AuditAction.LOGIN,
      entityType: 'Auth',
      summary: 'Tizimga kirdi',
      ipAddress: '92.63.201.14',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0',
      createdAt: atLocal(today, 8, 12),
    },
    {
      tenantId,
      userId: branches[0]?.adminUserId,
      action: AuditAction.APPROVE,
      entityType: 'PurchaseOrder',
      entityId: pendingOrders[0]?.id ?? null,
      summary: "Haftalik oziq-ovqat xaridi tasdiqlandi",
      reason: 'Ombor qoldig\'i minimal darajaga tushdi',
      createdAt: atLocal(addDays(today, -1), 9, 35),
    },
  ];

  if (sampleNutritionDay?.lines[0]) {
    const line = sampleNutritionDay.lines[0];
    const oldQuantity = Number(line.actualQuantity);
    const newQuantity = qty(oldQuantity * 0.8);

    auditRows.push({
      tenantId,
      userId: branches[0]?.adminUserId,
      action: AuditAction.UPDATE,
      entityType: 'NutritionDayLine',
      entityId: line.id,
      summary: `${line.product.name} sarfi: ${oldQuantity} → ${newQuantity} ${line.unit}`,
      reason: '2 bola tushlikdan oldin uyga ketdi',
      oldValue: { actualQuantity: oldQuantity },
      newValue: { actualQuantity: newQuantity },
      changedFields: ['actualQuantity'],
      createdAt: atLocal(addDays(today, -3), 16, 5),
    });
  }

  await prisma.auditLog.createMany({ data: auditRows });
}

// ─────────────────────────────────────────────────────────────
// 9. Yakuniy hisobot
// ─────────────────────────────────────────────────────────────

async function printSummary(tenantId: string) {
  const [children, groups, staff, attendance, movements, invoices, payments, expenses, incomes, stock] =
    await Promise.all([
      prisma.child.count({ where: { tenantId } }),
      prisma.group.count({ where: { tenantId } }),
      prisma.staff.count({ where: { tenantId } }),
      prisma.attendanceRecord.count({ where: { tenantId } }),
      prisma.stockMovement.count({ where: { tenantId } }),
      prisma.invoice.count({ where: { tenantId } }),
      prisma.payment.count({ where: { tenantId } }),
      prisma.expense.aggregate({ where: { tenantId }, _sum: { amount: true } }),
      prisma.income.aggregate({ where: { tenantId }, _sum: { amount: true } }),
      prisma.stockItem.aggregate({ where: { tenantId }, _sum: { totalValue: true } }),
    ]);

  const revenue = Number(incomes._sum.amount ?? 0);
  const expense = Number(expenses._sum.amount ?? 0);
  const mln = (value: number) => `${(value / 1_000_000).toFixed(1)} mln`;

  console.log('\n✅ Seed tugadi\n');
  console.log('  Bolalar:', children, '| Guruhlar:', groups, '| Xodimlar:', staff);
  console.log('  Davomat yozuvlari:', attendance, '| Ombor harakatlari:', movements);
  console.log("  Hisob-fakturalar:", invoices, "| To'lovlar:", payments);
  console.log('  Jami daromad:', mln(revenue), "so'm");
  console.log('  Jami xarajat:', mln(expense), "so'm");
  console.log('  Sof foyda:', mln(revenue - expense), "so'm");
  console.log('  Ombor qiymati:', mln(Number(stock._sum.totalValue ?? 0)), "so'm");
  console.log('\n  Kirish uchun (parol: %s):', DEFAULT_PASSWORD);
  console.log('   • Super admin:   ', SUPER_ADMIN_PHONE);
  console.log('   • Egasi (Owner): +998901110001');
  console.log('   • Administrator: +998901110002');
  console.log('   • Tarbiyachi:    +998901110011');
  console.log('   • Oshpaz:        +998901110021');
  console.log('   • Omborchi:      +998901110031');
  console.log('   • Buxgalter:     +998901110041\n');
}

main()
  .catch((error) => {
    console.error('❌ Seed xatosi:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
