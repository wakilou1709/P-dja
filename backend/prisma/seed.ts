import { PrismaClient, UserRole, ExamType, DifficultyLevel, QuestionType, SubscriptionPlan } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean existing data (in development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Cleaning existing data...');
    await prisma.userAchievement.deleteMany();
    await prisma.achievement.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.studySession.deleteMany();
    await prisma.progress.deleteMany();
    await prisma.quizAttempt.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.question.deleteMany();
    await prisma.exam.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
  }

  // ============================================
  // USERS
  // ============================================
  console.log('👤 Creating users...');

  const hashedPassword = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@pedja.app',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'Pédja',
      role: UserRole.ADMIN,
      phone: '+22997000001',
      isEmailVerified: true,
      isPhoneVerified: true,
      onboardingCompleted: true,
      points: 1000,
      level: 5,
      streak: 30,
    },
  });

  const students = await Promise.all([
    prisma.user.create({
      data: {
        email: 'marie.kouame@example.com',
        password: hashedPassword,
        firstName: 'Marie',
        lastName: 'Kouamé',
        role: UserRole.STUDENT,
        phone: '+22997000002',
        isEmailVerified: true,
        onboardingCompleted: true,
        preferredExamType: 'BAC',
        preferredSubjects: ['Mathématiques', 'Physique', 'SVT'],
        points: 450,
        level: 3,
        streak: 7,
      },
    }),
    prisma.user.create({
      data: {
        email: 'jean.traore@example.com',
        password: hashedPassword,
        firstName: 'Jean',
        lastName: 'Traoré',
        role: UserRole.STUDENT,
        phone: '+22997000003',
        isEmailVerified: true,
        onboardingCompleted: true,
        preferredExamType: 'BEPC',
        preferredSubjects: ['Français', 'Histoire', 'Anglais'],
        points: 280,
        level: 2,
        streak: 3,
      },
    }),
    prisma.user.create({
      data: {
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

  console.log(`✅ Created ${students.length + 1} users`);

  // ============================================
  // SUBSCRIPTIONS
  // ============================================
  console.log('💳 Creating subscriptions...');

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

  await prisma.subscription.create({
    data: {
      userId: students[1].id,
      plan: SubscriptionPlan.FREE,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created subscriptions');

  // ============================================
  // EXAMS
  // ============================================
  console.log('📚 Creating exams...');

  const examData = [
    // BAC Exams
    {
      title: 'BAC Mathématiques Série D - 2023',
      type: ExamType.BAC,
      year: 2023,
      subject: 'Mathématiques',
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2023',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2023'],
    },
    {
      title: 'BAC Physique-Chimie Série D - 2023',
      type: ExamType.BAC,
      year: 2023,
      subject: 'Physique-Chimie',
      description: 'Épreuve de physique-chimie du Baccalauréat série D, session 2023',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Physique', 'Chimie', '2023'],
    },
    {
      title: 'BAC Philosophie Série A - 2023',
      type: ExamType.BAC,
      year: 2023,
      subject: 'Philosophie',
      description: 'Épreuve de philosophie du Baccalauréat série A, session 2023',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 240,
      tags: ['BAC', 'Série A', 'Philosophie', '2023'],
    },

    // BEPC Exams
    {
      title: 'BEPC Mathématiques - 2023',
      type: ExamType.BEPC,
      year: 2023,
      subject: 'Mathématiques',
      description: 'Épreuve de mathématiques du BEPC, session 2023',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 120,
      tags: ['BEPC', 'Mathématiques', '2023'],
    },
    {
      title: 'BEPC Français - 2023',
      type: ExamType.BEPC,
      year: 2023,
      subject: 'Français',
      description: 'Épreuve de français du BEPC, session 2023',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 180,
      tags: ['BEPC', 'Français', '2023'],
    },
    {
      title: 'BEPC Anglais - 2023',
      type: ExamType.BEPC,
      year: 2023,
      subject: 'Anglais',
      description: 'Épreuve d\'anglais du BEPC, session 2023',
      difficulty: DifficultyLevel.EASY,
      duration: 120,
      tags: ['BEPC', 'Anglais', '2023'],
    },

    // Previous years
    {
      title: 'BAC Mathématiques Série D - 2022',
      type: ExamType.BAC,
      year: 2022,
      subject: 'Mathématiques',
      description: 'Épreuve de mathématiques du Baccalauréat série D, session 2022',
      difficulty: DifficultyLevel.HARD,
      duration: 180,
      tags: ['BAC', 'Série D', 'Mathématiques', '2022'],
    },
    {
      title: 'BAC SVT Série D - 2023',
      type: ExamType.BAC,
      year: 2023,
      subject: 'SVT',
      description: 'Épreuve de Sciences de la Vie et de la Terre, série D, session 2023',
      difficulty: DifficultyLevel.MEDIUM,
      duration: 180,
      tags: ['BAC', 'Série D', 'SVT', 'Biologie', '2023'],
    },
    {
      title: 'BEPC Histoire-Géographie - 2023',
      type: ExamType.BEPC,
      year: 2023,
      subject: 'Histoire-Géographie',
      description: 'Épreuve d\'histoire-géographie du BEPC, session 2023',
      difficulty: DifficultyLevel.EASY,
      duration: 120,
      tags: ['BEPC', 'Histoire', 'Géographie', '2023'],
    },
    {
      title: 'Licence Économie L1 - Microéconomie',
      type: ExamType.LICENCE,
      year: 2023,
      subject: 'Économie',
      description: 'Examen de microéconomie, Licence 1 Économie',
      difficulty: DifficultyLevel.EXPERT,
      duration: 120,
      tags: ['Licence', 'L1', 'Économie', 'Microéconomie'],
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

  // Assign achievement to active student
  await prisma.userAchievement.create({
    data: {
      userId: students[0].id,
      achievementId: achievements[0].id,
    },
  });

  console.log(`✅ Created ${achievements.length} achievements`);

  // ============================================
  // PROGRESS & NOTIFICATIONS
  // ============================================
  console.log('📈 Creating progress and notifications...');

  await prisma.progress.create({
    data: {
      userId: students[0].id,
      subject: 'Mathématiques',
      examType: ExamType.BAC,
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

  await prisma.notification.create({
    data: {
      userId: students[0].id,
      type: 'ACHIEVEMENT',
      title: 'Nouveau badge débloqué !',
      message: 'Félicitations ! Tu as débloqué le badge "Premier Pas"',
    },
  });

  console.log('✅ Created progress and notifications');

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
