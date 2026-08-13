/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { StockMovementSource, StockMovementType } from './enums';
import { Branch } from './branch.entity';
import { Expense } from './expense.entity';
import { NutritionDay } from './nutrition-day.entity';
import { Product } from './product.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Supplier } from './supplier.entity';
import { Tenant } from './tenant.entity';

@Entity('StockMovement')
export class StockMovement {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.stockMovements, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.stockMovements, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (related) => related.stockMovements, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'enum', enum: StockMovementType, enumName: 'StockMovementType' })
  type!: StockMovementType;

  @Column({ type: 'enum', enum: StockMovementSource, enumName: 'StockMovementSource', default: StockMovementSource.MANUAL })
  source!: StockMovementSource;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  quantity!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  unitCost!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalCost!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  balanceAfter!: number;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ type: 'text', nullable: true })
  documentNumber!: string | null;

  @Column({ type: 'text', nullable: true })
  attachmentUrl!: string | null;

  @Column({ type: 'uuid', nullable: true })
  supplierId!: string | null;

  @ManyToOne(() => Supplier, (related) => related.stockMovements, { nullable: true })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier | null;

  @Column({ type: 'uuid', nullable: true })
  purchaseOrderId!: string | null;

  @ManyToOne(() => PurchaseOrder, (related) => related.stockMovements, { nullable: true })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: PurchaseOrder | null;

  @Column({ type: 'uuid', nullable: true })
  nutritionDayId!: string | null;

  @ManyToOne(() => NutritionDay, (related) => related.stockMovements, { nullable: true })
  @JoinColumn({ name: 'nutritionDayId' })
  nutritionDay!: NutritionDay | null;

  @Column({ type: 'uuid', nullable: true })
  expenseId!: string | null;

  @ManyToOne(() => Expense, (related) => related.stockMovements, { nullable: true })
  @JoinColumn({ name: 'expenseId' })
  expense!: Expense | null;

  @Column({ type: 'uuid', nullable: true })
  createdById!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
