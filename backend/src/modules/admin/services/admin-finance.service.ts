import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AdminFinanceService {
  constructor(private prisma: PrismaService) {}

  async getSubscriptions(filters: any) {
    try {
      const { page = '1', limit = '10', status, plan } = filters;
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (plan) {
        where.plan = plan;
      }

      const subscriptions = await this.prisma.subscription.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          startDate: 'desc',
        },
      });

      const total = await this.prisma.subscription.count({ where });

      return {
        subscriptions,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      };
    } catch (error) {
      console.error('Error in getSubscriptions:', error);
      throw error;
    }
  }

  async getTransactions(filters: any) {
    const { page = 1, limit = 10, status, provider } = filters;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (provider) {
      where.provider = provider;
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        include: {
          subscription: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      transactions,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  async getFinanceStats() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalRevenue,
      monthlyRevenue,
      totalSubscriptions,
      activeSubscriptions,
      successfulTransactions,
      pendingTransactions,
      failedTransactions,
    ] = await Promise.all([
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
      this.prisma.subscription.count(),
      this.prisma.subscription.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.transaction.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.transaction.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.transaction.count({
        where: { status: 'FAILED' },
      }),
    ]);

    // Calculate MRR (Monthly Recurring Revenue)
    const mrr = monthlyRevenue._sum.amount || 0;

    return {
      totalRevenue: totalRevenue._sum.amount || 0,
      monthlyRevenue: mrr,
      totalSubscriptions,
      activeSubscriptions,
      transactions: {
        successful: successfulTransactions,
        pending: pendingTransactions,
        failed: failedTransactions,
      },
    };
  }

  async validateTransaction(transactionId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { subscription: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction introuvable');
    }
    if (transaction.status !== 'PENDING') {
      throw new BadRequestException('Cette transaction n\'est pas en attente');
    }

    const metadata = transaction.metadata as any;
    const plan: string = metadata?.plan ?? 'MONTHLY';

    const planDays: Record<string, number> = { MONTHLY: 30, QUARTERLY: 90, ANNUAL: 365 };
    const days = planDays[plan] ?? 30;
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const [updatedTransaction, updatedSubscription] = await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.subscription.update({
        where: { id: transaction.subscriptionId },
        data: {
          plan: plan as any,
          status: 'ACTIVE',
          startDate: now,
          endDate,
        },
      }),
    ]);

    return { success: true, transaction: updatedTransaction, subscription: updatedSubscription };
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

    // Group by date
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
}
