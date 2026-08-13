/**
 * Bildirishnoma kanallari abstraksiyasi (TZ §29).
 * Hozircha in-app; kelajakda push / email / SMS / Telegram qo'shiladi.
 */
export type NotificationChannelKind = 'in_app' | 'push' | 'email' | 'sms' | 'telegram';

export interface NotificationDispatchPayload {
  tenantId: string;
  userIds: string[];
  title: string;
  message: string;
  kind: string;
  severity: string;
  meta?: Record<string, unknown>;
}

export interface NotificationChannel {
  readonly kind: NotificationChannelKind;
  send(payload: NotificationDispatchPayload): Promise<void>;
}

/** In-app kanal — DB + realtime allaqachon NotificationsService da. No-op dispatch. */
export class InAppNotificationChannel implements NotificationChannel {
  readonly kind = 'in_app' as const;

  async send(_payload: NotificationDispatchPayload): Promise<void> {
    // Yozuv Prisma orqali yaratiladi; bu kanal kelajakdagi fan-out uchun rezerv.
  }
}

/** Stub kanallar — REDIS_URL + tashqi provayder ulanganda to'ldiriladi. */
export class PushNotificationChannel implements NotificationChannel {
  readonly kind = 'push' as const;
  async send(_payload: NotificationDispatchPayload): Promise<void> {
    /* not configured */
  }
}

export class EmailNotificationChannel implements NotificationChannel {
  readonly kind = 'email' as const;
  async send(_payload: NotificationDispatchPayload): Promise<void> {
    /* not configured */
  }
}

export class SmsNotificationChannel implements NotificationChannel {
  readonly kind = 'sms' as const;
  async send(_payload: NotificationDispatchPayload): Promise<void> {
    /* not configured */
  }
}

export class TelegramNotificationChannel implements NotificationChannel {
  readonly kind = 'telegram' as const;
  async send(_payload: NotificationDispatchPayload): Promise<void> {
    /* not configured */
  }
}

export function defaultNotificationChannels(): NotificationChannel[] {
  return [
    new InAppNotificationChannel(),
    new PushNotificationChannel(),
    new EmailNotificationChannel(),
    new SmsNotificationChannel(),
    new TelegramNotificationChannel(),
  ];
}
