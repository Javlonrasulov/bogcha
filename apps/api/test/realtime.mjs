/**
 * Real-time kanal testi (TZ §42). Mobil ilova qanday ulansa, shunday ulanadi:
 * Socket.IO `/realtime` namespace'iga access token bilan.
 *
 * Tekshiriladi:
 *   1. Tokensiz ulanish rad etiladi;
 *   2. Tarbiyachi davomat yuborganda `attendance:updated` filial xonasiga yetadi;
 *   3. Boshqa tashkilot foydalanuvchisi bu hodisani olmaydi.
 *
 * Ishlatish: node apps/api/test/realtime.mjs
 */
import { io } from 'socket.io-client';

const BASE = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const WS = BASE.replace(/\/api\/v\d+\/?$/, '');
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
  if (!response.ok) throw new Error(`${identifier} uchun login muvaffaqiyatsiz`);
  return response.json();
}

function connect(token) {
  return new Promise((resolve, reject) => {
    const socket = io(`${WS}/realtime`, {
      auth: token ? { token } : {},
      transports: ['websocket'],
      reconnection: false,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error('ulanish kutish vaqti tugadi'));
    }, 8_000);

    socket.on('connect', () => {
      clearTimeout(timer);
      resolve(socket);
    });
    socket.on('connect_error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    socket.on('disconnect', (reason) => {
      clearTimeout(timer);
      reject(new Error(`server uzdi: ${reason}`));
    });
  });
}

/** Hodisa kelishini kutadi; kelmasa `null` qaytaradi. */
function waitFor(socket, event, timeoutMs = 6_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(null);
    }, timeoutMs);

    const handler = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

async function main() {
  console.log('▶ Autentifikatsiya\n');

  const teacher = await login('+998901110011');
  const superAdmin = await login('+998900000000');

  // 1. Tokensiz ulanish
  let rejected = false;
  try {
    const socket = await connect(null);
    socket.disconnect();
  } catch {
    rejected = true;
  }
  check(rejected, 'Tokensiz ulanish rad etildi');

  // 2. Tarbiyachi ulanadi
  const teacherSocket = await connect(teacher.accessToken);
  check(teacherSocket.connected, 'Tarbiyachi soketi ulandi');

  // Super admin tenant'ga tegishli emas — uning xonalari boshqa.
  const outsiderSocket = await connect(superAdmin.accessToken);
  check(outsiderSocket.connected, 'Begona foydalanuvchi soketi ulandi');

  console.log('\n▶ Hodisa uzatish\n');

  const headers = {
    Authorization: `Bearer ${teacher.accessToken}`,
    'Content-Type': 'application/json',
  };

  const groups = await (await fetch(`${BASE}/groups/my`, { headers })).json();
  const group = groups[0];
  const date = new Date().toISOString().slice(0, 10);

  const board = await (
    await fetch(`${BASE}/attendance/board?groupId=${group.id}&date=${date}`, { headers })
  ).json();

  // Mavjud holat qayta yuboriladi — test ma'lumotni o'zgartirmaydi.
  const entries = board.children.map((child) => ({
    childId: child.id,
    status: child.status ?? 'PRESENT',
  }));

  const received = waitFor(teacherSocket, 'attendance:updated');
  const outsiderReceived = waitFor(outsiderSocket, 'attendance:updated', 3_000);

  const submit = await fetch(`${BASE}/attendance`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      groupId: group.id,
      date,
      entries,
      idempotencyKey: `realtime-test-${Date.now()}`,
    }),
  });
  check(submit.ok, `Davomat yuborildi (${submit.status})`);

  const payload = await received;
  check(
    payload?.groupId === group.id && payload?.date === date,
    "attendance:updated hodisasi yetib keldi",
    payload ? JSON.stringify(payload) : 'hodisa kelmadi',
  );

  check(
    (await outsiderReceived) === null,
    "Begona foydalanuvchi hodisani olmadi (tenant izolyatsiyasi)",
  );

  teacherSocket.disconnect();
  outsiderSocket.disconnect();

  console.log(failures === 0 ? '\n✅ Real-time tekshiruvlari o\'tdi\n' : `\n❌ ${failures} ta xato\n`);
  process.exitCode = failures === 0 ? 0 : 1;
}

await main();
