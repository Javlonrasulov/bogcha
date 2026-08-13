import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceStatus } from '@bogcha/shared';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export class AttendanceEntryDto {
  @ApiProperty()
  @IsUUID()
  childId!: string;

  @ApiProperty({ enum: AttendanceStatus })
  @IsEnum(AttendanceStatus)
  status!: AttendanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME)
  arrivedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(TIME)
  leftAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class MarkAttendanceDto {
  @ApiProperty()
  @IsUUID()
  groupId!: string;

  @ApiProperty()
  @IsString()
  @Matches(DATE_ONLY)
  date!: string;

  @ApiProperty({ type: [AttendanceEntryDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries!: AttendanceEntryDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientRecordedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(120)
  idempotencyKey?: string;
}

export class AttendanceSummaryQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;
}

export class AttendanceTrendQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  to?: string;

  @ApiPropertyOptional({ default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number = 30;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;
}

export class AttendanceBoardQueryDto {
  @ApiProperty()
  @IsUUID()
  groupId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  date?: string;
}

export class AttendanceMissingQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  date?: string;
}

export class AttendanceRecordsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY)
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  childId?: string;

  @ApiPropertyOptional({ enum: AttendanceStatus })
  @IsOptional()
  @IsEnum(AttendanceStatus)
  status?: AttendanceStatus;
}
