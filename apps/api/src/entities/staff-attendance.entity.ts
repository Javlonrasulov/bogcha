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
import { ColumnNumericTransformer } from './decimal.transformer';
import { Staff } from './staff.entity';
import { Tenant } from './tenant.entity';

@Entity('StaffAttendance')
export class StaffAttendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.staffAttendance, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  staffId!: string;

  @ManyToOne(() => Staff, (related) => related.attendance, { nullable: false })
  @JoinColumn({ name: 'staffId' })
  staff!: Staff;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkInAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  checkOutAt!: Date | null;

  @Column({ type: 'decimal', precision: 6, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  workedHours!: number;

  @Column({ type: 'int', default: 0 })
  lateMinutes!: number;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: ColumnNumericTransformer, nullable: true })
  checkInLatitude!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: ColumnNumericTransformer, nullable: true })
  checkInLongitude!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: ColumnNumericTransformer, nullable: true })
  checkOutLatitude!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: ColumnNumericTransformer, nullable: true })
  checkOutLongitude!: number | null;

  @Column({ type: 'text', nullable: true })
  deviceId!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
