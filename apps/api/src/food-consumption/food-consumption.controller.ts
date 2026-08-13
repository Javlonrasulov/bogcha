import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import {
  CreateProductDailyNormDto,
  FoodConsumptionReportQueryDto,
  FoodNormsQueryDto,
  UpsertFoodActualDto,
  UpsertFoodStockCheckDto,
} from './dto/food-consumption.dto';
import { FoodConsumptionService } from './food-consumption.service';

@ApiTags('Food consumption')
@Controller('food-consumption')
export class FoodConsumptionController {
  constructor(private readonly foodConsumptionService: FoodConsumptionService) {}

  @Get('norms')
  @RequirePermissions(Permission.PRODUCT_VIEW, Permission.RECIPE_VIEW, Permission.STOCK_VIEW)
  @ApiOperation({ summary: "Mahsulot me'yorlari (1 bola / 1 kun)" })
  norms(@Query() query: FoodNormsQueryDto, @Scope() scope: RequestScope) {
    return this.foodConsumptionService.listNorms(scope, query.branchId);
  }

  @Post('norms')
  @RequirePermissions(Permission.PRODUCT_MANAGE, Permission.RECIPE_MANAGE, Permission.STOCK_MANAGE)
  @ApiOperation({ summary: "Yangi me'yor versiyasi (effectiveFrom bilan)" })
  createNorm(@Body() body: CreateProductDailyNormDto, @Scope() scope: RequestScope) {
    return this.foodConsumptionService.createNorm(scope, body);
  }

  @Get('report')
  @RequirePermissions(Permission.PRODUCT_VIEW, Permission.RECIPE_VIEW, Permission.STOCK_VIEW)
  @ApiOperation({ summary: "Davomat → me'yoriy sarf → amaldagi sarf → ombor" })
  report(@Query() query: FoodConsumptionReportQueryDto, @Scope() scope: RequestScope) {
    return this.foodConsumptionService.report(scope, query);
  }

  @Post('actual')
  @RequirePermissions(Permission.PRODUCT_MANAGE, Permission.RECIPE_MANAGE, Permission.STOCK_MANAGE)
  @ApiOperation({ summary: 'Amaldagi mahsulot sarfini saqlash' })
  upsertActual(@Body() body: UpsertFoodActualDto, @Scope() scope: RequestScope) {
    return this.foodConsumptionService.upsertActual(scope, body);
  }

  @Post('stock-check')
  @RequirePermissions(Permission.STOCK_MANAGE, Permission.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Real ombor qoldig‘ini kiritish va solishtirish' })
  upsertStockCheck(@Body() body: UpsertFoodStockCheckDto, @Scope() scope: RequestScope) {
    return this.foodConsumptionService.upsertStockCheck(scope, body);
  }
}
