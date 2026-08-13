import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsOptional } from 'class-validator';
import type { BackupTier } from '../backup.service';

export class CreateBackupDto {
  @ApiPropertyOptional({
    isArray: true,
    enum: ['daily', 'weekly', 'monthly'],
    default: ['daily'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(['daily', 'weekly', 'monthly'] as const, { each: true })
  tiers: BackupTier[] = ['daily'];
}
