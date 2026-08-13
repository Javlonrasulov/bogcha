/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Notification } from './notification.entity';
import { User } from './user.entity';

@Entity('NotificationRecipient')
export class NotificationRecipient {
  @PrimaryColumn('uuid')
  notificationId!: string;

  @ManyToOne(() => Notification, (related) => related.recipients, { nullable: false })
  @JoinColumn({ name: 'notificationId' })
  notification!: Notification;

  @PrimaryColumn('uuid')
  userId!: string;

  @ManyToOne(() => User, (related) => related.notifications, { nullable: false })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'timestamp', nullable: true })
  readAt!: Date | null;
}
