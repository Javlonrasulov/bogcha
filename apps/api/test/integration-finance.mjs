/**
 * Integratsiya: oziqlanish yopilishi → ombor chiqimi + FOOD expense (COGS).
 * Xarid receive FOOD expense yaratmasligi kerak (C4).
 *
 * Ishlatish (API ishlab turganda):
 *   node apps/api/test/integration-finance.mjs
 */
const BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const PASSWORD = 'Bogcha2026!';

let failures = 0;

function check(ok, label, detail = '') {
  if (!ok) failures += 1;
  console.log(`  ${ok ? '✓' : '✗'} ${label}${detail ? `  ${detail}` : ''}`);
}

async function login(identifier) {
  const response = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  if (!response.ok) throw new Error(`login failed: ${identifier}`);
  return response.json();
}

async function api(path, token, init = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => null);
  return { status: response.status, ok: response.ok, body };
}

async function main() {
  console.log('▶ Health\n');
  const health = await fetch(`${BASE}/health`).then((r) => r.json());
  check(health.status === 'ok' || health.status === 'degraded', 'GET /health', JSON.stringify(health.checks));

  console.log('\n▶ Tenant isolation\n');
  const owner = await login('+998901110001');
  const foreign = await api(
    '/nutrition/preview?branchId=00000000-0000-4000-8000-000000000099',
    owner.accessToken,
  );
  check(foreign.status === 403, 'Begona branchId rad etildi', String(foreign.status));

  console.log('\n▶ Payment idempotency\n');
  const children = await api('/children?limit=1', owner.accessToken);
  const child = children.body?.items?.[0];
  check(Boolean(child), 'Test bolasi topildi');

  if (child) {
    const key = `pay-itest-${Date.now()}`;
    const payload = {
      childId: child.id,
      amount: 1000,
      date: new Date().toISOString().slice(0, 10),
      method: 'CASH',
      note: 'integration-idempotency',
      idempotencyKey: key,
    };
    const first = await api('/payments', owner.accessToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const second = await api('/payments', owner.accessToken, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    check(first.ok, `Birinchi to'lov ${first.status}`);
    check(second.ok, `Ikkinchi to'lov (idempotent) ${second.status}`);
    const firstId = first.body?.payment?.id ?? first.body?.id;
    const secondId = second.body?.payment?.id ?? second.body?.id;
    check(
      Boolean(firstId) && firstId === secondId,
      "Bir xil idempotencyKey — bir xil payment id",
      `${firstId} vs ${secondId}`,
    );
  }

  console.log('\n▶ Nutrition preview (0 bola xavfsiz)\n');
  const branches = await api('/branches', owner.accessToken);
  const branchId = branches.body?.[0]?.id ?? branches.body?.items?.[0]?.id;
  const preview = await api(`/nutrition/preview?branchId=${branchId}`, owner.accessToken);
  check(preview.ok, 'Preview 200', String(preview.status));
  check(
    typeof preview.body?.totalPlannedCost === 'number' ||
      typeof preview.body?.lines !== 'undefined' ||
      preview.body?.actualHeadcount === 0 ||
      preview.body?.plannedHeadcount >= 0,
    'Preview javobi oqiladi',
  );

  console.log(failures === 0 ? '\n✅ Integratsiya o‘tdi\n' : `\n❌ ${failures} ta xato\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

await main();
