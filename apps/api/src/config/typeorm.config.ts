import 'reflect-metadata';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../entities';

function loadEnvFile(): void {
  const path = resolve(process.cwd(), process.env.ENV_FILE ?? '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile();

/**
 * TypeORM CLI / migration DataSource.
 * synchronize hech qachon yoqilmaydi — schema Prisma migratsiyalari arxivi + yangi TypeORM migrations orqali.
 */
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [...ALL_ENTITIES],
  migrations: ['src/migrations/*.{ts,js}'],
  synchronize: false,
  logging: false,
});
