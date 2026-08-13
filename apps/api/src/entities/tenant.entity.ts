/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TenantStatus } from './enums';
import { AttendanceBatch } from './attendance-batch.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { AuditLog } from './audit-log.entity';
import { Branch } from './branch.entity';
import { Budget } from './budget.entity';
import { Child } from './child.entity';
import { Expense } from './expense.entity';
import { ExpenseCategory } from './expense-category.entity';
import { Group } from './group.entity';
import { Guardian } from './guardian.entity';
import { Income } from './income.entity';
import { IncomeCategory } from './income-category.entity';
import { Invoice } from './invoice.entity';
import { Menu } from './menu.entity';
import { Notification } from './notification.entity';
import { NutritionDay } from './nutrition-day.entity';
import { Payment } from './payment.entity';
import { Payroll } from './payroll.entity';
import { Plan } from './plan.entity';
import { Product } from './product.entity';
import { ProductCategory } from './product-category.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { Recipe } from './recipe.entity';
import { RefreshToken } from './refresh-token.entity';
import { Staff } from './staff.entity';
import { StaffAttendance } from './staff-attendance.entity';
import { StockItem } from './stock-item.entity';
import { StockMovement } from './stock-movement.entity';
import { Supplier } from './supplier.entity';
import { SupplierPrice } from './supplier-price.entity';
import { TenantSettings } from './tenant-settings.entity';
import { User } from './user.entity';

@Entity('Tenant')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  name!: string;

  @Column({ type: 'text', unique: true })
  slug!: string;

  @Column({ type: 'enum', enum: TenantStatus, enumName: 'TenantStatus', default: TenantStatus.ACTIVE })
  status!: TenantStatus;

  @Column({ type: 'uuid', nullable: true })
  planId!: string | null;

  @ManyToOne(() => Plan, (related) => related.tenants, { nullable: true })
  @JoinColumn({ name: 'planId' })
  plan!: Plan | null;

  @Column({ type: 'timestamp', nullable: true })
  planEndsAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  ownerFullName!: string | null;

  @Column({ type: 'text', nullable: true })
  contactPhone!: string | null;

  @Column({ type: 'text', nullable: true })
  contactEmail!: string | null;

  @Column({ type: 'text', nullable: true })
  logoUrl!: string | null;

  @Column({ type: 'text', default: "Asia/Tashkent" })
  timezone!: string;

  @Column({ type: 'text', default: "UZS" })
  currency!: string;

  @Column({ type: 'text', default: "uz" })
  locale!: string;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt!: Date | null;

  @OneToMany(() => Branch, (related) => related.tenant)
  branches!: Branch[];

  @OneToMany(() => User, (related) => related.tenant)
  users!: User[];

  @OneToMany(() => Group, (related) => related.tenant)
  groups!: Group[];

  @OneToMany(() => Child, (related) => related.tenant)
  children!: Child[];

  @OneToMany(() => Guardian, (related) => related.tenant)
  guardians!: Guardian[];

  @OneToMany(() => AttendanceRecord, (related) => related.tenant)
  attendance!: AttendanceRecord[];

  @OneToMany(() => AttendanceBatch, (related) => related.tenant)
  attendanceBatches!: AttendanceBatch[];

  @OneToMany(() => ProductCategory, (related) => related.tenant)
  productCategories!: ProductCategory[];

  @OneToMany(() => Product, (related) => related.tenant)
  products!: Product[];

  @OneToMany(() => StockItem, (related) => related.tenant)
  stockItems!: StockItem[];

  @OneToMany(() => StockMovement, (related) => related.tenant)
  stockMovements!: StockMovement[];

  @OneToMany(() => Supplier, (related) => related.tenant)
  suppliers!: Supplier[];

  @OneToMany(() => SupplierPrice, (related) => related.tenant)
  supplierPrices!: SupplierPrice[];

  @OneToMany(() => PurchaseOrder, (related) => related.tenant)
  purchaseOrders!: PurchaseOrder[];

  @OneToMany(() => Recipe, (related) => related.tenant)
  recipes!: Recipe[];

  @OneToMany(() => Menu, (related) => related.tenant)
  menus!: Menu[];

  @OneToMany(() => NutritionDay, (related) => related.tenant)
  nutritionDays!: NutritionDay[];

  @OneToMany(() => ExpenseCategory, (related) => related.tenant)
  expenseCategories!: ExpenseCategory[];

  @OneToMany(() => IncomeCategory, (related) => related.tenant)
  incomeCategories!: IncomeCategory[];

  @OneToMany(() => Expense, (related) => related.tenant)
  expenses!: Expense[];

  @OneToMany(() => Income, (related) => related.tenant)
  incomes!: Income[];

  @OneToMany(() => Invoice, (related) => related.tenant)
  invoices!: Invoice[];

  @OneToMany(() => Payment, (related) => related.tenant)
  payments!: Payment[];

  @OneToMany(() => Staff, (related) => related.tenant)
  staff!: Staff[];

  @OneToMany(() => StaffAttendance, (related) => related.tenant)
  staffAttendance!: StaffAttendance[];

  @OneToMany(() => Payroll, (related) => related.tenant)
  payrolls!: Payroll[];

  @OneToMany(() => Budget, (related) => related.tenant)
  budgets!: Budget[];

  @OneToMany(() => Notification, (related) => related.tenant)
  notifications!: Notification[];

  @OneToMany(() => AuditLog, (related) => related.tenant)
  auditLogs!: AuditLog[];

  @OneToOne(() => TenantSettings, (related) => related.tenant)
  settings!: TenantSettings | null;

  @OneToMany(() => RefreshToken, (related) => related.tenant)
  refreshTokens!: RefreshToken[];
}
