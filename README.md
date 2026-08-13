# Bog'cha Boshqaruv Tizimi

Xususiy bolalar bog'chalari uchun multi-tenant ERP platformasi: bolalar, davomat,
oziq-ovqat normasi, ombor, xaridlar, moliya, ish haqi, filiallar va KPI —
yagona tizimda.

Tizimning markaziy oqimi (TZ §47): davomat kiritiladi → kelgan bolalar soni
aniqlanadi → oziq-ovqat normasi hisoblanadi → ombordan sarf yoziladi →
xarajat va foyda qayta hisoblanadi → dashboard va hisobotlar yangilanadi.
Bir ma'lumot faqat bir joyda kiritiladi.

## Tarkib

| Paket                    | Vazifasi                                                                      |
| ------------------------ | ----------------------------------------------------------------------------- |
| `packages/shared`        | Rollar, RBAC matritsasi, birliklar, Zod sxemalar, API tiplari, norma/KPI/anomaliya logikasi |
| `packages/mobile-core`   | Mobil ilovalar uchun umumiy qatlam: tema, API klient, sessiya, offline navbat, i18n, UI kit |
| `apps/api`               | NestJS + Prisma REST API (`/api/v1`), JWT auth, audit log, realtime           |
| `apps/web`               | Next.js 15 Admin Web (App Router, RSC + server action'lar)                    |
| `apps/mobile-admin`      | Expo Admin ilovasi: dashboard, davomat, moliya, ombor, hisobot, bildirishnoma  |
| `apps/mobile-teacher`    | Expo Tarbiyachi ilovasi: offline davomat, guruh, bola profili                  |

Biznes hisob-kitoblari (norma, KPI, ish haqi, xarid rejasi, anomaliya qoidalari)
`packages/shared/src/logic` da sof funksiya sifatida yozilgan — backend ham,
frontend ham bir xil natijani oladi va ular unit test bilan qoplangan.
API javob tiplari `packages/shared/src/api/types.ts` da bitta shartnoma sifatida
saqlanadi: web ham, mobil ham shu tiplardan foydalanadi.

## Talablar

- Node.js ≥ 20.11
- PostgreSQL ≥ 14
- npm 11+

## Ishga tushirish

```bash
npm install
cp .env.example .env          # Windows: Copy-Item .env.example .env
```

`.env` ichida `DATABASE_URL` ni o'zingizning PostgreSQL manziliga moslang, so'ng:

```bash
npm run db:migrate            # sxemani yaratish
npm run db:seed               # realistik demo ma'lumot (2 filial, ~167 bola, 84 kunlik tarix)
npm run dev                   # API :4000, Web :3000
```

`db:seed` bazani tozalab qayta to'ldiradi va oxirida test hisoblarini chiqaradi.
Barcha demo hisoblar uchun parol: `Bogcha2026!`

| Rol            | Login           |
| -------------- | --------------- |
| Super admin    | `+998900000000` |
| Egasi (Owner)  | `+998901110001` |
| Administrator  | `+998901110002` |
| Tarbiyachi     | `+998901110011` |
| Oshpaz         | `+998901110021` |
| Omborchi       | `+998901110031` |
| Buxgalter      | `+998901110041` |

API hujjatlari (Swagger, faqat development): http://localhost:4000/api/v1/docs

## Mobil ilovalar

```bash
npm run start --workspace @bogcha/mobile-admin      # Expo Go: QR kodni skanerlash
npm run start --workspace @bogcha/mobile-teacher
```

API manzili avtomatik aniqlanadi: `localhost` Metro xostining LAN IP'siga
almashtiriladi, shuning uchun real qurilmada ham qo'shimcha sozlash kerak emas.
Boshqa serverga ulanish uchun `EXPO_PUBLIC_API_URL` ni bering:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.50:4000/api/v1 npm run start --workspace @bogcha/mobile-admin
```

Tarbiyachi ilovasi internetsiz ishlaydi (TZ §41): davomat qurilmada saqlanadi,
so'rovlar idempotentlik kaliti bilan navbatga qo'yiladi va ulanish qaytganda
avtomatik yuboriladi. Ekranlar oxirgi javobni keshdan ko'rsatadi.

Admin ilovasi jonli yangilanadi (TZ §42): Socket.IO orqali `attendance:updated`,
`payment:created`, `stock:updated` kabi hodisalar kelganda ekran o'zi qayta
yuklanadi. Ulanish ilova fonga o'tganda uziladi va qaytganda tiklanadi.

## Infrastruktura

```bash
GET /api/v1/health          # api + database + redis + queue + storage
```

- **Redis / BullMQ** — `REDIS_URL` berilsa navbat Redis orqali; aks holda jarayon ichida.
- **Fayl saqlash** — `StorageService` (lokal `UPLOAD_DIR`, S3-ready interfeys); `POST /files/upload`.
- **Request log** — `x-request-id` + JSON qator (userId/tenantId/duration).
- **COGS** — oziq-ovqat xarajati faqat kun yopilganda; xarid faqat ombor + AP.
- **Idempotency** — attendance, payment, purchase receive.

```bash
# REDIS_URL=redis://localhost:6379
```

## Rejalashtirilgan vazifalar

Kunlik anomaliya tekshiruvi (TZ §22) barcha faol filiallarni aylanib chiqadi va
davomat pasayishi hamda qarzdorlik o'sishini aniqlaydi. Qolgan besh anomaliya
(ombor qoldig'i, budjet, narx, ortiqcha sarf, oziq-ovqat xarajati) tegishli amal
bajarilgan zahoti tekshiriladi.

```bash
SCHEDULER_ENABLED=true
ANOMALY_CHECK_CRON="0 19 * * *"   # har kuni 19:00
```

## Zaxiralash va tiklash

Zaxira `pg_dump` bilan custom formatda olinadi (TZ §43). Bitta yugurishda uch
pog'ona to'ldiriladi: har kuni `daily`, yakshanba `weekly`, oyning 1-kuni
`monthly`. Har pog'onada faqat belgilangan sondagi eng yangi nusxa qoladi.

```bash
BACKUP_ENABLED=true
BACKUP_DIR=./backups
BACKUP_DAILY_CRON="0 2 * * *"
BACKUP_KEEP_DAILY=7
BACKUP_KEEP_WEEKLY=4
BACKUP_KEEP_MONTHLY=12
```

Zaxira butun bazani, ya'ni barcha tashkilotlar ma'lumotini qamraydi — shuning
uchun `GET /backups` va `POST /backups` faqat `SUPER_ADMIN` uchun ochiq.

Tiklash `apps/api` papkasidan bajariladi:

```bash
npm run backup:list --workspace @bogcha/api          # mavjud nusxalar
node scripts/restore.mjs <fayl> --confirm            # tiklash
```

`--confirm` bo'lmasa skript faqat nima qilishini ko'rsatadi. Tiklash
`pg_restore --clean --single-transaction` bilan bajariladi: xato bo'lsa baza
o'zgarishsiz qoladi.

## Tekshirish

```bash
npm run typecheck             # barcha paketlar
npm run lint
npm test                      # shared paketdagi biznes logika unit testlari
```

API va Web ishlab turganda uchdan-uchiga smoke testlar:

```bash
npm run smoke:api             # har bir rol uchun login + endpointlar + RBAC/scoping
npm run smoke:web             # 6 rol × 26 sahifa render tekshiruvi
npm run smoke:realtime        # Socket.IO: auth, hodisa uzatish, tenant izolyatsiyasi
npm run test:integration --workspace @bogcha/api   # health, tenant IDOR, payment idempotency
```

`smoke:api` da zaxiralash tekshiruvi `pg_dump` talab qilgani uchun sukut bo'yicha
o'tkazib yuboriladi; yoqish uchun `SMOKE_BACKUP=1` bering.

`smoke:web` sahifa 200 qaytarsa ham ichida 5xx bergan API chaqiruvlarini
alohida xato deb hisoblaydi — shu sababli yashirin nosozliklar ham ko'rinadi.
Bitta sahifadagi xatoni batafsil ko'rish uchun:

```bash
node apps/web/test/debug-page.mjs /users +998901110001
```

Mobil ilovalar Metro bilan yig'ilishini tekshirish:

```bash
npm run bundle --workspace @bogcha/mobile-admin
npm run bundle --workspace @bogcha/mobile-teacher
```

## Foydali buyruqlar

```bash
npm run build                 # barcha paketlarni yig'ish
npm run db:studio             # Prisma Studio
npm run dev --workspace @bogcha/api
npm run dev --workspace @bogcha/web
```

## Arxitektura qoidalari

- **Tenant izolyatsiyasi.** `tenantId` hech qachon so'rov tanasidan olinmaydi;
  har bir servis `RequestScope` orqali `where` shartini quradi
  (`apps/api/src/common/scope/request-scope.ts`).
- **RBAC.** Endpointlar `@RequirePermissions(...)` bilan himoyalanadi, huquqlar
  ro'yxati `packages/shared/src/domain/permissions.ts` da. Tarbiyachi qo'shimcha
  ravishda guruh darajasida cheklanadi.
- **Validatsiya.** Kirish ma'lumotlari Zod bilan tekshiriladi (backend va frontend
  bir xil sxemadan foydalanadi).
- **Audit.** Muhim o'zgarishlar eski/yangi qiymat bilan `AuditLog` ga yoziladi.
- **i18n.** UI matnlari `apps/web/src/i18n/dictionaries` (web) va
  `packages/mobile-core/src/i18n/dictionary.ts` (mobil) da: o'zbek lotin,
  o'zbek kirill va rus tili.
- **Offline-first mobil.** Yozish so'rovlari `SyncProvider` orqali o'tadi: onlayn
  bo'lsa darhol yuboriladi, aks holda navbatga tushadi. Server takroriy
  yuborishni idempotentlik kaliti bilan ajratadi.
- **Real-time.** Socket.IO xonalari tenant va filial bo'yicha ajratilgan; token
  qo'l berish bosqichida tekshiriladi. Web brauzerga SSE proxy orqali uzatadi
  (token httpOnly cookie'da qoladi), mobil ilova to'g'ridan-to'g'ri ulanadi.
- **Ogohlantirishlar.** Anomaliyalar `dedupeKey` bilan yoziladi va kalit filialga
  bog'lanadi — bir tashkilotning ikki filialidagi bir xil muammo alohida
  ogohlantirish beradi.
