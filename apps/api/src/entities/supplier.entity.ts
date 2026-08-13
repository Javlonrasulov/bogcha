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
import { Expense } from './expense.entity';
import { Product } from './product.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { StockMovement } from './stock-movement.entity';
import { SupplierPrice } from './supplier-price.entity';
import { Tenant } from './tenant.entity';

@Entity('Supplier')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.suppliers, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  phone!: string;

  @Column({ type: 'text', nullable: true })
  contactPerson!: string | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'text', nullable: true })
  inn!: string | null;

  @Column({ type: 'text', nullable: true })
  bankAccount!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  balance!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => Product, (related) => related.defaultSupplier)
  products!: Product[];

  @OneToMany(() => PurchaseOrder, (related) => related.supplier)
  purchaseOrders!: PurchaseOrder[];

  @OneToMany(() => SupplierPrice, (related) => related.supplier)
  prices!: SupplierPrice[];

  @OneToMany(() => StockMovement, (related) => related.supplier)
  stockMovements!: StockMovement[];

  @OneToMany(() => Expense, (related) => related.supplier)
  expenses!: Expense[];
}
