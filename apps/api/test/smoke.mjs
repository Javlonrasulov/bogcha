/**
 * API smoke test: login qiladi va asosiy endpointlarni tekshiradi.
 * Ishlatish: node apps/api/test/smoke.mjs
 */

const BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';

const ACCOUNTS = [
  { label: 'SuperAdmin', identifier: '+998900000000' },
  { label: 'Owner', identifier: '+998901110001' },
  { label: 'Administrator', identifier: '+998901110002' },
  { label: 'Tarbiyachi', identifier: '+998901110011' },
  { label: 'Oshpaz', identifier: '+998901110021' },
  { label: 'Omborchi', identifier: '+998901110031' },
  { label: 'Buxgalter', identifier: '+998901110041' },
];

const OWNER_ENDPOINTS = [
  '/dashboard/overview',
  '/dashboard/charts',
  '/dashboard/branches',
  '/attendance/summary',
  '/attendance/trend?days=14',
  '/children?limit=3',
  '/groups',
  '/stock?lowOnly=true',
  '/stock/movements?limit=3',
  '/products?limit=3',
  '/suppliers',
  '/purchases?limit=3',
  '/finance/summary',
  '/finance/plan-vs-fact',
  '/expenses?limit=3',
  '/incomes?limit=3',
  '/payments/summary',
  '/debts?limit=3',
  '/nutrition/days?limit=2',
  '/nutrition/recipes?limit=3',
  '/nutrition/cost-trend?days=14',
  '/staff?limit=3',
  '/staff/attendance/today',
  '/payroll',
  '/notifications?limit=3',
  '/audit?limit=3',
  '/settings',
  '/users?limit=3',
  '/dashboard/search?q=Kar',
  '/reports/daily',
  '/reports/monthly?period=' + new Date().toISOString().slice(0, 7),
  '/reports/yearly?year=' + new Date().getUTCFullYear(),
];

let failures = 0;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Login 10 so'rov/daqiqa bilan cheklangan (TZ §40), shuning uchun testni
 * ketma-ket ishlatganda 429 kutish bilan qayta urinamiz.
 */
async function request(path, init = {}, attempt = 0) {
  const response = await fetch(BASE + path, init);
  if (response.status === 429 && attempt < 3) {
    const wait = Number(response.headers.get('retry-after') ?? 0) * 1000 || 20_000;
    console.log(`    … rate limit, ${wait / 1000}s kutilmoqda`);
    await sleep(wait);
    return request(path, init, attempt + 1);
  }
  return { status: response.status, ok: response.ok, body: await response.json().catch(() => null) };
}

async function login(identifier) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Bogcha2026!' }),
  });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  return `${new Date().toISOString().slice(0, 7)}-01`;
}

function preview(value) {
  return JSON.stringify(value).replace(/\s+/g, ' ').slice(0, 160);
}

const fetchJson = (path, headers) => request(path, { headers });

async function main() {
  console.log('▶ Health\n');
  const healthRes = await request('/health');
  // /health Public — token shart emas
  const healthOk = healthRes.status === 200 && healthRes.body?.checks?.database === true;
  if (!healthOk) failures += 1;
  console.log(`  ${healthOk ? '✓' : '✗'} ${healthRes.status} /health  ${preview(healthRes.body)}`);

  console.log('▶ Login tekshiruvi\n');
  const tokens = {};

  for (const account of ACCOUNTS) {
    const result = await login(account.identifier);
    const ok = result.status === 200 && Boolean(result.body.accessToken);
    if (!ok) failures += 1;
    else tokens[account.label] = result.body.accessToken;

    console.log(
      `  ${ok ? '✓' : '✗'} ${account.label.padEnd(14)} ${account.identifier}  →  ` +
        (ok
          ? `${result.body.user.roles.join(',')} (${result.body.user.permissions.length} huquq)`
          : preview(result.body)),
    );
  }

  console.log('\n▶ Owner endpointlari\n');
  const headers = { Authorization: `Bearer ${tokens.Owner}` };

  for (const path of OWNER_ENDPOINTS) {
    const { status, ok, body } = await fetchJson(path, headers);
    if (!ok) failures += 1;
    console.log(`  ${ok ? '✓' : '✗'} ${String(status)} ${path.padEnd(34)} ${preview(body)}`);
  }

  console.log('\n▶ Filialga bog\'liq endpointlar\n');
  const branches = (await fetchJson('/branches', headers)).body ?? [];
  const branchId = branches[0]?.id ?? branches.items?.[0]?.id;

  for (const path of [
    `/procurement/plan?branchId=${branchId}&days=7`,
    `/nutrition/preview?branchId=${branchId}`,
    `/nutrition/cost-trend?branchId=${branchId}&days=14`,
    `/dashboard/overview?branchId=${branchId}`,
    `/nutrition/menus/active?branchId=${branchId}`,
    `/reports/daily?branchId=${branchId}`,
    `/reports/range?from=${monthStart()}&to=${today()}&granularity=WEEK&branchId=${branchId}`,
  ]) {
    const { status, ok, body } = await fetchJson(path, headers);
    if (!ok) failures += 1;
    console.log(`  ${ok ? '✓' : '✗'} ${status} ${path.slice(0, 40).padEnd(42)} ${preview(body)}`);
  }

  console.log('\n▶ RBAC: tarbiyachi moliyaga kira olmasligi kerak\n');
  const teacherHeaders = { Authorization: `Bearer ${tokens.Tarbiyachi}` };
  for (const path of ['/finance/summary', '/payroll', '/users']) {
    const { status } = await fetchJson(path, teacherHeaders);
    const ok = status === 403;
    if (!ok) failures += 1;
    console.log(`  ${ok ? '✓' : '✗'} ${status} ${path} (403 kutilgan)`);
  }

  console.log("\n▶ Guruh scoping: tarbiyachi faqat o'z guruhini ko'radi\n");
  const myGroups = await fetchJson('/groups/my', teacherHeaders);
  const allowedGroupIds = new Set(
    (Array.isArray(myGroups.body) ? myGroups.body : []).map((group) => group.id),
  );

  const scopeChecks = [
    {
      path: '/groups/my',
      result: myGroups,
      valid: (body) => Array.isArray(body) && body.length > 0,
    },
    {
      path: '/groups',
      result: await fetchJson('/groups', teacherHeaders),
      valid: (body) =>
        Array.isArray(body) &&
        body.length > 0 &&
        body.every((group) => allowedGroupIds.has(group.id)),
    },
    {
      path: '/children?limit=50',
      result: await fetchJson('/children?limit=50', teacherHeaders),
      valid: (body) =>
        Array.isArray(body?.items) && body.items.every((child) => allowedGroupIds.has(child.groupId)),
    },
    {
      path: '/attendance/summary',
      result: await fetchJson('/attendance/summary', teacherHeaders),
      valid: (body) => typeof body?.total === 'number',
    },
  ];

  for (const { path, result, valid } of scopeChecks) {
    const ok = result.status === 200 && valid(result.body);
    if (!ok) failures += 1;
    console.log(`  ${ok ? '✓' : '✗'} ${result.status} ${path.padEnd(20)} ${preview(result.body)}`);
  }

  console.log('\n▶ Mobil ilovalar ishlatadigan endpointlar\n');
  const firstGroupId = [...allowedGroupIds][0];
  // Mobil ekranlar filialga bog'liq endpointlarga har doim `branchId` yuboradi.
  const mobileChecks = [
    { label: 'Tarbiyachi', headers: teacherHeaders, path: `/attendance/board?groupId=${firstGroupId}` },
    { label: 'Tarbiyachi', headers: teacherHeaders, path: '/staff/attendance/me' },
    { label: 'Owner', headers, path: `/procurement/plan?branchId=${branchId}&days=7` },
    { label: 'Owner', headers, path: `/nutrition/preview?branchId=${branchId}` },
    { label: 'Owner', headers, path: '/notifications?limit=50' },
    { label: 'Owner', headers, path: `/dashboard/branches?period=${new Date().toISOString().slice(0, 7)}` },
  ];

  for (const check of mobileChecks) {
    const { status, ok, body } = await fetchJson(check.path, check.headers);
    if (!ok) failures += 1;
    console.log(
      `  ${ok ? '✓' : '✗'} ${status} ${check.label.padEnd(11)} ${check.path
        .slice(0, 38)
        .padEnd(40)} ${preview(body)}`,
    );
  }

  console.log('\n▶ Anomaliya tekshiruvi (rejalashtiruvchi bilan bir xil kod yo\'li)\n');
  const anomaly = await request('/dashboard/anomaly-check', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ branchId }),
  });
  const anomalyOk = anomaly.status === 201 && typeof anomaly.body?.detected === 'number';
  if (!anomalyOk) failures += 1;
  console.log(`  ${anomalyOk ? '✓' : '✗'} ${anomaly.status} /dashboard/anomaly-check   ${preview(anomaly.body)}`);

  console.log('\n▶ Zaxiralash (faqat SUPER_ADMIN)\n');
  const superHeaders = { Authorization: `Bearer ${tokens.SuperAdmin}` };

  const backupDenied = await fetchJson('/backups', headers);
  const deniedOk = backupDenied.status === 403;
  if (!deniedOk) failures += 1;
  console.log(`  ${deniedOk ? '✓' : '✗'} ${backupDenied.status} Owner /backups (403 kutilgan)`);

  const backupList = await fetchJson('/backups', superHeaders);
  const listOk = backupList.status === 200 && Array.isArray(backupList.body?.items);
  if (!listOk) failures += 1;
  console.log(`  ${listOk ? '✓' : '✗'} ${backupList.status} SuperAdmin /backups     ${preview(backupList.body)}`);

  // pg_dump har muhitda mavjud emas, shuning uchun bu tekshiruv ixtiyoriy.
  if (process.env.SMOKE_BACKUP === '1') {
    const created = await request('/backups', {
      method: 'POST',
      headers: { ...superHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiers: ['daily'] }),
    });
    const createdOk = created.status === 201 && created.body?.files?.length > 0;
    if (!createdOk) failures += 1;
    console.log(`  ${createdOk ? '✓' : '✗'} ${created.status} POST /backups           ${preview(created.body)}`);
  } else {
    console.log('  – POST /backups o\'tkazib yuborildi (SMOKE_BACKUP=1 bilan yoqiladi)');
  }

  console.log(failures === 0 ? '\n✅ Barcha tekshiruvlar muvaffaqiyatli\n' : `\n❌ ${failures} ta xato\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

await main();
