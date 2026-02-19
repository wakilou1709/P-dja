import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [PrismaModule],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
