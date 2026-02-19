import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { DifficultyLevel } from '@prisma/client';

@ApiTags('exams')
@Controller('exams')
export class ExamsController {
  constructor(private examsService: ExamsService) {}

  @Public()
  @Get('hierarchy')
  @ApiOperation({ summary: 'Récupérer la hiérarchie complète des examens' })
  @ApiResponse({ status: 200, description: 'Hiérarchie des examens (nationaux et universités)' })
  async getHierarchy() {
    return this.examsService.getExamHierarchy();
  }

  @Public()
  @Get('universities')
  @ApiOperation({ summary: 'Récupérer la liste des universités' })
  @ApiResponse({ status: 200, description: 'Liste des universités' })
  async getUniversities() {
    return this.examsService.getUniversities();
  }

  @Public()
  @Get('faculties')
  @ApiOperation({ summary: 'Récupérer la liste des facultés' })
  @ApiQuery({ name: 'university', required: false })
  @ApiResponse({ status: 200, description: 'Liste des facultés' })
  async getFaculties(@Query('university') university?: string) {
    return this.examsService.getFaculties(university);
  }

  @Public()
  @Get('list')
  @ApiOperation({ summary: 'Récupérer tous les examens avec filtres' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'subject', required: false })
  @ApiQuery({ name: 'year', required: false })
  @ApiQuery({ name: 'difficulty', enum: DifficultyLevel, required: false })
  @ApiQuery({ name: 'university', required: false })
  @ApiQuery({ name: 'faculty', required: false })
  @ApiQuery({ name: 'series', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiResponse({ status: 200, description: 'Liste des examens' })
  async findAll(
    @Query('type') type?: string,
    @Query('subject') subject?: string,
    @Query('year') year?: string,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('university') university?: string,
    @Query('faculty') faculty?: string,
    @Query('series') series?: string,
    @Query('search') search?: string,
  ) {
    return this.examsService.findAll({
      type,
      subject,
      year: year ? parseInt(year) : undefined,
      difficulty,
      university,
      faculty,
      series,
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
