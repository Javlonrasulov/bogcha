import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import {
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  CreateIncomeCategoryDto,
  CreateIncomeDto,
  DebtQueryDto,
  DeleteReasonQueryDto,
  FinanceQueryDto,
  GenerateInvoicesDto,
  PaymentQueryDto,
  PeriodQueryDto,
  RecordPaymentDto,
  SetBudgetDto,
  UpdateExpenseDto,
} from './dto/finance.dto';
import { FinanceService } from './finance.service';
import { PaymentsService } from './payments.service';

@ApiTags('Finance')
@Controller()
export class FinanceController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // ── Xarajatlar ────────────────────────────────────────────────

  @Get('expenses')
  @RequirePermissions(Permission.EXPENSE_VIEW)
  @ApiOperation({ summary: "Xarajatlar ro'yxati" })
  expenses(@Query() query: FinanceQueryDto, @Scope() scope: RequestScope) {
    return this.financeService.listExpenses(scope, query as never);
  }

  @Post('expenses')
  @RequirePermissions(Permission.EXPENSE_MANAGE)
  @ApiOperation({ summary: 'Xarajat kiritish' })
  createExpense(@Body() body: CreateExpenseDto, @Scope() scope: RequestScope) {
    return this.financeService.createExpense(scope, body as never);
  }

  @Patch('expenses/:id')
  @RequirePermissions(Permission.EXPENSE_MANAGE)
  @ApiOperation({ summary: "Xarajatni o'zgartirish" })
  updateExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateExpenseDto,
    @Scope() scope: RequestScope,
  ) {
    return this.financeService.updateExpense(scope, id, body as never);
  }

  @Delete('expenses/:id')
  @RequirePermissions(Permission.EXPENSE_MANAGE)
  @ApiOperation({ summary: "Xarajatni o'chirish" })
  removeExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: DeleteReasonQueryDto,
    @Scope() scope: RequestScope,
  ) {
    return this.financeService.removeExpense(scope, id, query.reason);
  }

  @Get('expense-categories')
  @RequirePermissions(Permission.EXPENSE_VIEW)
  @ApiOperation({ summary: 'Xarajat kategoriyalari va joriy oy sarfi' })
  expenseCategories(@Scope() scope: RequestScope) {
    return this.financeService.listExpenseCategories(scope);
  }

  @Post('expense-categories')
  @RequirePermissions(Permission.EXPENSE_MANAGE)
  @ApiOperation({ summary: 'Yangi xarajat kategoriyasi' })
  createExpenseCategory(@Body() body: CreateExpenseCategoryDto, @Scope() scope: RequestScope) {
    return this.financeService.createExpenseCategory(scope, body);
  }

  // ── Daromadlar ────────────────────────────────────────────────

  @Get('incomes')
  @RequirePermissions(Permission.INCOME_VIEW)
  @ApiOperation({ summary: "Daromadlar ro'yxati" })
  incomes(@Query() query: FinanceQueryDto, @Scope() scope: RequestScope) {
    return this.financeService.listIncomes(scope, query as never);
  }

  @Post('incomes')
  @RequirePermissions(Permission.INCOME_MANAGE)
  @ApiOperation({ summary: 'Daromad kiritish' })
  createIncome(@Body() body: CreateIncomeDto, @Scope() scope: RequestScope) {
    return this.financeService.createIncome(scope, body as never);
  }

  @Get('income-categories')
  @RequirePermissions(Permission.INCOME_VIEW)
  @ApiOperation({ summary: 'Daromad kategoriyalari' })
  incomeCategories(@Scope() scope: RequestScope) {
    return this.financeService.listIncomeCategories(scope);
  }

  @Post('income-categories')
  @RequirePermissions(Permission.INCOME_MANAGE)
  @ApiOperation({ summary: 'Yangi daromad kategoriyasi' })
  createIncomeCategory(@Body() body: CreateIncomeCategoryDto, @Scope() scope: RequestScope) {
    return this.financeService.createIncomeCategory(scope, body);
  }

  // ── Hisobot va budjet ─────────────────────────────────────────

  @Get('finance/summary')
  @RequirePermissions(Permission.EXPENSE_VIEW, Permission.INCOME_VIEW)
  @ApiOperation({ summary: 'Oylik moliyaviy natija: daromad, xarajat, sof foyda' })
  summary(@Query() query: PeriodQueryDto, @Scope() scope: RequestScope) {
    return this.financeService.summary(scope, query);
  }

  @Get('finance/plan-vs-fact')
  @RequirePermissions(Permission.BUDGET_VIEW)
  @ApiOperation({ summary: 'Reja vs Fakt taqqoslash' })
  planVsFact(@Query() query: PeriodQueryDto, @Scope() scope: RequestScope) {
    return this.financeService.planVsFact(scope, query);
  }

  @Post('finance/budget')
  @RequirePermissions(Permission.BUDGET_MANAGE)
  @ApiOperation({ summary: 'Oylik budjetni belgilash' })
  setBudget(@Body() body: SetBudgetDto, @Scope() scope: RequestScope) {
    return this.financeService.setBudget(scope, body as never);
  }

  // ── To'lovlar va qarzdorlik ───────────────────────────────────

  @Get('payments')
  @RequirePermissions(Permission.PAYMENT_VIEW)
  @ApiOperation({ summary: "To'lovlar ro'yxati" })
  payments(@Query() query: PaymentQueryDto, @Scope() scope: RequestScope) {
    return this.paymentsService.listPayments(scope, query as never);
  }

  @Post('payments')
  @RequirePermissions(Permission.PAYMENT_MANAGE)
  @ApiOperation({ summary: "To'lov qabul qilish (avtomatik daromadga yoziladi)" })
  recordPayment(@Body() body: RecordPaymentDto, @Scope() scope: RequestScope) {
    return this.paymentsService.recordPayment(scope, body as never);
  }

  @Get('payments/summary')
  @RequirePermissions(Permission.PAYMENT_VIEW)
  @ApiOperation({ summary: "Kutilayotgan / to'langan / qarz" })
  collectionSummary(@Query() query: PeriodQueryDto, @Scope() scope: RequestScope) {
    return this.paymentsService.collectionSummary(scope, query);
  }

  @Post('invoices/generate')
  @RequirePermissions(Permission.PAYMENT_MANAGE)
  @ApiOperation({ summary: 'Oylik hisob-fakturalarni yaratish' })
  generateInvoices(@Body() body: GenerateInvoicesDto, @Scope() scope: RequestScope) {
    return this.paymentsService.generateInvoices(scope, body as never);
  }

  @Get('invoices/child/:childId')
  @RequirePermissions(Permission.PAYMENT_VIEW)
  @ApiOperation({ summary: "Bolaning hisob-fakturalari" })
  childInvoices(@Param('childId', ParseUUIDPipe) childId: string, @Scope() scope: RequestScope) {
    return this.paymentsService.childInvoices(scope, childId);
  }

  @Get('debts')
  @RequirePermissions(Permission.DEBT_VIEW)
  @ApiOperation({ summary: "Qarzdorlar ro'yxati" })
  debtors(@Query() query: DebtQueryDto, @Scope() scope: RequestScope) {
    return this.paymentsService.debtors(scope, query as never);
  }
}
