import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PLAN_AMOUNTS: Record<string, number> = {
  MONTHLY: 1000,
  QUARTERLY: 2500,
  ANNUAL: 8000,
};

@Injectable()
export class PromoService {
  constructor(private prisma: PrismaService) {}

  async validateCode(code: string) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!promoCode || !promoCode.isActive) {
      return { valid: false, message: 'Code promo invalide ou désactivé' };
    }

    return { valid: true, code: promoCode.code, ownerName: promoCode.owner.firstName };
  }

  async applyCommission(
    transactionId: string,
    subscriberId: string,
    promoCodeStr: string,
    plan: string,
  ) {
    const promoCode = await this.prisma.promoCode.findUnique({
      where: { code: promoCodeStr.toUpperCase() },
    });

    if (!promoCode || !promoCode.isActive) return;

    // A subscriber can't earn from their own code
    if (promoCode.ownerId === subscriberId) return;

    // Check if this subscriber has used this code before
    const previousUsage = await this.prisma.promoCodeUsage.findFirst({
      where: { promoCodeId: promoCode.id, subscriberId },
    });

    const planAmount = PLAN_AMOUNTS[plan] ?? 1000;
    const type = previousUsage ? 'RENEWAL' : 'FIRST_TIME';
    const commissionAmount = type === 'FIRST_TIME' ? planAmount * 0.5 : 100;

    await this.prisma.promoCodeUsage.create({
      data: {
        promoCodeId: promoCode.id,
        subscriberId,
        transactionId,
        commissionAmount,
        type,
      },
    });
  }

  async getMyPromoCode(userId: string) {
    const promoCode = await this.prisma.promoCode.findFirst({
      where: { ownerId: userId },
    });
    return promoCode ?? null;
  }

  async getMyDashboard(userId: string) {
    const promoCode = await this.prisma.promoCode.findFirst({
      where: { ownerId: userId },
      include: {
        usages: {
          include: {
            subscriber: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
            transaction: {
              select: { createdAt: true, amount: true, provider: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!promoCode) {
      throw new NotFoundException('Vous n\'avez pas encore de code promo');
    }

    const totalEarnings = promoCode.usages.reduce(
      (sum, u) => sum + u.commissionAmount,
      0,
    );
    const firstTimeCount = promoCode.usages.filter((u) => u.type === 'FIRST_TIME').length;
    const renewalCount = promoCode.usages.filter((u) => u.type === 'RENEWAL').length;
    const uniqueSubscribers = new Set(promoCode.usages.map((u) => u.subscriberId)).size;

    return {
      promoCode: {
        id: promoCode.id,
        code: promoCode.code,
        isActive: promoCode.isActive,
        createdAt: promoCode.createdAt,
      },
      stats: {
        totalEarnings,
        firstTimeCount,
        renewalCount,
        uniqueSubscribers,
      },
      usages: promoCode.usages,
    };
  }

  // Used by admin
  generateCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return Array.from({ length: 8 }, () =>
      chars[Math.floor(Math.random() * chars.length)],
    ).join('');
  }

  async createPromoCode(userId: string, customCode?: string) {
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) throw new NotFoundException('Utilisateur introuvable');

    const existingCode = await this.prisma.promoCode.findFirst({ where: { ownerId: userId } });
    if (existingCode) throw new BadRequestException('Cet utilisateur a déjà un code promo');

    const code = customCode?.toUpperCase() ?? this.generateCode();

    return this.prisma.promoCode.create({
      data: { code, ownerId: userId },
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async togglePromoCode(id: string) {
    const promoCode = await this.prisma.promoCode.findUnique({ where: { id } });
    if (!promoCode) throw new NotFoundException('Code promo introuvable');

    return this.prisma.promoCode.update({
      where: { id },
      data: { isActive: !promoCode.isActive },
    });
  }

  async getAllPromoCodes() {
    const codes = await this.prisma.promoCode.findMany({
      include: {
        owner: { select: { id: true, email: true, firstName: true, lastName: true } },
        usages: { select: { commissionAmount: true, type: true, subscriberId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return codes.map((c) => ({
      id: c.id,
      code: c.code,
      isActive: c.isActive,
      createdAt: c.createdAt,
      owner: c.owner,
      stats: {
        totalEarnings: c.usages.reduce((s, u) => s + u.commissionAmount, 0),
        totalUsages: c.usages.length,
        uniqueSubscribers: new Set(c.usages.map((u) => u.subscriberId)).size,
        firstTimeCount: c.usages.filter((u) => u.type === 'FIRST_TIME').length,
        renewalCount: c.usages.filter((u) => u.type === 'RENEWAL').length,
      },
    }));
  }
}
