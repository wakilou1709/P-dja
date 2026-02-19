import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { PromoService } from '../../promo/promo.service';
import { CreatePromoCodeDto } from '../../promo/dto/create-promo-code.dto';

@Controller('admin/promo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminPromoController {
  constructor(private readonly promoService: PromoService) {}

  @Get('codes')
  @ApiOperation({ summary: 'List all promo codes with stats' })
  async getAllCodes() {
    return this.promoService.getAllPromoCodes();
  }

  @Post('codes')
  @ApiOperation({ summary: 'Create a promo code for a user' })
  async createCode(@Body() dto: CreatePromoCodeDto) {
    return this.promoService.createPromoCode(dto.userId, dto.code);
  }

  @Patch('codes/:id/toggle')
  @ApiOperation({ summary: 'Activate or deactivate a promo code' })
  async toggleCode(@Param('id') id: string) {
    return this.promoService.togglePromoCode(id);
  }
}
