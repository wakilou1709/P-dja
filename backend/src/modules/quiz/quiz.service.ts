import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StartQuizDto } from './dto/start-quiz.dto';
import { SubmitAttemptDto } from './dto/submit-attempt.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async getQuestions(dto: StartQuizDto) {
    const where: any = {
      exam: {
        type: dto.examType,
        ...(dto.subject && { subject: dto.subject }),
        ...(dto.series && { series: dto.series }),
      },
      ...(dto.difficulty && { difficulty: dto.difficulty }),
    };

    const questions = await this.prisma.question.findMany({
      where,
      select: {
        id: true,
        content: true,
        type: true,
        options: true,
        difficulty: true,
        imageUrl: true,
        exam: {
          select: {
            type: true,
            subject: true,
            series: true,
          },
        },
      },
    });

    return this.shuffle(questions).slice(0, dto.limit);
  }

  async startAttempt(userId: string, dto: StartQuizDto) {
    const questions = await this.getQuestions(dto);

    if (questions.length === 0) {
      throw new NotFoundException(
        'Aucune question trouvée pour ces critères. Vérifiez que des épreuves existent pour ce type.',
      );
    }

    const timeLimitMinutes =
      dto.mode === 'TIMED' ? 30 : dto.mode === 'COMPETITIVE' ? 180 : null;

    const quiz = await this.prisma.quiz.create({
      data: {
        title: `${dto.examType}${dto.subject ? ' - ' + dto.subject : ''}${dto.series ? ' ' + dto.series : ''}`,
        subject: dto.subject || dto.examType,
        description: JSON.stringify({
          examType: dto.examType,
          series: dto.series || dto.bacSeries,
        }),
        mode: dto.mode,
        timeLimit: timeLimitMinutes,
        questionIds: questions.map((q) => q.id),
        totalQuestions: questions.length,
        isPublished: false,
      },
    });

    const attempt = await this.prisma.quizAttempt.create({
      data: {
        userId,
        quizId: quiz.id,
        score: 0,
        totalQuestions: questions.length,
        correctAnswers: 0,
        wrongAnswers: 0,
        skippedQuestions: 0,
        timeSpent: 0,
        answers: [],
        isPassed: false,
      },
    });

    return {
      attemptId: attempt.id,
      quizId: quiz.id,
      mode: dto.mode,
      timeLimit: timeLimitMinutes,
      questions,
    };
  }

  async submitAttempt(userId: string, attemptId: string, dto: SubmitAttemptDto) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: { quiz: true },
    });

    if (!attempt) {
      throw new NotFoundException('Tentative introuvable');
    }

    if (attempt.userId !== userId) {
      throw new ForbiddenException('Accès refusé');
    }

    if (attempt.completedAt) {
      throw new ForbiddenException('Cette tentative est déjà terminée');
    }

    const questionIds = attempt.quiz.questionIds;
    const questions = await this.prisma.question.findMany({
      where: { id: { in: questionIds } },
      include: { exam: { select: { type: true, subject: true, series: true } } },
    });

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const answeredIds = new Set(dto.answers.map((a) => a.questionId));

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    const weakAreaMap = new Map<string, number>();
    const questionsWithAnswers: any[] = [];

    for (const question of questions) {
      const userAnswer = dto.answers.find((a) => a.questionId === question.id);

      if (!userAnswer) {
        skippedCount++;
        questionsWithAnswers.push({
          ...this.stripAnswer(question),
          userAnswer: null,
          isCorrect: false,
          isSkipped: true,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        });
        continue;
      }

      const isCorrect = this.checkAnswer(
        userAnswer.answer,
        question.correctAnswer || '',
      );

      if (isCorrect) {
        correctCount++;
      } else {
        wrongCount++;
        const area = question.exam?.subject || 'Autre';
        weakAreaMap.set(area, (weakAreaMap.get(area) || 0) + 1);
      }

      questionsWithAnswers.push({
        ...this.stripAnswer(question),
        userAnswer: userAnswer.answer,
        isCorrect,
        isSkipped: false,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
      });

      await this.prisma.question.update({
        where: { id: question.id },
        data: {
          timesAnswered: { increment: 1 },
          ...(isCorrect && { timesCorrect: { increment: 1 } }),
        },
      });
    }

    const totalAnswered = questionIds.length;
    const score = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;

    const updatedAttempt = await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score,
        correctAnswers: correctCount,
        wrongAnswers: wrongCount,
        skippedQuestions: skippedCount,
        timeSpent: dto.answers.reduce((acc, a) => acc + (a.timeSpent || 0), 0),
        answers: dto.answers as any,
        isPassed: score >= 50,
        completedAt: new Date(),
      },
    });

    await this.prisma.quiz.update({
      where: { id: attempt.quizId },
      data: { totalAttempts: { increment: 1 } },
    });

    const meta = JSON.parse(attempt.quiz.description || '{}');
    const examType = meta.examType || attempt.quiz.subject;
    const subject = attempt.quiz.subject;

    const existingProgress = await this.prisma.progress.findUnique({
      where: {
        userId_subject_examType: { userId, subject, examType },
      },
    });

    if (existingProgress) {
      const newTotal = existingProgress.totalQuizzes + 1;
      const newCorrect = existingProgress.correctAnswers + correctCount;
      const newTotalQ = existingProgress.totalQuestions + totalAnswered;
      const newAvg = newTotalQ > 0 ? (newCorrect / newTotalQ) * 100 : 0;

      await this.prisma.progress.update({
        where: { userId_subject_examType: { userId, subject, examType } },
        data: {
          totalQuizzes: newTotal,
          totalQuestions: newTotalQ,
          correctAnswers: newCorrect,
          averageScore: newAvg,
          lastStudyDate: new Date(),
          weakAreas: Array.from(weakAreaMap.entries()).map(([area, count]) => ({
            area,
            count,
          })),
        },
      });
    } else {
      const avgScore = totalAnswered > 0 ? (correctCount / totalAnswered) * 100 : 0;
      await this.prisma.progress.create({
        data: {
          userId,
          subject,
          examType,
          totalQuizzes: 1,
          totalQuestions: totalAnswered,
          correctAnswers: correctCount,
          averageScore: avgScore,
          lastStudyDate: new Date(),
          weakAreas: Array.from(weakAreaMap.entries()).map(([area, count]) => ({
            area,
            count,
          })),
        },
      });
    }

    const weakAreas = Array.from(weakAreaMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([area]) => area);

    const xpGained = correctCount * 20;

    return {
      score: Math.round(score),
      correctAnswers: correctCount,
      wrongAnswers: wrongCount,
      skippedQuestions: skippedCount,
      totalQuestions: totalAnswered,
      isPassed: updatedAttempt.isPassed,
      questionsWithAnswers,
      weakAreas,
      xpGained,
    };
  }

  async getMyAttempts(userId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        quiz: {
          select: {
            title: true,
            subject: true,
            mode: true,
            description: true,
          },
        },
      },
    });
  }

  async getMyProgress(userId: string) {
    return this.prisma.progress.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  private checkAnswer(userAnswer: string, correctAnswer: string): boolean {
    return userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
  }

  private stripAnswer(question: any) {
    const { correctAnswer, explanation, ...rest } = question;
    return rest;
  }

  private shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
