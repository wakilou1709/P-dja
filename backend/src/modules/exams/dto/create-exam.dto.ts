import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ExamType, DifficultyLevel } from '@prisma/client';

export class CreateExamDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ enum: ExamType })
  @IsEnum(ExamType)
  type: ExamType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: DifficultyLevel, default: DifficultyLevel.MEDIUM })
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficulty?: DifficultyLevel;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  duration?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
