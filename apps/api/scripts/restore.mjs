#!/usr/bin/env node
/**
 * Zaxiradan tiklash (TZ §43).
 *
 * Ishlatilishi:
 *   node scripts/restore.mjs                    — zaxiralar ro'yxatini ko'rsatadi
 *   node scripts/restore.mjs <fayl> --confirm   — bazani shu zaxiradan tiklaydi
 *
 * DIQQAT: tiklash mavjud ma'lumotlarni butunlay almashtiradi. Shuning uchun
 * `--confirm` bayrog'isiz hech narsa o'zgarmaydi.
 */
import { spawn } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

// Skript API'dan mustaqil ishlaydi, shuning uchun .env'ni o'zi yuklaydi.
try {
  process.loadEnvFile(resolve('.env'));
} catch {
  // .env yo'q — muhit o'zgaruvchilari tashqaridan berilgan deb hisoblanadi.
}

const BASE_DIR = resolve(process.env.BACKUP_DIR ?? './backups');
const TIERS = ['daily', 'weekly', 'monthly'];

function parseDatabaseUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.error('DATABASE_URL topilmadi. .env faylini yuklang.');
    process.exit(1);
  }

  const url = new URL(raw);
  return {
    host: url.hostname,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
  };
}

async function listBackups() {
  const items = [];

  for (const tier of TIERS) {
    const dir = join(BASE_DIR, tier);
    let names;
    try {
      names = await readdir(dir);
    } catch {
      continue;
    }

    for (const name of names) {
      if (!name.endsWith('.dump')) continue;
      const info = await stat(join(dir, name));
      items.push({ tier, name, path: join(dir, name), size: info.size, mtime: info.mtime });
    }
  }

  return items.sort((a, b) => b.mtime - a.mtime);
}

async function resolveBackupPath(argument) {
  if (isAbsolute(argument)) return argument;

  const backups = await listBackups();
  const match = backups.find((item) => item.name === argument || item.path.endsWith(argument));
  if (!match) {
    console.error(`Zaxira topilmadi: ${argument}`);
    process.exit(1);
  }
  return match.path;
}

function run(command, args, env) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { env: { ...process.env, ...env }, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolvePromise() : reject(new Error(`${command} ${code} kodi bilan tugadi`)),
    );
  });
}

async function main() {
  const [target, ...flags] = process.argv.slice(2);

  if (!target) {
    const backups = await listBackups();
    if (backups.length === 0) {
      console.log(`Zaxira topilmadi. Papka: ${BASE_DIR}`);
      return;
    }

    console.log(`Zaxiralar (${BASE_DIR}):\n`);
    for (const item of backups) {
      const mb = (item.size / 1024 / 1024).toFixed(1);
      console.log(
        `  ${item.tier.padEnd(8)} ${item.name}  ${mb} MB  ${item.mtime.toISOString()}`,
      );
    }
    console.log('\nTiklash: node scripts/restore.mjs <fayl> --confirm');
    return;
  }

  const backupPath = await resolveBackupPath(target);
  const db = parseDatabaseUrl();

  if (!flags.includes('--confirm')) {
    console.log(`Tiklanadigan zaxira: ${backupPath}`);
    console.log(`Nishon baza:         ${db.database} @ ${db.host}:${db.port}`);
    console.log('\nBu amal bazadagi barcha joriy ma\'lumotni almashtiradi.');
    console.log('Davom etish uchun --confirm bayrog\'ini qo\'shing.');
    return;
  }

  console.log(`Tiklanmoqda: ${backupPath} → ${db.database}`);

  await run(
    'pg_restore',
    [
      '--host', db.host,
      '--port', db.port,
      '--username', db.user,
      '--dbname', db.database,
      // Mavjud obyektlar tiklashga xalaqit bermasligi uchun avval tozalanadi.
      '--clean',
      '--if-exists',
      '--no-owner',
      '--single-transaction',
      backupPath,
    ],
    { PGPASSWORD: db.password },
  );

  console.log('Tiklash muvaffaqiyatli yakunlandi.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
