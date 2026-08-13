import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, type ConnectionOptions, type JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { BackupModule } from '../backup/backup.module';
import { BackupService } from '../backup/backup.service';
import { AnomalyScheduler } from '../scheduler/anomaly.scheduler';
import { SchedulerModule } from '../scheduler/scheduler.module';

export const QUEUE_NAMES = {
  REPORTS: 'reports',
  NOTIFICATIONS: 'notifications',
  MAINTENANCE: 'maintenance',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export type JobName =
  | 'report.generate'
  | 'notification.dispatch'
  | 'backup.run'
  | 'anomaly.check'
  | 'cleanup.temp';

type JobHandler = (data: Record<string, unknown>) => Promise<unknown>;

/**
 * Redis mavjud bo'lsa BullMQ, aks holda jarayon ichida navbat.
 * Lokal muhit Redis'siz ham ishlashi uchun.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: IORedis | null;
  private readonly queues = new Map<string, Queue>();
  private readonly workers: Worker[] = [];
  private readonly handlers = new Map<JobName, JobHandler>();
  private readonly memoryJobs: Array<{ name: JobName; data: Record<string, unknown> }> = [];
  private memoryTimer: ReturnType<typeof setInterval> | null = null;

  readonly enabled: boolean;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string | undefined>('redisUrl');
    if (url) {
      this.connection = new IORedis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
      this.enabled = true;
      this.logger.log(`BullMQ ulandi: ${url.replace(/\/\/.*@/, '//***@')}`);
      for (const name of Object.values(QUEUE_NAMES)) {
        this.queues.set(name, new Queue(name, { connection: this.connection as ConnectionOptions }));
      }
    } else {
      this.connection = null;
      this.enabled = false;
      this.logger.log("Redis yo'q — navbat jarayon ichida ishlaydi");
      this.memoryTimer = setInterval(() => void this.flushMemory(), 2_000);
    }
  }

  register(name: JobName, handler: JobHandler, queueName: QueueName = QUEUE_NAMES.MAINTENANCE): void {
    this.handlers.set(name, handler);

    if (!this.connection) return;

    const worker = new Worker(
      queueName,
      async (job) => {
        const fn = this.handlers.get(job.name as JobName);
        if (!fn) {
          this.logger.warn(`Handler topilmadi: ${job.name}`);
          return;
        }
        return fn(job.data as Record<string, unknown>);
      },
      { connection: this.connection as ConnectionOptions },
    );

    worker.on('failed', (job, error) => {
      this.logger.error(`Job muvaffaqiyatsiz: ${job?.name}`, error.stack);
    });

    this.workers.push(worker);
  }

  async enqueue(
    name: JobName,
    data: Record<string, unknown> = {},
    options: JobsOptions & { queue?: QueueName } = {},
  ): Promise<{ id: string; mode: 'redis' | 'memory' }> {
    const queueName = options.queue ?? this.queueFor(name);

    if (this.connection) {
      const queue = this.queues.get(queueName);
      if (!queue) throw new Error(`Navbat topilmadi: ${queueName}`);
      const { queue: _q, ...jobOptions } = options;
      const job = await queue.add(name, data, {
        removeOnComplete: 100,
        removeOnFail: 200,
        attempts: jobOptions.attempts ?? 3,
        backoff: jobOptions.backoff ?? { type: 'exponential', delay: 2_000 },
        ...jobOptions,
      });
      return { id: String(job.id), mode: 'redis' };
    }

    this.memoryJobs.push({ name, data });
    return { id: `mem-${Date.now()}-${this.memoryJobs.length}`, mode: 'memory' };
  }

  async isRedisHealthy(): Promise<boolean | null> {
    if (!this.connection) return null;
    try {
      return (await this.connection.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.memoryTimer) clearInterval(this.memoryTimer);
    await Promise.all(this.workers.map((worker) => worker.close()));
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    if (this.connection) await this.connection.quit();
  }

  private queueFor(name: JobName): QueueName {
    if (name === 'report.generate') return QUEUE_NAMES.REPORTS;
    if (name === 'notification.dispatch') return QUEUE_NAMES.NOTIFICATIONS;
    return QUEUE_NAMES.MAINTENANCE;
  }

  private async flushMemory(): Promise<void> {
    while (this.memoryJobs.length > 0) {
      const job = this.memoryJobs.shift();
      if (!job) break;
      const handler = this.handlers.get(job.name);
      if (!handler) continue;
      try {
        await handler(job.data);
      } catch (error) {
        this.logger.error(
          `Memory job xato: ${job.name}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}

/** Standart background job handlerlarni ulang. */
@Injectable()
export class QueueBootstrap implements OnModuleInit {
  private readonly logger = new Logger(QueueBootstrap.name);

  constructor(
    private readonly queue: QueueService,
    private readonly anomalies: AnomalyScheduler,
    private readonly backup: BackupService,
  ) {}

  onModuleInit(): void {
    this.queue.register('anomaly.check', async () => this.anomalies.run());
    this.queue.register('backup.run', async (data) => {
      const tiers = (data.tiers as Array<'daily' | 'weekly' | 'monthly'> | undefined) ?? ['daily'];
      return this.backup.create(tiers);
    });
    this.queue.register('cleanup.temp', async () => {
      this.logger.debug('Temp cleanup (stub)');
      return { ok: true };
    });
    this.queue.register('report.generate', async (data) => {
      this.logger.log(`Hisobot navbatga olindi: ${JSON.stringify(data)}`);
      return { queued: true, ...data };
    });
    this.queue.register('notification.dispatch', async (data) => {
      this.logger.debug(`Notification dispatch: ${JSON.stringify(data)}`);
      return { ok: true };
    });
  }
}

@Global()
@Module({
  imports: [BackupModule, SchedulerModule],
  providers: [QueueService, QueueBootstrap],
  exports: [QueueService],
})
export class QueueModule {}
