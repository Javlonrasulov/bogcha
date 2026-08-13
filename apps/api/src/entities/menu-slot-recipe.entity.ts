/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { MenuSlot } from './menu-slot.entity';
import { Recipe } from './recipe.entity';

@Entity('MenuSlotRecipe')
export class MenuSlotRecipe {
  @PrimaryColumn('uuid')
  menuSlotId!: string;

  @PrimaryColumn('uuid')
  recipeId!: string;

  @ManyToOne(() => MenuSlot, (related) => related.recipes, { nullable: false })
  @JoinColumn({ name: 'menuSlotId' })
  menuSlot!: MenuSlot;

  @ManyToOne(() => Recipe, (related) => related.menuSlots, { nullable: false })
  @JoinColumn({ name: 'recipeId' })
  recipe!: Recipe;
}
