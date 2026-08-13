/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Payroll } from './payroll.entity';
import { Staff } from './staff.entity';

@Entity('PayrollItem')
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  payrollId!: string;

  @ManyToOne(() => Payroll, (related) => related.items, { nullable: false })
  @JoinColumn({ name: 'payrollId' })
  payroll!: Payroll;

  @Column({ type: 'uuid' })
  staffId!: string;

  @ManyToOne(() => Staff, (related) => related.payrollItems, { nullable: false })
  @JoinColumn({ name: 'staffId' })
  staff!: Staff;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  baseSalary!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  proratedBase!: number;

  @Column({ type: 'jsonb', default: [] })
  bonuses!: Record<string, unknown> | unknown[];

  @Column({ type: 'jsonb', default: [] })
  allowances!: Record<string, unknown> | unknown[];

  @Column({ type: 'jsonb', default: [] })
  deductions!: Record<string, unknown> | unknown[];

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  bonusTotal!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  allowanceTotal!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  deductionTotal!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  taxAmount!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  grossAmount!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  netAmount!: number;

  @Column({ type: 'int', nullable: true })
  workedDays!: number | null;

  @Column({ type: 'int', nullable: true })
  expectedDays!: number | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;
}
