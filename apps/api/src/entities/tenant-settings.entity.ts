/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ColumnNumericTransformer } from './decimal.transformer';
import { Tenant } from './tenant.entity';

@Entity('TenantSettings')
export class TenantSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  tenantId!: string;

  @OneToOne(() => Tenant, (related) => related.settings)
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'int', default: 100 })
  normBaseHeadcount!: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  normWastePercent!: number;

  @Column({ type: 'decimal', precision: 10, scale: 3, transformer: ColumnNumericTransformer, default: 0 })
  normRoundingStep!: number;

  @Column({ type: 'text', default: "NONE" })
  normRoundingMode!: string;

  @Column({ type: 'decimal', precision: 5, scale: 3, transformer: ColumnNumericTransformer, default: 0 })
  staffMealFactor!: number;

  @Column({ type: 'jsonb', default: {} })
  anomalyThresholds!: Record<string, unknown> | unknown[];

  @Column({ type: 'decimal', precision: 5, scale: 2, transformer: ColumnNumericTransformer, default: 0 })
  payrollTaxPercent!: number;

  @Column({ type: 'int', default: 10 })
  invoiceDueDay!: number;

  @Column({ type: 'int', array: true, default: [1,2,3,4,5,6] })
  workdays!: number[];

  @Column({ type: 'text', default: "08:00" })
  shiftStart!: string;

  @Column({ type: 'text', default: "18:00" })
  shiftEnd!: string;

  @Column({ type: 'int', default: 10 })
  lateGraceMinutes!: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
