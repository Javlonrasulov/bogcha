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
import { Branch } from './branch.entity';
import { MenuSlot } from './menu-slot.entity';
import { Tenant } from './tenant.entity';

@Entity('Menu')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.menus, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'uuid' })
  branchId!: string;

  @ManyToOne(() => Branch, (related) => related.menus, { nullable: false })
  @JoinColumn({ name: 'branchId' })
  branch!: Branch;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'date' })
  validFrom!: Date;

  @Column({ type: 'date', nullable: true })
  validTo!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @OneToMany(() => MenuSlot, (related) => related.menu)
  slots!: MenuSlot[];
}
