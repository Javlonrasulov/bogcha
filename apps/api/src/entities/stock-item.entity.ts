/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Branch } from './branch.entity';
import { Product } from './product.entity';
import { Tenant } from './tenant.entity';

@Entity('StockItem')
export class StockItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.stockItems, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.stockItems, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (related) => related.stockItems, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer, default: 0 })
  quantity!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  unitCost!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalValue!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMovementAt!: Date | null;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
