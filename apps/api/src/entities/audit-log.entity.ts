/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from './enums';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('AuditLog')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, (related) => related.auditLogs, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant | null;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, (related) => related.auditLogs, { nullable: true })
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  @Column({ type: 'enum', enum: AuditAction, enumName: 'AuditAction' })
  action!: AuditAction;

  @Column({ type: 'text' })
  entityType!: string;

  @Column({ type: 'text', nullable: true })
  entityId!: string | null;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  oldValue!: Record<string, unknown> | unknown[] | null;

  @Column({ type: 'jsonb', nullable: true })
  newValue!: Record<string, unknown> | unknown[] | null;

  @Column({ type: 'text', array: true, default: [] })
  changedFields!: string[];

  @Column({ type: 'text', nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
