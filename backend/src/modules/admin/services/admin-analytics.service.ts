import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminAnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalExams,
      totalRevenue,
      monthlyRevenue,
      activeSubscriptions,
      totalQuizzes,
      completedQuizzes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: { createdAt: { gte: firstDayOfMonth } },
      }),
      this.prisma.exam.count(),
      this.prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: firstDayOfMonth },
        },
        _sum: { amount: true },
      }),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.quiz.count(),
      this.prisma.quizAttempt.count({
        where: { completedAt: { not: null } },
      }),
    ]);

    // Calculate growth rates
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const usersLastMonth = await this.prisma.user.count({
      where: {
        createdAt: {
          gte: lastMonthStart,
          lte: lastMonthEnd,
        },
      },
    });

    const userGrowthRate = usersLastMonth > 0
      ? ((newUsersThisMonth - usersLastMonth) / usersLastMonth) * 100
      : 0;

    return {
      users: {
        total: totalUsers,
        newThisMonth: newUsersThisMonth,
        growthRate: userGrowthRate,
      },
      exams: {
        total: totalExams,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        monthly: monthlyRevenue._sum.amount || 0,
      },
      subscriptions: {
        active: activeSubscriptions,
      },
      quizzes: {
        total: totalQuizzes,
        completed: completedQuizzes,
      },
    };
  }

  async getUserGrowth(period: string = '30d') {
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const users = await this.prisma.user.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Group by date and count cumulative users
    const usersByDate = users.reduce((acc, user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += 1;
      return acc;
    }, {} as Record<string, number>);

    let cumulative = 0;
    return Object.entries(usersByDate).map(([date, count]) => {
      cumulative += count;
      return { date, count: cumulative };
    });
  }

  async getRevenueChart(period: string = '30d') {
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      select: {
        amount: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    const revenueByDate = transactions.reduce((acc, transaction) => {
      const date = transaction.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += transaction.amount;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(revenueByDate).map(([date, revenue]) => ({
      date,
      revenue,
    }));
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
