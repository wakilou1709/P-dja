import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ExamType, DifficultyLevel } from '@prisma/client';

@ApiTags('exams')
@Controller('exams')
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Récupérer tous les examens' })
  @ApiQuery({ name: 'type', enum: ExamType, required: false })
  @ApiQuery({ name: 'subject', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'difficulty', enum: DifficultyLevel, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Liste des examens' })
  async findAll(
    @Query('type') type?: ExamType,
    @Query('subject') subject?: string,
    @Query('year') year?: string,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('search') search?: string,
  ) {
    return this.examsService.findAll({
      type,
      subject,
      year: year ? parseInt(year) : undefined,
      difficulty,
      search,
    });
  }

  @Public()
  @Get('subjects')
  @ApiOperation({ summary: 'Récupérer la liste des matières' })
  @ApiResponse({ status: 200, description: 'Liste des matières' })
  async getSubjects() {
    return this.examsService.getSubjects();
  }

  @Public()
  @Get('years')
  @ApiOperation({ summary: 'Récupérer la liste des années' })
  @ApiResponse({ status: 200, description: 'Liste des années' })
  async getYears() {
    return this.examsService.getYears();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un examen par ID' })
  @ApiResponse({ status: 200, description: 'Examen trouvé' })
  @ApiResponse({ status: 404, description: 'Examen non trouvé' })
  async findById(@Param('id') id: string) {
    return this.examsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Créer un nouvel examen (Admin)' })
  @ApiResponse({ status: 201, description: 'Examen créé' })
  async create(@Body() dto: CreateExamDto) {
    return this.examsService.create(dto);
  }
}
