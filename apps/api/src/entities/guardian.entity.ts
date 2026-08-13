/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Child } from './child.entity';
import { Tenant } from './tenant.entity';

@Entity('Guardian')
export class Guardian {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.guardians, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  childId!: string;

  @ManyToOne(() => Child, (related) => related.guardians, { nullable: false })
  @JoinColumn({ name: 'childId' })
  child!: Child;

  @Column({ type: 'text' })
  fullName!: string;

  @Column({ type: 'text' })
  relation!: string;

  @Column({ type: 'text' })
  phone!: string;

  @Column({ type: 'text', nullable: true })
  secondaryPhone!: string | null;

  @Column({ type: 'text', nullable: true })
  workplace!: string | null;

  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;
}
