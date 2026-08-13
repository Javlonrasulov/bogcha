import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { access, constants, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { QueueService } from '../queue/queue.module';

export type HealthStatus = 'ok' | 'degraded';

export interface HealthChecks {
  api: true;
  database: boolean;
  /** `null` — REDIS_URL sozlanmagan. */
  redis: boolean | null;
  queue: 'redis' | 'memory';
  storage: boolean;
}

export interface HealthResult {
  status: HealthStatus;
  checks: HealthChecks;
}

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    @Optional() private readonly queue?: QueueService,
  ) {}

  async check(): Promise<HealthResult> {
    const [database, redis, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
    ]);

    const checks: HealthChecks = {
      api: true,
      database,
      redis,
      queue: this.queue?.enabled ? 'redis' : 'memory',
      storage,
    };
    const criticalOk = database && storage;
    const redisOk = redis === null || redis === true;

    return {
      status: criticalOk && redisOk ? 'ok' : 'degraded',
      checks,
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean | null> {
    if (this.queue) return this.queue.isRedisHealthy();
    const redisUrl = this.config.get<string | undefined>('redisUrl');
    return redisUrl ? false : null;
  }

  private async checkStorage(): Promise<boolean> {
    const uploadDir = resolve(this.config.get<string>('uploads.dir', './uploads'));
    try {
      await mkdir(uploadDir, { recursive: true });
      await access(uploadDir, constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }
}
