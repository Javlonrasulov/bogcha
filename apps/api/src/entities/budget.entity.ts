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
import { BudgetLine } from './budget-line.entity';
import { Tenant } from './tenant.entity';

@Entity('Budget')
export class Budget {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.budgets, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.budgets, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'text' })
  period!: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: ColumnNumericTransformer, nullable: true })
  plannedRevenue!: number | null;

  @Column({ type: 'int', nullable: true })
  plannedChildren!: number | null;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => BudgetLine, (related) => related.budget)
  lines!: BudgetLine[];
}
