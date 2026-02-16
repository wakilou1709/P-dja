import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        points: true,
        level: true,
        streak: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        avatar: true,
        preferredExamType: true,
        preferredSubjects: true,
      },
    });

    return user;
  }

  async getUserStats(userId: string) {
    const [user, progress, quizAttempts, achievements] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          points: true,
          level: true,
          streak: true,
          lastActive: true,
        },
      }),
      this.prisma.progress.findMany({
        where: { userId },
      }),
      this.prisma.quizAttempt.count({
        where: { userId },
      }),
      this.prisma.userAchievement.count({
        where: { userId },
      }),
    ]);

    const totalQuizzes = progress.reduce((acc, p) => acc + p.totalQuizzes, 0);
    const averageScore =
      progress.reduce((acc, p) => acc + p.averageScore, 0) / (progress.length || 1);

    return {
      ...user,
      totalQuizzes,
      totalAttempts: quizAttempts,
      averageScore: Math.round(averageScore * 100) / 100,
      totalAchievements: achievements,
      progressBySubject: progress,
    };
  }
}
