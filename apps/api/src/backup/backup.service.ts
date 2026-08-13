import { spawn } from 'node:child_process';
import { copyFile, mkdir, readdir, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

const JOB_NAME = 'database-backup';

export type BackupTier = 'daily' | 'weekly' | 'monthly';

const TIERS: readonly BackupTier[] = ['daily', 'weekly', 'monthly'];

const RETENTION_KEY: Record<BackupTier, string> = {
  daily: 'backup.keepDaily',
  weekly: 'backup.keepWeekly',
  monthly: 'backup.keepMonthly',
};

const RETENTION_FALLBACK: Record<BackupTier, number> = { daily: 7, weekly: 4, monthly: 12 };

export interface BackupFile {
  tier: BackupTier;
  name: string;
  sizeBytes: number;
  createdAt: string;
}

interface PostgresTarget {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

/**
 * Baza zaxirasi (TZ §43). `pg_dump` custom formatda yoziladi — bu format
 * `pg_restore` bilan tanlab tiklashga imkon beradi va siqilgan bo'ladi.
 *
 * Uch pog'ona bitta yugurishda to'ldiriladi: har kuni `daily`, yakshanba kuni
 * qo'shimcha `weekly`, oyning birinchi kunida `monthly`. Har pog'onada faqat
 * belgilangan sondagi eng yangi nusxa qoladi.
 */
@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.enabled) {
      this.logger.log("Zaxiralash o'chirilgan (BACKUP_ENABLED=false)");
      return;
    }

    const cronTime = this.config.get<string>('backup.dailyCron', '0 2 * * *');
    const job = new CronJob(cronTime, () => void this.runScheduled());

    this.registry.addCronJob(JOB_NAME, job as never);
    job.start();
    this.logger.log(`Zaxiralash rejalashtirildi: ${cronTime} → ${this.baseDir}`);
  }

  get enabled(): boolean {
    return this.config.get<boolean>('backup.enabled', false);
  }

  private get baseDir(): string {
    return this.config.get<string>('backup.dir', './backups');
  }

  /** Rejalashtirilgan yugurish: pog'onalarni sanaga qarab tanlaydi. */
  private async runScheduled(): Promise<void> {
    const now = new Date();
    const tiers: BackupTier[] = ['daily'];
    if (now.getDay() === 0) tiers.push('weekly');
    if (now.getDate() === 1) tiers.push('monthly');

    try {
      await this.create(tiers);
    } catch (error) {
      this.logger.error(
        'Rejalashtirilgan zaxiralash muvaffaqiyatsiz',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /**
   * Zaxira yaratadi. Dump bir marta olinadi va kerakli pog'onalarga nusxalanadi,
   * shuning uchun bazaga qo'shimcha yuk tushmaydi.
   */
  async create(tiers: readonly BackupTier[] = ['daily']): Promise<BackupFile[]> {
    if (this.running) throw new Error('Zaxiralash allaqachon bajarilmoqda');
    this.running = true;

    const started = Date.now();
    try {
      const target = this.resolveTarget();
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `bogcha-${stamp}.dump`;

      const primary = tiers[0] ?? 'daily';
      const copies = tiers.slice(1);
      const primaryPath = join(this.baseDir, primary, fileName);

      await mkdir(join(this.baseDir, primary), { recursive: true });
      await this.pgDump(target, primaryPath);

      for (const tier of copies) {
        await mkdir(join(this.baseDir, tier), { recursive: true });
        await copyFile(primaryPath, join(this.baseDir, tier, fileName));
      }

      await Promise.all(tiers.map((tier) => this.prune(tier)));

      this.logger.log(
        `Zaxira tayyor: ${fileName} → ${tiers.join(', ')} (${Date.now() - started} ms)`,
      );

      const files = await this.list();
      return files.filter((file) => file.name === fileName);
    } finally {
      this.running = false;
    }
  }

  /** Mavjud zaxiralar ro'yxati — eng yangisi birinchi. */
  async list(): Promise<BackupFile[]> {
    const results: BackupFile[] = [];

    for (const tier of TIERS) {
      const dir = join(this.baseDir, tier);
      let names: string[];
      try {
        names = await readdir(dir);
      } catch {
        // Pog'ona hali yaratilmagan — bo'sh deb qaraladi.
        continue;
      }

      for (const name of names) {
        if (!name.endsWith('.dump')) continue;
        const info = await stat(join(dir, name));
        results.push({
          tier,
          name,
          sizeBytes: info.size,
          createdAt: info.mtime.toISOString(),
        });
      }
    }

    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /** Pog'onada belgilangan sondan ortiq nusxalarni o'chiradi. */
  private async prune(tier: BackupTier): Promise<void> {
    const keep = this.config.get<number>(RETENTION_KEY[tier], RETENTION_FALLBACK[tier]);

    const files = (await this.list()).filter((file) => file.tier === tier);
    const stale = files.slice(keep);

    for (const file of stale) {
      await unlink(join(this.baseDir, tier, file.name));
      this.logger.log(`Eski zaxira o'chirildi: ${tier}/${file.name}`);
    }
  }

  private resolveTarget(): PostgresTarget {
    const raw = this.config.get<string>('databaseUrl', '');
    const url = new URL(raw);

    return {
      host: url.hostname,
      port: url.port || '5432',
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
    };
  }

  private pgDump(target: PostgresTarget, outputPath: string): Promise<void> {
    const binary = this.config.get<string>('backup.pgDumpPath', 'pg_dump');

    return new Promise((resolve, reject) => {
      const child = spawn(
        binary,
        [
          '--host', target.host,
          '--port', target.port,
          '--username', target.user,
          '--dbname', target.database,
          '--format', 'custom',
          '--compress', '6',
          '--no-owner',
          '--file', outputPath,
        ],
        {
          // Parol argument sifatida berilmaydi — u jarayonlar ro'yxatida ko'rinardi.
          env: { ...process.env, PGPASSWORD: target.password },
        },
      );

      let stderr = '';
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      child.on('error', (error) =>
        reject(new Error(`${binary} ishga tushmadi: ${error.message}`)),
      );

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump ${code} kodi bilan tugadi: ${stderr.trim()}`));
      });
    });
  }
}
