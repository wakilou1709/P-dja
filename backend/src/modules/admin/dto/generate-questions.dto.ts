import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class GenerateQuestionsDto {
  @IsString()
  examType: string;

  @IsString()
  subject: string;

  @IsString()
  @IsOptional()
  series?: string;

  @IsString()
  difficulty: string;

  @IsNumber()
  @Min(1)
  @Max(10)
  count: number;

  @IsArray()
  @IsString({ each: true })
  questionTypes: string[];

  @IsBoolean()
  @IsOptional()
  saveDirectly?: boolean;

  @IsString()
  @IsOptional()
  examId?: string;
}
