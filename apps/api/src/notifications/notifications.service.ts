import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Anomaly, PaginationQuery } from '@bogcha/shared';
import { DataSource, IsNull, Repository } from 'typeorm';
import { requireTenant, type RequestScope } from '../common/scope/request-scope';
import { paginate, paginated } from '../common/utils/pagination.util';
import { NotificationKind, NotificationSeverity, Role } from '../entities/enums';
import { NotificationRecipient } from '../entities/notification-recipient.entity';
import { Notification } from '../entities/notification.entity';
import { User } from '../entities/user.entity';
import { RealtimeEvent, RealtimeGateway } from '../realtime/realtime.gateway';
import {
  defaultNotificationChannels,
  type NotificationChannel,
} from './notification.channels';

/** Ogohlantirish qaysi rollarga yuboriladi. */
const KIND_AUDIENCE: Readonly<Record<NotificationKind, Role[]>> = {
  LOW_STOCK: [Role.OWNER, Role.ADMINISTRATOR, Role.STOREKEEPER, Role.COOK],
  EXPENSE_SPIKE: [Role.OWNER, Role.ADMINISTRATOR, Role.ACCOUNTANT],
  BUDGET_EXCEEDED: [Role.OWNER, Role.ACCOUNTANT],
  DEBT_ALERT: [Role.OWNER, Role.ADMINISTRATOR, Role.ACCOUNTANT],
  PAYMENT_DUE: [Role.OWNER, Role.ADMINISTRATOR, Role.ACCOUNTANT],
  STAFF_LATE: [Role.OWNER, Role.ADMINISTRATOR],
  ABNORMAL_CONSUMPTION: [Role.OWNER, Role.ADMINISTRATOR, Role.COOK, Role.STOREKEEPER],
  ATTENDANCE_DROP: [Role.OWNER, Role.ADMINISTRATOR],
  PRICE_SPIKE: [Role.OWNER, Role.ADMINISTRATOR, Role.STOREKEEPER, Role.ACCOUNTANT],
  PURCHASE_APPROVAL: [Role.OWNER, Role.ADMINISTRATOR],
  NEW_PURCHASE: [Role.OWNER, Role.ADMINISTRATOR, Role.ACCOUNTANT],
  SYSTEM: [Role.OWNER],
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly channels: NotificationChannel[] = defaultNotificationChannels();

  constructor(
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectRepository(NotificationRecipient)
    private readonly recipients: Repository<NotificationRecipient>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Anomaliyalarni bildirishnomaga aylantiradi. `dedupeKey` bir xil ogohlantirish
   * qayta-qayta yuborilishini bloklaydi (TZ §22, §30).
   *
   * Kalit filial bilan qo'shib saqlanadi: bir tashkilotning ikki filialida bir
   * kunda davomat tushsa, ikkalasi ham alohida ogohlantirish oladi (TZ §26).
   */
  async publishAnomalies(
    tenantId: string,
    branchId: string | null,
    anomalies: readonly Anomaly[],
  ): Promise<number> {
    let created = 0;

    for (const anomaly of anomalies) {
      const dedupeKey = branchId ? `${branchId}:${anomaly.dedupeKey}` : anomaly.dedupeKey;

      const existing = await this.notifications.findOne({
        where: { tenantId, dedupeKey },
      });
      if (existing) continue;

      const recipientIds = await this.resolveRecipients(tenantId, branchId, anomaly.kind as NotificationKind);

      const notification = await this.dataSource.transaction(async (manager) => {
        const saved = await manager.save(
          manager.create(Notification, {
            tenantId,
            branchId,
            kind: anomaly.kind as NotificationKind,
            severity: anomaly.severity as NotificationSeverity,
            title: anomaly.title,
            message: anomaly.message,
            dedupeKey,
            entityType: anomaly.entity?.type ?? null,
            entityId: anomaly.entity?.id ?? null,
            metric: anomaly.metric ? (anomaly.metric as Record<string, unknown>) : null,
          }),
        );

        if (recipientIds.length > 0) {
          await manager.save(
            recipientIds.map((userId) =>
              manager.create(NotificationRecipient, {
                notificationId: saved.id,
                userId,
                readAt: null,
              }),
            ),
          );
        }

        return saved;
      });

      created += 1;
      this.realtime.emitToTenant(tenantId, RealtimeEvent.NOTIFICATION_CREATED, notification);
      await this.dispatchChannels({
        tenantId,
        userIds: recipientIds,
        title: anomaly.title,
        message: anomaly.message,
        kind: anomaly.kind,
        severity: anomaly.severity,
      });
    }

    return created;
  }

  async create(params: {
    tenantId: string;
    branchId?: string | null;
    kind: NotificationKind;
    severity?: NotificationSeverity;
    title: string;
    message: string;
    dedupeKey: string;
    entityType?: string;
    entityId?: string;
  }): Promise<void> {
    const recipients = await this.resolveRecipients(
      params.tenantId,
      params.branchId ?? null,
      params.kind,
    );

    const severity = params.severity ?? NotificationSeverity.INFO;

    const notification = await this.dataSource.transaction(async (manager) => {
      let existing = await manager.findOne(Notification, {
        where: { tenantId: params.tenantId, dedupeKey: params.dedupeKey },
      });

      if (existing) {
        existing.message = params.message;
        existing.severity = severity;
        existing = await manager.save(existing);
        return existing;
      }

      const created = await manager.save(
        manager.create(Notification, {
          tenantId: params.tenantId,
          branchId: params.branchId ?? null,
          kind: params.kind,
          severity,
          title: params.title,
          message: params.message,
          dedupeKey: params.dedupeKey,
          entityType: params.entityType ?? null,
          entityId: params.entityId ?? null,
        }),
      );

      if (recipients.length > 0) {
        await manager.save(
          recipients.map((userId) =>
            manager.create(NotificationRecipient, {
              notificationId: created.id,
              userId,
              readAt: null,
            }),
          ),
        );
      }

      return created;
    });

    this.realtime.emitToTenant(params.tenantId, RealtimeEvent.NOTIFICATION_CREATED, notification);
    await this.dispatchChannels({
      tenantId: params.tenantId,
      userIds: recipients,
      title: params.title,
      message: params.message,
      kind: params.kind,
      severity,
    });
  }

  async list(scope: RequestScope, query: PaginationQuery & { unreadOnly?: boolean }) {
    const tenantId = requireTenant(scope);
    const { skip, take } = paginate(query);

    const qb = this.notifications
      .createQueryBuilder('n')
      .innerJoinAndSelect('n.recipients', 'r', 'r.userId = :userId', { userId: scope.userId })
      .where('n.tenantId = :tenantId', { tenantId })
      .orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    if (query.unreadOnly) {
      qb.andWhere('r.readAt IS NULL');
    }

    const [items, total] = await qb.getManyAndCount();

    const unreadCount = await this.recipients
      .createQueryBuilder('r')
      .innerJoin('r.notification', 'n')
      .where('r.userId = :userId', { userId: scope.userId })
      .andWhere('r.readAt IS NULL')
      .andWhere('n.tenantId = :tenantId', { tenantId })
      .getCount();

    return {
      ...paginated(
        items.map((item) => ({ ...item, readAt: item.recipients[0]?.readAt ?? null })),
        total,
        query,
      ),
      unreadCount,
    };
  }

  async markRead(scope: RequestScope, notificationId: string) {
    await this.recipients.update(
      { notificationId, userId: scope.userId, readAt: IsNull() },
      { readAt: new Date() },
    );
    return { success: true };
  }

  async markAllRead(scope: RequestScope) {
    const tenantId = requireTenant(scope);
    const result = await this.recipients
      .createQueryBuilder()
      .update(NotificationRecipient)
      .set({ readAt: new Date() })
      .where('"userId" = :userId', { userId: scope.userId })
      .andWhere('"readAt" IS NULL')
      .andWhere(
        `"notificationId" IN (SELECT id FROM "Notification" WHERE "tenantId" = :tenantId)`,
        { tenantId },
      )
      .execute();

    return { success: true, count: result.affected ?? 0 };
  }

  private async dispatchChannels(payload: {
    tenantId: string;
    userIds: string[];
    title: string;
    message: string;
    kind: string;
    severity: string;
  }): Promise<void> {
    for (const channel of this.channels) {
      try {
        await channel.send(payload);
      } catch (error) {
        this.logger.warn(
          `Kanal ${channel.kind} xato: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  private async resolveRecipients(
    tenantId: string,
    branchId: string | null,
    kind: NotificationKind,
  ): Promise<string[]> {
    const roles = KIND_AUDIENCE[kind] ?? [Role.OWNER];

    const qb = this.users
      .createQueryBuilder('user')
      .select('user.id', 'id')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.isActive = true')
      .andWhere('user.deletedAt IS NULL')
      .andWhere(`user.roles && :roles::"Role"[]`, { roles });

    if (branchId) {
      qb.andWhere(
        `(
          EXISTS (
            SELECT 1 FROM "UserBranch" ub
            WHERE ub."userId" = "user"."id" AND ub."branchId" = :branchId
          )
          OR NOT EXISTS (
            SELECT 1 FROM "UserBranch" ub2 WHERE ub2."userId" = "user"."id"
          )
        )`,
        { branchId },
      );
    }

    const users = await qb.getRawMany<{ id: string }>();
    return users.map((user) => user.id);
  }
}
