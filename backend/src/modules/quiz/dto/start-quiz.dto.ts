import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { DifficultyLevel } from '@prisma/client';

export class StartQuizDto {
  @IsString()
  examType: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  series?: string;

  @IsEnum(DifficultyLevel)
  @IsOptional()
  difficulty?: DifficultyLevel;

  @IsNumber()
  @Min(5)
  @Max(30)
  limit: number;

  @IsEnum(['PRACTICE', 'TIMED', 'COMPETITIVE'])
  mode: 'PRACTICE' | 'TIMED' | 'COMPETITIVE';

  @IsString()
  @IsOptional()
  bacSeries?: string;
}
