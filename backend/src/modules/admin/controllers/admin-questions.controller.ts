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
import { AdminQuestionsService } from '../services/admin-questions.service';
import { CreateQuestionDto, UpdateQuestionDto } from '../dto/create-question.dto';
import { GenerateQuestionsDto } from '../dto/generate-questions.dto';

@Controller('admin/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminQuestionsController {
  constructor(private readonly adminQuestionsService: AdminQuestionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all questions with filters' })
  async getAll(
    @Query('examId') examId?: string,
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminQuestionsService.getAll(
      { examId, type, difficulty },
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a new question' })
  async create(@Body() dto: CreateQuestionDto) {
    return this.adminQuestionsService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question' })
  async update(@Param('id') id: string, @Body() dto: UpdateQuestionDto) {
    return this.adminQuestionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question' })
  async delete(@Param('id') id: string) {
    return this.adminQuestionsService.delete(id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate questions with AI (Claude)' })
  async generateWithAI(@Body() dto: GenerateQuestionsDto) {
    return this.adminQuestionsService.generateWithAI(dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk create questions after review' })
  async bulkCreate(@Body() body: { questions: CreateQuestionDto[] }) {
    return this.adminQuestionsService.bulkCreate(body.questions as any);
  }
}
