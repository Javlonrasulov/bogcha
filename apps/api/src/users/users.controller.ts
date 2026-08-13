import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import {
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UsersListQueryDto,
} from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(Permission.USER_VIEW)
  @ApiOperation({ summary: "Foydalanuvchilar ro'yxati" })
  list(@Query() query: UsersListQueryDto, @Scope() scope: RequestScope) {
    return this.usersService.list(scope, {
      page: query.page ?? 1,
      limit: query.limit ?? 25,
      search: query.search,
      sortBy: query.sortBy,
      sortDir: query.sortDir ?? 'desc',
      role: query.role,
    });
  }

  @Get(':id')
  @RequirePermissions(Permission.USER_VIEW)
  @ApiOperation({ summary: 'Foydalanuvchi va uning huquqlari' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.usersService.findOne(scope, id);
  }

  @Post()
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Yangi foydalanuvchi' })
  create(@Body() dto: CreateUserDto, @Scope() scope: RequestScope) {
    return this.usersService.create(scope, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: "Foydalanuvchini o'zgartirish" })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Scope() scope: RequestScope,
  ) {
    return this.usersService.update(scope, id, dto);
  }

  @Post(':id/reset-password')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: 'Parolni tiklash' })
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @Scope() scope: RequestScope,
  ) {
    return this.usersService.resetPassword(scope, id, dto.newPassword);
  }

  @Delete(':id')
  @RequirePermissions(Permission.USER_MANAGE)
  @ApiOperation({ summary: "Foydalanuvchini o'chirish" })
  remove(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.usersService.remove(scope, id);
  }
}
