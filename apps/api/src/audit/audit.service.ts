import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { PaginationQuery } from '@bogcha/shared';
import { Between, type FindOptionsWhere, Repository } from 'typeorm';
import type { RequestScope } from '../common/scope/request-scope';
import { paginate, paginated } from '../common/utils/pagination.util';
import { AuditAction } from '../entities/enums';
import { AuditLog } from '../entities/audit-log.entity';

export interface AuditEntry {
  action: AuditAction | `${AuditAction}`;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  reason?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>,
  ) {}

  /**
   * Audit yozuvini saqlaydi. Audit yozishdagi xatolik asosiy biznes amalini
   * to'xtatmasligi kerak, shuning uchun faqat log qilinadi.
   */
  async record(scope: RequestScope, entry: AuditEntry): Promise<void> {
    try {
      const changedFields = diffFields(entry.oldValue, entry.newValue);

      await this.auditLogs.save(
        this.auditLogs.create({
          tenantId: scope.tenantId,
          userId: scope.userId || null,
          action: entry.action as AuditAction,
          entityType: entry.entityType,
          entityId: entry.entityId ?? null,
          summary: entry.summary ?? null,
          reason: entry.reason ?? null,
          oldValue: toJson(entry.oldValue) ?? null,
          newValue: toJson(entry.newValue) ?? null,
          changedFields,
          ipAddress: entry.ipAddress ?? null,
          userAgent: entry.userAgent ?? null,
        }),
      );
    } catch (error) {
      this.logger.error(`Audit yozuvini saqlash muvaffaqiyatsiz: ${String(error)}`);
    }
  }

  /** Tizim tomonidan bajarilgan avtomatik amallar uchun (foydalanuvchi yo'q). */
  async recordSystem(tenantId: string, entry: AuditEntry): Promise<void> {
    await this.record(
      { userId: '', tenantId, roles: [], permissions: [], branchIds: [], groupIds: [] },
      entry,
    );
  }

  async list(
    scope: RequestScope,
    query: PaginationQuery & {
      entityType?: string;
      entityId?: string;
      userId?: string;
      action?: AuditAction;
      from?: string;
      to?: string;
    },
  ) {
    const where: FindOptionsWhere<AuditLog> = {
      ...(scope.tenantId ? { tenantId: scope.tenantId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.from && query.to
        ? {
            createdAt: Between(
              new Date(`${query.from}T00:00:00.000Z`),
              new Date(`${query.to}T23:59:59.999Z`),
            ),
          }
        : {}),
    };

    const { skip, take } = paginate(query);

    const qb = this.auditLogs
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .where(where)
      .orderBy('log.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.search) {
      qb.andWhere(
        '(log.summary ILIKE :search OR log.entityType ILIKE :search OR log.reason ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.from && !query.to) {
      qb.andWhere('log.createdAt >= :from', {
        from: new Date(`${query.from}T00:00:00.000Z`),
      });
    }
    if (query.to && !query.from) {
      qb.andWhere('log.createdAt <= :to', {
        to: new Date(`${query.to}T23:59:59.999Z`),
      });
    }

    const [items, total] = await qb.getManyAndCount();
    return paginated(items, total, query);
  }
}

function toJson(value: unknown): Record<string, unknown> | unknown[] | null | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown> | unknown[];
}

/** Eski va yangi qiymat orasidagi farqni maydonlar ro'yxati sifatida qaytaradi. */
export function diffFields(oldValue: unknown, newValue: unknown): string[] {
  if (!isRecord(oldValue) || !isRecord(newValue)) return [];

  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  const changed: string[] = [];

  for (const key of keys) {
    if (JSON.stringify(oldValue[key]) !== JSON.stringify(newValue[key])) changed.push(key);
  }
  return changed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
