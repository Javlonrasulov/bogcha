import { readFileSync } from 'node:fs';
import { Client } from 'pg';

function loadEnv() {
  const raw = readFileSync('.env', 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i <= 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnv();

const drops = [
  ['GroupTeacher', 'groupId'],
  ['GroupTeacher', 'userId'],
  ['MenuSlotRecipe', 'recipeId'],
  ['MenuSlotRecipe', 'menuSlotId'],
  ['NotificationRecipient', 'notificationId'],
  ['NotificationRecipient', 'userId'],
  ['UserBranch', 'userId'],
  ['UserBranch', 'branchId'],
];

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
for (const [table, column] of drops) {
  const sql = `ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`;
  await client.query(sql);
  console.log(sql);
}
await client.end();
