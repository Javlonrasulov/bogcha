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
import { Product } from './product.entity';
import { Supplier } from './supplier.entity';
import { Tenant } from './tenant.entity';

@Entity('SupplierPrice')
export class SupplierPrice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.supplierPrices, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  supplierId!: string;

  @ManyToOne(() => Supplier, (related) => related.prices, { nullable: false })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (related) => related.supplierPrices, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer })
  price!: number;

  @Column({ type: 'date' })
  date!: Date;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;
}
