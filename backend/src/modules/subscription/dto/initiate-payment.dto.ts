import { IsEnum, IsString, IsOptional, Matches } from 'class-validator';

export enum SubscriptionPlanInput {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export enum PaymentProviderInput {
  ORANGE_MONEY = 'ORANGE_MONEY',
  MOOV_MONEY = 'MOOV_MONEY',
  WAVE = 'WAVE',
}

export class InitiatePaymentDto {
  @IsEnum(SubscriptionPlanInput)
  plan: SubscriptionPlanInput;

  @IsEnum(PaymentProviderInput)
  provider: PaymentProviderInput;

  @IsString()
  @Matches(/^\d{8}$/, { message: 'phoneNumber must be 8 digits (e.g. 70000000)' })
  phoneNumber: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
