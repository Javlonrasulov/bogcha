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
import { PayrollStatus } from './enums';
import { Branch } from './branch.entity';
import { Expense } from './expense.entity';
import { PayrollItem } from './payroll-item.entity';
import { Tenant } from './tenant.entity';

@Entity('Payroll')
export class Payroll {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.payrolls, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.payrolls, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'text' })
  period!: string;

  @Column({ type: 'enum', enum: PayrollStatus, enumName: 'PayrollStatus', default: PayrollStatus.DRAFT })
  status!: PayrollStatus;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalGross!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalNet!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalTax!: number;

  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => PayrollItem, (related) => related.payroll)
  items!: PayrollItem[];

  @OneToMany(() => Expense, (related) => related.payroll)
  expenses!: Expense[];
}
