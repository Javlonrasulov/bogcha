/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Product } from './product.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('PurchaseOrderItem')
export class PurchaseOrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  purchaseOrderId!: string;

  @ManyToOne(() => PurchaseOrder, (related) => related.items, { nullable: false })
  @JoinColumn({ name: 'purchaseOrderId' })
  purchaseOrder!: PurchaseOrder;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (related) => related.purchaseItems, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  quantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer, nullable: true })
  receivedQuantity!: number | null;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  unitPrice!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalPrice!: number;

  @Column({ type: 'text', nullable: true })
  note!: string | null;
}
