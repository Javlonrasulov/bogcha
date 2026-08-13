import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Unit } from './enums';
import { Branch } from './branch.entity';
import { Product } from './product.entity';
import { Tenant } from './tenant.entity';

@Entity('FoodStockCheck')
export class FoodStockCheck {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'date' })
  checkDate!: Date;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  countedQuantity!: number;

  @Column({ type: 'enum', enum: Unit, enumName: 'Unit' })
  unit!: Unit;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
