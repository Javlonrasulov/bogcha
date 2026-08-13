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
import { ColumnNumericTransformer } from './decimal.transformer';
import { EmploymentStatus, StaffPosition } from './enums';
import { Branch } from './branch.entity';
import { PayrollItem } from './payroll-item.entity';
import { StaffAttendance } from './staff-attendance.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('Staff')
export class Staff {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.staff, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.staff, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid', nullable: true, unique: true })
  userId!: string | null;

  @OneToOne(() => User, (related) => related.staff)
  @JoinColumn({ name: 'userId' })
  user!: User | null;

  @Column({ type: 'text' })
  firstName!: string;

  @Column({ type: 'text' })
  lastName!: string;

  @Column({ type: 'text', nullable: true })
  middleName!: string | null;

  @Column({ type: 'enum', enum: StaffPosition, enumName: 'StaffPosition' })
  position!: StaffPosition;

  @Column({ type: 'text' })
  phone!: string;

  @Column({ type: 'date', nullable: true })
  birthDate!: Date | null;

  @Column({ type: 'date' })
  hiredAt!: Date;

  @Column({ type: 'date', nullable: true })
  firedAt!: Date | null;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  baseSalary!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  monthlyBonus!: number;

  @Column({ type: 'enum', enum: EmploymentStatus, enumName: 'EmploymentStatus', default: EmploymentStatus.ACTIVE })
  status!: EmploymentStatus;

  @Column({ type: 'text', nullable: true })
  passportNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => StaffAttendance, (related) => related.staff)
  attendance!: StaffAttendance[];

  @OneToMany(() => PayrollItem, (related) => related.staff)
  payrollItems!: PayrollItem[];
}
