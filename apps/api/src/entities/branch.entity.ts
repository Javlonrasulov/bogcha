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
import { AttendanceBatch } from './attendance-batch.entity';
import { Budget } from './budget.entity';
import { Child } from './child.entity';
import { Expense } from './expense.entity';
import { Group } from './group.entity';
import { Income } from './income.entity';
import { Invoice } from './invoice.entity';
import { Menu } from './menu.entity';
import { Notification } from './notification.entity';
import { NutritionDay } from './nutrition-day.entity';
import { Payment } from './payment.entity';
import { Payroll } from './payroll.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Staff } from './staff.entity';
import { StockItem } from './stock-item.entity';
import { StockMovement } from './stock-movement.entity';
import { Tenant } from './tenant.entity';
import { UserBranch } from './user-branch.entity';

@Entity('Branch')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @ManyToOne(() => Tenant, (related) => related.branches, { nullable: false })
  @JoinColumn({ name: 'tenantId' })
  tenant!: Tenant;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text' })
  code!: string;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ type: 'text', nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  managerName!: string | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: ColumnNumericTransformer, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 9, scale: 6, transformer: ColumnNumericTransformer, nullable: true })
  longitude!: number | null;

  @Column({ type: 'int', default: 0 })
  capacity!: number;

  @Column({ type: 'timestamp', nullable: true })
  openedAt!: Date | null;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => Group, (related) => related.branch)
  groups!: Group[];

  @OneToMany(() => Child, (related) => related.branch)
  children!: Child[];

  @OneToMany(() => StockItem, (related) => related.branch)
  stockItems!: StockItem[];

  @OneToMany(() => StockMovement, (related) => related.branch)
  stockMovements!: StockMovement[];

  @OneToMany(() => PurchaseOrder, (related) => related.branch)
  purchaseOrders!: PurchaseOrder[];

  @OneToMany(() => Menu, (related) => related.branch)
  menus!: Menu[];

  @OneToMany(() => NutritionDay, (related) => related.branch)
  nutritionDays!: NutritionDay[];

  @OneToMany(() => Expense, (related) => related.branch)
  expenses!: Expense[];

  @OneToMany(() => Income, (related) => related.branch)
  incomes!: Income[];

  @OneToMany(() => Invoice, (related) => related.branch)
  invoices!: Invoice[];

  @OneToMany(() => Payment, (related) => related.branch)
  payments!: Payment[];

  @OneToMany(() => Staff, (related) => related.branch)
  staff!: Staff[];

  @OneToMany(() => Payroll, (related) => related.branch)
  payrolls!: Payroll[];

  @OneToMany(() => Budget, (related) => related.branch)
  budgets!: Budget[];

  @OneToMany(() => UserBranch, (related) => related.branch)
  userBranches!: UserBranch[];

  @OneToMany(() => AttendanceBatch, (related) => related.branch)
  attendanceBatches!: AttendanceBatch[];

  @OneToMany(() => Notification, (related) => related.branch)
  notifications!: Notification[];
}
