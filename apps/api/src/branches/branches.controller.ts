import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { BranchesService } from './branches.service';

@ApiTags('Branches')
@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @RequirePermissions(Permission.BRANCH_VIEW)
  @ApiOperation({ summary: "Filiallar ro'yxati va to'ldirilish darajasi" })
  list(@Scope() scope: RequestScope) {
    return this.branchesService.list(scope);
  }

  @Get(':id')
  @RequirePermissions(Permission.BRANCH_VIEW)
  @ApiOperation({ summary: "Filial ma'lumotlari" })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.branchesService.findOne(scope, id);
  }
}
