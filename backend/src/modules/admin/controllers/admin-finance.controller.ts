import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminFinanceService } from '../services/admin-finance.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminFinanceController {
  constructor(private readonly adminFinanceService: AdminFinanceService) {}

  @Get('subscriptions')
  @ApiOperation({ summary: 'Get all subscriptions with filters' })
  async getSubscriptions(@Query() filters: any) {
    return this.adminFinanceService.getSubscriptions(filters);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions with filters' })
  async getTransactions(@Query() filters: any) {
    return this.adminFinanceService.getTransactions(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get finance statistics' })
  async getFinanceStats() {
    return this.adminFinanceService.getFinanceStats();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue chart data' })
  async getRevenueChart(@Query('period') period: string) {
    return this.adminFinanceService.getRevenueChart(period || '30d');
  }

  @Patch('transactions/:id/validate')
  @ApiOperation({ summary: 'Manually validate a pending transaction (admin backup)' })
  async validateTransaction(@Param('id') id: string) {
    return this.adminFinanceService.validateTransaction(id);
  }
}
