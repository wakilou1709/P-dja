import { IsString, IsOptional, Matches, Length } from 'class-validator';

export class CreatePromoCodeDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  @Length(4, 12)
  @Matches(/^[A-Z0-9]+$/, { message: 'Le code doit contenir uniquement des lettres majuscules et des chiffres' })
  code?: string;
}
