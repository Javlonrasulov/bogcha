import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Unit } from '../../entities/enums';
import { IsEnum } from 'class-validator';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateProductDailyNormDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  quantityPerChild!: number;

  @ApiProperty({ enum: Unit })
  @IsEnum(Unit)
  unit!: Unit;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  @Matches(DATE_ONLY)
  effectiveFrom!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class FoodConsumptionReportQueryDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  @Matches(DATE_ONLY)
  from!: string;

  @ApiProperty({ example: '2026-08-10' })
  @IsString()
  @Matches(DATE_ONLY)
  to!: string;
}

export class FoodNormsQueryDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;
}

export class FoodActualLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualQuantity!: number;
}

export class UpsertFoodActualDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: '2026-08-01' })
  @IsString()
  @Matches(DATE_ONLY)
  date!: string;

  @ApiProperty({ type: [FoodActualLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FoodActualLineDto)
  lines!: FoodActualLineDto[];
}

export class FoodStockCheckLineDto {
  @ApiProperty()
  @IsUUID()
  productId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  countedQuantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}

export class UpsertFoodStockCheckDto {
  @ApiProperty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ example: '2026-08-10' })
  @IsString()
  @Matches(DATE_ONLY)
  checkDate!: string;

  @ApiProperty({ type: [FoodStockCheckLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FoodStockCheckLineDto)
  lines!: FoodStockCheckLineDto[];
}
