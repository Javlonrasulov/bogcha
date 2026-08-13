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
import { Product } from './product.entity';
import { Recipe } from './recipe.entity';

@Entity('RecipeItem')
export class RecipeItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  recipeId!: string;

  @ManyToOne(() => Recipe, (related) => related.items, { nullable: false })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;

  @Column({ type: 'uuid' })
  productId!: string;

  @ManyToOne(() => Product, (related) => related.recipeItems, { nullable: false })
  @JoinColumn({ name: 'productId' })
  product!: Product;

  @Column({ type: 'decimal', precision: 14, scale: 3, transformer: ColumnNumericTransformer })
  quantity!: number;

  @Column({ type: 'enum', enum: Unit, enumName: 'Unit' })
  unit!: Unit;
}
