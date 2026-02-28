import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PromoService } from '../promo/promo.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

const PLAN_AMOUNTS: Record<string, number> = {
  MONTHLY: 1000,
  QUARTERLY: 2500,
  ANNUAL: 8000,
};

const PLAN_DAYS: Record<string, number> = {
  MONTHLY: 30,
  QUARTERLY: 90,
  ANNUAL: 365,
};

@Injectable()
export class SubscriptionService {
  constructor(
    private prisma: PrismaService,
    private promoService: PromoService,
  ) {}

  async getMySubscription(userId: string) {
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });

    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: { userId },
        include: { transactions: true },
      });
    }

    const now = new Date();
    const userRole = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    const hasAccess =
      userRole?.role === 'ADMIN' ||
      userRole?.role === 'MODERATOR' ||
      (subscription.plan !== 'FREE' &&
       subscription.status === 'ACTIVE' &&
       (subscription.endDate === null || subscription.endDate > now));

    return { subscription, hasAccess };
  }

  async checkAccess(userId: string): Promise<{ hasAccess: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role === 'ADMIN' || user?.role === 'MODERATOR') return { hasAccess: true };

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return { hasAccess: false };

    const now = new Date();
    const hasAccess =
      subscription.plan !== 'FREE' &&
      subscription.status === 'ACTIVE' &&
      (subscription.endDate === null || subscription.endDate > now);

    return { hasAccess };
  }

  async initiatePayment(userId: string, dto: InitiatePaymentDto) {
    const { plan, provider, phoneNumber, promoCode } = dto;

    // Validate promo code if provided
    if (promoCode) {
      const validation = await this.promoService.validateCode(promoCode);
      if (!validation.valid) {
        throw new BadRequestException(validation.message ?? 'Code promo invalide');
      }
    }

    // Ensure subscription exists
    let subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) {
      subscription = await this.prisma.subscription.create({
        data: { userId },
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // +10 minutes

    const amount = PLAN_AMOUNTS[plan];

    const transaction = await this.prisma.transaction.create({
      data: {
        subscriptionId: subscription.id,
        amount,
        currency: 'XOF',
        provider: provider as any,
        phoneNumber,
        status: 'PENDING',
        metadata: {
          otp,
          otpExpiry: otpExpiry.toISOString(),
          plan,
          ...(promoCode ? { promoCode: promoCode.toUpperCase() } : {}),
        },
      },
    });

    // Simulate SMS (log in console)
    console.log(`[SMS SIMULATION] +226${phoneNumber} — Code OTP Pédja: ${otp} (valide 10 min)`);

    return {
      transactionId: transaction.id,
      message: `Code envoyé sur +226${phoneNumber}`,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    };
  }

  async verifyOtp(userId: string, dto: VerifyOtpDto) {
    const { transactionId, otpCode } = dto;

    // Find the user's subscription
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    if (!subscription) {
      throw new NotFoundException('Abonnement introuvable');
    }

    // Find the transaction
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        subscriptionId: subscription.id,
        status: 'PENDING',
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction introuvable ou déjà traitée');
    }

    // Extract OTP data from metadata
    const metadata = transaction.metadata as any;
    if (!metadata?.otp || !metadata?.otpExpiry || !metadata?.plan) {
      throw new BadRequestException('Données de transaction invalides');
    }

    // Check OTP code
    if (metadata.otp !== otpCode) {
      throw new BadRequestException('Code incorrect ou expiré');
    }

    // Check expiry
    const now = new Date();
    if (now > new Date(metadata.otpExpiry)) {
      throw new BadRequestException('Code incorrect ou expiré');
    }

    const plan: string = metadata.plan;
    const days = PLAN_DAYS[plan] ?? 30;
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // Update transaction and subscription atomically
    const [, updatedSubscription] = await this.prisma.$transaction([
      this.prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'COMPLETED' },
      }),
      this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          plan: plan as any,
          status: 'ACTIVE',
          startDate: now,
          endDate,
        },
      }),
    ]);

    // Apply promo code commission if code was used
    if (metadata.promoCode) {
      await this.promoService.applyCommission(
        transactionId,
        userId,
        metadata.promoCode,
        plan,
      );
    }

    return {
      success: true,
      subscription: updatedSubscription,
    };
  }
}
