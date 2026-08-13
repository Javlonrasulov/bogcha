/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { IncomeCategoryKind } from './enums';
import { Income } from './income.entity';
import { Tenant } from './tenant.entity';

@Entity('IncomeCategory')
export class IncomeCategory {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.incomeCategories, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'enum', enum: IncomeCategoryKind, enumName: 'IncomeCategoryKind' })
  kind!: IncomeCategoryKind;

  @Column({ type: 'boolean', default: false })
  isSystem!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Income, (related) => related.category)
  incomes!: Income[];
}
