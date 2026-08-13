import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission } from '@bogcha/shared';
import type { Response } from 'express';
import { RequirePermissions, Scope } from '../common/decorators';
import { requireTenant, type RequestScope } from '../common/scope/request-scope';
import { StorageService } from './storage.service';

type MemoryUploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class StorageController {
  constructor(
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  @Post('upload')
  @RequirePermissions(Permission.FILE_MANAGE)
  @ApiOperation({ summary: 'Fayl yuklash (jpeg/png/webp/pdf)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      // Default: multer memoryStorage — buffer controllerda qayta ishlanadi.
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @UploadedFile() file: MemoryUploadedFile | undefined,
    @Scope() scope: RequestScope,
  ) {
    const tenantId = requireTenant(scope);
    if (!file?.buffer?.length) {
      throw new BadRequestException('Fayl yuborilmadi');
    }

    const maxMb = this.config.getOrThrow<number>('uploads.maxMb');
    this.storage.assertSize(file.size);
    this.storage.assertContentType(file.mimetype);

    const key = this.storage.buildObjectKey(file.originalname, file.mimetype);
    const result = await this.storage.putObject({
      key,
      buffer: file.buffer,
      contentType: file.mimetype,
      tenantId,
    });

    return {
      ...result,
      contentType: file.mimetype,
      size: file.size,
      maxUploadMb: maxMb,
    };
  }

  @Get('*path')
  @RequirePermissions(Permission.FILE_VIEW)
  @ApiOperation({ summary: "Mahalliy faylni ko'rish" })
  async serve(
    @Param('path') filePath: string,
    @Scope() scope: RequestScope,
    @Res() res: Response,
  ) {
    const tenantId = requireTenant(scope);
    const key = String(filePath ?? '').replace(/^\/+/, '');
    if (!key) throw new BadRequestException("Fayl yo'li ko'rsatilmagan");

    // Tenant izolyatsiyasi: kalit shu tashkilot prefiksi bilan boshlanishi shart.
    if (!key.startsWith(`${tenantId}/`)) {
      throw new BadRequestException("Bu faylga ruxsat yo'q");
    }

    const { stream } = this.storage.openReadStream(key);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.on('error', () => {
      if (!res.headersSent) res.status(404).end();
      else res.end();
    });
    stream.pipe(res);
  }
}
