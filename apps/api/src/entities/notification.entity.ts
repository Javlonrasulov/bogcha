/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { NotificationKind, NotificationSeverity } from './enums';
import { Branch } from './branch.entity';
import { NotificationRecipient } from './notification-recipient.entity';
import { Tenant } from './tenant.entity';

@Entity('Notification')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.notifications, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => Branch, (related) => related.notifications, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch | null;

  @Column({ type: 'enum', enum: NotificationKind, enumName: 'NotificationKind' })
  kind!: NotificationKind;

  @Column({ type: 'enum', enum: NotificationSeverity, enumName: 'NotificationSeverity', default: NotificationSeverity.INFO })
  severity!: NotificationSeverity;

  @Column({ type: 'text' })
  title!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'text' })
  dedupeKey!: string;

  @Column({ type: 'text', nullable: true })
  entityType!: string | null;

  @Column({ type: 'text', nullable: true })
  entityId!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metric!: Record<string, unknown> | unknown[] | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => NotificationRecipient, (related) => related.notification)
  recipients!: NotificationRecipient[];
}
