# 🛠️ Pédja - Stack Technique Détaillée

## 📦 Technologies Choisies & Justifications

### Backend

#### Framework: NestJS
**Choix:** NestJS avec TypeScript
**Pourquoi:**
- ✅ Architecture modulaire et scalable (microservices-ready)
- ✅ TypeScript natif (type-safety, meilleur DX)
- ✅ Patterns enterprise (DI, Guards, Interceptors, Pipes)
- ✅ Excellent pour équipes (structure claire)
- ✅ GraphQL + REST support natif
- ✅ Testing intégré (Jest)
- ✅ Large écosystème (Passport, Prisma, etc.)

**Alternatives considérées:**
- Express.js: ❌ Trop basique, pas de structure
- Fastify: ❌ Moins de structure que NestJS
- Django (Python): ❌ Moins adapté temps réel
- Laravel (PHP): ❌ Stack JS/TS préférée pour full-stack

#### ORM: Prisma
**Choix:** Prisma ORM
**Pourquoi:**
- ✅ Type-safety automatique (TypeScript)
- ✅ Migrations simples et fiables
- ✅ Prisma Studio (GUI base de données)
- ✅ Performance excellente (query optimization)
- ✅ Support PostgreSQL avancé (JSON, full-text search)
- ✅ Developer experience incomparable

**Alternatives:**
- TypeORM: ❌ Bugs fréquents, moins maintenu
- Sequelize: ❌ Pas type-safe
- Drizzle: ⚠️ Trop récent, moins mature

#### Base de Données

**Principale: PostgreSQL 16**
**Pourquoi:**
- ✅ ACID compliance (data integrity)
- ✅ JSON/JSONB support (flexibilité)
- ✅ Full-text search natif
- ✅ Performance excellente
- ✅ Extensions puissantes (PostGIS, pg_trgm)
- ✅ Open-source, pas de vendor lock-in

**Cache: Redis 7**
**Pourquoi:**
- ✅ Ultra-rapide (in-memory)
- ✅ Sessions utilisateurs
- ✅ Rate limiting
- ✅ Cache queries fréquentes
- ✅ Pub/Sub pour temps réel

**Recherche: Elasticsearch (Phase 2)**
**Pourquoi:**
- ✅ Full-text search ultra-performant
- ✅ Facettes et filtres complexes
- ✅ Typo-tolerance
- ✅ Scoring et pertinence

#### Authentification
**Stack:**
- **Passport.js** (stratégies multiples)
- **JWT** (access tokens - 15min)
- **Refresh Tokens** (7 jours, rotation)
- **Bcrypt** (hash passwords - cost 12)
- **Argon2** (alternative future)

**Flow:**
```
1. Login → JWT (15min) + Refresh Token (7j)
2. Request → JWT dans Authorization header
3. JWT expire → Utilise Refresh Token
4. Refresh Token expire → Re-login
```

#### Storage & CDN
**Choix:** AWS S3 + CloudFront
**Pourquoi:**
- ✅ Scalabilité illimitée
- ✅ Prix très compétitif
- ✅ Durabilité 99.999999999%
- ✅ CDN global (latence faible)

**Alternative:** Cloudinary
- ✅ Meilleur pour images (transformations)
- ⚠️ Plus cher pour PDFs

---

### Frontend Web

#### Framework: Next.js 15
**Choix:** Next.js (React) avec App Router
**Pourquoi:**
- ✅ SSR/SSG pour SEO optimal
- ✅ Server Components (performance)
- ✅ File-based routing intuitif
- ✅ API Routes intégrées
- ✅ Image optimization automatique
- ✅ Vercel deployment (1-click)
- ✅ Best-in-class developer experience

**Alternatives:**
- Create React App: ❌ Obsolète, pas SSR
- Remix: ⚠️ Bon mais écosystème plus petit
- Vite + React: ❌ Pas de SSR simple
- SvelteKit: ❌ Moins d'emplois/ressources

#### Styling: Tailwind CSS
**Choix:** Tailwind CSS v4
**Pourquoi:**
- ✅ Utility-first ultra-rapide
- ✅ Zero runtime (compiled)
- ✅ Design system cohérent
- ✅ Dark mode simple
- ✅ Responsive facile
- ✅ Très populaire (hiring facile)

**Compléments:**
- **shadcn/ui**: Composants réutilisables (pas library)
- **Radix UI**: Primitives accessibles
- **CVA**: Class variance authority (variants)

#### Animations: Framer Motion
**Choix:** Framer Motion
**Pourquoi:**
- ✅ API déclarative simple
- ✅ Performance 60fps
- ✅ Gestures et drag
- ✅ Layout animations magiques
- ✅ Variants système

**Alternative:** GSAP
- ⚠️ Plus puissant mais complexe
- ⚠️ Payant pour certaines features

#### State Management
**Choix:** Zustand + React Query
**Pourquoi Zustand:**
- ✅ Ultra-léger (1kb)
- ✅ API simple et intuitive
- ✅ Pas de boilerplate
- ✅ DevTools support
- ✅ Middleware (persist, immer)

**Pourquoi React Query:**
- ✅ Server state management parfait
- ✅ Cache intelligent
- ✅ Optimistic updates
- ✅ Retry et polling automatique
- ✅ DevTools puissants

**Alternatives rejetées:**
- Redux Toolkit: ❌ Trop lourd et verbeux
- Recoil: ❌ Moins mature
- Jotai: ⚠️ Bon mais moins populaire

#### Forms: React Hook Form + Zod
**Pourquoi:**
- ✅ Performance (uncontrolled)
- ✅ Zod integration (type-safe validation)
- ✅ Petite taille bundle
- ✅ DevTools

---

### Mobile

#### Framework: React Native (Expo)
**Choix:** Expo (managed workflow)
**Pourquoi:**
- ✅ Setup instantané (0 config)
- ✅ OTA updates (pas d'attente stores)
- ✅ EAS Build (CI/CD cloud)
- ✅ Expo Router (navigation moderne)
- ✅ Plugins qualité (camera, notifs, etc.)
- ✅ Code partagé avec web (logique)

**Alternatives:**
- React Native CLI: ❌ Plus complexe, moins rapide
- Flutter: ⚠️ Bon mais stack différente (Dart)
- Ionic: ❌ WebView, pas natif

#### Navigation: Expo Router
**Pourquoi:**
- ✅ File-based (comme Next.js)
- ✅ Deep linking automatique
- ✅ TypeScript support
- ✅ Layouts partagés

#### Offline: WatermelonDB
**Pourquoi:**
- ✅ Optimisé React Native
- ✅ Lazy loading
- ✅ Sync intelligent
- ✅ Performance native (SQLite)

---

### Paiement Mobile Money

#### Intégrations
**Providers:**
1. **MTN Mobile Money**
   - API: MTN Open API
   - Sandbox: Oui
   - Webhook: Oui

2. **Moov Money**
   - API: Moov Africa API
   - Documentation: Limitée

3. **Orange Money**
   - API: Orange Developer API
   - OAuth2

**Gateway Unifié:** CinetPay / FedaPay
**Pourquoi:**
- ✅ Une intégration = tous providers
- ✅ Gestion des échecs
- ✅ Dashboard analytics
- ⚠️ Frais supplémentaires (1-2%)

**Alternative:** Intégrations directes
- ✅ Moins de frais
- ❌ Maintenance complexe

---

### Infrastructure & DevOps

#### Hosting

**Backend: Railway**
**Pourquoi:**
- ✅ Deploy depuis Git (auto)
- ✅ PostgreSQL + Redis inclus
- ✅ Prix raisonnable ($5-20/mois)
- ✅ Scaling automatique
- ✅ Logs et metrics

**Alternatives:**
- Render: ✅ Similaire, bon choix aussi
- AWS ECS: ❌ Trop complexe pour MVP
- Heroku: ⚠️ Plus cher, moins features

**Frontend: Vercel**
**Pourquoi:**
- ✅ Next.js creators (perfect fit)
- ✅ Deploy auto sur push
- ✅ Edge Network global
- ✅ Analytics intégrées
- ✅ Free tier généreux

**Alternative:** Netlify
- ✅ Bon aussi mais moins Next.js focus

#### CI/CD: GitHub Actions
**Pourquoi:**
- ✅ Gratuit pour open-source
- ✅ 2,000 minutes/mois (private)
- ✅ Intégration GitHub native
- ✅ Matrix builds (test multi-env)

**Workflows:**
- PR: Lint + Tests + Build
- Main: Deploy auto staging
- Tag: Deploy production

#### Containerization: Docker
**Pourquoi:**
- ✅ Environnements reproductibles
- ✅ Dev = Prod (parity)
- ✅ Docker Compose (local dev)
- ✅ Facilite deployment

---

### Monitoring & Analytics

#### Erreurs: Sentry
**Pourquoi:**
- ✅ Source maps support
- ✅ Release tracking
- ✅ User feedback
- ✅ Performance monitoring
- ✅ Free tier: 5k events/mois

#### Analytics: PostHog
**Pourquoi:**
- ✅ Open-source (self-host possible)
- ✅ Product analytics + Feature flags
- ✅ Session replay
- ✅ Heatmaps
- ✅ GDPR compliant

**Alternative:** Mixpanel
- ⚠️ Plus cher
- ✅ UI/UX légèrement meilleure

#### APM: (Future - Phase 2)
- New Relic / DataDog
- Pour monitoring performance avancé

---

### Email & SMS

#### Email: Resend
**Pourquoi:**
- ✅ Developer-first (excellent DX)
- ✅ React Email templates
- ✅ Prix très compétitif
- ✅ Analytics
- ✅ Free: 3,000 emails/mois

**Alternative:** SendGrid
- ✅ Mature, fiable
- ❌ UI plus complexe

#### SMS: Twilio / Africa's Talking
**Pourquoi Africa's Talking:**
- ✅ Spécialisé Afrique
- ✅ Prix très compétitifs
- ✅ Support local
- ✅ SMS + Voice + USSD

---

### Testing

#### Backend
- **Unit:** Jest
- **Integration:** Supertest
- **E2E:** Jest + Supertest
- **Coverage:** 80%+ target

#### Frontend
- **Unit:** Vitest (plus rapide que Jest)
- **Components:** Testing Library
- **E2E:** Playwright
- **Visual:** Chromatic (Storybook)

#### Mobile
- **Unit:** Jest
- **Integration:** Detox
- **Manual:** TestFlight (iOS) / Internal Testing (Android)

---

### Security

#### Mesures Implémentées
- ✅ Helmet.js (security headers)
- ✅ CORS configuré strictement
- ✅ Rate limiting (Redis)
- ✅ SQL injection prevention (Prisma)
- ✅ XSS prevention (sanitization)
- ✅ CSRF tokens
- ✅ Secrets dans .env (jamais commit)
- ✅ HTTPS only
- ✅ JWT rotation
- ✅ Password strength validation
- ✅ 2FA (future)

#### Compliance
- GDPR: Consentement + Droit à l'oubli
- Data encryption: At rest (DB) + In transit (TLS)
- Audit logs: Actions sensibles
- Backups: Quotidiens (30 jours retention)

---

### Performance Optimizations

#### Backend
- Connection pooling (Prisma)
- Redis caching (hot data)
- Query optimization (indexes)
- Pagination (limit/offset)
- CDN pour assets statiques
- Compression (gzip/brotli)

#### Frontend
- Code splitting (dynamic imports)
- Image optimization (next/image)
- Font optimization (next/font)
- Lazy loading components
- Service Worker (offline)
- Bundle analyzer

#### Mobile
- Hermes engine (React Native)
- Image caching (react-native-fast-image)
- FlatList optimization (windowing)
- Memoization (useMemo, useCallback)

---

### Development Tools

#### IDE: VS Code
**Extensions essentielles:**
- ESLint + Prettier
- Prisma
- Tailwind CSS IntelliSense
- GitLens
- Thunder Client (API testing)
- Error Lens

#### API Testing
- Thunder Client (VS Code)
- Postman (équipe)
- Insomnia (alternative)

#### Design
- Figma (UI/UX design)
- Excalidraw (diagrammes)
- Penpot (alternative open-source)

#### Documentation
- Swagger/OpenAPI (REST)
- GraphQL Playground
- Storybook (composants)
- Docusaurus (docs site)

---

### Version Control & Collaboration

#### Git Strategy
- **Branching:** Git Flow
  - `main`: Production
  - `develop`: Staging
  - `feature/*`: Nouvelles features
  - `hotfix/*`: Bugs urgents

#### Conventional Commits
```
feat: add quiz timer
fix: resolve payment webhook
docs: update README
chore: upgrade dependencies
```

#### Code Review
- Minimum 1 approval
- Automated tests passing
- No merge conflicts
- Squash and merge

---

### Environnements

#### Local Development
```env
DATABASE_URL=postgresql://localhost:5432/pedja_dev
REDIS_URL=redis://localhost:6379
NODE_ENV=development
```

#### Staging
```env
DATABASE_URL=postgresql://staging.db/pedja
REDIS_URL=redis://staging.cache/pedja
NODE_ENV=staging
```

#### Production
```env
DATABASE_URL=postgresql://prod.db/pedja (encrypted)
REDIS_URL=redis://prod.cache/pedja (encrypted)
NODE_ENV=production
```

---

### Coûts Mensuels (Détaillés)

| Service | Free Tier | Paid (MVP) | Paid (Scale) |
|---------|-----------|------------|--------------|
| **Railway** (Backend) | $5 | $20 | $50-200 |
| **Vercel** (Frontend) | ✅ | $20 | $20 |
| **Supabase** (PostgreSQL) | 500MB | $25 | $50 |
| **Upstash** (Redis) | ✅ 10k req | $0 | $10 |
| **AWS S3** | 5GB | $5 | $20 |
| **Cloudflare** | ✅ | $20 | $20 |
| **Sentry** | 5k events | $0 | $26 |
| **PostHog** | 1M events | $0 | $20 |
| **Resend** | 3k emails | $0 | $20 |
| **Africa's Talking** | - | $30 | $100 |
| **GitHub** | ✅ | $0 | $0 |
| **Total** | **~$65** | **~$140** | **~$516** |

---

### Roadmap Technique

#### Phase 1: MVP (Mois 1-3)
- ✅ Setup infrastructure (Docker, DB, CI/CD)
- ✅ Auth complet (JWT, OAuth)
- ✅ CRUD examens et quiz
- ✅ Paiement Mobile Money (1 provider)
- ✅ Dashboard basique
- ✅ Mobile app (iOS + Android)

#### Phase 2: Features (Mois 4-6)
- ✅ Elasticsearch (recherche avancée)
- ✅ Gamification (badges, leaderboard)
- ✅ Notifications push
- ✅ Mode offline mobile
- ✅ Analytics avancées
- ✅ 3 providers Mobile Money

#### Phase 3: Scale (Mois 7-12)
- ✅ Microservices (si besoin)
- ✅ GraphQL subscriptions (real-time)
- ✅ ML recommendations
- ✅ CDN global
- ✅ Performance optimizations
- ✅ Load balancing

#### Phase 4: Advanced (An 2+)
- ✅ IA question generation (GPT-4)
- ✅ Video streaming (cours)
- ✅ WebRTC (sessions groupe)
- ✅ Mobile app native (Swift/Kotlin si besoin)
- ✅ White-label B2B

---

**Stack validé et prêt pour développement** 🚀

_Dernière mise à jour: Février 2026_
