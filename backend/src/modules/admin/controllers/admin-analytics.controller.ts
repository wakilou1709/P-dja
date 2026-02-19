import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminAnalyticsService } from '../services/admin-analytics.service';

@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    return this.adminAnalyticsService.getDashboardStats();
  }

  @Get('user-growth')
  @ApiOperation({ summary: 'Get user growth chart data' })
  async getUserGrowth(@Query('period') period: string) {
    return this.adminAnalyticsService.getUserGrowth(period || '30d');
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Get revenue chart data' })
  async getRevenueChart(@Query('period') period: string) {
    return this.adminAnalyticsService.getRevenueChart(period || '30d');
  }

  @Get('popular-exams')
  @ApiOperation({ summary: 'Get popular exams' })
  async getPopularExams(@Query('limit') limit: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.adminAnalyticsService.getPopularExams(limitNum);
  }
}
