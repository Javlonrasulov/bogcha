/* Auto-generated from prisma/schema.prisma — do not edit by hand. */

import { Plan } from './plan.entity';
import { Tenant } from './tenant.entity';
import { TenantSettings } from './tenant-settings.entity';
import { Branch } from './branch.entity';
import { User } from './user.entity';
import { UserBranch } from './user-branch.entity';
import { RefreshToken } from './refresh-token.entity';
import { Group } from './group.entity';
import { GroupTeacher } from './group-teacher.entity';
import { Child } from './child.entity';
import { Guardian } from './guardian.entity';
import { AttendanceBatch } from './attendance-batch.entity';
import { AttendanceRecord } from './attendance-record.entity';
import { ProductCategory } from './product-category.entity';
import { Product } from './product.entity';
import { StockItem } from './stock-item.entity';
import { StockMovement } from './stock-movement.entity';
import { Supplier } from './supplier.entity';
import { SupplierPrice } from './supplier-price.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { Recipe } from './recipe.entity';
import { RecipeItem } from './recipe-item.entity';
import { Menu } from './menu.entity';
import { MenuSlot } from './menu-slot.entity';
import { MenuSlotRecipe } from './menu-slot-recipe.entity';
import { NutritionDay } from './nutrition-day.entity';
import { NutritionDayLine } from './nutrition-day-line.entity';
import { ProductDailyNorm } from './product-daily-norm.entity';
import { FoodConsumptionActual } from './food-consumption-actual.entity';
import { FoodStockCheck } from './food-stock-check.entity';
import { ExpenseCategory } from './expense-category.entity';
import { IncomeCategory } from './income-category.entity';
import { Expense } from './expense.entity';
import { Income } from './income.entity';
import { Invoice } from './invoice.entity';
import { Payment } from './payment.entity';
import { PaymentAllocation } from './payment-allocation.entity';
import { Budget } from './budget.entity';
import { BudgetLine } from './budget-line.entity';
import { Staff } from './staff.entity';
import { StaffAttendance } from './staff-attendance.entity';
import { Payroll } from './payroll.entity';
import { PayrollItem } from './payroll-item.entity';
import { Notification } from './notification.entity';
import { NotificationRecipient } from './notification-recipient.entity';
import { AuditLog } from './audit-log.entity';

export * from './enums';
export { columnNumericTransformer, ColumnNumericTransformer } from './decimal.transformer';
export { Plan } from './plan.entity';
export { Tenant } from './tenant.entity';
export { TenantSettings } from './tenant-settings.entity';
export { Branch } from './branch.entity';
export { User } from './user.entity';
export { UserBranch } from './user-branch.entity';
export { RefreshToken } from './refresh-token.entity';
export { Group } from './group.entity';
export { GroupTeacher } from './group-teacher.entity';
export { Child } from './child.entity';
export { Guardian } from './guardian.entity';
export { AttendanceBatch } from './attendance-batch.entity';
export { AttendanceRecord } from './attendance-record.entity';
export { ProductCategory } from './product-category.entity';
export { Product } from './product.entity';
export { StockItem } from './stock-item.entity';
export { StockMovement } from './stock-movement.entity';
export { Supplier } from './supplier.entity';
export { SupplierPrice } from './supplier-price.entity';
export { PurchaseOrder } from './purchase-order.entity';
export { PurchaseOrderItem } from './purchase-order-item.entity';
export { Recipe } from './recipe.entity';
export { RecipeItem } from './recipe-item.entity';
export { Menu } from './menu.entity';
export { MenuSlot } from './menu-slot.entity';
export { MenuSlotRecipe } from './menu-slot-recipe.entity';
export { NutritionDay } from './nutrition-day.entity';
export { NutritionDayLine } from './nutrition-day-line.entity';
export { ProductDailyNorm } from './product-daily-norm.entity';
export { FoodConsumptionActual } from './food-consumption-actual.entity';
export { FoodStockCheck } from './food-stock-check.entity';
export { ExpenseCategory } from './expense-category.entity';
export { IncomeCategory } from './income-category.entity';
export { Expense } from './expense.entity';
export { Income } from './income.entity';
export { Invoice } from './invoice.entity';
export { Payment } from './payment.entity';
export { PaymentAllocation } from './payment-allocation.entity';
export { Budget } from './budget.entity';
export { BudgetLine } from './budget-line.entity';
export { Staff } from './staff.entity';
export { StaffAttendance } from './staff-attendance.entity';
export { Payroll } from './payroll.entity';
export { PayrollItem } from './payroll-item.entity';
export { Notification } from './notification.entity';
export { NotificationRecipient } from './notification-recipient.entity';
export { AuditLog } from './audit-log.entity';

export const ALL_ENTITIES = [
  Plan,
  Tenant,
  TenantSettings,
  Branch,
  User,
  UserBranch,
  RefreshToken,
  Group,
  GroupTeacher,
  Child,
  Guardian,
  AttendanceBatch,
  AttendanceRecord,
  ProductCategory,
  Product,
  StockItem,
  StockMovement,
  Supplier,
  SupplierPrice,
  PurchaseOrder,
  PurchaseOrderItem,
  Recipe,
  RecipeItem,
  Menu,
  MenuSlot,
  MenuSlotRecipe,
  NutritionDay,
  NutritionDayLine,
  ProductDailyNorm,
  FoodConsumptionActual,
  FoodStockCheck,
  ExpenseCategory,
  IncomeCategory,
  Expense,
  Income,
  Invoice,
  Payment,
  PaymentAllocation,
  Budget,
  BudgetLine,
  Staff,
  StaffAttendance,
  Payroll,
  PayrollItem,
  Notification,
  NotificationRecipient,
  AuditLog,
] as (typeof Plan)[];
