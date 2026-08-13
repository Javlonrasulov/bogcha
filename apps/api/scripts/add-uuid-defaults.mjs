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

const client = new Client({ connectionString: process.env.DATABASE_URL });

await client.connect();

const { rows } = await client.query(`
  SELECT c.relname AS table, a.attname AS column
  FROM pg_attribute a
  JOIN pg_class c ON c.oid = a.attrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_constraint con ON con.conrelid = c.oid AND con.contype = 'p'
  JOIN pg_attribute pa ON pa.attrelid = con.conrelid AND pa.attnum = ANY (con.conkey)
  WHERE n.nspname = 'public'
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attname = pa.attname
    AND format_type(a.atttypid, a.atttypmod) = 'uuid'
  ORDER BY c.relname
`);

for (const r of rows) {
  const sql = `ALTER TABLE "${r.table}" ALTER COLUMN "${r.column}" SET DEFAULT gen_random_uuid()`;
  await client.query(sql);
  console.log(sql);
}

await client.end();
console.log('done', rows.length);
