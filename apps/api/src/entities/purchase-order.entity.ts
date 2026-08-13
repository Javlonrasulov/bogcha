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
import { PurchaseOrderStatus } from './enums';
import { Branch } from './branch.entity';
import { Expense } from './expense.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { StockMovement } from './stock-movement.entity';
import { Supplier } from './supplier.entity';
import { Tenant } from './tenant.entity';
import { User } from './user.entity';

@Entity('PurchaseOrder')
export class PurchaseOrder {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.purchaseOrders, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.purchaseOrders, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'text' })
  number!: string;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, enumName: 'PurchaseOrderStatus', default: PurchaseOrderStatus.DRAFT })
  status!: PurchaseOrderStatus;

  @Column({ type: 'date', nullable: true })
  neededBy!: Date | null;

  @Column({ type: 'date', nullable: true })
  orderedAt!: Date | null;

  @Column({ type: 'date', nullable: true })
  receivedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => Supplier, (related) => related.purchaseOrders, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalAmount!: number;

  @Column({ type: 'boolean', default: false })
  isPaid!: boolean;

  @Column({ type: 'text', nullable: true })
  receiveIdempotencyKey!: string | null;

  @Column({ type: 'boolean', default: false })
  generatedFromPlan!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @ManyToOne(() => User, (related) => related.createdOrders, { nullable: true })
  @JoinColumn({ name: 'createdById' })
  createdBy!: User | null;

  @Column({ type: 'uuid', nullable: true })
  approvedById!: string | null;

  @ManyToOne(() => User, (related) => related.approvedOrders, { nullable: true })
  @JoinColumn({ name: 'approvedById' })
  approvedBy!: User | null;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  approvalComment!: string | null;

  @Column({ type: 'text', nullable: true })
  documentNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  receiptImageUrl!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => PurchaseOrderItem, (related) => related.purchaseOrder)
  items!: PurchaseOrderItem[];

  @OneToMany(() => StockMovement, (related) => related.purchaseOrder)
  stockMovements!: StockMovement[];

  @OneToMany(() => Expense, (related) => related.purchaseOrder)
  expenses!: Expense[];
}
