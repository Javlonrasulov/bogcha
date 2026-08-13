import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { CronJob } from 'cron';
import { Repository } from 'typeorm';
import { DashboardService } from '../dashboard/dashboard.service';
import { Branch } from '../entities/branch.entity';
import { TenantStatus } from '../entities/enums';

const JOB_NAME = 'anomaly-check';

/**
 * Kunlik anomaliya tekshiruvi (TZ §22). Davomat pasayishi va qarzdorlik o'sishi
 * hech qanday operatsiyaga bog'lanmagan — ularni faqat vaqt bo'yicha aniqlash
 * mumkin, shuning uchun har kuni barcha faol filiallar aylanib chiqiladi.
 *
 * Qolgan besh anomaliya (ombor qoldig'i, budjet, narx, ortiqcha sarf, oziq-ovqat
 * xarajati) tegishli amal bajarilganda darhol tekshiriladi.
 */
@Injectable()
export class AnomalyScheduler implements OnModuleInit {
  private readonly logger = new Logger(AnomalyScheduler.name);

  constructor(
    @InjectRepository(Branch) private readonly branches: Repository<Branch>,
    private readonly dashboard: DashboardService,
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    if (!this.config.get<boolean>('scheduler.enabled', true)) {
      this.logger.log("Rejalashtiruvchi o'chirilgan (SCHEDULER_ENABLED=false)");
      return;
    }

    const cronTime = this.config.get<string>('scheduler.anomalyCron', '0 19 * * *');
    const job = new CronJob(cronTime, () => void this.run());

    this.registry.addCronJob(JOB_NAME, job as never);
    job.start();
    this.logger.log(`Anomaliya tekshiruvi rejalashtirildi: ${cronTime}`);
  }

  /** Barcha faol tashkilotlarning faol filiallarini tekshiradi. */
  async run(): Promise<{ branches: number; created: number }> {
    const branches = await this.branches
      .createQueryBuilder('branch')
      .innerJoin('branch.tenant', 'tenant')
      .select(['branch.id', 'branch.name', 'branch.tenantId'])
      .where('branch.isActive = true')
      .andWhere('branch.deletedAt IS NULL')
      .andWhere('tenant.status = :status', { status: TenantStatus.ACTIVE })
      .andWhere('tenant.deletedAt IS NULL')
      .getMany();

    let created = 0;

    for (const branch of branches) {
      try {
        const result = await this.dashboard.checkBranchAnomalies(branch.tenantId, branch.id);
        created += result.created;
      } catch (error) {
        // Bitta filialdagi nosozlik qolganlarini to'xtatmasligi kerak.
        this.logger.error(
          `Anomaliya tekshiruvi muvaffaqiyatsiz: ${branch.name}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    this.logger.log(
      `Anomaliya tekshiruvi tugadi: ${branches.length} filial, ${created} yangi ogohlantirish`,
    );
    return { branches: branches.length, created };
  }
}
