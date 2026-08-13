/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Unit } from './enums';
import { NutritionDay } from './nutrition-day.entity';
import { Product } from './product.entity';

@Entity('NutritionDayLine')
export class NutritionDayLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  nutritionDayId!: string;

  @ManyToOne(() => NutritionDay, (related) => related.lines, { nullable: false })
  @JoinColumn({ name: 'nutritionDayId' })
  nutritionDay!: NutritionDay;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (related) => related.nutritionLines, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'enum', enum: Unit, enumName: 'Unit' })
  unit!: Unit;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  plannedQuantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  actualQuantity!: number;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  savedQuantity!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  unitCost!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  plannedCost!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  actualCost!: number;

  @Column({ type: 'boolean', default: false })
  wasOverridden!: boolean;

  @Column({ type: 'text', nullable: true })
  overrideReason!: string | null;
}
