# 🎓 Pédja - Plateforme de Préparation aux Examens

> Révolutionner l'éducation en Afrique grâce à une plateforme moderne de préparation aux examens

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 🚀 À Propos

**Pédja** est une application web et mobile qui permet aux étudiants et élèves de se préparer efficacement aux examens nationaux et universitaires à travers :

- 📚 **Bibliothèque de sujets** - Examens des années antérieures classés par année, type, université et faculté
- 🎯 **Quiz interactifs** - Entraînement avec correction instantanée et explications détaillées
- 📊 **Suivi de progression** - Statistiques avancées et recommandations personnalisées
- 🏆 **Gamification** - Badges, classements et challenges pour rester motivé
- 💳 **Paiement Mobile Money** - Abonnement mensuel simple via MTN, Moov, Orange

## 🛠️ Stack Technique

### Backend
- **NestJS** (Node.js + TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Redis** (cache)
- **JWT Authentication**
- **GraphQL** + **REST API**

### Frontend Web
- **Next.js 15** (React)
- **Tailwind CSS** + **shadcn/ui**
- **Framer Motion** (animations)
- **React Query** (state management)

### Mobile
- **React Native** (Expo)
- **Expo Router**
- **WatermelonDB** (offline-first)

### Infrastructure
- **Docker** + **Docker Compose**
- **GitHub Actions** (CI/CD)
- **Vercel** (frontend hosting)
- **Railway** (backend hosting)

## 📁 Structure du Projet

```
pedja/
├── backend/          # API NestJS
├── frontend/         # Application web Next.js
├── mobile/           # Application mobile React Native
├── shared/           # Code partagé (types, utils)
└── docs/             # Documentation
```

## 🚦 Démarrage Rapide

### Prérequis
- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker (optionnel mais recommandé)

### Installation

1. **Cloner le projet**
```bash
git clone https://github.com/votre-org/pedja.git
cd pedja
```

2. **Avec Docker (recommandé)**
```bash
docker-compose up -d
```

3. **Sans Docker**

**Backend**
```bash
cd backend
npm install
cp .env.example .env
# Configurer les variables d'environnement
npm run prisma:migrate
npm run seed
npm run dev
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

**Mobile**
```bash
cd mobile
npm install
npx expo start
```

## 🌐 URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Docs**: http://localhost:4000/api/docs
- **GraphQL Playground**: http://localhost:4000/graphql

## 📚 Documentation

- [Plan d'Architecture](./PLAN_ARCHITECTURE.md) - Architecture complète et roadmap
- [API Documentation](./docs/API.md) - Endpoints et schémas
- [Guide de Déploiement](./docs/DEPLOYMENT.md) - Instructions de déploiement
- [Guide de Contribution](./docs/CONTRIBUTING.md) - Comment contribuer

## 🎯 Roadmap

### Phase 1: MVP (3 mois) - En cours
- [x] Architecture et setup initial
- [ ] Système d'authentification
- [ ] Upload et affichage de sujets
- [ ] Quiz basique
- [ ] Paiement Mobile Money
- [ ] Application mobile de base

### Phase 2: Core Features (2 mois)
- [ ] Recherche avancée
- [ ] Statistiques et progression
- [ ] Notifications push
- [ ] Mode hors-ligne
- [ ] Interface admin

### Phase 3: Enhancement (2 mois)
- [ ] Gamification complète
- [ ] IA recommandations
- [ ] Quiz adaptatif
- [ ] Optimisations performance

## 💡 Contribuer

Les contributions sont les bienvenues ! Consultez [CONTRIBUTING.md](./docs/CONTRIBUTING.md) pour les guidelines.

1. Fork le projet
2. Créer une branche (`git checkout -b feature/amazing-feature`)
3. Commit vos changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📝 License

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus d'informations.

## 👥 Équipe

- **Votre Nom** - _Fondateur & Lead Developer_ - [@votre-github](https://github.com/votre-github)

## 🙏 Remerciements

- Tous les étudiants qui ont partagé leurs retours
- La communauté open-source
- Nos beta testeurs

## 📧 Contact

Pour toute question ou suggestion :
- Email: contact@pedja.app
- Twitter: [@pedja_app](https://twitter.com/pedja_app)
- Discord: [Rejoindre notre communauté](https://discord.gg/pedja)

---

**Fait avec ❤️ pour les étudiants d'Afrique**
