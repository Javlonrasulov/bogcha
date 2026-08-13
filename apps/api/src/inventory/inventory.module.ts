import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Branch } from '../entities/branch.entity';
import { Product } from '../entities/product.entity';
import { ProductCategory } from '../entities/product-category.entity';
import { StockItem } from '../entities/stock-item.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { Supplier } from '../entities/supplier.entity';
import { SupplierPrice } from '../entities/supplier-price.entity';
import { InventoryController } from './inventory.controller';
import { ProductsService } from './products.service';
import { StockService } from './stock.service';
import { SuppliersService } from './suppliers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Branch,
      Product,
      ProductCategory,
      StockItem,
      StockMovement,
      Supplier,
      SupplierPrice,
    ]),
  ],
  controllers: [InventoryController],
  providers: [ProductsService, StockService, SuppliersService],
  exports: [ProductsService, StockService, SuppliersService],
})
export class InventoryModule {}
