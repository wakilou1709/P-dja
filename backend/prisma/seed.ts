import { PrismaClient, UserRole, DifficultyLevel, QuestionType, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development only)
  // NOTE: We preserve users, subscriptions and transactions to avoid losing user accounts
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning exam data (preserving user accounts)...');
    await prisma.userAchievement.deleteMany();
    await prisma.achievement.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.quizAttempt.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.question.deleteMany();
    await prisma.exam.deleteMany();
    // Users, subscriptions and transactions are preserved
  }

  // ============================================
  // USERS
  // ============================================
  console.log('👤 Creating/updating test users...');

  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pedja.app' },
    update: {},
    create: {
      email: 'admin@pedja.app',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Pédja',
      role: UserRole.ADMIN,
      phone: '+22670000001',
      isEmailVerified: true,
      isPhoneVerified: true,
      onboardingCompleted: true,
      points: 1000,
      level: 5,
      streak: 30,
    },
  });

  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: 'marie.kouame@example.com' },
      update: {},
      create: {
        email: 'marie.kouame@example.com',
        password: hashedPassword,
        firstName: 'Marie',
        lastName: 'Kouamé',
        role: UserRole.STUDENT,
        phone: '+22670123456',
        isEmailVerified: true,
        onboardingCompleted: true,
        preferredExamType: 'BAC',
        preferredSubjects: ['Mathématiques', 'Physique', 'SVT'],
        points: 450,
        level: 3,
        streak: 7,
      },
    }),
    prisma.user.upsert({
      where: { email: 'jean.traore@example.com' },
      update: {},
      create: {
        email: 'jean.traore@example.com',
        password: hashedPassword,
        firstName: 'Jean',
        lastName: 'Traoré',
        role: UserRole.STUDENT,
        phone: '71234567',
        isEmailVerified: true,
        onboardingCompleted: true,
        preferredExamType: 'BEPC',
        preferredSubjects: ['Français', 'Histoire', 'Anglais'],
        points: 280,
        level: 2,
        streak: 3,
      },
    }),
    prisma.user.upsert({
      where: { email: 'aissatou.diallo@example.com' },
      update: {},
      create: {
        email: 'aissatou.diallo@example.com',
        password: hashedPassword,
        firstName: 'Aïssatou',
        lastName: 'Diallo',
        role: UserRole.STUDENT,
        phone: '+22997000004',
        isEmailVerified: false,
        onboardingCompleted: false,
        points: 0,
        level: 1,
        streak: 0,
      },
    }),
  ]);

  console.log(`✅ Users ready (${students.length + 1} total)`);

  // ============================================
  // SUBSCRIPTIONS
  // ============================================
  console.log('💳 Checking subscriptions...');

  // Only create subscriptions if they don't exist
  const existingSub1 = await prisma.subscription.findFirst({
    where: { userId: students[0].id },
  });

  if (!existingSub1) {
    await prisma.subscription.create({
      data: {
        userId: students[0].id,
        plan: SubscriptionPlan.MONTHLY,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        autoRenew: true,
      },
    });
  }

  const existingSub2 = await prisma.subscription.findFirst({
    where: { userId: students[1].id },
  });

  if (!existingSub2) {
    await prisma.subscription.create({
      data: {
        userId: students[1].id,
        plan: SubscriptionPlan.FREE,
        status: 'ACTIVE',
      },
    });
  }

  console.log('✅ Subscriptions ready');

  // ============================================
  // EXAMS - Structured by National Exams and Universities
  // ============================================
  console.log('📚 Creating exams...');

  const examData = [
    // ========================================
    // EXAMENS NATIONAUX (PRIMAIRE)
    // ========================================
    // CEP - Certificat d'Études Primaires
    {
      title: 'CEP Mathématiques - 2024',
      type: "CEP",
      year: 2024,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Certificat d\'Études Primaires, session 2024',
      difficulty: DifficultyLevel.EASY,
      duration: 90,
      tags: ['CEP', 'Mathématiques', '2024', 'Primaire'],
    },
    {
      title: 'CEP Français - 2024',
      type: "CEP",
      year: 2024,
      subject: 'Français',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de français du Certificat d\'Études Primaires, session 2024',
      difficulty: DifficultyLevel.EASY,
      duration: 90,
      tags: ['CEP', 'Français', '2024', 'Primaire'],
    },
    {
      title: 'CEP Mathématiques - 2023',
      type: "CEP",
      year: 2023,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Certificat d\'Études Primaires, session 2023',
      difficulty: DifficultyLevel.EASY,
      duration: 90,
      tags: ['CEP', 'Mathématiques', '2023', 'Primaire'],
    },

    // ========================================
    // EXAMENS NATIONAUX (COLLÈGE)
    // ========================================
    // BEPC - Brevet d'Études du Premier Cycle
    {
      title: 'BEPC Mathématiques - 2024',
      type: "BEPC",
      year: 2024,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du BEPC, session 2024',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 120,
      tags: ['BEPC', 'Mathématiques', '2024', 'Collège'],
    },
    {
      title: 'BEPC Français - 2024',
      type: "BEPC",
      year: 2024,
      subject: 'Français',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de français du BEPC, session 2024',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 180,
      tags: ['BEPC', 'Français', '2024', 'Collège'],
    },
    {
      title: 'BEPC Anglais - 2024',
      type: "BEPC",
      year: 2024,
      subject: 'Anglais',
      university: "NONE",
      faculty: null,
      description: 'Épreuve d\'anglais du BEPC, session 2024',
      difficulty: DifficultyLevel.EASY,
      duration: 120,
      tags: ['BEPC', 'Anglais', '2024', 'Collège'],
    },
    {
      title: 'BEPC Histoire-Géographie - 2024',
      type: "BEPC",
      year: 2024,
      subject: 'Histoire-Géographie',
      university: "NONE",
      faculty: null,
      description: 'Épreuve d\'histoire-géographie du BEPC, session 2024',
      difficulty: DifficultyLevel.EASY,
      duration: 120,
      tags: ['BEPC', 'Histoire', 'Géographie', '2024', 'Collège'],
    },
    {
      title: 'BEPC Sciences Physiques - 2024',
      type: "BEPC",
      year: 2024,
      subject: 'Sciences Physiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de sciences physiques du BEPC, session 2024',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 90,
      tags: ['BEPC', 'Sciences', 'Physique', '2024', 'Collège'],
    },

    // ========================================
    // EXAMENS NATIONAUX (LYCÉE)
    // ========================================
    // BAC - Baccalauréat
    // Série D (Sciences Expérimentales)
    {
      title: 'BAC Mathématiques Série D - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Mathématiques',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2024', 'Lycée'],
    },
    {
      title: 'BAC Physique-Chimie Série D - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Physique-Chimie',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de physique-chimie du Baccalauréat série D, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Physique', 'Chimie', '2024', 'Lycée'],
    },
    {
      title: 'BAC SVT Série D - 2024',
      type: "BAC",
      year: 2024,
      subject: 'SVT',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de Sciences de la Vie et de la Terre, série D, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'SVT', 'Biologie', '2024', 'Lycée'],
    },
    {
      title: 'BAC Philosophie Série D - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Philosophie',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de philosophie du Baccalauréat série D, session 2024',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 240,
      tags: ['BAC', 'Série D', 'Philosophie', '2024', 'Lycée'],
    },

    // Série C (Mathématiques)
    {
      title: 'BAC Mathématiques Série C - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Mathématiques',
      series: 'C',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série C, session 2024',
      difficulty: DifficultyLevel.EXPERT,
      duration: 240,
      tags: ['BAC', 'Série C', 'Mathématiques', '2024', 'Lycée'],
    },
    {
      title: 'BAC Physique-Chimie Série C - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Physique-Chimie',
      series: 'C',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de physique-chimie du Baccalauréat série C, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série C', 'Physique', 'Chimie', '2024', 'Lycée'],
    },

    // Série A (Littéraire)
    {
      title: 'BAC Philosophie Série A - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Philosophie',
      series: 'A',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de philosophie du Baccalauréat série A, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 240,
      tags: ['BAC', 'Série A', 'Philosophie', '2024', 'Lycée'],
    },
    {
      title: 'BAC Français Série A - 2024',
      type: "BAC",
      year: 2024,
      subject: 'Français',
      series: 'A',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de français du Baccalauréat série A, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 240,
      tags: ['BAC', 'Série A', 'Français', '2024', 'Lycée'],
    },

    // ========================================
    // EXAMENS 2025
    // ========================================
    {
      title: 'BAC Mathématiques Série D - 2025',
      type: "BAC",
      year: 2025,
      subject: 'Mathématiques',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2025',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2025', 'Lycée'],
    },
    {
      title: 'BEPC Mathématiques - 2025',
      type: "BEPC",
      year: 2025,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du BEPC, session 2025',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 120,
      tags: ['BEPC', 'Mathématiques', '2025', 'Collège'],
    },

    // ========================================
    // EXAMENS 2023
    // ========================================
    {
      title: 'BAC Mathématiques Série D - 2023',
      type: "BAC",
      year: 2023,
      subject: 'Mathématiques',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2023',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2023', 'Lycée'],
    },
    {
      title: 'BAC Physique-Chimie Série D - 2023',
      type: "BAC",
      year: 2023,
      subject: 'Physique-Chimie',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de physique-chimie du Baccalauréat série D, session 2023',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Physique', 'Chimie', '2023', 'Lycée'],
    },
    {
      title: 'BEPC Français - 2023',
      type: "BEPC",
      year: 2023,
      subject: 'Français',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de français du BEPC, session 2023',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 180,
      tags: ['BEPC', 'Français', '2023', 'Collège'],
    },

    // ========================================
    // EXAMENS 2022
    // ========================================
    {
      title: 'BAC Mathématiques Série D - 2022',
      type: "BAC",
      year: 2022,
      subject: 'Mathématiques',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2022',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2022', 'Lycée'],
    },
    {
      title: 'BAC Philosophie Série A - 2022',
      type: "BAC",
      year: 2022,
      subject: 'Philosophie',
      series: 'A',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de philosophie du Baccalauréat série A, session 2022',
      difficulty: DifficultyLevel.HARD,
      duration: 240,
      tags: ['BAC', 'Série A', 'Philosophie', '2022', 'Lycée'],
    },
    {
      title: 'BEPC Mathématiques - 2022',
      type: "BEPC",
      year: 2022,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du BEPC, session 2022',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 120,
      tags: ['BEPC', 'Mathématiques', '2022', 'Collège'],
    },
    {
      title: 'CEP Français - 2022',
      type: "CEP",
      year: 2022,
      subject: 'Français',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de français du Certificat d\'Études Primaires, session 2022',
      difficulty: DifficultyLevel.EASY,
      duration: 90,
      tags: ['CEP', 'Français', '2022', 'Primaire'],
    },

    // ========================================
    // EXAMENS 2021
    // ========================================
    {
      title: 'BAC Mathématiques Série C - 2021',
      type: "BAC",
      year: 2021,
      subject: 'Mathématiques',
      series: 'C',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série C, session 2021',
      difficulty: DifficultyLevel.EXPERT,
      duration: 240,
      tags: ['BAC', 'Série C', 'Mathématiques', '2021', 'Lycée'],
    },
    {
      title: 'BAC SVT Série D - 2021',
      type: "BAC",
      year: 2021,
      subject: 'SVT',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de Sciences de la Vie et de la Terre, série D, session 2021',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'SVT', 'Biologie', '2021', 'Lycée'],
    },
    {
      title: 'BEPC Anglais - 2021',
      type: "BEPC",
      year: 2021,
      subject: 'Anglais',
      university: "NONE",
      faculty: null,
      description: 'Épreuve d\'anglais du BEPC, session 2021',
      difficulty: DifficultyLevel.EASY,
      duration: 120,
      tags: ['BEPC', 'Anglais', '2021', 'Collège'],
    },

    // ========================================
    // EXAMENS 2020
    // ========================================
    {
      title: 'BAC Mathématiques Série D - 2020',
      type: "BAC",
      year: 2020,
      subject: 'Mathématiques',
      series: 'D',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2020',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2020', 'Lycée'],
    },
    {
      title: 'BAC Français Série A - 2020',
      type: "BAC",
      year: 2020,
      subject: 'Français',
      series: 'A',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de français du Baccalauréat série A, session 2020',
      difficulty: DifficultyLevel.HARD,
      duration: 240,
      tags: ['BAC', 'Série A', 'Français', '2020', 'Lycée'],
    },
    {
      title: 'BEPC Histoire-Géographie - 2020',
      type: "BEPC",
      year: 2020,
      subject: 'Histoire-Géographie',
      university: "NONE",
      faculty: null,
      description: 'Épreuve d\'histoire-géographie du BEPC, session 2020',
      difficulty: DifficultyLevel.EASY,
      duration: 120,
      tags: ['BEPC', 'Histoire', 'Géographie', '2020', 'Collège'],
    },
    {
      title: 'CEP Mathématiques - 2020',
      type: "CEP",
      year: 2020,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du Certificat d\'Études Primaires, session 2020',
      difficulty: DifficultyLevel.EASY,
      duration: 90,
      tags: ['CEP', 'Mathématiques', '2020', 'Primaire'],
    },

    // ========================================
    // EXAMENS TECHNIQUES ET PROFESSIONNELS
    // ========================================
    // BEP - Brevet d'Études Professionnelles
    {
      title: 'BEP Électricité - 2024',
      type: "BEP",
      year: 2024,
      subject: 'Électricité',
      university: "NONE",
      faculty: null,
      description: 'Épreuve d\'électricité du BEP, session 2024',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 180,
      tags: ['BEP', 'Électricité', '2024', 'Professionnel'],
    },

    // CAP - Certificat d'Aptitude Professionnelle
    {
      title: 'CAP Mécanique Automobile - 2024',
      type: "CAP",
      year: 2024,
      subject: 'Mécanique',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mécanique automobile du CAP, session 2024',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 120,
      tags: ['CAP', 'Mécanique', 'Automobile', '2024', 'Professionnel'],
    },

    // ========================================
    // CONCOURS ET ÉCOLES
    // ========================================
    // Concours Fonction Publique
    {
      title: 'Concours Agent de Santé - 2024',
      type: "CONCOURS_FP",
      year: 2024,
      subject: 'Sciences de la Santé',
      university: "NONE",
      faculty: null,
      description: 'Concours de recrutement des agents de santé de la fonction publique',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['Concours', 'Santé', '2024', 'Fonction Publique'],
    },
    {
      title: 'Concours Enseignants - 2024',
      type: "CONCOURS_FP",
      year: 2024,
      subject: 'Pédagogie',
      university: "NONE",
      faculty: null,
      description: 'Concours de recrutement des enseignants du primaire',
      difficulty: DifficultyLevel.HARD,
      duration: 240,
      tags: ['Concours', 'Enseignement', '2024', 'Fonction Publique'],
    },

    // PMK - Prytanée Militaire du Kadiogo
    {
      title: 'PMK Mathématiques - 2024',
      type: "PMK",
      year: 2024,
      subject: 'Mathématiques',
      university: "NONE",
      faculty: null,
      description: 'Épreuve de mathématiques du concours d\'entrée au PMK, session 2024',
      difficulty: DifficultyLevel.HARD,
      duration: 120,
      tags: ['PMK', 'Mathématiques', '2024', 'Militaire'],
    },

    // ========================================
    // UNIVERSITÉS - JOSEPH KI-ZERBO (OUAGADOUGOU)
    // ========================================
    // UFR/SEA - Sciences Exactes et Appliquées
    {
      title: 'Analyse Mathématique I - L1 MPCSI',
      type: "LICENCE",
      year: 2024,
      subject: 'Mathématiques',
      university: "JOSEPH_KI_ZERBO",
      faculty: 'UFR/SEA - Sciences Exactes et Appliquées',
      description: 'Examen d\'analyse mathématique I, Licence 1 MPCSI, Université Joseph Ki-Zerbo',
      difficulty: DifficultyLevel.EXPERT,
      duration: 180,
      tags: ['Licence', 'L1', 'Mathématiques', 'JKZ', '2024'],
    },
    {
      title: 'Algèbre Linéaire I - L1 MPCSI',
      type: "LICENCE",
      year: 2024,
      subject: 'Mathématiques',
      university: "JOSEPH_KI_ZERBO",
      faculty: 'UFR/SEA - Sciences Exactes et Appliquées',
      description: 'Examen d\'algèbre linéaire I, Licence 1 MPCSI, Université Joseph Ki-Zerbo',
      difficulty: DifficultyLevel.EXPERT,
      duration: 180,
      tags: ['Licence', 'L1', 'Mathématiques', 'Algèbre', 'JKZ', '2024'],
    },
    {
      title: 'Mécanique du Point - L1 PC',
      type: "LICENCE",
      year: 2024,
      subject: 'Physique',
      university: "JOSEPH_KI_ZERBO",
      faculty: 'UFR/SEA - Sciences Exactes et Appliquées',
      description: 'Examen de mécanique du point, Licence 1 Physique-Chimie, Université Joseph Ki-Zerbo',
      difficulty: DifficultyLevel.EXPERT,
      duration: 180,
      tags: ['Licence', 'L1', 'Physique', 'Mécanique', 'JKZ', '2024'],
    },

    // Faculté des Sciences de la Vie et de la Terre
    {
      title: 'Biologie Cellulaire - L1 SVT',
      type: "LICENCE",
      year: 2024,
      subject: 'Biologie',
      university: "JOSEPH_KI_ZERBO",
      faculty: 'Faculté des Sciences de la Vie et de la Terre',
      description: 'Examen de biologie cellulaire, Licence 1 SVT, Université Joseph Ki-Zerbo',
      difficulty: DifficultyLevel.HARD,
      duration: 120,
      tags: ['Licence', 'L1', 'Biologie', 'SVT', 'JKZ', '2024'],
    },

    // Faculté des Sciences Économiques et de Gestion
    {
      title: 'Microéconomie I - L1 Économie',
      type: "LICENCE",
      year: 2024,
      subject: 'Économie',
      university: "JOSEPH_KI_ZERBO",
      faculty: 'Faculté des Sciences Économiques et de Gestion',
      description: 'Examen de microéconomie I, Licence 1 Économie, Université Joseph Ki-Zerbo',
      difficulty: DifficultyLevel.EXPERT,
      duration: 180,
      tags: ['Licence', 'L1', 'Économie', 'JKZ', '2024'],
    },

    // ========================================
    // UNIVERSITÉS - NAZI BONI (BOBO-DIOULASSO)
    // ========================================
    // Institut du Développement Rural
    {
      title: 'Agronomie Générale - L1 IDR',
      type: "LICENCE",
      year: 2024,
      subject: 'Agronomie',
      university: "NAZI_BONI",
      faculty: 'Institut du Développement Rural',
      description: 'Examen d\'agronomie générale, Licence 1 IDR, Université Nazi Boni',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['Licence', 'L1', 'Agronomie', 'Nazi Boni', '2024'],
    },

    // ========================================
    // UNIVERSITÉS - NORBERT ZONGO (KOUDOUGOU)
    // ========================================
    // Faculté des Lettres
    {
      title: 'Littérature Française - L1 Lettres',
      type: "LICENCE",
      year: 2024,
      subject: 'Littérature',
      university: "NORBERT_ZONGO",
      faculty: 'Faculté des Lettres, Arts et Communication',
      description: 'Examen de littérature française, Licence 1 Lettres, Université Norbert Zongo',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['Licence', 'L1', 'Littérature', 'Koudougou', '2024'],
    },

    // ========================================
    // UNIVERSITÉS PRIVÉES
    // ========================================
    // AUBE NOUVELLE
    {
      title: 'Droit Civil I - L1 Droit',
      type: "LICENCE",
      year: 2024,
      subject: 'Droit',
      university: "AUBE_NOUVELLE",
      faculty: 'Faculté de Droit',
      description: 'Examen de droit civil I, Licence 1 Droit, Université Aube Nouvelle',
      difficulty: DifficultyLevel.EXPERT,
      duration: 180,
      tags: ['Licence', 'L1', 'Droit', 'Aube Nouvelle', '2024'],
    },

    // ULB - Université Libre du Burkina
    {
      title: 'Gestion des Entreprises - L1 Économie',
      type: "LICENCE",
      year: 2024,
      subject: 'Gestion',
      university: "ULB",
      faculty: 'Faculté des Sciences Économiques et de Gestion',
      description: 'Examen de gestion des entreprises, Licence 1 Économie, Université Libre du Burkina',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['Licence', 'L1', 'Gestion', 'ULB', '2024'],
    },
    {
      title: 'Droit Constitutionnel - L1 Droit',
      type: "LICENCE",
      year: 2024,
      subject: 'Droit',
      university: "ULB",
      faculty: 'Faculté de Droit et Sciences Politiques',
      description: 'Examen de droit constitutionnel, Licence 1 Droit, Université Libre du Burkina',
      difficulty: DifficultyLevel.EXPERT,
      duration: 180,
      tags: ['Licence', 'L1', 'Droit', 'ULB', '2024'],
    },

    // UNDA - Université Notre Dame d'Afrique
    {
      title: 'Marketing Fondamental - L2 Commerce',
      type: "LICENCE",
      year: 2024,
      subject: 'Marketing',
      university: "UNDA",
      faculty: 'Faculté de Commerce et Gestion',
      description: 'Examen de marketing fondamental, Licence 2 Commerce, Université Notre Dame d\'Afrique',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 120,
      tags: ['Licence', 'L2', 'Marketing', 'UNDA', '2024'],
    },

    // UPO - Université Privée de Ouagadougou
    {
      title: 'Comptabilité Générale - L1 Gestion',
      type: "LICENCE",
      year: 2024,
      subject: 'Comptabilité',
      university: "UPO",
      faculty: 'Institut de Gestion et Management',
      description: 'Examen de comptabilité générale, Licence 1 Gestion, Université Privée de Ouagadougou',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 180,
      tags: ['Licence', 'L1', 'Comptabilité', 'UPO', '2024'],
    },

    // SAINT_JOSEPH - Université Privée Catholique Saint Joseph
    {
      title: 'Théologie Morale - L1 Théologie',
      type: "LICENCE",
      year: 2024,
      subject: 'Théologie',
      university: "SAINT_JOSEPH",
      faculty: 'Faculté de Théologie',
      description: 'Examen de théologie morale, Licence 1 Théologie, Université Privée Catholique Saint Joseph',
      difficulty: DifficultyLevel.HARD,
      duration: 120,
      tags: ['Licence', 'L1', 'Théologie', 'Saint Joseph', '2024'],
    },
  ];

  const exams = await Promise.all(
    examData.map((data) =>
      prisma.exam.create({
        data: {
          ...data,
          totalQuestions: 0, // Will be updated when adding questions
          viewCount: Math.floor(Math.random() * 500),
          downloadCount: Math.floor(Math.random() * 200),
        },
      }),
    ),
  );

  console.log(`✅ Created ${exams.length} exams`);

  // ============================================
  // QUESTIONS
  // ============================================
  console.log('❓ Creating questions...');

  const mathExam = exams.find((e) => e.subject === 'Mathématiques' && e.year === 2023);
  const physicsExam = exams.find((e) => e.subject === 'Physique-Chimie');

  if (mathExam) {
    await Promise.all([
      prisma.question.create({
        data: {
          examId: mathExam.id,
          content: 'Résoudre l\'équation du second degré : 2x² - 5x + 2 = 0',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.MEDIUM,
          options: JSON.stringify([
            { id: 'A', text: 'x₁ = 1/2, x₂ = 2', isCorrect: false },
            { id: 'B', text: 'x₁ = 1, x₂ = 1/2', isCorrect: false },
            { id: 'C', text: 'x₁ = 2, x₂ = 1/2', isCorrect: true },
            { id: 'D', text: 'x₁ = -2, x₂ = -1/2', isCorrect: false },
          ]),
          correctAnswer: 'C',
          explanation: 'En utilisant la formule du discriminant Δ = b² - 4ac, on trouve Δ = 9, puis x₁ = (5+3)/4 = 2 et x₂ = (5-3)/4 = 1/2',
        },
      }),
      prisma.question.create({
        data: {
          examId: mathExam.id,
          content: 'Calculer la dérivée de f(x) = 3x³ - 2x² + 5x - 1',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          options: JSON.stringify([
            { id: 'A', text: 'f\'(x) = 9x² - 4x + 5', isCorrect: true },
            { id: 'B', text: 'f\'(x) = 9x² - 4x + 5x', isCorrect: false },
            { id: 'C', text: 'f\'(x) = 3x² - 2x + 5', isCorrect: false },
            { id: 'D', text: 'f\'(x) = 9x³ - 4x² + 5', isCorrect: false },
          ]),
          correctAnswer: 'A',
          explanation: 'La dérivée d\'une fonction polynôme se calcule terme par terme : (xⁿ)\' = n·xⁿ⁻¹',
        },
      }),
      prisma.question.create({
        data: {
          examId: mathExam.id,
          content: 'Dans un repère orthonormé, quelle est l\'équation d\'une droite passant par A(2,3) et B(4,7) ?',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.MEDIUM,
          options: JSON.stringify([
            { id: 'A', text: 'y = 2x - 1', isCorrect: true },
            { id: 'B', text: 'y = 2x + 1', isCorrect: false },
            { id: 'C', text: 'y = x + 1', isCorrect: false },
            { id: 'D', text: 'y = -2x + 7', isCorrect: false },
          ]),
          correctAnswer: 'A',
          explanation: 'Pente m = (7-3)/(4-2) = 2, puis avec y - y₁ = m(x - x₁), on trouve y = 2x - 1',
        },
      }),
      prisma.question.create({
        data: {
          examId: mathExam.id,
          content: 'Simplifier l\'expression : (2√3 + √12) / √3',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.HARD,
          options: JSON.stringify([
            { id: 'A', text: '4', isCorrect: true },
            { id: 'B', text: '2 + 2√3', isCorrect: false },
            { id: 'C', text: '6', isCorrect: false },
            { id: 'D', text: '2√3', isCorrect: false },
          ]),
          correctAnswer: 'A',
          explanation: '√12 = 2√3, donc (2√3 + 2√3) / √3 = 4√3 / √3 = 4',
        },
      }),
      prisma.question.create({
        data: {
          examId: mathExam.id,
          content: 'Soit f(x) = x² - 4x + 3. Déterminer le minimum de f.',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.MEDIUM,
          options: JSON.stringify([
            { id: 'A', text: 'f(2) = -1', isCorrect: true },
            { id: 'B', text: 'f(0) = 3', isCorrect: false },
            { id: 'C', text: 'f(1) = 0', isCorrect: false },
            { id: 'D', text: 'f(3) = 0', isCorrect: false },
          ]),
          correctAnswer: 'A',
          explanation: 'Le sommet est en x = -b/2a = 4/2 = 2, et f(2) = 4 - 8 + 3 = -1',
        },
      }),
    ]);

    await prisma.exam.update({
      where: { id: mathExam.id },
      data: { totalQuestions: 5 },
    });
  }

  if (physicsExam) {
    await Promise.all([
      prisma.question.create({
        data: {
          examId: physicsExam.id,
          content: 'Quelle est l\'unité de la force dans le système international ?',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          options: JSON.stringify([
            { id: 'A', text: 'Joule (J)', isCorrect: false },
            { id: 'B', text: 'Newton (N)', isCorrect: true },
            { id: 'C', text: 'Watt (W)', isCorrect: false },
            { id: 'D', text: 'Pascal (Pa)', isCorrect: false },
          ]),
          correctAnswer: 'B',
          explanation: 'Le Newton est l\'unité de force dans le SI, défini par F = m·a',
        },
      }),
      prisma.question.create({
        data: {
          examId: physicsExam.id,
          content: 'Un corps de masse 2 kg subit une accélération de 3 m/s². Quelle est la force appliquée ?',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          options: JSON.stringify([
            { id: 'A', text: '5 N', isCorrect: false },
            { id: 'B', text: '6 N', isCorrect: true },
            { id: 'C', text: '1.5 N', isCorrect: false },
            { id: 'D', text: '2/3 N', isCorrect: false },
          ]),
          correctAnswer: 'B',
          explanation: 'F = m × a = 2 kg × 3 m/s² = 6 N',
        },
      }),
      prisma.question.create({
        data: {
          examId: physicsExam.id,
          content: 'La vitesse de la lumière dans le vide est approximativement :',
          type: QuestionType.MULTIPLE_CHOICE,
          difficulty: DifficultyLevel.EASY,
          options: JSON.stringify([
            { id: 'A', text: '3 × 10⁸ m/s', isCorrect: true },
            { id: 'B', text: '3 × 10⁶ m/s', isCorrect: false },
            { id: 'C', text: '3 × 10⁹ m/s', isCorrect: false },
            { id: 'D', text: '3 × 10⁷ m/s', isCorrect: false },
          ]),
          correctAnswer: 'A',
          explanation: 'La vitesse de la lumière c ≈ 300 000 km/s = 3 × 10⁸ m/s',
        },
      }),
    ]);

    await prisma.exam.update({
      where: { id: physicsExam.id },
      data: { totalQuestions: 3 },
    });
  }

  console.log('✅ Created questions for exams');

  // ============================================
  // QUIZZES
  // ============================================
  console.log('🎯 Creating quizzes...');

  if (mathExam) {
    const mathQuestions = await prisma.question.findMany({
      where: { examId: mathExam.id },
      select: { id: true },
    });

    await prisma.quiz.create({
      data: {
        title: 'Quiz BAC Maths - Fonctions et Dérivées',
        description: 'Testez vos connaissances sur les fonctions et leurs dérivées',
        subject: 'Mathématiques',
        mode: 'PRACTICE',
        timeLimit: 600, // 10 minutes
        passingScore: 70,
        questionIds: mathQuestions.map((q) => q.id),
        totalQuestions: mathQuestions.length,
        difficulty: DifficultyLevel.MEDIUM,
      },
    });

    await prisma.quiz.create({
      data: {
        title: 'Quiz Rapide - Équations',
        description: 'Quiz rapide sur les équations du second degré',
        subject: 'Mathématiques',
        mode: 'TIMED',
        timeLimit: 300, // 5 minutes
        passingScore: 60,
        questionIds: [mathQuestions[0].id],
        totalQuestions: 1,
        difficulty: DifficultyLevel.EASY,
      },
    });
  }

  console.log('✅ Created quizzes');

  // ============================================
  // ACHIEVEMENTS
  // ============================================
  console.log('🏆 Creating achievements...');

  const achievements = await Promise.all([
    prisma.achievement.create({
      data: {
        name: 'Premier Pas',
        description: 'Complète ton premier quiz',
        type: 'QUIZ_COUNT',
        requirement: JSON.stringify({ type: 'quiz_count', value: 1 }),
        points: 10,
      },
    }),
    prisma.achievement.create({
      data: {
        name: 'Marathonien',
        description: 'Maintiens une série de 7 jours consécutifs',
        type: 'STREAK',
        requirement: JSON.stringify({ type: 'streak', value: 7 }),
        points: 50,
      },
    }),
    prisma.achievement.create({
      data: {
        name: 'Score Parfait',
        description: 'Obtiens 100% à un quiz',
        type: 'PERFECT_SCORE',
        requirement: JSON.stringify({ type: 'perfect_score', value: 100 }),
        points: 30,
      },
    }),
  ]);

  // Assign achievement to active student (if not already assigned)
  const existingUserAchievement = await prisma.userAchievement.findFirst({
    where: {
      userId: students[0].id,
      achievementId: achievements[0].id,
    },
  });

  if (!existingUserAchievement) {
    await prisma.userAchievement.create({
      data: {
        userId: students[0].id,
        achievementId: achievements[0].id,
      },
    });
  }

  console.log(`✅ Created ${achievements.length} achievements`);

  // ============================================
  // PROGRESS & NOTIFICATIONS
  // ============================================
  console.log('📈 Creating progress and notifications...');

  const existingProgress = await prisma.progress.findFirst({
    where: {
      userId: students[0].id,
      subject: 'Mathématiques',
      examType: "BAC",
    },
  });

  if (!existingProgress) {
    await prisma.progress.create({
      data: {
        userId: students[0].id,
        subject: 'Mathématiques',
        examType: "BAC",
        totalQuizzes: 12,
        totalQuestions: 85,
        correctAnswers: 68,
        averageScore: 80,
        totalTimeSpent: 3600,
        currentStreak: 7,
        longestStreak: 15,
        lastStudyDate: new Date(),
      },
    });
  }

  const existingNotification = await prisma.notification.findFirst({
    where: {
      userId: students[0].id,
      type: 'ACHIEVEMENT',
      title: 'Nouveau badge débloqué !',
    },
  });

  if (!existingNotification) {
    await prisma.notification.create({
      data: {
        userId: students[0].id,
        type: 'ACHIEVEMENT',
        title: 'Nouveau badge débloqué !',
        message: 'Félicitations ! Tu as débloqué le badge "Premier Pas"',
      },
    });
  }

  console.log('✅ Progress and notifications ready');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`   - Users: ${students.length + 1} (1 admin, ${students.length} students)`);
  console.log(`   - Exams: ${exams.length}`);
  console.log('   - Questions: Multiple questions created');
  console.log(`   - Achievements: ${achievements.length}`);
  console.log('\n🔐 Test Credentials:');
  console.log('   Email: admin@pedja.app');
  console.log('   Email: marie.kouame@example.com');
  console.log('   Email: jean.traore@example.com');
  console.log('   Password: Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
