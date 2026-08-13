import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Prisma UUID PK larida DB default yo'q edi — TypeORM insert DEFAULT ishlatadi.
 * Faqat yakka `id` ustunlariga gen_random_uuid() qo'shiladi (composite PK emas).
 */
export class UuidPkDefaults20260812120000 implements MigrationInterface {
  name = 'UuidPkDefaults20260812120000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'AttendanceBatch',
      'AttendanceRecord',
      'AuditLog',
      'Branch',
      'Budget',
      'BudgetLine',
      'Child',
      'Expense',
      'ExpenseCategory',
      'Group',
      'Guardian',
      'Income',
      'IncomeCategory',
      'Invoice',
      'Menu',
      'MenuSlot',
      'Notification',
      'NutritionDay',
      'NutritionDayLine',
      'Payment',
      'PaymentAllocation',
      'Payroll',
      'PayrollItem',
      'Plan',
      'Product',
      'ProductCategory',
      'PurchaseOrder',
      'PurchaseOrderItem',
      'Recipe',
      'RecipeItem',
      'RefreshToken',
      'Staff',
      'StaffAttendance',
      'StockItem',
      'StockMovement',
      'Supplier',
      'SupplierPrice',
      'Tenant',
      'TenantSettings',
      'User',
    ];

    for (const table of tables) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ALTER COLUMN "id" SET DEFAULT gen_random_uuid()`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'AttendanceBatch',
      'AttendanceRecord',
      'AuditLog',
      'Branch',
      'Budget',
      'BudgetLine',
      'Child',
      'Expense',
      'ExpenseCategory',
      'Group',
      'Guardian',
      'Income',
      'IncomeCategory',
      'Invoice',
      'Menu',
      'MenuSlot',
      'Notification',
      'NutritionDay',
      'NutritionDayLine',
      'Payment',
      'PaymentAllocation',
      'Payroll',
      'PayrollItem',
      'Plan',
      'Product',
      'ProductCategory',
      'PurchaseOrder',
      'PurchaseOrderItem',
      'Recipe',
      'RecipeItem',
      'RefreshToken',
      'Staff',
      'StaffAttendance',
      'StockItem',
      'StockMovement',
      'Supplier',
      'SupplierPrice',
      'Tenant',
      'TenantSettings',
      'User',
    ];

    for (const table of tables) {
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "id" DROP DEFAULT`);
    }
  }
}
