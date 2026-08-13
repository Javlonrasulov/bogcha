import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { BudgetLine } from '../entities/budget-line.entity';
import { Budget } from '../entities/budget.entity';
import { Child } from '../entities/child.entity';
import { ExpenseCategory } from '../entities/expense-category.entity';
import { Expense } from '../entities/expense.entity';
import { IncomeCategory } from '../entities/income-category.entity';
import { Income } from '../entities/income.entity';
import { Invoice } from '../entities/invoice.entity';
import { PaymentAllocation } from '../entities/payment-allocation.entity';
import { Payment } from '../entities/payment.entity';
import { FinanceController } from './finance.controller';
import { FinanceService } from './finance.service';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Expense,
      Income,
      ExpenseCategory,
      IncomeCategory,
      Budget,
      BudgetLine,
      Payment,
      PaymentAllocation,
      Invoice,
      Child,
      AttendanceRecord,
      Branch,
    ]),
  ],
  controllers: [FinanceController],
  providers: [FinanceService, PaymentsService],
  exports: [FinanceService, PaymentsService],
})
export class FinanceModule {}
