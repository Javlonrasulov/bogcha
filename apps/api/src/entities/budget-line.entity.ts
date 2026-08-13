/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Budget } from './budget.entity';
import { ExpenseCategory } from './expense-category.entity';

@Entity('BudgetLine')
export class BudgetLine {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  budgetId!: string;

  @ManyToOne(() => Budget, (related) => related.lines, { nullable: false })
  @JoinColumn({ name: 'budgetId' })
  budget!: Budget;

  @Column({ type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => ExpenseCategory, (related) => related.budgetLines, { nullable: false })
  @JoinColumn({ name: 'categoryId' })
  category!: ExpenseCategory;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer })
  plannedAmount!: number;
}
