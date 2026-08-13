import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { CreateGroupDto, GroupsListQueryDto, UpdateGroupDto } from './dto/groups.dto';
import { GroupsService } from './groups.service';

@ApiTags('Groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @RequirePermissions(Permission.GROUP_VIEW)
  @ApiOperation({ summary: "Guruhlar ro'yxati (sig'im, davomat statistikasi)" })
  list(@Query() query: GroupsListQueryDto, @Scope() scope: RequestScope) {
    return this.groupsService.list(scope, query);
  }

  @Get('my')
  @RequirePermissions(Permission.GROUP_VIEW)
  @ApiOperation({ summary: "Tarbiyachining o'z guruhlari" })
  myGroups(@Scope() scope: RequestScope) {
    return this.groupsService.myGroups(scope);
  }

  @Get(':id')
  @RequirePermissions(Permission.GROUP_VIEW)
  @ApiOperation({ summary: "Guruh ma'lumotlari va bolalar ro'yxati" })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.groupsService.findOne(scope, id);
  }

  @Post()
  @RequirePermissions(Permission.GROUP_MANAGE)
  @ApiOperation({ summary: 'Yangi guruh' })
  create(@Body() dto: CreateGroupDto, @Scope() scope: RequestScope) {
    return this.groupsService.create(scope, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.GROUP_MANAGE)
  @ApiOperation({ summary: "Guruhni o'zgartirish" })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGroupDto,
    @Scope() scope: RequestScope,
  ) {
    return this.groupsService.update(scope, id, dto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.GROUP_MANAGE)
  @ApiOperation({ summary: "Guruhni o'chirish" })
  remove(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.groupsService.remove(scope, id);
  }
}
