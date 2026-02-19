import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SubscriptionService } from './subscription.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionService.getMySubscription(userId);
  }

  @Get('check')
  @ApiOperation({ summary: 'Check if current user has active subscription' })
  async checkAccess(@CurrentUser('id') userId: string) {
    return this.subscriptionService.checkAccess(userId);
  }

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate a payment and receive OTP' })
  async initiatePayment(
    @CurrentUser('id') userId: string,
    @Body() dto: InitiatePaymentDto,
  ) {
    return this.subscriptionService.initiatePayment(userId, dto);
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify OTP to complete payment and activate subscription' })
  async verifyOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyOtpDto,
  ) {
    return this.subscriptionService.verifyOtp(userId, dto);
  }
}
