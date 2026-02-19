import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminExamsService {
  constructor(private prisma: PrismaService) {}

  async createExam(data: any) {
    return this.prisma.exam.create({
      data,
    });
  }

  async updateExam(id: string, data: any) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    return this.prisma.exam.update({
      where: { id },
      data,
    });
  }

  async deleteExam(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    // Delete associated questions first
    await this.prisma.question.deleteMany({
      where: { examId: id },
    });

    // Note: Quiz doesn't have examId relation, so we skip quiz deletion
    // Quizzes are created independently with questionIds

    return this.prisma.exam.delete({
      where: { id },
    });
  }

  async addQuestions(examId: string, questions: any[]) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    const createdQuestions = await Promise.all(
      questions.map((question) =>
        this.prisma.question.create({
          data: {
            ...question,
            examId,
          },
        }),
      ),
    );

    return createdQuestions;
  }

  async getExamStats() {
    const [
      totalExams,
      cepExams,
      bepcExams,
      bacExams,
      totalQuestions,
      totalQuizzes,
    ] = await Promise.all([
      this.prisma.exam.count(),
      this.prisma.exam.count({
        where: { type: 'CEP' },
      }),
      this.prisma.exam.count({
        where: { type: 'BEPC' },
      }),
      this.prisma.exam.count({
        where: { type: 'BAC' },
      }),
      this.prisma.question.count(),
      this.prisma.quiz.count(),
    ]);

    return {
      totalExams,
      cepExams,
      bepcExams,
      bacExams,
      totalQuestions,
      totalQuizzes,
    };
  }

  async getPopularExams(limit: number = 10) {
    const exams = await this.prisma.exam.findMany({
      orderBy: {
        viewCount: 'desc',
      },
      take: limit,
      include: {
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    return exams;
  }
}
