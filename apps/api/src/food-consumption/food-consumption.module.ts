import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceModule } from '../attendance/attendance.module';
import { FoodConsumptionActual } from '../entities/food-consumption-actual.entity';
import { FoodStockCheck } from '../entities/food-stock-check.entity';
import { Product } from '../entities/product.entity';
import { ProductDailyNorm } from '../entities/product-daily-norm.entity';
import { StockItem } from '../entities/stock-item.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { FoodConsumptionController } from './food-consumption.controller';
import { FoodConsumptionService } from './food-consumption.service';

@Module({
  imports: [
    AttendanceModule,
    TypeOrmModule.forFeature([
      ProductDailyNorm,
      FoodConsumptionActual,
      FoodStockCheck,
      Product,
      StockItem,
      StockMovement,
    ]),
  ],
  controllers: [FoodConsumptionController],
  providers: [FoodConsumptionService],
  exports: [FoodConsumptionService],
})
export class FoodConsumptionModule {}
