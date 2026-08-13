import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceRecord } from '../entities/attendance-record.entity';
import { Branch } from '../entities/branch.entity';
import { Child } from '../entities/child.entity';
import { Expense } from '../entities/expense.entity';
import { Group } from '../entities/group.entity';
import { Income } from '../entities/income.entity';
import { Invoice } from '../entities/invoice.entity';
import { Product } from '../entities/product.entity';
import { StockItem } from '../entities/stock-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      Child,
      AttendanceRecord,
      Income,
      Expense,
      Invoice,
      StockItem,
      Product,
      Supplier,
      Group,
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
