/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MealType, Weekday } from './enums';
import { Menu } from './menu.entity';
import { MenuSlotRecipe } from './menu-slot-recipe.entity';

@Entity('MenuSlot')
export class MenuSlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  menuId!: string;

  @ManyToOne(() => Menu, (related) => related.slots, { nullable: false })
  @JoinColumn({ name: 'menuId' })
  menu!: Menu;

  @Column({ type: 'enum', enum: Weekday, enumName: 'Weekday' })
  weekday!: Weekday;

  @Column({ type: 'enum', enum: MealType, enumName: 'MealType' })
  mealType!: MealType;

  @OneToMany(() => MenuSlotRecipe, (related) => related.menuSlot)
  recipes!: MenuSlotRecipe[];
}
