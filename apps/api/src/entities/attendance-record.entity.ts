/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AttendanceStatus } from './enums';
import { AttendanceBatch } from './attendance-batch.entity';
import { Child } from './child.entity';
import { Group } from './group.entity';
import { Tenant } from './tenant.entity';

@Entity('AttendanceRecord')
export class AttendanceRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.attendance, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  childId!: string;

  @ManyToOne(() => Child, (related) => related.attendance, { nullable: false })
  @JoinColumn({ name: 'childId' })
  child!: Child;

  @Column({ type: 'uuid', nullable: true })
  groupId!: string | null;

  @ManyToOne(() => Group, (related) => related.attendance, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group!: Group | null;

  @Column({ type: 'uuid', nullable: true })
  batchId!: string | null;

  @ManyToOne(() => AttendanceBatch, (related) => related.records, { nullable: true })
  @JoinColumn({ name: 'batchId' })
  batch!: AttendanceBatch | null;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'enum', enum: AttendanceStatus, enumName: 'AttendanceStatus' })
  status!: AttendanceStatus;

  @Column({ type: 'timestamp', nullable: true })
  arrivedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  leftAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
