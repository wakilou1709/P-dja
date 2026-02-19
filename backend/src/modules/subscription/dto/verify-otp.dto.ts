import { IsString, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  transactionId: string;

  @IsString()
  @Length(6, 6, { message: 'otpCode must be exactly 6 characters' })
  otpCode: string;
}
