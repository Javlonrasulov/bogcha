import { Body, Controller, Get, Post, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import { RequirePermissions } from '../common/decorators';
import { BackupService } from './backup.service';
import { CreateBackupDto } from './dto/backup.dto';

/**
 * Zaxira butun bazani, ya'ni barcha tashkilotlar ma'lumotini qamraydi.
 * Shu sababli u faqat platforma egasiga (SUPER_ADMIN) ochiq (TZ §39, §43).
 */
@ApiTags('Backup')
@Controller('backups')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get()
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({ summary: "Mavjud zaxiralar ro'yxati" })
  async list() {
    return {
      enabled: this.backupService.enabled,
      items: await this.backupService.list(),
    };
  }

  @Post()
  @RequirePermissions(Permission.TENANT_MANAGE)
  @ApiOperation({ summary: 'Hozir zaxira olish' })
  async create(@Body() body: CreateBackupDto) {
    try {
      const files = await this.backupService.create(body.tiers);
      return { success: true, files };
    } catch (error) {
      throw new ServiceUnavailableException(
        error instanceof Error ? error.message : 'Zaxiralash muvaffaqiyatsiz',
      );
    }
  }
}
