import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { DashboardService } from './dashboard.service';
import {
  AnomalyCheckDto,
  DashboardChartsQueryDto,
  DashboardOverviewQueryDto,
  DashboardSearchQueryDto,
} from './dto/dashboard.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Bugungi holat, moliya va ombor' })
  overview(@Query() query: DashboardOverviewQueryDto, @Scope() scope: RequestScope) {
    return this.dashboardService.overview(scope, query);
  }

  @Get('charts')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Trend grafiklari: davomat, pul oqimi' })
  charts(@Query() query: DashboardChartsQueryDto, @Scope() scope: RequestScope) {
    return this.dashboardService.charts(scope, query);
  }

  @Get('search')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({ summary: 'Global qidiruv' })
  search(@Query() query: DashboardSearchQueryDto, @Scope() scope: RequestScope) {
    return this.dashboardService.globalSearch(scope, query.q);
  }

  @Post('anomaly-check')
  @RequirePermissions(Permission.DASHBOARD_VIEW)
  @ApiOperation({ summary: "G'ayritabiiy holatlarni tekshirish" })
  anomalyCheck(@Body() body: AnomalyCheckDto, @Scope() scope: RequestScope) {
    return this.dashboardService.runAnomalyChecks(scope, body);
  }
}
