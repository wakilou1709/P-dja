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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
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

  @Post('upload-pdf')
  @ApiOperation({ summary: 'Upload and parse a PDF exam file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: process.env.UPLOADS_DIR || '/app/uploads',
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `exam-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Seuls les fichiers PDF sont acceptés'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 20 * 1024 * 1024 },
    }),
  )
  async uploadPdf(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    return this.adminExamsService.extractAndStructurePdf(file);
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

  @Post(':id/generate-correction')
  @ApiOperation({ summary: 'Generate AI correction for an exam' })
  async generateCorrection(@Param('id') id: string) {
    return this.adminExamsService.generateCorrection(id);
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
