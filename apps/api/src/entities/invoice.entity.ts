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
import { InvoiceStatus } from './enums';
import { Branch } from './branch.entity';
import { Child } from './child.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Tenant } from './tenant.entity';

@Entity('Invoice')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.invoices, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.invoices, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  childId!: string;

  @ManyToOne(() => Child, (related) => related.invoices, { nullable: false })
  @JoinColumn({ name: 'childId' })
  child!: Child;

  @Column({ type: 'text' })
  period!: string;

  @Column({ type: 'date' })
  dueDate!: Date;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  baseAmount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  discountPercent!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  discountAmount!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  totalAmount!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  paidAmount!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  balance!: number;

  @Column({ type: 'enum', enum: InvoiceStatus, enumName: 'InvoiceStatus', default: InvoiceStatus.ISSUED })
  status!: InvoiceStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => PaymentAllocation, (related) => related.invoice)
  allocations!: PaymentAllocation[];
}
