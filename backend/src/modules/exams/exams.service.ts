import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { ExamType, DifficultyLevel } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: dto,
    });
  }

  async findAll(filters?: {
    type?: ExamType;
    subject?: string;
    year?: number;
    difficulty?: DifficultyLevel;
    search?: string;
  }) {
    const where: any = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.subject) {
      where.subject = { contains: filters.subject, mode: 'insensitive' };
    }

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.difficulty) {
      where.difficulty = filters.difficulty;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { subject: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const exams = await this.prisma.exam.findMany({
      where,
      orderBy: [{ year: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { questions: true },
        },
      },
    });

    return exams;
  }

  async findById(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!exam) {
      throw new NotFoundException('Examen non trouvé');
    }

    // Increment view count
    await this.prisma.exam.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    });

    return exam;
  }

  async getSubjects() {
    const exams = await this.prisma.exam.findMany({
      select: { subject: true },
      distinct: ['subject'],
    });

    return exams.map((e) => e.subject).sort();
  }

  async getYears() {
    const exams = await this.prisma.exam.findMany({
      select: { year: true },
      where: { year: { not: null } },
      distinct: ['year'],
      orderBy: { year: 'desc' },
    });

    return exams.map((e) => e.year);
  }
}
