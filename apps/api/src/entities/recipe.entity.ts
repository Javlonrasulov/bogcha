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
import { MealType } from './enums';
import { MenuSlotRecipe } from './menu-slot-recipe.entity';
import { RecipeItem } from './recipe-item.entity';
import { Tenant } from './tenant.entity';

@Entity('Recipe')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.recipes, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'enum', enum: MealType, enumName: 'MealType' })
  mealType!: MealType;

  @Column({ type: 'int', default: 100 })
  baseHeadcount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  wastePercent!: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, transformer: ColumnNumericTransformer, nullable: true })
  caloriesPerPortion!: number | null;

  @Column({ type: 'text', nullable: true })
  instructions!: string | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => RecipeItem, (related) => related.recipe)
  items!: RecipeItem[];

  @OneToMany(() => MenuSlotRecipe, (related) => related.recipe)
  menuSlots!: MenuSlotRecipe[];
}
