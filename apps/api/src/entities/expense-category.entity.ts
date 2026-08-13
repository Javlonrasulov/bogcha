/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExpenseCategoryKind } from './enums';
import { BudgetLine } from './budget-line.entity';
import { Expense } from './expense.entity';
import { Tenant } from './tenant.entity';

@Entity('ExpenseCategory')
export class ExpenseCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.expenseCategories, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'enum', enum: ExpenseCategoryKind, enumName: 'ExpenseCategoryKind' })
  kind!: ExpenseCategoryKind;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Expense, (related) => related.category)
  expenses!: Expense[];

  @OneToMany(() => BudgetLine, (related) => related.category)
  budgetLines!: BudgetLine[];
}
