import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { AdminExamConfigService } from '../services/admin-exam-config.service';
import { Public } from '../../../common/decorators/public.decorator';

@Controller('admin/exam-config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth()
@ApiTags('admin')
export class AdminExamConfigController {
  constructor(private readonly service: AdminExamConfigService) {}

  /** Accessible publiquement pour que le frontend étudiant puisse charger les listes */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Récupérer toutes les configs (groupées par catégorie)' })
  findAll(@Query('category') category?: string) {
    return this.service.findAll(category);
  }

  @Post('seed')
  @ApiOperation({ summary: 'Initialiser les valeurs par défaut (si table vide)' })
  seed() {
    return this.service.seed();
  }

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle config' })
  create(@Body() body: { category: string; value: string; label: string; description?: string; extra?: any; order?: number }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une config (met à jour les examens si valeur change)' })
  update(@Param('id') id: string, @Body() body: { label?: string; description?: string; value?: string; extra?: any; order?: number }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une config' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
