import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PromoModule } from '../promo/promo.module';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminExamsController } from './controllers/admin-exams.controller';
import { AdminFinanceController } from './controllers/admin-finance.controller';
import { AdminAnalyticsController } from './controllers/admin-analytics.controller';
import { AdminPromoController } from './controllers/admin-promo.controller';
import { AdminExamConfigController } from './controllers/admin-exam-config.controller';
import { AdminQuestionsController } from './controllers/admin-questions.controller';
import { AdminUsersService } from './services/admin-users.service';
import { AdminExamsService } from './services/admin-exams.service';
import { AdminFinanceService } from './services/admin-finance.service';
import { AdminAnalyticsService } from './services/admin-analytics.service';
import { AdminExamConfigService } from './services/admin-exam-config.service';
import { AdminQuestionsService } from './services/admin-questions.service';

@Module({
  imports: [PrismaModule, PromoModule],
  controllers: [
    AdminUsersController,
    AdminExamsController,
    AdminFinanceController,
    AdminAnalyticsController,
    AdminPromoController,
    AdminExamConfigController,
    AdminQuestionsController,
  ],
  providers: [
    AdminUsersService,
    AdminExamsService,
    AdminFinanceService,
    AdminAnalyticsService,
    AdminExamConfigService,
    AdminQuestionsService,
  ],
})
export class AdminModule {}
