import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const compression = require('compression');
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Gzip compression — réduit drastiquement la taille des réponses JSON
  app.use(compression());

  // Limites body: 10mb suffisant pour import batch (texte OCR, pas binaire)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // permet au frontend de charger les fichiers uploadés (vidéos, PDFs)
  }));

  // CORS
  const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://pe-dja.com',
    'https://www.pe-dja.com',
    'https://pedja.wapiki.com',
    'https://www.pedja.wapiki.com',
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Pédja API')
    .setDescription('API pour la plateforme éducative Pédja')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentification et autorisation')
    .addTag('users', 'Gestion des utilisateurs')
    .addTag('exams', 'Examens et annales')
    .addTag('quizzes', 'Quiz et tests')
    .addTag('subscriptions', 'Abonnements et paiements')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`
    🚀 Pédja Backend API is running!

    📡 URL: http://localhost:${port}/api
    📚 Swagger Docs: http://localhost:${port}/api/docs
    🌍 Environment: ${process.env.NODE_ENV || 'development'}

    Ready to accept requests...
  `);
}

bootstrap();
