/**
 * Bitta sahifani ochib, xato matnini chiqaradi (dev overlay HTML'idan).
 * Ishlatish: node apps/web/test/debug-page.mjs /users [identifier]
 */

const API = process.env.API_URL ?? 'http://localhost:4000/api/v1';
const WEB = process.env.WEB_URL ?? 'http://localhost:3000';

const path = process.argv[2] ?? '/';
const identifier = process.argv[3] ?? '+998901110001';

const login = await fetch(`${API}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ identifier, password: 'Bogcha2026!' }),
});
const session = await login.json();

const response = await fetch(WEB + path, {
  headers: { cookie: `bogcha_at=${session.accessToken}; bogcha_rt=${session.refreshToken}` },
  redirect: 'manual',
});
const html = await response.text();

console.log('status:', response.status);

// Flight oqimidagi qatorlar `\"` bilan escape qilingan, shuning uchun ikki marta unescape.
const raw = html.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
const found = new Set();
for (const match of raw.matchAll(/"(?:message|stack|digest|env)":"?((?:[^"\\]|\\.)*)"?/g)) {
  found.add(match[1]);
}
for (const line of found) console.log('---\n' + line);

const lines = raw.split('\n').filter((line) => /at .*src[\\/]|Error:|TypeError:|NEXT_/.test(line));
if (lines.length) console.log('\n=== stack ===\n' + lines.slice(0, 40).join('\n'));
if (found.size === 0 && lines.length === 0) console.log(html.slice(0, 4000));
