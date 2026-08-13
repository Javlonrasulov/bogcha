import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import {
  CreateCategoryDto,
  CreateProductDto,
  CreateSupplierDto,
  PaginationQueryDto,
  ProductQueryDto,
  StockAdjustmentDto,
  StockMovementDto,
  StockMovementsQueryDto,
  StockSnapshotQueryDto,
  StockTransferDto,
  UpdateProductDto,
  UpdateSupplierDto,
} from './dto/inventory.dto';
import { ProductsService } from './products.service';
import { StockService } from './stock.service';
import { SuppliersService } from './suppliers.service';

@ApiTags('Inventory')
@Controller()
export class InventoryController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly stockService: StockService,
    private readonly suppliersService: SuppliersService,
  ) {}

  @Get('products')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  @ApiOperation({ summary: "Mahsulotlar ro'yxati" })
  products(@Query() query: ProductQueryDto, @Scope() scope: RequestScope) {
    return this.productsService.list(scope, query);
  }

  @Get('products/categories')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  @ApiOperation({ summary: 'Mahsulot kategoriyalari' })
  categories(@Scope() scope: RequestScope) {
    return this.productsService.listCategories(scope);
  }

  @Post('products/categories')
  @RequirePermissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Yangi kategoriya' })
  createCategory(@Body() body: CreateCategoryDto, @Scope() scope: RequestScope) {
    return this.productsService.createCategory(scope, body);
  }

  @Get('products/:id')
  @RequirePermissions(Permission.PRODUCT_VIEW)
  @ApiOperation({ summary: "Mahsulot ma'lumotlari va narx tarixi" })
  product(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.productsService.findOne(scope, id);
  }

  @Post('products')
  @RequirePermissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({ summary: 'Yangi mahsulot' })
  createProduct(@Body() body: CreateProductDto, @Scope() scope: RequestScope) {
    return this.productsService.create(scope, body);
  }

  @Patch('products/:id')
  @RequirePermissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({ summary: "Mahsulotni o'zgartirish" })
  updateProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateProductDto,
    @Scope() scope: RequestScope,
  ) {
    return this.productsService.update(scope, id, body);
  }

  @Delete('products/:id')
  @RequirePermissions(Permission.PRODUCT_MANAGE)
  @ApiOperation({ summary: "Mahsulotni o'chirish" })
  removeProduct(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.productsService.remove(scope, id);
  }

  @Get('stock')
  @RequirePermissions(Permission.STOCK_VIEW)
  @ApiOperation({ summary: 'Ombor holati: qoldiq, qiymat, necha kunga yetadi' })
  stock(@Query() query: StockSnapshotQueryDto, @Scope() scope: RequestScope) {
    return this.stockService.snapshot(scope, {
      ...query,
      lowStockOnly: query.lowStockOnly ?? query.lowOnly,
    });
  }

  @Get('stock/movements')
  @RequirePermissions(Permission.STOCK_VIEW)
  @ApiOperation({ summary: 'Ombor harakatlari tarixi' })
  movements(@Query() query: StockMovementsQueryDto, @Scope() scope: RequestScope) {
    return this.stockService.movements(scope, query);
  }

  @Post('stock/movements')
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ApiOperation({ summary: "Qo'lda kirim/chiqim (auditga yoziladi)" })
  createMovement(@Body() body: StockMovementDto, @Scope() scope: RequestScope) {
    return this.stockService.createMovement(scope, body);
  }

  @Post('stock/adjust')
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ApiOperation({ summary: 'Inventarizatsiya: haqiqiy qoldiqni kiritish' })
  adjust(@Body() body: StockAdjustmentDto, @Scope() scope: RequestScope) {
    return this.stockService.adjust(scope, body);
  }

  @Post('stock/transfer')
  @RequirePermissions(Permission.STOCK_MANAGE)
  @ApiOperation({ summary: 'Filiallararo ombor transferi' })
  transfer(@Body() body: StockTransferDto, @Scope() scope: RequestScope) {
    return this.stockService.transfer(scope, body);
  }

  @Get('suppliers')
  @RequirePermissions(Permission.SUPPLIER_VIEW)
  @ApiOperation({ summary: "Yetkazib beruvchilar ro'yxati" })
  suppliers(@Query() query: PaginationQueryDto, @Scope() scope: RequestScope) {
    return this.suppliersService.list(scope, query);
  }

  @Get('suppliers/:id')
  @RequirePermissions(Permission.SUPPLIER_VIEW)
  @ApiOperation({ summary: 'Yetkazib beruvchi: xarid tarixi va narx tendensiyasi' })
  supplier(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.suppliersService.findOne(scope, id);
  }

  @Post('suppliers')
  @RequirePermissions(Permission.SUPPLIER_MANAGE)
  @ApiOperation({ summary: 'Yangi yetkazib beruvchi' })
  createSupplier(@Body() body: CreateSupplierDto, @Scope() scope: RequestScope) {
    return this.suppliersService.create(scope, body);
  }

  @Patch('suppliers/:id')
  @RequirePermissions(Permission.SUPPLIER_MANAGE)
  @ApiOperation({ summary: "Yetkazib beruvchini o'zgartirish" })
  updateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateSupplierDto,
    @Scope() scope: RequestScope,
  ) {
    return this.suppliersService.update(scope, id, body);
  }

  @Delete('suppliers/:id')
  @RequirePermissions(Permission.SUPPLIER_MANAGE)
  @ApiOperation({ summary: "Yetkazib beruvchini o'chirish" })
  removeSupplier(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.suppliersService.remove(scope, id);
  }
}
