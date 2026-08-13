import { z } from 'zod';

/**
 * `z.coerce.boolean()` bo'sh bo'lmagan har qanday satrni `true` deb oladi —
 * ya'ni `"false"` ham `true` bo'lib qolardi. Shu sababli aniq ro'yxat.
 */
const booleanEnv = (fallback: boolean) =>
  z
    .enum(['true', 'false', '1', '0'])
    .default(fallback ? 'true' : 'false')
    .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL majburiy'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_PREFIX: z.string().default('api/v1'),

  JWT_ACCESS_SECRET: z.string().min(16, "JWT_ACCESS_SECRET kamida 16 belgi bo'lishi kerak"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET kamida 16 belgi bo'lishi kerak"),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),
  RATE_LIMIT_TTL: z.coerce.number().int().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().default(200),

  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().default(10),

  /** Ixtiyoriy — health check / kelajakdagi navbatlar uchun. */
  REDIS_URL: z.string().optional(),

  // Rejalashtirilgan vazifalar (TZ §22, §43). Testda o'chirib qo'yiladi.
  SCHEDULER_ENABLED: booleanEnv(true),
  ANOMALY_CHECK_CRON: z.string().default('0 19 * * *'),

  BACKUP_ENABLED: booleanEnv(false),
  BACKUP_DIR: z.string().default('./backups'),
  BACKUP_DAILY_CRON: z.string().default('0 2 * * *'),
  BACKUP_KEEP_DAILY: z.coerce.number().int().min(1).default(7),
  BACKUP_KEEP_WEEKLY: z.coerce.number().int().min(1).default(4),
  BACKUP_KEEP_MONTHLY: z.coerce.number().int().min(1).default(12),
  PG_DUMP_PATH: z.string().default('pg_dump'),
});

export type AppConfig = ReturnType<typeof loadConfiguration>;

export function loadConfiguration() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Muhit o'zgaruvchilari noto'g'ri sozlangan:\n${details}`);
  }

  const env = parsed.data;

  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    databaseUrl: env.DATABASE_URL,
    port: env.API_PORT,
    apiPrefix: env.API_PREFIX,
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    corsOrigins: env.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    rateLimit: { ttl: env.RATE_LIMIT_TTL, limit: env.RATE_LIMIT_MAX },
    uploads: { dir: env.UPLOAD_DIR, maxMb: env.MAX_UPLOAD_MB },
    redisUrl: env.REDIS_URL,
    scheduler: {
      enabled: env.SCHEDULER_ENABLED,
      anomalyCron: env.ANOMALY_CHECK_CRON,
    },
    backup: {
      enabled: env.BACKUP_ENABLED,
      dir: env.BACKUP_DIR,
      dailyCron: env.BACKUP_DAILY_CRON,
      keepDaily: env.BACKUP_KEEP_DAILY,
      keepWeekly: env.BACKUP_KEEP_WEEKLY,
      keepMonthly: env.BACKUP_KEEP_MONTHLY,
      pgDumpPath: env.PG_DUMP_PATH,
    },
  };
}
