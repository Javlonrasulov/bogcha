/**
 * Web smoke test: API'dan token oladi, cookie sifatida qo'yadi va
 * barcha sahifalarni tekshiradi.
 * Ishlatish: node apps/web/test/smoke.mjs
 */

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

const PAGES = [
  '/',
  '/children',
  '/groups',
  '/attendance',
  '/nutrition',
  '/menu',
  '/recipes',
  '/inventory',
  '/products',
  '/purchases',
  '/suppliers',
  '/incomes',
  '/expenses',
  '/payments',
  '/debts',
  '/staff',
  '/payroll',
  '/branches',
  '/reports',
  '/analytics',
  '/kpi',
  '/notifications',
  '/audit',
  '/users',
  '/settings',
  '/profile',
];

const ACCOUNTS = process.env.ONLY_OWNER
  ? [{ label: 'Owner', identifier: '+998901110001' }]
  : [
      { label: 'Owner', identifier: '+998901110001' },
      { label: 'Administrator', identifier: '+998901110002' },
      { label: 'Tarbiyachi', identifier: '+998901110011' },
      { label: 'Oshpaz', identifier: '+998901110021' },
      { label: 'Omborchi', identifier: '+998901110031' },
      { label: 'Buxgalter', identifier: '+998901110041' },
    ];

let failures = 0;

async function login(identifier) {
  const response = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Bogcha2026!' }),
  });
  if (!response.ok) throw new Error(`Login xato: ${identifier} → ${response.status}`);
  return response.json();
}

/**
 * Dev rejimdagi RSC payload'ida har bir API `fetch` natijasi ko'rinadi.
 * 5xx javob bergan chaqiruvlar sahifa 200 qaytarsa ham yashirin nosozlik —
 * shu sababli ularni alohida yig'amiz. 403 kutilgan holat (RBAC).
 */
function failedApiCalls(html) {
  const calls = new Map();
  for (const match of html.matchAll(/\{\\"url\\":\\"([^"\\]+)\\"[^}]*?\\"status\\":(\d{3})/g)) {
    const [, url, status] = match;
    if (Number(status) >= 500) calls.set(url.replace(/^.*\/api\/v1/, ''), Number(status));
  }
  return [...calls].map(([url, status]) => `${status} ${url}`);
}

async function check(path, cookie) {
  const response = await fetch(WEB + path, { headers: { cookie }, redirect: 'manual' });
  const html = response.status === 200 ? await response.text() : '';
  const renderError = /id="__next_error__"|Application error/.test(html);
  const apiErrors = failedApiCalls(html);
  const ok = (response.status === 200 && !renderError && apiErrors.length === 0) || response.status === 307;
  if (!ok) failures += 1;
  return { status: response.status, ok, renderError, apiErrors, redirect: response.headers.get('location') };
}

for (const account of ACCOUNTS) {
  const session = await login(account.identifier);
  const cookie = `bogcha_at=${session.accessToken}; bogcha_rt=${session.refreshToken}`;
  console.log(`\n▶ ${account.label} (${session.user.roles.join(',')})`);

  for (const path of PAGES) {
    const result = await check(path, cookie);
    const note = result.redirect
      ? ` → ${result.redirect}`
      : result.renderError
        ? ' (render xato)'
        : result.apiErrors.length > 0
          ? ` (API: ${result.apiErrors.join(', ')})`
          : '';
    console.log(`  ${result.ok ? '✓' : '✗'} ${result.status} ${path}${note}`);
  }
}

console.log(failures === 0 ? '\n✅ Barcha sahifalar ishlaydi\n' : `\n❌ ${failures} ta muammo\n`);
process.exitCode = failures === 0 ? 0 : 1;
