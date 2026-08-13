/**
 * Seed uchun statik katalog: mahsulotlar, retseptlar, haftalik menyu va ismlar.
 * Raqamlar O'zbekistondagi real bog'cha amaliyotiga yaqin olingan (narxlar so'mda,
 * retseptlar 100 bola uchun).
 */

import { MealType, StaffPosition, Unit, Weekday } from '@prisma/client';

export const PRODUCT_CATEGORIES = [
  "Go'sht va baliq",
  'Yorma va makaron',
  'Sabzavotlar',
  'Sut mahsulotlari',
  'Non va shirinlik',
  "Yog' va ziravor",
  'Mevalar',
  "Xo'jalik mollari",
] as const;

export type ProductCategoryName = (typeof PRODUCT_CATEGORIES)[number];

export interface ProductSeed {
  name: string;
  category: ProductCategoryName;
  unit: Unit;
  unitCost: number;
  minQuantity: number;
  maxQuantity?: number;
  shelfLifeDays?: number;
}

export const PRODUCTS: ProductSeed[] = [
  { name: "Mol go'shti", category: "Go'sht va baliq", unit: Unit.KG, unitCost: 92_000, minQuantity: 15, maxQuantity: 120, shelfLifeDays: 5 },
  { name: "Tovuq go'shti", category: "Go'sht va baliq", unit: Unit.KG, unitCost: 38_000, minQuantity: 12, maxQuantity: 100, shelfLifeDays: 4 },

  { name: 'Guruch', category: 'Yorma va makaron', unit: Unit.KG, unitCost: 18_000, minQuantity: 25, maxQuantity: 200 },
  { name: 'Makaron', category: 'Yorma va makaron', unit: Unit.KG, unitCost: 12_000, minQuantity: 15, maxQuantity: 120 },
  { name: 'Grechka', category: 'Yorma va makaron', unit: Unit.KG, unitCost: 22_000, minQuantity: 8, maxQuantity: 60 },
  { name: 'Manniy yormasi', category: 'Yorma va makaron', unit: Unit.KG, unitCost: 11_000, minQuantity: 8, maxQuantity: 60 },
  { name: 'Suli yormasi', category: 'Yorma va makaron', unit: Unit.KG, unitCost: 14_000, minQuantity: 8, maxQuantity: 60 },
  { name: "No'xat", category: 'Yorma va makaron', unit: Unit.KG, unitCost: 16_000, minQuantity: 6, maxQuantity: 50 },

  { name: 'Kartoshka', category: 'Sabzavotlar', unit: Unit.KG, unitCost: 6_500, minQuantity: 40, maxQuantity: 350, shelfLifeDays: 30 },
  { name: 'Sabzi', category: 'Sabzavotlar', unit: Unit.KG, unitCost: 5_500, minQuantity: 20, maxQuantity: 180, shelfLifeDays: 21 },
  { name: 'Piyoz', category: 'Sabzavotlar', unit: Unit.KG, unitCost: 4_500, minQuantity: 20, maxQuantity: 150, shelfLifeDays: 30 },
  { name: 'Pomidor', category: 'Sabzavotlar', unit: Unit.KG, unitCost: 9_000, minQuantity: 10, maxQuantity: 80, shelfLifeDays: 7 },
  { name: 'Karam', category: 'Sabzavotlar', unit: Unit.KG, unitCost: 4_000, minQuantity: 10, maxQuantity: 80, shelfLifeDays: 14 },

  { name: 'Sut', category: 'Sut mahsulotlari', unit: Unit.LITER, unitCost: 12_000, minQuantity: 40, maxQuantity: 250, shelfLifeDays: 5 },
  { name: 'Qatiq', category: 'Sut mahsulotlari', unit: Unit.LITER, unitCost: 14_000, minQuantity: 15, maxQuantity: 100, shelfLifeDays: 5 },
  { name: 'Tvorog', category: 'Sut mahsulotlari', unit: Unit.KG, unitCost: 32_000, minQuantity: 8, maxQuantity: 60, shelfLifeDays: 5 },
  { name: "Sariyog'", category: 'Sut mahsulotlari', unit: Unit.KG, unitCost: 78_000, minQuantity: 6, maxQuantity: 40, shelfLifeDays: 30 },
  { name: 'Pishloq', category: 'Sut mahsulotlari', unit: Unit.KG, unitCost: 65_000, minQuantity: 4, maxQuantity: 30, shelfLifeDays: 20 },
  { name: 'Tuxum', category: 'Sut mahsulotlari', unit: Unit.PIECE, unitCost: 1_300, minQuantity: 250, maxQuantity: 2_000, shelfLifeDays: 20 },

  { name: 'Non', category: 'Non va shirinlik', unit: Unit.PIECE, unitCost: 3_500, minQuantity: 60, maxQuantity: 400, shelfLifeDays: 2 },
  { name: 'Bulochka', category: 'Non va shirinlik', unit: Unit.PIECE, unitCost: 2_500, minQuantity: 60, maxQuantity: 400, shelfLifeDays: 3 },
  { name: 'Pechene', category: 'Non va shirinlik', unit: Unit.KG, unitCost: 34_000, minQuantity: 10, maxQuantity: 70 },
  { name: 'Shakar', category: 'Non va shirinlik', unit: Unit.KG, unitCost: 13_500, minQuantity: 20, maxQuantity: 140 },
  { name: 'Choy', category: 'Non va shirinlik', unit: Unit.KG, unitCost: 60_000, minQuantity: 3, maxQuantity: 20 },

  { name: "O'simlik yog'i", category: "Yog' va ziravor", unit: Unit.LITER, unitCost: 24_000, minQuantity: 20, maxQuantity: 150 },
  { name: 'Tuz', category: "Yog' va ziravor", unit: Unit.KG, unitCost: 2_500, minQuantity: 10, maxQuantity: 60 },
  { name: 'Ziravor', category: "Yog' va ziravor", unit: Unit.KG, unitCost: 45_000, minQuantity: 3, maxQuantity: 15 },

  { name: 'Olma', category: 'Mevalar', unit: Unit.KG, unitCost: 14_000, minQuantity: 15, maxQuantity: 100, shelfLifeDays: 14 },
  { name: 'Banan', category: 'Mevalar', unit: Unit.KG, unitCost: 18_000, minQuantity: 12, maxQuantity: 80, shelfLifeDays: 7 },

  { name: 'Yuvish vositasi', category: "Xo'jalik mollari", unit: Unit.PIECE, unitCost: 22_000, minQuantity: 6, maxQuantity: 40 },
  { name: 'Salfetka', category: "Xo'jalik mollari", unit: Unit.PACK, unitCost: 9_000, minQuantity: 12, maxQuantity: 80 },
];

export interface SupplierSeed {
  name: string;
  phone: string;
  contactPerson: string;
  address: string;
  inn: string;
  categories: ProductCategoryName[];
  /** Oyiga o'rtacha narx o'sishi (%) — narx tarixini yaratish uchun. */
  monthlyDrift: number;
}

export const SUPPLIERS: SupplierSeed[] = [
  {
    name: '"Navoiy Go\'sht Savdo" MChJ',
    phone: '+998 91 220 45 67',
    contactPerson: 'Sherzod Qurbonov',
    address: 'Navoiy sh., Do\'stlik ko\'chasi 14',
    inn: '304556781',
    categories: ["Go'sht va baliq"],
    monthlyDrift: 4.2,
  },
  {
    name: '"Zarafshon Agro" fermer xo\'jaligi',
    phone: '+998 93 305 18 22',
    contactPerson: 'Bahodir Ismoilov',
    address: 'Karmana tumani, Yangiobod QFY',
    inn: '301778452',
    categories: ['Sabzavotlar', 'Mevalar'],
    monthlyDrift: 2.6,
  },
  {
    name: '"Oq Sut" sut mahsulotlari',
    phone: '+998 90 411 76 09',
    contactPerson: 'Nodira Saidova',
    address: 'Navoiy sh., Galaba shoh ko\'chasi 3',
    inn: '308991234',
    categories: ['Sut mahsulotlari'],
    monthlyDrift: 1.8,
  },
  {
    name: '"Optom Baraka" ulgurji savdo',
    phone: '+998 97 512 33 41',
    contactPerson: 'Rustam Alimov',
    address: 'Navoiy sh., Markaziy bozor, 2-blok',
    inn: '302445667',
    categories: ['Yorma va makaron', 'Non va shirinlik', "Yog' va ziravor", "Xo'jalik mollari"],
    monthlyDrift: 2.1,
  },
];

export interface RecipeItemSeed {
  product: string;
  quantity: number;
  unit: Unit;
}

export interface RecipeSeed {
  name: string;
  mealType: MealType;
  wastePercent: number;
  caloriesPerPortion: number;
  instructions: string;
  items: RecipeItemSeed[];
}

/** Barcha retseptlar 100 bola uchun yozilgan (TZ §11). */
export const RECIPES: RecipeSeed[] = [
  {
    name: "Sutli guruch bo'tqasi",
    mealType: MealType.BREAKFAST,
    wastePercent: 2,
    caloriesPerPortion: 290,
    instructions: "Guruch yuviladi, sutda qaynatiladi, shakar va sariyog' qo'shiladi.",
    items: [
      { product: 'Guruch', quantity: 6, unit: Unit.KG },
      { product: 'Sut', quantity: 20, unit: Unit.LITER },
      { product: 'Shakar', quantity: 2, unit: Unit.KG },
      { product: "Sariyog'", quantity: 1, unit: Unit.KG },
      { product: 'Tuz', quantity: 0.1, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: "Manniy bo'tqasi",
    mealType: MealType.BREAKFAST,
    wastePercent: 2,
    caloriesPerPortion: 275,
    instructions: 'Sut qaynatilib, manniy yormasi sekin sepiladi va aralashtiriladi.',
    items: [
      { product: 'Manniy yormasi', quantity: 5, unit: Unit.KG },
      { product: 'Sut', quantity: 22, unit: Unit.LITER },
      { product: 'Shakar', quantity: 2, unit: Unit.KG },
      { product: "Sariyog'", quantity: 1, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: 'Omlet va pishloq',
    mealType: MealType.BREAKFAST,
    wastePercent: 3,
    caloriesPerPortion: 310,
    instructions: "Tuxum sut bilan ko'piklanadi, pechda pishiriladi, ustiga pishloq surtiladi.",
    items: [
      { product: 'Tuxum', quantity: 150, unit: Unit.PIECE },
      { product: 'Sut', quantity: 6, unit: Unit.LITER },
      { product: "Sariyog'", quantity: 1, unit: Unit.KG },
      { product: 'Pishloq', quantity: 2, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
      { product: 'Tuz', quantity: 0.15, unit: Unit.KG },
    ],
  },
  {
    name: "Suli bo'tqasi",
    mealType: MealType.BREAKFAST,
    wastePercent: 2,
    caloriesPerPortion: 265,
    instructions: "Suli yormasi sutda 15 daqiqa qaynatiladi, sariyog' qo'shiladi.",
    items: [
      { product: 'Suli yormasi', quantity: 5, unit: Unit.KG },
      { product: 'Sut', quantity: 20, unit: Unit.LITER },
      { product: 'Shakar', quantity: 1.8, unit: Unit.KG },
      { product: "Sariyog'", quantity: 0.8, unit: Unit.KG },
      { product: 'Non', quantity: 45, unit: Unit.PIECE },
    ],
  },
  {
    name: 'Tvorogli zapekanka',
    mealType: MealType.BREAKFAST,
    wastePercent: 3,
    caloriesPerPortion: 330,
    instructions: 'Tvorog tuxum va manniy bilan aralashtirilib, pechda pishiriladi.',
    items: [
      { product: 'Tvorog', quantity: 8, unit: Unit.KG },
      { product: 'Tuxum', quantity: 40, unit: Unit.PIECE },
      { product: 'Shakar', quantity: 2, unit: Unit.KG },
      { product: 'Manniy yormasi', quantity: 1.5, unit: Unit.KG },
      { product: "Sariyog'", quantity: 1, unit: Unit.KG },
      { product: 'Sut', quantity: 4, unit: Unit.LITER },
    ],
  },

  {
    name: 'Osh',
    mealType: MealType.LUNCH,
    wastePercent: 3,
    caloriesPerPortion: 520,
    instructions: "Sabzi va piyoz qovuriladi, go'sht qo'shiladi, guruch damlanadi.",
    items: [
      { product: 'Guruch', quantity: 10, unit: Unit.KG },
      { product: "Mol go'shti", quantity: 8, unit: Unit.KG },
      { product: 'Sabzi', quantity: 8, unit: Unit.KG },
      { product: 'Piyoz', quantity: 3, unit: Unit.KG },
      { product: "O'simlik yog'i", quantity: 3, unit: Unit.LITER },
      { product: 'Tuz', quantity: 0.3, unit: Unit.KG },
      { product: 'Ziravor', quantity: 0.2, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: 'Mastava',
    mealType: MealType.LUNCH,
    wastePercent: 4,
    caloriesPerPortion: 430,
    instructions: "Go'sht va sabzavotlar qovuriladi, suv quyilib guruch bilan qaynatiladi.",
    items: [
      { product: 'Guruch', quantity: 4, unit: Unit.KG },
      { product: "Mol go'shti", quantity: 6, unit: Unit.KG },
      { product: 'Kartoshka', quantity: 8, unit: Unit.KG },
      { product: 'Sabzi', quantity: 4, unit: Unit.KG },
      { product: 'Piyoz', quantity: 2.5, unit: Unit.KG },
      { product: 'Pomidor', quantity: 3, unit: Unit.KG },
      { product: "O'simlik yog'i", quantity: 1.5, unit: Unit.LITER },
      { product: 'Tuz', quantity: 0.3, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: 'Kartoshkali qovurma',
    mealType: MealType.LUNCH,
    wastePercent: 4,
    caloriesPerPortion: 480,
    instructions: "Tovuq go'shti qovuriladi, kartoshka va sabzavot qo'shib dimlanadi.",
    items: [
      { product: 'Kartoshka', quantity: 15, unit: Unit.KG },
      { product: "Tovuq go'shti", quantity: 9, unit: Unit.KG },
      { product: 'Piyoz', quantity: 3, unit: Unit.KG },
      { product: 'Sabzi', quantity: 3, unit: Unit.KG },
      { product: "O'simlik yog'i", quantity: 2.5, unit: Unit.LITER },
      { product: 'Tuz', quantity: 0.3, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: "Makaron va go'shtli sous",
    mealType: MealType.LUNCH,
    wastePercent: 3,
    caloriesPerPortion: 460,
    instructions: "Makaron qaynatiladi, go'shtli pomidor sousi bilan beriladi.",
    items: [
      { product: 'Makaron', quantity: 8, unit: Unit.KG },
      { product: "Mol go'shti", quantity: 6, unit: Unit.KG },
      { product: 'Pomidor', quantity: 4, unit: Unit.KG },
      { product: 'Piyoz', quantity: 2.5, unit: Unit.KG },
      { product: "O'simlik yog'i", quantity: 2, unit: Unit.LITER },
      { product: 'Tuz', quantity: 0.25, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: "No'xatli sho'rva",
    mealType: MealType.LUNCH,
    wastePercent: 4,
    caloriesPerPortion: 410,
    instructions: "No'xat oldindan ivitiladi, go'sht va sabzavot bilan qaynatiladi.",
    items: [
      { product: "No'xat", quantity: 5, unit: Unit.KG },
      { product: "Mol go'shti", quantity: 6, unit: Unit.KG },
      { product: 'Kartoshka', quantity: 10, unit: Unit.KG },
      { product: 'Sabzi', quantity: 4, unit: Unit.KG },
      { product: 'Piyoz', quantity: 2.5, unit: Unit.KG },
      { product: "O'simlik yog'i", quantity: 1.5, unit: Unit.LITER },
      { product: 'Tuz', quantity: 0.3, unit: Unit.KG },
      { product: 'Non', quantity: 50, unit: Unit.PIECE },
    ],
  },
  {
    name: 'Grechka va tovuq kotleti',
    mealType: MealType.LUNCH,
    wastePercent: 4,
    caloriesPerPortion: 470,
    instructions: 'Grechka qaynatiladi, tovuq kotletlari pechda pishiriladi.',
    items: [
      { product: 'Grechka', quantity: 7, unit: Unit.KG },
      { product: "Tovuq go'shti", quantity: 8, unit: Unit.KG },
      { product: 'Tuxum', quantity: 30, unit: Unit.PIECE },
      { product: 'Piyoz', quantity: 2, unit: Unit.KG },
      { product: "O'simlik yog'i", quantity: 2, unit: Unit.LITER },
      { product: 'Tuz', quantity: 0.25, unit: Unit.KG },
      { product: 'Non', quantity: 45, unit: Unit.PIECE },
    ],
  },

  {
    name: 'Pechene va choy',
    mealType: MealType.SNACK,
    wastePercent: 1,
    caloriesPerPortion: 180,
    instructions: 'Choy damlanadi, pechene bilan beriladi.',
    items: [
      { product: 'Pechene', quantity: 4, unit: Unit.KG },
      { product: 'Shakar', quantity: 2, unit: Unit.KG },
      { product: 'Choy', quantity: 0.15, unit: Unit.KG },
    ],
  },
  {
    name: 'Sut va bulochka',
    mealType: MealType.SNACK,
    wastePercent: 1,
    caloriesPerPortion: 210,
    instructions: 'Iliq sut va yangi bulochka.',
    items: [
      { product: 'Sut', quantity: 15, unit: Unit.LITER },
      { product: 'Bulochka', quantity: 100, unit: Unit.PIECE },
    ],
  },
  {
    name: 'Qatiq va olma',
    mealType: MealType.SNACK,
    wastePercent: 2,
    caloriesPerPortion: 165,
    instructions: 'Qatiq va yuvilgan olma bo\'laklari.',
    items: [
      { product: 'Qatiq', quantity: 12, unit: Unit.LITER },
      { product: 'Olma', quantity: 12, unit: Unit.KG },
    ],
  },
  {
    name: 'Banan va sut',
    mealType: MealType.SNACK,
    wastePercent: 2,
    caloriesPerPortion: 195,
    instructions: 'Banan bo\'laklari va iliq sut.',
    items: [
      { product: 'Banan', quantity: 10, unit: Unit.KG },
      { product: 'Sut', quantity: 15, unit: Unit.LITER },
    ],
  },
  {
    name: 'Tvorog va meva',
    mealType: MealType.SNACK,
    wastePercent: 2,
    caloriesPerPortion: 205,
    instructions: 'Tvorog shakar va olma bilan aralashtiriladi.',
    items: [
      { product: 'Tvorog', quantity: 6, unit: Unit.KG },
      { product: 'Olma', quantity: 8, unit: Unit.KG },
      { product: 'Shakar', quantity: 1, unit: Unit.KG },
    ],
  },
];

/** Haftalik menyu: har kun uchun nonushta / tushlik / poldnik (TZ §10). */
export const WEEKLY_MENU: Array<{
  weekday: Weekday;
  breakfast: string;
  lunch: string;
  snack: string;
}> = [
  { weekday: Weekday.MONDAY, breakfast: "Sutli guruch bo'tqasi", lunch: 'Osh', snack: 'Pechene va choy' },
  { weekday: Weekday.TUESDAY, breakfast: 'Omlet va pishloq', lunch: 'Mastava', snack: 'Sut va bulochka' },
  { weekday: Weekday.WEDNESDAY, breakfast: "Manniy bo'tqasi", lunch: 'Kartoshkali qovurma', snack: 'Qatiq va olma' },
  { weekday: Weekday.THURSDAY, breakfast: "Suli bo'tqasi", lunch: "Makaron va go'shtli sous", snack: 'Banan va sut' },
  { weekday: Weekday.FRIDAY, breakfast: 'Tvorogli zapekanka', lunch: "No'xatli sho'rva", snack: 'Tvorog va meva' },
  { weekday: Weekday.SATURDAY, breakfast: "Sutli guruch bo'tqasi", lunch: 'Grechka va tovuq kotleti', snack: 'Pechene va choy' },
];

export const BOY_NAMES = [
  'Aziz', 'Sardor', 'Javohir', 'Bekzod', 'Diyor', 'Islom', 'Doniyor', 'Temur', 'Anvar', 'Rustam',
  'Nodirbek', 'Shohruh', 'Amir', 'Umid', 'Behruz', 'Alisher', 'Jasur', 'Muhammadali', 'Otabek', 'Ravshan',
  'Farrux', 'Ulugbek', 'Sanjar', 'Elyor', 'Nurbek', 'Xurshid', 'Asadbek', 'Davron', 'Ibrohim', 'Yusuf',
];

export const GIRL_NAMES = [
  'Zilola', 'Nilufar', 'Madina', 'Sevinch', 'Dilnoza', 'Oisha', 'Zaynab', 'Malika', 'Gulnora', 'Kamola',
  'Robiya', 'Shahzoda', 'Nafisa', 'Mohira', 'Sarvinoz', 'Umida', 'Feruza', 'Laylo', 'Iroda', 'Dildora',
  'Munisa', 'Zuhra', 'Ozoda', 'Rayhona', 'Sitora', 'Xadicha', 'Muslima', 'Gulruh', 'Asal', 'Nozima',
];

export const SURNAMES = [
  'Karimov', 'Rahimov', 'Tursunov', 'Yusupov', 'Sattorov', 'Abdullayev', 'Ergashev', 'Xolmatov',
  'Nazarov', 'Qodirov', 'Ismoilov', "Jo'rayev", 'Mirzayev', 'Sharipov', 'Toshmatov', 'Umarov',
  'Hakimov', 'Saidov', 'Norboyev', 'Alimov', 'Bahodirov', 'Salimov', 'Yo\'ldoshev', 'Muminov',
];

export const FATHER_NAMES = [
  'Baxtiyor', 'Shuhrat', 'Ilhom', 'Qahramon', 'Otabek', 'Sherzod', 'Mirzo', 'Akmal', 'Dilshod',
  'Zafar', 'Ravshan', 'Bahrom', 'Ulugbek', 'Farhod', 'Jahongir', 'Odil',
];

export const MOTHER_NAMES = [
  'Gulnoza', 'Dilfuza', 'Mavluda', 'Zulfiya', 'Nargiza', 'Saodat', 'Munira', 'Xurshida',
  'Nasiba', 'Ra\'no', 'Shahnoza', 'Gulchehra', 'Zebo', 'Malohat', 'Dildora', 'Sevara',
];

export const WORKPLACES = [
  'Navoiy KMK', 'Maktab №12', 'Tibbiyot birlashmasi', 'Xususiy tadbirkor', 'Bank filiali',
  '"Agro Servis" MChJ', 'Temir yo\'l depo', 'Uy bekasi', 'Soliq inspeksiyasi', 'IT kompaniya',
];

export interface StaffSeed {
  firstName: string;
  lastName: string;
  middleName: string;
  position: StaffPosition;
  baseSalary: number;
  monthlyBonus: number;
  /** Tizimga kirish uchun login (telefon). Bo'sh bo'lsa foydalanuvchi yaratilmaydi. */
  login?: string;
  role?: 'ADMINISTRATOR' | 'TEACHER' | 'COOK' | 'STOREKEEPER' | 'ACCOUNTANT';
  /** Tarbiyachi biriktiriladigan guruh indeksi. */
  groupIndex?: number;
  isPrimaryTeacher?: boolean;
}

export const NAVOIY_STAFF: StaffSeed[] = [
  { firstName: 'Nodira', lastName: 'Saidova', middleName: 'Alisher qizi', position: StaffPosition.ADMINISTRATOR, baseSalary: 6_500_000, monthlyBonus: 800_000, login: '+998901110002', role: 'ADMINISTRATOR' },
  { firstName: 'Gulnora', lastName: 'Tursunova', middleName: 'Rahim qizi', position: StaffPosition.TEACHER, baseSalary: 4_200_000, monthlyBonus: 400_000, login: '+998901110011', role: 'TEACHER', groupIndex: 0, isPrimaryTeacher: true },
  { firstName: 'Dilnoza', lastName: 'Karimova', middleName: 'Baxtiyor qizi', position: StaffPosition.TEACHER, baseSalary: 3_900_000, monthlyBonus: 300_000, login: '+998901110012', role: 'TEACHER', groupIndex: 1, isPrimaryTeacher: true },
  { firstName: 'Sevara', lastName: 'Yusupova', middleName: 'Odil qizi', position: StaffPosition.TEACHER, baseSalary: 4_400_000, monthlyBonus: 450_000, login: '+998901110013', role: 'TEACHER', groupIndex: 2, isPrimaryTeacher: true },
  { firstName: 'Kamola', lastName: 'Ergasheva', middleName: 'Zafar qizi', position: StaffPosition.TEACHER, baseSalary: 4_100_000, monthlyBonus: 350_000, login: '+998901110014', role: 'TEACHER', groupIndex: 3, isPrimaryTeacher: true },
  { firstName: 'Feruza', lastName: 'Nazarova', middleName: 'Ilhom qizi', position: StaffPosition.ASSISTANT, baseSalary: 2_800_000, monthlyBonus: 150_000 },
  { firstName: 'Malika', lastName: 'Qodirova', middleName: 'Shuhrat qizi', position: StaffPosition.ASSISTANT, baseSalary: 2_800_000, monthlyBonus: 150_000 },
  { firstName: 'Zebo', lastName: 'Mirzayeva', middleName: 'Akmal qizi', position: StaffPosition.COOK, baseSalary: 3_600_000, monthlyBonus: 300_000, login: '+998901110021', role: 'COOK' },
  { firstName: 'Oybek', lastName: 'Sharipov', middleName: 'Farhod ogli', position: StaffPosition.STOREKEEPER, baseSalary: 3_400_000, monthlyBonus: 250_000, login: '+998901110031', role: 'STOREKEEPER' },
  { firstName: 'Aziza', lastName: 'Hakimova', middleName: 'Bahrom qizi', position: StaffPosition.ACCOUNTANT, baseSalary: 5_200_000, monthlyBonus: 600_000, login: '+998901110041', role: 'ACCOUNTANT' },
  { firstName: 'Munisa', lastName: 'Alimova', middleName: 'Jahongir qizi', position: StaffPosition.NURSE, baseSalary: 3_200_000, monthlyBonus: 200_000 },
  { firstName: 'Sobir', lastName: 'Umarov', middleName: 'Ravshan ogli', position: StaffPosition.SECURITY, baseSalary: 2_600_000, monthlyBonus: 100_000 },
  { firstName: 'Ozoda', lastName: 'Toshmatova', middleName: 'Qahramon qizi', position: StaffPosition.CLEANER, baseSalary: 2_400_000, monthlyBonus: 100_000 },
];

export const KARMANA_STAFF: StaffSeed[] = [
  { firstName: 'Shahnoza', lastName: 'Abdullayeva', middleName: 'Mirzo qizi', position: StaffPosition.ADMINISTRATOR, baseSalary: 5_800_000, monthlyBonus: 700_000, login: '+998902220002', role: 'ADMINISTRATOR' },
  { firstName: 'Nasiba', lastName: 'Xolmatova', middleName: 'Dilshod qizi', position: StaffPosition.TEACHER, baseSalary: 3_800_000, monthlyBonus: 300_000, login: '+998902220011', role: 'TEACHER', groupIndex: 0, isPrimaryTeacher: true },
  { firstName: 'Umida', lastName: 'Ismoilova', middleName: 'Sherzod qizi', position: StaffPosition.TEACHER, baseSalary: 3_700_000, monthlyBonus: 250_000, login: '+998902220012', role: 'TEACHER', groupIndex: 1, isPrimaryTeacher: true },
  { firstName: 'Laylo', lastName: 'Norboyeva', middleName: 'Otabek qizi', position: StaffPosition.TEACHER, baseSalary: 3_900_000, monthlyBonus: 320_000, login: '+998902220013', role: 'TEACHER', groupIndex: 2, isPrimaryTeacher: true },
  { firstName: 'Robiya', lastName: 'Salimova', middleName: 'Ulugbek qizi', position: StaffPosition.ASSISTANT, baseSalary: 2_600_000, monthlyBonus: 120_000 },
  { firstName: 'Mavluda', lastName: "Jo'rayeva", middleName: 'Bahodir qizi', position: StaffPosition.COOK, baseSalary: 3_300_000, monthlyBonus: 250_000, login: '+998902220021', role: 'COOK' },
  { firstName: 'Rustam', lastName: 'Bahodirov', middleName: 'Salim ogli', position: StaffPosition.STOREKEEPER, baseSalary: 3_100_000, monthlyBonus: 200_000, login: '+998902220031', role: 'STOREKEEPER' },
  { firstName: 'Nozima', lastName: 'Muminova', middleName: 'Anvar qizi', position: StaffPosition.CLEANER, baseSalary: 2_300_000, monthlyBonus: 80_000 },
  { firstName: 'Islom', lastName: 'Yoldoshev', middleName: 'Temur ogli', position: StaffPosition.SECURITY, baseSalary: 2_500_000, monthlyBonus: 100_000 },
];

export interface GroupSeed {
  name: string;
  ageFrom: number;
  ageTo: number;
  capacity: number;
  fill: number;
  colorToken: string;
}

export const NAVOIY_GROUPS: GroupSeed[] = [
  { name: 'Kichik guruh', ageFrom: 2, ageTo: 3, capacity: 25, fill: 22, colorToken: 'sky' },
  { name: "O'rta guruh", ageFrom: 3, ageTo: 4, capacity: 28, fill: 26, colorToken: 'violet' },
  { name: 'Katta guruh', ageFrom: 4, ageTo: 5, capacity: 30, fill: 28, colorToken: 'emerald' },
  { name: 'Tayyorlov guruh', ageFrom: 5, ageTo: 6, capacity: 30, fill: 27, colorToken: 'amber' },
];

export const KARMANA_GROUPS: GroupSeed[] = [
  { name: 'Kichik guruh', ageFrom: 2, ageTo: 3, capacity: 22, fill: 19, colorToken: 'sky' },
  { name: "O'rta guruh", ageFrom: 3, ageTo: 4, capacity: 25, fill: 23, colorToken: 'violet' },
  { name: 'Katta guruh', ageFrom: 4, ageTo: 6, capacity: 28, fill: 25, colorToken: 'emerald' },
];
