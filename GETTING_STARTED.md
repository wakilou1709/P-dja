# 🚀 Pédja - Guide de Démarrage Rapide

## 📋 Checklist Avant de Commencer

### 1. Prérequis Système
- [ ] Node.js 20+ installé ([nodejs.org](https://nodejs.org))
- [ ] Git installé et configuré
- [ ] Docker & Docker Compose installés (recommandé)
- [ ] VS Code (ou IDE de votre choix)
- [ ] Terminal (bash/zsh)

### 2. Comptes à Créer (Gratuits pour commencer)
- [ ] GitHub account
- [ ] Vercel account (déploiement frontend)
- [ ] Railway account (backend) ou Render
- [ ] Supabase account (PostgreSQL)
- [ ] Cloudinary account (images/PDFs)
- [ ] Resend account (emails)

---

## ⚡ Démarrage Ultra-Rapide (5 minutes)

### Option 1: Avec Docker (Recommandé)

```bash
# 1. Cloner le projet
git clone https://github.com/votre-org/pedja.git
cd pedja

# 2. Créer fichier .env racine
cat > .env << EOF
DATABASE_URL=postgresql://pedja:pedja123@postgres:5432/pedja
REDIS_URL=redis://redis:6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
EOF

# 3. Démarrer tous les services
docker-compose up -d

# 4. Appliquer les migrations
docker-compose exec backend npm run prisma:migrate

# 5. Seed la base de données
docker-compose exec backend npm run seed

# ✅ C'est prêt!
# Backend: http://localhost:4000
# Frontend: http://localhost:3000
```

### Option 2: Sans Docker (Installation Manuelle)

#### Backend
```bash
# 1. Installer PostgreSQL et Redis localement
# Ubuntu/Debian:
sudo apt install postgresql redis-server

# macOS:
brew install postgresql redis

# 2. Créer la base de données
sudo -u postgres psql
CREATE DATABASE pedja;
CREATE USER pedja WITH PASSWORD 'pedja123';
GRANT ALL PRIVILEGES ON DATABASE pedja TO pedja;
\q

# 3. Setup backend
cd backend
npm install

# 4. Configurer .env
cat > .env << EOF
DATABASE_URL=postgresql://pedja:pedja123@localhost:5432/pedja
REDIS_URL=redis://localhost:6379
JWT_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
PORT=4000
NODE_ENV=development
EOF

# 5. Migrations et seed
npm run prisma:migrate
npm run prisma:generate
npm run seed

# 6. Démarrer le serveur
npm run dev
```

#### Frontend
```bash
# Dans un nouveau terminal
cd frontend
npm install

# Configurer .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Démarrer
npm run dev
```

#### Mobile
```bash
# Dans un nouveau terminal
cd mobile
npm install

# Démarrer Expo
npx expo start

# Scanner le QR code avec Expo Go app
```

---

## 📁 Initialiser les Dossiers du Projet

### Backend (NestJS)

```bash
cd backend

# Installer NestJS CLI globalement
npm i -g @nestjs/cli

# Créer le projet NestJS
nest new . --skip-git --package-manager npm

# Installer les dépendances
npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
npm install @prisma/client prisma
npm install @nestjs/config class-validator class-transformer
npm install redis ioredis
npm install @nestjs/graphql @nestjs/apollo @apollo/server graphql

# Dev dependencies
npm install -D @types/passport-jwt @types/bcrypt
npm install -D @types/node typescript ts-node

# Initialiser Prisma
npx prisma init
```

### Frontend (Next.js)

```bash
cd frontend

# Créer projet Next.js
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Installer dépendances UI
npm install @radix-ui/react-dropdown-menu @radix-ui/react-dialog
npm install @radix-ui/react-select @radix-ui/react-tabs
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react

# State management et data fetching
npm install zustand @tanstack/react-query axios

# Formulaires et validation
npm install react-hook-form zod @hookform/resolvers

# Animations
npm install framer-motion

# Installer shadcn/ui CLI
npx shadcn@latest init

# Ajouter composants shadcn de base
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
npx shadcn@latest add form
npx shadcn@latest add toast
```

### Mobile (React Native Expo)

```bash
cd mobile

# Créer projet Expo
npx create-expo-app@latest . --template tabs

# Installer dépendances
npm install @tanstack/react-query axios zustand
npm install @react-navigation/native @react-navigation/stack
npm install expo-secure-store expo-notifications
npm install @watermelondb/watermelondb
npm install react-native-safe-area-context
```

---

## 🗄️ Structure de la Base de Données

### Créer le schéma Prisma

Créer `backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Utilisateurs
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  phone         String?   @unique
  password      String
  firstName     String
  lastName      String
  avatar        String?
  role          Role      @default(STUDENT)
  isVerified    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  subscription  Subscription?
  quizAttempts  QuizAttempt[]
  progress      Progress[]
}

enum Role {
  STUDENT
  ADMIN
  MODERATOR
}

// Abonnements
model Subscription {
  id            String              @id @default(uuid())
  userId        String              @unique
  user          User                @relation(fields: [userId], references: [id])
  status        SubscriptionStatus  @default(PENDING)
  plan          Plan
  startDate     DateTime
  endDate       DateTime
  autoRenew     Boolean             @default(true)
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  transactions  Transaction[]
}

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  PENDING
}

enum Plan {
  FREE_TRIAL
  MONTHLY
  QUARTERLY
  YEARLY
}

// Transactions Mobile Money
model Transaction {
  id              String              @id @default(uuid())
  subscriptionId  String
  subscription    Subscription        @relation(fields: [subscriptionId], references: [id])
  amount          Float
  currency        String              @default("XOF")
  provider        PaymentProvider
  transactionId   String              @unique
  phoneNumber     String
  status          TransactionStatus
  metadata        Json?
  createdAt       DateTime            @default(now())
}

enum PaymentProvider {
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

// Examens
model Exam {
  id            String      @id @default(uuid())
  title         String
  type          ExamType
  year          Int
  subject       String
  pdfUrl        String
  correctionUrl String?
  difficulty    Int         @default(3)
  views         Int         @default(0)
  downloads     Int         @default(0)
  createdAt     DateTime    @default(now())

  questions     Question[]
}

enum ExamType {
  BAC
  BEPC
  LICENCE
  MASTER
  CONCOURS
}

// Questions
model Question {
  id              String        @id @default(uuid())
  examId          String
  exam            Exam          @relation(fields: [examId], references: [id])
  content         String        @db.Text
  type            QuestionType
  options         Json?
  correctAnswer   String
  explanation     String?       @db.Text
  points          Int           @default(1)
  order           Int
}

enum QuestionType {
  MULTIPLE_CHOICE
  TRUE_FALSE
  SHORT_ANSWER
}

// Quiz
model Quiz {
  id            String    @id @default(uuid())
  title         String
  subject       String
  timeLimit     Int
  createdAt     DateTime  @default(now())

  attempts      QuizAttempt[]
}

// Tentatives de Quiz
model QuizAttempt {
  id            String    @id @default(uuid())
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  quizId        String
  score         Float
  timeSpent     Int
  answers       Json
  completedAt   DateTime  @default(now())
}

// Progression
model Progress {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  subject         String
  totalQuizzes    Int       @default(0)
  averageScore    Float     @default(0)
  lastActivity    DateTime  @default(now())

  @@unique([userId, subject])
}
```

### Appliquer les migrations

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

---

## 🔑 Fichiers de Configuration Essentiels

### docker-compose.yml (Racine du projet)

```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:16-alpine
    container_name: pedja_postgres
    environment:
      POSTGRES_DB: pedja
      POSTGRES_USER: pedja
      POSTGRES_PASSWORD: pedja123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - pedja_network

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: pedja_redis
    ports:
      - "6379:6379"
    networks:
      - pedja_network

  # Backend API
  backend:
    build: ./backend
    container_name: pedja_backend
    depends_on:
      - postgres
      - redis
    environment:
      DATABASE_URL: postgresql://pedja:pedja123@postgres:5432/pedja
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      PORT: 4000
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    networks:
      - pedja_network
    command: npm run dev

  # Frontend Web
  frontend:
    build: ./frontend
    container_name: pedja_frontend
    depends_on:
      - backend
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    networks:
      - pedja_network
    command: npm run dev

volumes:
  postgres_data:

networks:
  pedja_network:
    driver: bridge
```

### backend/Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 4000

CMD ["npm", "run", "dev"]
```

### frontend/Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
```

---

## 🎨 Configurer le Design System

### frontend/tailwind.config.ts

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#faf5ff",
          100: "#f3e8ff",
          200: "#e9d5ff",
          300: "#d8b4fe",
          400: "#c084fc",
          500: "#8b5cf6", // Main
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        secondary: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4", // Main
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

---

## 🧪 Tester Rapidement

### Backend: Test l'API

```bash
# Démarrer le backend
cd backend && npm run dev

# Dans un autre terminal, tester
curl http://localhost:4000/health

# Devrait retourner: {"status":"ok"}
```

### Frontend: Ouvrir le navigateur

```bash
cd frontend && npm run dev
# Ouvrir http://localhost:3000
```

### Mobile: Scanner le QR code

```bash
cd mobile && npx expo start
# Scanner avec Expo Go app (iOS/Android)
```

---

## 📚 Ressources Utiles

### Documentation Officielle
- **NestJS**: https://docs.nestjs.com
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **Expo**: https://docs.expo.dev
- **Tailwind**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com

### Tutoriels Recommandés
- NestJS Crash Course: https://www.youtube.com/watch?v=GHTA143_b-s
- Next.js 15 Tutorial: https://www.youtube.com/watch?v=ZVnjOPwW4ZA
- Prisma Full Course: https://www.youtube.com/watch?v=RebA5J-rlwg
- React Native Expo: https://www.youtube.com/watch?v=ANdSdIlgsEw

### Communities
- Discord NestJS: https://discord.gg/nestjs
- Discord Next.js: https://discord.gg/nextjs
- Discord Expo: https://discord.gg/expo

---

## 🐛 Troubleshooting Commun

### Problème: Port déjà utilisé
```bash
# Trouver et tuer le processus
lsof -ti:4000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

### Problème: Prisma Client non généré
```bash
cd backend
npx prisma generate
```

### Problème: Docker ne démarre pas
```bash
# Nettoyer et redémarrer
docker-compose down -v
docker-compose up --build
```

### Problème: npm install échoue
```bash
# Nettoyer cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## ✅ Checklist Post-Installation

- [ ] Backend démarre sans erreur sur :4000
- [ ] Frontend accessible sur :3000
- [ ] Base de données connectée (Prisma Studio: `npx prisma studio`)
- [ ] Redis fonctionne (test ping)
- [ ] Mobile app ouvre sur Expo Go
- [ ] Git repo initialisé et premier commit fait
- [ ] .env ignoré dans .gitignore
- [ ] Documentation lue (PLAN_ARCHITECTURE.md)

---

## 🚀 Prochaines Étapes

1. ✅ Lire le [Plan d'Architecture](./PLAN_ARCHITECTURE.md)
2. ✅ Créer les mockups Figma (UI/UX)
3. ✅ Implémenter l'authentification (JWT)
4. ✅ Créer les premiers endpoints API
5. ✅ Design des composants UI (shadcn)
6. ✅ Intégrer Mobile Money (sandbox)
7. ✅ Tests unitaires
8. ✅ Deploy staging

---

**Bon développement! 🎓💻**

_Pour toute question, consultez la documentation ou ouvrez une issue sur GitHub._
