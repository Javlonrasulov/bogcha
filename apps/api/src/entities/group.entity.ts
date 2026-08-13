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
import { AttendanceBatch } from './attendance-batch.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { Branch } from './branch.entity';
import { Child } from './child.entity';
import { GroupTeacher } from './group-teacher.entity';
import { Tenant } from './tenant.entity';

@Entity('Group')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.groups, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.groups, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'int', default: 3 })
  ageFrom!: number;

  @Column({ type: 'int', default: 4 })
  ageTo!: number;

  @Column({ type: 'int', default: 25 })
  capacity!: number;

  @Column({ type: 'text', nullable: true })
  colorToken!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => Child, (related) => related.group)
  children!: Child[];

  @OneToMany(() => GroupTeacher, (related) => related.group)
  teachers!: GroupTeacher[];

  @OneToMany(() => AttendanceBatch, (related) => related.group)
  attendanceBatches!: AttendanceBatch[];

  @OneToMany(() => AttendanceRecord, (related) => related.group)
  attendance!: AttendanceRecord[];
}
