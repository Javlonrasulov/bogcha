import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions, Scope } from '../common/decorators';
import type { RequestScope } from '../common/scope/request-scope';
import { NotificationListQueryDto } from './dto/notifications.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @RequirePermissions(Permission.NOTIFICATION_VIEW)
  @ApiOperation({ summary: "Bildirishnomalar ro'yxati" })
  list(@Query() query: NotificationListQueryDto, @Scope() scope: RequestScope) {
    return this.notificationsService.list(scope, {
      page: query.page ?? 1,
      limit: query.limit ?? 25,
      sortDir: query.sortDir ?? 'desc',
      search: query.search,
      sortBy: query.sortBy,
      unreadOnly: query.unreadOnly,
    });
  }

  @Post(':id/read')
  @RequirePermissions(Permission.NOTIFICATION_VIEW)
  @ApiOperation({ summary: "O'qilgan deb belgilash" })
  markRead(@Param('id', ParseUUIDPipe) id: string, @Scope() scope: RequestScope) {
    return this.notificationsService.markRead(scope, id);
  }

  @Post('read-all')
  @RequirePermissions(Permission.NOTIFICATION_VIEW)
  @ApiOperation({ summary: "Barchasini o'qilgan deb belgilash" })
  markAllRead(@Scope() scope: RequestScope) {
    return this.notificationsService.markAllRead(scope);
  }
}
