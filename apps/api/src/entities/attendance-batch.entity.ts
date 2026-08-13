/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AttendanceRecord } from './attendance-record.entity';
import { Branch } from './branch.entity';
import { Group } from './group.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('AttendanceBatch')
export class AttendanceBatch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.attendanceBatches, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.attendanceBatches, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, (related) => related.attendanceBatches, { nullable: false })
  @JoinColumn({ name: 'groupId' })
  group!: Group;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'uuid', nullable: true })
  submittedById!: string | null;

  @ManyToOne(() => User, (related) => related.submittedBatches, { nullable: true })
  @JoinColumn({ name: 'submittedById' })
  submittedBy!: User | null;

  @Column({ type: 'timestamp' })
  submittedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  clientRecordedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'boolean', default: false })
  syncedFromOffline!: boolean;

  @Column({ type: 'int', default: 0 })
  totalCount!: number;

  @Column({ type: 'int', default: 0 })
  presentCount!: number;

  @Column({ type: 'int', default: 0 })
  absentCount!: number;

  @OneToMany(() => AttendanceRecord, (related) => related.batch)
  records!: AttendanceRecord[];
}
