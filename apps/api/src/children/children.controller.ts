import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { ChildrenService } from './children.service';
import { ChildQueryDto, CreateChildDto, UpdateChildDto } from './dto/children.dto';

@ApiTags('Children')
@Controller('children')
export class ChildrenController {
  constructor(private readonly childrenService: ChildrenService) {}

  @Get()
  @RequirePermissions(Permission.CHILD_VIEW, Permission.CHILD_VIEW_OWN_GROUP)
  @ApiOperation({ summary: "Bolalar ro'yxati (filtr, qidiruv, qarzdorlik)" })
  list(@Query() query: ChildQueryDto, @Scope() scope: RequestScope) {
    return this.childrenService.list(scope, {
      page: query.page ?? 1,
      limit: query.limit ?? 25,
      search: query.search,
      sortBy: query.sortBy,
      sortDir: query.sortDir ?? 'desc',
      branchId: query.branchId,
      groupId: query.groupId,
      status: query.status,
      gender: query.gender,
      hasDebt: query.hasDebt,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.CHILD_VIEW, Permission.CHILD_VIEW_OWN_GROUP)
  @ApiOperation({ summary: "Bola profili: davomat, to'lov tarixi, qarzdorlik" })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.childrenService.findOne(scope, id);
  }

  @Post()
  @RequirePermissions(Permission.CHILD_MANAGE)
  @ApiOperation({ summary: 'Yangi bola qabul qilish' })
  create(@Body() dto: CreateChildDto, @Scope() scope: RequestScope) {
    return this.childrenService.create(scope, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CHILD_MANAGE)
  @ApiOperation({ summary: "Bola ma'lumotlarini o'zgartirish" })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChildDto,
    @Scope() scope: RequestScope,
  ) {
    return this.childrenService.update(scope, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CHILD_MANAGE)
  @ApiOperation({ summary: "Bolani ro'yxatdan chiqarish" })
  remove(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.childrenService.remove(scope, id);
  }
}
