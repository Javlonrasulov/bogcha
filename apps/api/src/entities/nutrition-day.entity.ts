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
import { Branch } from './branch.entity';
import { Expense } from './expense.entity';
import { NutritionDayLine } from './nutrition-day-line.entity';
import { StockMovement } from './stock-movement.entity';
import { Tenant } from './tenant.entity';

@Entity('NutritionDay')
export class NutritionDay {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.nutritionDays, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.nutritionDays, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'date' })
  date!: Date;

  @Column({ type: 'int' })
  plannedHeadcount!: number;

  @Column({ type: 'int' })
  actualHeadcount!: number;

  @Column({ type: 'int', nullable: true })
  headcountOverride!: number | null;

  @Column({ type: 'text', nullable: true })
  overrideReason!: string | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalPlannedCost!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalActualCost!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  totalSavedCost!: number;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  costPerChild!: number;

  @Column({ type: 'boolean', default: false })
  isClosed!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  closedAt!: Date | null;

  @Column({ type: 'uuid', nullable: true })
  closedById!: string | null;

  @Column({ type: 'uuid', nullable: true })
  expenseId!: string | null;

  @ManyToOne(() => Expense, (related) => related.nutritionDays, { nullable: true })
  @JoinColumn({ name: 'expenseId' })
  expense!: Expense | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => NutritionDayLine, (related) => related.nutritionDay)
  lines!: NutritionDayLine[];

  @OneToMany(() => StockMovement, (related) => related.nutritionDay)
  stockMovements!: StockMovement[];
}
