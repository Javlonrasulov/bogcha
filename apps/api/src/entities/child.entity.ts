/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { ChildStatus, Gender } from './enums';
import { AttendanceRecord } from './attendance-record.entity';
import { Branch } from './branch.entity';
import { Group } from './group.entity';
import { Guardian } from './guardian.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';
import { Tenant } from './tenant.entity';

@Entity('Child')
export class Child {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.children, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.children, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => Group, (related) => related.children, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group!: Group | null;

  @Column({ type: 'text' })
  firstName!: string;

  @Column({ type: 'text' })
  lastName!: string;

  @Column({ type: 'text', nullable: true })
  middleName!: string | null;

  @Column({ type: 'date' })
  birthDate!: Date;

  @Column({ type: 'enum', enum: Gender, enumName: 'Gender' })
  gender!: Gender;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'date' })
  enrolledAt!: Date;

  @Column({ type: 'date', nullable: true })
  withdrawnAt!: Date | null;

  @Column({ type: 'enum', enum: ChildStatus, enumName: 'ChildStatus', default: ChildStatus.ACTIVE })
  status!: ChildStatus;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  monthlyFee!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  discountPercent!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  discountAmount!: number;

  @Column({ type: 'text', nullable: true })
  discountReason!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'text', nullable: true })
  medicalNotes!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => Guardian, (related) => related.child)
  guardians!: Guardian[];

  @OneToMany(() => AttendanceRecord, (related) => related.child)
  attendance!: AttendanceRecord[];

  @OneToMany(() => Invoice, (related) => related.child)
  invoices!: Invoice[];

  @OneToMany(() => Payment, (related) => related.child)
  payments!: Payment[];
}
