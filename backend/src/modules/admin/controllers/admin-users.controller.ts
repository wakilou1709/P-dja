import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminUsersService } from '../services/admin-users.service';
import { GetUsersDto, UpdateUserRoleDto, UpdateUserStatusDto } from '../dto';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with filters' })
  async getAllUsers(@Query() filters: GetUsersDto) {
    return this.adminUsersService.findAllWithFilters(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get user statistics' })
  async getUserStats() {
    return this.adminUsersService.getUserStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user details by ID' })
  async getUserDetails(@Param('id') id: string) {
    return this.adminUsersService.getUserDetails(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminUsersService.updateUserRole(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update user status' })
  async updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.adminUsersService.updateUserStatus(id, dto);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'Get user activity history' })
  async getUserActivity(@Param('id') id: string) {
    return this.adminUsersService.getUserActivity(id);
  }
}
