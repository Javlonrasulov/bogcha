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
import { Unit } from './enums';
import { NutritionDayLine } from './nutrition-day-line.entity';
import { ProductCategory } from './product-category.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { RecipeItem } from './recipe-item.entity';
import { StockItem } from './stock-item.entity';
import { StockMovement } from './stock-movement.entity';
import { Supplier } from './supplier.entity';
import { SupplierPrice } from './supplier-price.entity';
import { Tenant } from './tenant.entity';

@Entity('Product')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.products, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid', nullable: true })
  categoryId!: string | null;

  @ManyToOne(() => ProductCategory, (related) => related.products, { nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category!: ProductCategory | null;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'enum', enum: Unit, enumName: 'Unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  unitCost!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer, default: 0 })
  minQuantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer, nullable: true })
  maxQuantity!: number | null;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer, nullable: true })
  packageSize!: number | null;

  @Column({ type: 'int', nullable: true })
  shelfLifeDays!: number | null;

  @Column({ type: 'text', nullable: true })
  barcode!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'uuid', nullable: true })
  defaultSupplierId!: string | null;

  @ManyToOne(() => Supplier, (related) => related.products, { nullable: true })
  @JoinColumn({ name: 'defaultSupplierId' })
  defaultSupplier!: Supplier | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => StockItem, (related) => related.product)
  stockItems!: StockItem[];

  @OneToMany(() => StockMovement, (related) => related.product)
  stockMovements!: StockMovement[];

  @OneToMany(() => RecipeItem, (related) => related.product)
  recipeItems!: RecipeItem[];

  @OneToMany(() => PurchaseOrderItem, (related) => related.product)
  purchaseItems!: PurchaseOrderItem[];

  @OneToMany(() => SupplierPrice, (related) => related.product)
  supplierPrices!: SupplierPrice[];

  @OneToMany(() => NutritionDayLine, (related) => related.product)
  nutritionLines!: NutritionDayLine[];
}
