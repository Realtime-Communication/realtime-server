import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { ReportStatus } from '@prisma/client';
import { Pageable } from '../../common/pagination/pageable.dto';
import { Type } from 'class-transformer';

export class UpdateReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsOptional()
  @IsString()
  rejectedReason?: string;
}

export class ReportFilterDto  {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Size must be a number' })
  size: number = 10;

  @IsOptional()
  @IsString({ each: true, message: 'Search fields must be an array of strings' })
  searchFields?: string[];

  @IsOptional()
  @IsString()
  order?: string; 
} 
