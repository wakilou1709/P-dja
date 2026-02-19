import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminExamsService } from '../services/admin-exams.service';

@Controller('admin/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminExamsController {
  constructor(private readonly adminExamsService: AdminExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create new exam' })
  async createExam(@Body() data: any) {
    return this.adminExamsService.createExam(data);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update exam' })
  async updateExam(@Param('id') id: string, @Body() data: any) {
    return this.adminExamsService.updateExam(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete exam' })
  async deleteExam(@Param('id') id: string) {
    return this.adminExamsService.deleteExam(id);
  }

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add questions to exam' })
  async addQuestions(@Param('id') examId: string, @Body() body: any) {
    return this.adminExamsService.addQuestions(examId, body.questions);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get exam statistics' })
  async getExamStats() {
    return this.adminExamsService.getExamStats();
  }

  @Get('popular')
  @ApiOperation({ summary: 'Get popular exams' })
  async getPopularExams(@Query('limit') limit: string) {
    const limitNum = limit ? parseInt(limit) : 10;
    return this.adminExamsService.getPopularExams(limitNum);
  }
}
