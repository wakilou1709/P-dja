# 🎓 Pédja - Plan d'Architecture Moderne & Futuriste

## 📋 Vue d'ensemble
Pédja est une plateforme éducative SaaS permettant aux étudiants et élèves de se préparer efficacement aux examens nationaux et universitaires via des sujets corrigés et des quiz interactifs.

---

## 🏗️ Architecture Technique

### Stack Technologique Moderne (2026)

#### **Backend (API REST/GraphQL)**
- **Framework**: Node.js avec **NestJS** (architecture modulaire et scalable)
  - TypeScript pour la sécurité des types
  - Architecture microservices-ready
  - Support WebSocket pour fonctionnalités temps réel
- **Base de données**:
  - **PostgreSQL** (données relationnelles: utilisateurs, examens, universités)
  - **MongoDB** (documents flexibles: questions, quiz, statistiques)
  - **Redis** (cache, sessions, rate limiting)
- **ORM**: Prisma (moderne, type-safe, excellent DX)
- **API**: REST + GraphQL (Apollo Server) pour flexibilité
- **Authentification**: JWT + Refresh Tokens + OAuth2
- **Paiement Mobile Money**:
  - Intégration API: MTN Mobile Money, Moov Money, Orange Money
  - Webhook pour validation automatique
- **Storage**: AWS S3 / Cloudinary (PDFs examens, images, médias)
- **Search Engine**: Elasticsearch (recherche avancée de sujets)

#### **Frontend Web**
- **Framework**: **Next.js 15** (React Server Components, App Router)
  - SSR/SSG pour SEO optimal
  - Route handlers pour API integration
  - Middleware pour protection routes
- **UI Library**:
  - **shadcn/ui** + **Tailwind CSS** (design system moderne)
  - **Framer Motion** (animations fluides et futuristes)
  - **Radix UI** (composants accessibles)
- **State Management**:
  - Zustand (léger et simple)
  - React Query (data fetching et cache)
- **Formulaires**: React Hook Form + Zod (validation)
- **Graphiques**: Recharts / Chart.js (statistiques progression)

#### **Application Mobile**
- **Framework**: **React Native** (Expo)
  - Code partagé avec le web (logique métier)
  - Expo Router pour navigation
  - Expo Notifications pour rappels
- **Alternative moderne**: **Flutter** (si équipe préfère)
- **Offline Mode**:
  - WatermelonDB / Realm pour données locales
  - Synchronisation intelligente

#### **Infrastructure & DevOps**
- **Hosting**:
  - Backend: Railway / Render / AWS ECS
  - Frontend: Vercel / Netlify (déploiement automatique)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (erreurs), Posthog (analytics)
- **CDN**: Cloudflare (performance globale)
- **Container**: Docker + Docker Compose

---

## 🎨 Design UI/UX Moderne & Intuitif

### Principes de Design
1. **Minimaliste & Épuré** - Interface claire sans distraction
2. **Dark Mode par défaut** - Réduit fatigue oculaire (étude prolongée)
3. **Micro-interactions** - Feedback visuel instantané
4. **Gamification** - Badges, streaks, classements
5. **Responsive Mobile-First** - Optimisé pour smartphone

### Palette de Couleurs (Futuriste)
```
Primary: Violet/Pourpre (#8B5CF6) - Innovation, Education
Secondary: Cyan (#06B6D4) - Technologie, Confiance
Accent: Orange (#F97316) - Énergie, Motivation
Success: Vert (#10B981) - Réussite
Background Dark: #0F172A / #1E293B
Text: #F1F5F9 / #CBD5E1
```

### Écrans Principaux

#### 1. **Landing Page** (Non connecté)
- Hero section avec animation 3D (Three.js)
- Démonstration interactive quiz
- Témoignages étudiants (carousel)
- Statistiques en temps réel (utilisateurs, quiz complétés)
- Call-to-action clair: "Essai gratuit 7 jours"

#### 2. **Dashboard Principal** (Connecté)
```
┌─────────────────────────────────────────────┐
│  🏠 Dashboard    👤 Profile    🔔 (3)      │
├─────────────────────────────────────────────┤
│                                             │
│  Bonjour Étudiant! 👋                       │
│  Progression: ████████░░ 78%                │
│  Streak: 🔥 12 jours                        │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 📚 Sujets│  │ 🎯 Quiz  │  │ 📊 Stats │ │
│  │  2,345   │  │   456    │  │   89%    │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  📅 Prochains Examens                       │
│  ┌──────────────────────────────────────┐  │
│  │ BAC 2026 - 120 jours restants        │  │
│  │ Progression: 45% ▓▓▓▓▓░░░░░          │  │
│  └──────────────────────────────────────┘  │
│                                             │
│  🔥 Recommandés pour toi                    │
│  [Mathématiques] [Physique] [...]          │
│                                             │
└─────────────────────────────────────────────┘
```

#### 3. **Bibliothèque de Sujets** (Filtres avancés)
- Recherche intelligente (Elasticsearch)
- Filtres multiples:
  - Examen (BAC, BEPC, Licence, Master...)
  - Année (2015-2026)
  - Matière
  - Université/Faculté
  - Difficulté (IA-évaluée)
- Vue: Grille / Liste / Timeline
- Téléchargement PDF avec watermark
- Favoris / Historique

#### 4. **Interface Quiz** (Mode Examen)
- Timer avec animations
- Progression visuelle
- Mode plein écran (distraction-free)
- Navigation question par question
- Sauvegarde automatique
- Correction instantanée avec explications détaillées
- Analyse de performance (temps, points faibles)

#### 5. **Profil & Statistiques**
- Graphiques de progression (radar, line, bar)
- Heatmap d'activité (style GitHub)
- Badges et achievements
- Classement (leaderboard)
- Historique complet
- Export PDF de résultats

---

## 🗄️ Modèle de Base de Données

### Schéma PostgreSQL (Relationnel)

```prisma
// Utilisateurs
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  phone           String?   @unique
  password        String    // bcrypt hash
  firstName       String
  lastName        String
  avatar          String?
  role            Role      @default(STUDENT)
  subscription    Subscription?
  progress        Progress[]
  quizAttempts    QuizAttempt[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

enum Role {
  STUDENT
  ADMIN
  MODERATOR
}

// Abonnement
model Subscription {
  id              String    @id @default(uuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id])
  plan            Plan
  status          SubscriptionStatus
  startDate       DateTime
  endDate         DateTime
  autoRenew       Boolean   @default(true)
  paymentMethod   PaymentMethod
  transactions    Transaction[]
}

enum Plan {
  FREE_TRIAL      // 7 jours gratuit
  MONTHLY         // Abonnement mensuel
  QUARTERLY       // 3 mois (-10%)
  YEARLY          // 12 mois (-30%)
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  PENDING
}

// Transactions Mobile Money
model Transaction {
  id              String    @id @default(uuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  amount          Float
  currency        String    @default("XOF")
  provider        MobileMoneyProvider
  transactionId   String    @unique // ID du provider
  phoneNumber     String
  status          TransactionStatus
  createdAt       DateTime  @default(now())
}

enum MobileMoneyProvider {
  MTN_MONEY
  MOOV_MONEY
  ORANGE_MONEY
}

enum TransactionStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

// Universités
model University {
  id              String    @id @default(uuid())
  name            String
  country         String
  city            String
  logo            String?
  faculties       Faculty[]
}

model Faculty {
  id              String    @id @default(uuid())
  universityId    String
  university      University @relation(fields: [universityId], references: [id])
  name            String
  exams           Exam[]
}

// Examens
model Exam {
  id              String    @id @default(uuid())
  title           String
  type            ExamType
  year            Int
  session         String?   // Normale, Rattrapage
  facultyId       String?
  faculty         Faculty?  @relation(fields: [facultyId], references: [id])
  subject         String    // Mathématiques, Physique...
  duration        Int       // minutes
  pdfUrl          String
  correctionUrl   String?
  questions       Question[]
  difficulty      Int       @default(3) // 1-5
  downloads       Int       @default(0)
  views           Int       @default(0)
  createdAt       DateTime  @default(now())
}

enum ExamType {
  BAC
  BEPC
  LICENCE
  MASTER
  CONCOURS
}

// Questions (MongoDB-style mais en PostgreSQL JSON)
model Question {
  id              String    @id @default(uuid())
  examId          String
  exam            Exam      @relation(fields: [examId], references: [id])
  content         String    @db.Text
  type            QuestionType
  options         Json?     // Pour QCM: ["A", "B", "C", "D"]
  correctAnswer   String
  explanation     String?   @db.Text
  points          Int       @default(1)
  order           Int
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
  ESSAY
}

// Quiz & Attempts
model Quiz {
  id              String    @id @default(uuid())
  title           String
  description     String?
  subject         String
  examType        ExamType
  timeLimit       Int       // minutes
  questions       Question[]
  attempts        QuizAttempt[]
  isPublic        Boolean   @default(true)
  createdAt       DateTime  @default(now())
}

model QuizAttempt {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  quizId          String
  score           Float
  timeSpent       Int       // seconds
  answers         Json      // {questionId: answer}
  completedAt     DateTime  @default(now())
}

// Progression
model Progress {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  subject         String
  examType        ExamType
  totalQuizzes    Int       @default(0)
  averageScore    Float     @default(0)
  totalTimeSpent  Int       @default(0)
  lastActivity    DateTime  @default(now())
}
```

---

## ⚙️ Fonctionnalités Détaillées

### 🔐 Authentification & Sécurité
- Inscription: Email + Téléphone (OTP via SMS)
- Login: Email/Téléphone + Mot de passe
- 2FA optionnel (Google Authenticator)
- OAuth2: Google, Facebook (future)
- Rate limiting (protection DDOS)
- CORS configuré
- Helmet.js (sécurité headers)
- Validation stricte (Zod/Joi)

### 💳 Système de Paiement
1. **Page Abonnement**
   - Plans affichés clairement
   - Calcul automatique prix avec réductions
   - Formulaire: Numéro téléphone + Provider
2. **Flow Paiement**
   ```
   User clique "S'abonner"
   → Affiche modal paiement
   → User sélectionne provider (MTN/Moov/Orange)
   → User entre numéro téléphone
   → Backend appelle API Mobile Money
   → User reçoit prompt sur téléphone
   → User confirme paiement
   → Webhook reçoit confirmation
   → Abonnement activé instantanément
   → Email/SMS confirmation envoyé
   ```
3. **Renouvellement automatique**
   - Cron job (tous les jours)
   - Vérifie abonnements expirant dans 3 jours
   - Envoie notification rappel
   - Tente renouvellement automatique

### 📚 Gestion de Contenu (Admin)
- Interface admin (React Admin / Refine)
- Upload PDF examens (drag & drop)
- OCR automatique pour extraire questions (Tesseract.js)
- Création quiz visuelle
- Modération contenu
- Analytics détaillées

### 🎯 Système de Quiz Intelligent
- Génération automatique quiz depuis sujets
- Algorithme adaptatif (plus difficile si succès)
- Mode chronométré / Mode entraînement
- Correction instantanée avec explications
- Statistiques détaillées par question
- Révision questions ratées

### 📊 Analytics & Gamification
- **Dashboard Progression**:
  - Graphiques temps réel
  - Comparaison avec moyenne
  - Prédiction score examen (ML)
- **Gamification**:
  - Points XP par quiz complété
  - Niveaux (Débutant → Expert)
  - Badges (Premier quiz, 10 jours consécutifs, etc.)
  - Classement hebdomadaire/mensuel
  - Challenges entre amis

### 🔔 Notifications
- Push notifications (Expo / FCM)
- Email notifications (Resend / SendGrid)
- SMS (Twilio / Africa's Talking)
- Types:
  - Rappel examen proche
  - Nouveau sujet disponible
  - Abonnement expire bientôt
  - Achievement débloqué
  - Classement mis à jour

### 🌐 Fonctionnalités Futures (v2)
- Mode hors-ligne complet
- Forum communautaire
- Sessions étude en groupe (WebRTC)
- IA assistant personnel (GPT-4)
- Génération questions par IA
- Cours vidéo
- Tutorat en ligne
- API publique pour développeurs

---

## 📁 Structure du Projet

```
pedja/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── strategies/
│   │   │   │   └── guards/
│   │   │   ├── users/
│   │   │   ├── exams/
│   │   │   ├── quizzes/
│   │   │   ├── subscriptions/
│   │   │   ├── payments/
│   │   │   ├── universities/
│   │   │   └── notifications/
│   │   ├── common/
│   │   │   ├── decorators/
│   │   │   ├── filters/
│   │   │   ├── guards/
│   │   │   ├── interceptors/
│   │   │   ├── pipes/
│   │   │   └── utils/
│   │   ├── config/
│   │   ├── database/
│   │   │   ├── prisma/
│   │   │   │   └── schema.prisma
│   │   │   └── migrations/
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   ├── docker-compose.yml
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── exams/
│   │   │   ├── quiz/
│   │   │   ├── profile/
│   │   │   ├── subscription/
│   │   │   └── layout.tsx
│   │   ├── landing/
│   │   ├── api/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/          # shadcn components
│   │   ├── dashboard/
│   │   ├── exams/
│   │   ├── quiz/
│   │   └── shared/
│   ├── lib/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── utils/
│   │   └── constants/
│   ├── public/
│   ├── styles/
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── mobile/
│   ├── app/
│   │   ├── (tabs)/
│   │   ├── (auth)/
│   │   └── _layout.tsx
│   ├── components/
│   ├── lib/
│   ├── assets/
│   ├── app.json
│   └── package.json
│
├── shared/              # Code partagé
│   ├── types/
│   ├── constants/
│   └── utils/
│
├── docs/
│   ├── API.md
│   ├── DEPLOYMENT.md
│   └── CONTRIBUTING.md
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml
│       ├── frontend-ci.yml
│       └── mobile-ci.yml
│
├── docker-compose.yml   # Dev environment
├── README.md
└── LICENSE
```

---

## 🚀 Feuille de Route (Roadmap)

### Phase 1: MVP (3 mois)
- ✅ Authentication système
- ✅ Base de données setup
- ✅ Upload et affichage sujets PDF
- ✅ Système quiz basique
- ✅ Paiement Mobile Money (un provider)
- ✅ Dashboard simple
- ✅ Application mobile basique

### Phase 2: Core Features (2 mois)
- ✅ Recherche avancée
- ✅ Statistiques et progression
- ✅ Notifications
- ✅ Mode hors-ligne mobile
- ✅ Gamification basique
- ✅ Interface admin

### Phase 3: Enhancement (2 mois)
- ✅ 3 providers Mobile Money
- ✅ IA recommandations
- ✅ Quiz adaptatif
- ✅ Classements
- ✅ Optimisations performance

### Phase 4: Scale (ongoing)
- ✅ Forum communautaire
- ✅ Cours vidéo
- ✅ Mode collaboration
- ✅ API publique
- ✅ Expansion régionale

---

## 💰 Modèle Économique

### Pricing (Exemple Afrique de l'Ouest)
- **Essai gratuit**: 7 jours (accès complet)
- **Mensuel**: 2,500 XOF (~4€)
- **Trimestriel**: 6,750 XOF (~10€) - économie 10%
- **Annuel**: 21,000 XOF (~32€) - économie 30%

### Revenus Additionnels
- Publicités (version gratuite limitée - future)
- Partenariats universités
- Contenu premium (cours vidéo)
- API B2B pour écoles

---

## 📈 KPIs à Suivre

### Acquisition
- Inscriptions / jour
- Taux de conversion essai → payant
- Coût acquisition client (CAC)
- Source de trafic

### Engagement
- DAU / MAU (Daily/Monthly Active Users)
- Temps moyen session
- Quiz complétés / user
- Taux de retention (D1, D7, D30)

### Revenus
- MRR (Monthly Recurring Revenue)
- Churn rate
- LTV (Lifetime Value)
- ARPU (Average Revenue Per User)

### Technique
- Temps de chargement pages
- Taux d'erreur API
- Uptime
- Taux de succès paiements

---

## 🔒 Conformité & Légal

- **RGPD**: Consentement explicite données
- **CGU/CGV**: Termes clairs abonnement
- **Politique remboursement**: 7 jours satisfait ou remboursé
- **Licence contenu**: Droits examens (domaine public si >70 ans)
- **Mentions légales**: Entreprise, contact, hébergeur
- **Protection données**: Encryption at rest & in transit
- **KYC Mobile Money**: Vérification identité si requis

---

## 🎯 Différenciateurs Clés

1. **Focus Afrique**: Intégration native Mobile Money
2. **Offline-First Mobile**: Étude sans connexion
3. **IA Adaptative**: Quiz personnalisés selon niveau
4. **Gamification Poussée**: Engagement maximal
5. **Interface Moderne**: UI/UX 2026, pas 2010
6. **Performance**: Chargement ultra-rapide
7. **Communauté**: Entraide entre étudiants
8. **Prix Accessible**: Moins cher qu'un cahier d'exercices

---

## 📞 Prochaines Étapes

1. **Valider le plan** avec les parties prenantes
2. **Étude de marché**: Interviews étudiants cibles
3. **Design Mockups**: Figma/Adobe XD (haute fidélité)
4. **Setup infrastructure**: Repos, CI/CD, environnements
5. **Sprint 0**: Architecture technique détaillée
6. **Développement MVP**: 3 mois de dev intensif
7. **Beta testing**: 50-100 étudiants pilotes
8. **Launch**: Marketing et acquisition

---

**Créé avec ❤️ pour révolutionner l'éducation en Afrique**
