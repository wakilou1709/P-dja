import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

const DEFAULTS = [
  // Exam Types
  { category: 'examType', value: 'CEP',         label: 'CEP',          description: "Certificat d'Études Primaires",      order: 1 },
  { category: 'examType', value: 'BEPC',        label: 'BEPC',         description: 'Brevet du Premier Cycle',            order: 2 },
  { category: 'examType', value: 'BAC',         label: 'BAC',          description: 'Baccalauréat',                       order: 3 },
  { category: 'examType', value: 'BEP',         label: 'BEP',          description: "Brevet d'Études Professionnelles",   order: 4 },
  { category: 'examType', value: 'CAP',         label: 'CAP',          description: "Certificat d'Aptitude Professionnelle", order: 5 },
  { category: 'examType', value: 'CONCOURS_FP', label: 'Concours FP',  description: 'Concours Fonction Publique',         order: 6 },
  { category: 'examType', value: 'PMK',         label: 'PMK',          description: 'Prytanée Militaire du Kadiogo',      order: 7 },

  // Universities
  { category: 'university', value: 'JOSEPH_KI_ZERBO',   label: 'Université Joseph Ki-Zerbo',        order: 1 },
  { category: 'university', value: 'NAZI_BONI',         label: 'Université Nazi Boni',              order: 2 },
  { category: 'university', value: 'NORBERT_ZONGO',     label: 'Université Norbert Zongo',          order: 3 },
  { category: 'university', value: 'THOMAS_SANKARA',    label: 'Université Thomas Sankara',         order: 4 },
  { category: 'university', value: 'OUAHIGOUYA',        label: 'Université de Ouahigouya',          order: 5 },
  { category: 'university', value: 'FADA_NGOURMA',      label: "Université de Fada N'Gourma",       order: 6 },
  { category: 'university', value: 'DEDOUGOU',          label: 'Université de Dédougou',            order: 7 },
  { category: 'university', value: 'AUBE_NOUVELLE',     label: 'Université Aube Nouvelle',          order: 8 },
  { category: 'university', value: 'UCAO',              label: 'UCAO',                              order: 9 },
  { category: 'university', value: 'SAINT_THOMAS_AQUIN',label: "Université Saint Thomas d'Aquin",   order: 10 },
  { category: 'university', value: 'ULB',               label: 'Université Libre du Burkina',       order: 11 },
  { category: 'university', value: 'UNDA',              label: "Université Notre Dame d'Afrique",   order: 12 },
  { category: 'university', value: 'UPO',               label: 'Université Privée de Ouagadougou',  order: 13 },
  { category: 'university', value: 'SAINT_JOSEPH',      label: 'Université Saint Joseph',           order: 14 },

  // BAC Series
  { category: 'bacSeries', value: 'A', label: 'Série A', description: 'Littéraire',                          order: 1 },
  { category: 'bacSeries', value: 'C', label: 'Série C', description: 'Mathématiques',                       order: 2 },
  { category: 'bacSeries', value: 'D', label: 'Série D', description: 'Sciences Expérimentales',             order: 3 },
  { category: 'bacSeries', value: 'E', label: 'Série E', description: 'Mathématiques et Technologie',        order: 4 },
  { category: 'bacSeries', value: 'F', label: 'Série F', description: 'Techniques Industrielles',            order: 5 },
  { category: 'bacSeries', value: 'G', label: 'Série G', description: 'Techniques Administratives',          order: 6 },

  // University levels
  { category: 'niveau', value: 'L1',      label: 'Licence 1',  description: '1ère année de Licence', order: 1 },
  { category: 'niveau', value: 'L2',      label: 'Licence 2',  description: '2ème année de Licence', order: 2 },
  { category: 'niveau', value: 'L3',      label: 'Licence 3',  description: '3ème année de Licence', order: 3 },
  { category: 'niveau', value: 'M1',      label: 'Master 1',   description: '1ère année de Master',  order: 4 },
  { category: 'niveau', value: 'M2',      label: 'Master 2',   description: '2ème année de Master',  order: 5 },
  { category: 'niveau', value: 'DOCTORAT',label: 'Doctorat',   description: 'Études doctorales',     order: 6 },

  // Faculties (not scoped to a university — global defaults)
  { category: 'faculty', value: 'Faculté des Sciences',                    label: 'Faculté des Sciences',                    order: 1 },
  { category: 'faculty', value: 'Faculté de Médecine',                     label: 'Faculté de Médecine',                     order: 2 },
  { category: 'faculty', value: 'Faculté de Droit et Sciences Politiques', label: 'Faculté de Droit et Sciences Politiques', order: 3 },
  { category: 'faculty', value: 'Faculté des Lettres et Sciences Humaines',label: 'Faculté des Lettres et Sciences Humaines',order: 4 },
  { category: 'faculty', value: 'UFR/SEA', label: 'UFR/SEA', order: 5 },
  { category: 'faculty', value: 'UFR/SDS', label: 'UFR/SDS', order: 6 },
];

@Injectable()
export class AdminExamConfigService {
  constructor(private prisma: PrismaService) {}

  /** Initialise les valeurs par défaut si la table est vide */
  async seed() {
    const count = await this.prisma.examConfig.count();
    if (count > 0) return { seeded: 0 };

    await this.prisma.examConfig.createMany({ data: DEFAULTS, skipDuplicates: true });
    return { seeded: DEFAULTS.length };
  }

  async findAll(category?: string) {
    const where = category ? { category } : {};
    const configs = await this.prisma.examConfig.findMany({
      where,
      orderBy: [{ category: 'asc' }, { order: 'asc' }, { label: 'asc' }],
    });
    // Regrouper par catégorie
    const grouped: Record<string, any[]> = {};
    for (const c of configs) {
      if (!grouped[c.category]) grouped[c.category] = [];
      grouped[c.category].push(c);
    }
    return grouped;
  }

  async create(data: { category: string; value: string; label: string; description?: string; extra?: any; order?: number }) {
    const exists = await this.prisma.examConfig.findUnique({
      where: { category_value: { category: data.category, value: data.value } },
    });
    if (exists) throw new ConflictException(`La valeur "${data.value}" existe déjà dans la catégorie "${data.category}"`);

    return this.prisma.examConfig.create({ data });
  }

  async update(id: string, data: { label?: string; description?: string; value?: string; extra?: any; order?: number }) {
    const config = await this.prisma.examConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Configuration introuvable');

    // Si la valeur change, mettre à jour en cascade les examens associés
    if (data.value && data.value !== config.value) {
      await this.updateExamsValue(config.category, config.value, data.value);
    }

    return this.prisma.examConfig.update({ where: { id }, data });
  }

  async remove(id: string) {
    const config = await this.prisma.examConfig.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Configuration introuvable');
    return this.prisma.examConfig.delete({ where: { id } });
  }

  /** Met à jour les examens impactés quand une valeur change */
  private async updateExamsValue(category: string, oldVal: string, newVal: string) {
    if (category === 'examType') {
      await this.prisma.exam.updateMany({ where: { type: oldVal },      data: { type: newVal } });
      await this.prisma.progress.updateMany({ where: { examType: oldVal }, data: { examType: newVal } });
      await this.prisma.studySession.updateMany({ where: { examType: oldVal }, data: { examType: newVal } });
    } else if (category === 'university') {
      await this.prisma.exam.updateMany({ where: { university: oldVal }, data: { university: newVal } });
    } else if (category === 'bacSeries') {
      await this.prisma.exam.updateMany({ where: { series: oldVal },    data: { series: newVal } });
    } else if (category === 'niveau') {
      await this.prisma.exam.updateMany({ where: { niveau: oldVal },    data: { niveau: newVal } });
    } else if (category === 'faculty') {
      await this.prisma.exam.updateMany({ where: { faculty: oldVal },   data: { faculty: newVal } });
    }
  }
}
