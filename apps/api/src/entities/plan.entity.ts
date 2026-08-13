/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { PlanTier } from './enums';
import { Tenant } from './tenant.entity';

@Entity('Plan')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PlanTier, enumName: 'PlanTier', unique: true })
  tier!: PlanTier;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'decimal', precision: 16, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  monthlyPrice!: number;

  @Column({ type: 'int', default: 1 })
  maxBranches!: number;

  @Column({ type: 'int', default: 100 })
  maxChildren!: number;

  @Column({ type: 'int', default: 10 })
  maxUsers!: number;

  @Column({ type: 'jsonb', default: {} })
  features!: Record<string, unknown> | unknown[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => Tenant, (related) => related.plan)
  tenants!: Tenant[];
}
