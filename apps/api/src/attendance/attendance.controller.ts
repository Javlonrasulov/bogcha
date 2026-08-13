import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { addDays, formatDateOnly, toDateOnly, todayDateOnly } from '../common/utils/date.util';
import { AttendanceService } from './attendance.service';
import {
  AttendanceBoardQueryDto,
  AttendanceMissingQueryDto,
  AttendanceRecordsQueryDto,
  AttendanceSummaryQueryDto,
  AttendanceTrendQueryDto,
  MarkAttendanceDto,
} from './dto/attendance.dto';

@ApiTags('Attendance')
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @RequirePermissions(Permission.ATTENDANCE_MARK)
  @ApiOperation({
    summary: "Guruh davomatini saqlash (offline sinxronizatsiyani qo'llab-quvvatlaydi)",
  })
  mark(@Body() dto: MarkAttendanceDto, @Scope() scope: RequestScope) {
    return this.attendanceService.mark(scope, dto);
  }

  @Get('summary')
  @RequirePermissions(Permission.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Kunlik davomat jamlanmasi' })
  summary(@Query() query: AttendanceSummaryQueryDto, @Scope() scope: RequestScope) {
    return this.attendanceService.daySummary(scope, query);
  }

  @Get('trend')
  @RequirePermissions(Permission.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Davomat trendi (haftalik/oylik)' })
  trend(@Query() query: AttendanceTrendQueryDto, @Scope() scope: RequestScope) {
    const to = query.to ?? formatDateOnly(todayDateOnly());
    const days = query.days ?? 30;
    const from = query.from ?? formatDateOnly(addDays(toDateOnly(to), -(days - 1)));
    return this.attendanceService.trend(scope, {
      from,
      to,
      branchId: query.branchId,
      groupId: query.groupId,
    });
  }

  @Get('board')
  @RequirePermissions(Permission.ATTENDANCE_MARK, Permission.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Tarbiyachi ekrani: guruhning bugungi holati' })
  board(@Query() query: AttendanceBoardQueryDto, @Scope() scope: RequestScope) {
    return this.attendanceService.teacherBoard(scope, query);
  }

  @Get('missing')
  @RequirePermissions(Permission.ATTENDANCE_MANAGE)
  @ApiOperation({ summary: 'Davomat kiritilmagan guruhlar' })
  missing(@Query() query: AttendanceMissingQueryDto, @Scope() scope: RequestScope) {
    return this.attendanceService.missingSubmissions(scope, query.date);
  }

  @Get('records')
  @RequirePermissions(Permission.ATTENDANCE_VIEW)
  @ApiOperation({ summary: 'Davomat yozuvlari' })
  records(@Query() query: AttendanceRecordsQueryDto, @Scope() scope: RequestScope) {
    return this.attendanceService.records(scope, query);
  }
}
