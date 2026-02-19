import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PromoService } from './promo.service';

@Controller('promo')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiTags('promo')
export class PromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get('validate/:code')
  @ApiOperation({ summary: 'Validate a promo code before payment' })
  async validateCode(@Param('code') code: string) {
    return this.promoService.validateCode(code);
  }

  @Get('my-code')
  @ApiOperation({ summary: 'Get my promo code (if any)' })
  async getMyPromoCode(@CurrentUser('id') userId: string) {
    return this.promoService.getMyPromoCode(userId);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get my promo code dashboard with earnings and subscribers' })
  async getMyDashboard(@CurrentUser('id') userId: string) {
    return this.promoService.getMyDashboard(userId);
  }
}
