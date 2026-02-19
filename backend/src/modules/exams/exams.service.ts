import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { DifficultyLevel } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateExamDto) {
    return this.prisma.exam.create({
      data: dto,
    });
  }

  async findAll(filters?: {
    type?: string;
    subject?: string;
    year?: number;
    difficulty?: DifficultyLevel;
    university?: string;
    faculty?: string;
    series?: string;
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

    if (filters?.university) {
      where.university = filters.university;
    }

    if (filters?.faculty) {
      where.faculty = { contains: filters.faculty, mode: 'insensitive' };
    }

    if (filters?.series) {
      where.series = filters.series;
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

  async getUniversities() {
    const exams = await this.prisma.exam.findMany({
      select: { university: true },
      where: { university: { not: 'NONE' } },
      distinct: ['university'],
    });

    return exams.map((e) => e.university).sort();
  }

  async getFaculties(university?: string) {
    const where: any = { faculty: { not: null } };

    if (university) {
      where.university = university;
    }

    const exams = await this.prisma.exam.findMany({
      select: { faculty: true, university: true },
      where,
      distinct: ['faculty'],
    });

    return exams.map((e) => ({ university: e.university, faculty: e.faculty }));
  }

  async getExamHierarchy() {
    // Get national exams grouped by type
    const nationalExams = await this.prisma.exam.groupBy({
      by: ['type', 'year'],
      where: { university: 'NONE' },
      _count: { id: true },
      orderBy: [{ type: 'asc' }, { year: 'desc' }],
    });

    // Get university exams grouped by university and faculty
    const universityExams = await this.prisma.exam.groupBy({
      by: ['university', 'faculty', 'year'],
      where: { university: { not: 'NONE' } },
      _count: { id: true },
      orderBy: [{ university: 'asc' }, { faculty: 'asc' }, { year: 'desc' }],
    });

    return {
      nationalExams,
      universityExams,
    };
  }
}
