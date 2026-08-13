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
import { PaymentMethod } from './enums';
import { Branch } from './branch.entity';
import { Child } from './child.entity';
import { Income } from './income.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Tenant } from './tenant.entity';

@Entity('Payment')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.payments, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.payments, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  childId!: string;

  @ManyToOne(() => Child, (related) => related.payments, { nullable: false })
  @JoinColumn({ name: 'childId' })
  child!: Child;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  amount!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'enum', enum: PaymentMethod, enumName: 'PaymentMethod', default: PaymentMethod.CASH })
  method!: PaymentMethod;

  @Column({ type: 'text', nullable: true })
  receiptNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'text', nullable: true })
  idempotencyKey!: string | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => PaymentAllocation, (related) => related.payment)
  allocations!: PaymentAllocation[];

  @OneToMany(() => Income, (related) => related.payment)
  incomes!: Income[];
}
