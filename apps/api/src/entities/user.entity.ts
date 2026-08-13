/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from './enums';
import { AttendanceBatch } from './attendance-batch.entity';
import { AuditLog } from './audit-log.entity';
import { GroupTeacher } from './group-teacher.entity';
import { NotificationRecipient } from './notification-recipient.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { RefreshToken } from './refresh-token.entity';
import { Staff } from './staff.entity';
import { Tenant } from './tenant.entity';
import { UserBranch } from './user-branch.entity';

@Entity('User')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  tenantId!: string | null;

  @ManyToOne(() => Tenant, (related) => related.users, { nullable: true })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant | null;

  @Column({ type: 'text' })
  fullName!: string;

  @Column({ type: 'text', nullable: true })
  email!: string | null;

  @Column({ type: 'text' })
  phone!: string;

  @Column({ type: 'text' })
  passwordHash!: string;

  @Column({ type: 'enum', enum: Role, enumName: 'Role', array: true, default: [] })
  roles!: Role[];

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'text', default: "uz" })
  locale!: string;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'int', default: 0 })
  tokenVersion!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ type: 'int', default: 0 })
  failedLoginCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lockedUntil!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => UserBranch, (related) => related.user)
  branches!: UserBranch[];

  @OneToMany(() => GroupTeacher, (related) => related.user)
  groups!: GroupTeacher[];

  @OneToOne(() => Staff, (related) => related.user)
  staff!: Staff | null;

  @OneToMany(() => RefreshToken, (related) => related.user)
  refreshTokens!: RefreshToken[];

  @OneToMany(() => AuditLog, (related) => related.user)
  auditLogs!: AuditLog[];

  @OneToMany(() => NotificationRecipient, (related) => related.user)
  notifications!: NotificationRecipient[];

  @OneToMany(() => PurchaseOrder, (related) => related.approvedBy)
  approvedOrders!: PurchaseOrder[];

  @OneToMany(() => PurchaseOrder, (related) => related.createdBy)
  createdOrders!: PurchaseOrder[];

  @OneToMany(() => AttendanceBatch, (related) => related.submittedBy)
  submittedBatches!: AttendanceBatch[];
}
