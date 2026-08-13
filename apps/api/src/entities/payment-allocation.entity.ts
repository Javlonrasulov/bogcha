/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';

@Entity('PaymentAllocation')
export class PaymentAllocation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  paymentId!: string;

  @ManyToOne(() => Payment, (related) => related.allocations, { nullable: false })
  @JoinColumn({ name: 'paymentId' })
  payment!: Payment;

  @Column({ type: 'uuid' })
  invoiceId!: string;

  @ManyToOne(() => Invoice, (related) => related.allocations, { nullable: false })
  @JoinColumn({ name: 'invoiceId' })
  invoice!: Invoice;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  amount!: number;
}
