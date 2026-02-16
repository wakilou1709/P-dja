# 🚀 Guide de Démarrage Rapide - Pédja

## ✅ Ce qui a été créé

Le setup complet est maintenant en place :

### Backend (NestJS + Prisma + PostgreSQL)
- ✅ 30+ fichiers backend créés
- ✅ Authentification JWT complète
- ✅ Modules : Auth, Users, Exams, Health
- ✅ Prisma schema avec 15 modèles
- ✅ Seed file avec données de test

### Frontend (Next.js + Tailwind)
- ✅ 35+ fichiers frontend créés
- ✅ Landing page moderne
- ✅ Pages auth (login/register)
- ✅ Dashboard avec sidebar
- ✅ Pages : Dashboard, Examens, Quiz, Profil

### Mobile (React Native Expo)
- ✅ 20+ fichiers mobile créés
- ✅ Écran welcome
- ✅ Auth screens (login/register)
- ✅ Navigation tabs (Dashboard, Examens, Profil)

### Infrastructure
- ✅ Docker Compose (PostgreSQL + Redis)
- ✅ Variables d'environnement configurées
- ✅ Secrets JWT générés automatiquement

## 📦 Installation des dépendances

### 1. Dépendances racine

```bash
npm install
```

### 2. Backend

```bash
cd backend
npm install
cd ..
```

### 3. Frontend

```bash
cd frontend
npm install
cd ..
```

### 4. Mobile (optionnel)

```bash
cd mobile
npm install
cd ..
```

## 🐳 Démarrer Docker

```bash
# Démarrer PostgreSQL et Redis
npm run docker:up

# Vérifier que les containers tournent
docker ps
```

Vous devriez voir :
- `pedja_postgres` (PostgreSQL 16)
- `pedja_redis` (Redis 7)

## 🗄️ Initialiser la base de données

```bash
cd backend

# Exécuter les migrations Prisma
npx prisma migrate dev --name init

# Générer le client Prisma
npx prisma generate

# Insérer les données de test
npx prisma db seed

cd ..
```

Cela va créer :
- 1 admin (admin@pedja.app)
- 3 étudiants
- 10 examens (BAC, BEPC, etc.)
- 8 questions
- 2 quiz
- 3 achievements

## 🎬 Lancer l'application

### Option 1 : Tout en même temps

```bash
npm run dev
```

Cela démarre :
- ✅ Backend sur http://localhost:4000
- ✅ Frontend sur http://localhost:3000

### Option 2 : Séparément

**Backend uniquement :**
```bash
npm run dev:backend
```

**Frontend uniquement :**
```bash
npm run dev:frontend
```

**Mobile (Expo) :**
```bash
npm run dev:mobile
# Scanner le QR code avec Expo Go sur votre téléphone
```

## 🧪 Tester l'application

### 1. Vérifier le backend

```bash
# Health check
curl http://localhost:4000/api/health

# Devrait retourner:
# {"status":"ok","timestamp":"...","uptime":...}
```

### 2. Swagger API Documentation

Ouvrir dans le navigateur :
```
http://localhost:4000/api/docs
```

Vous verrez toute la documentation Swagger avec tous les endpoints.

### 3. Frontend Web

1. Ouvrir http://localhost:3000
2. Cliquer sur "Commencer" ou "Connexion"
3. Se connecter avec :
   - **Email :** `admin@pedja.app`
   - **Password :** `Password123!`
4. Explorer le dashboard

### 4. Prisma Studio (Visualiser la DB)

```bash
cd backend
npx prisma studio
```

Ouvre http://localhost:5555 - Interface graphique pour voir/éditer les données.

## 👥 Comptes de test

Tous les comptes ont le mot de passe : `Password123!`

**Admin :**
- Email: `admin@pedja.app`
- Role: ADMIN

**Étudiants :**
- Email: `marie.kouame@example.com`
- Email: `jean.traore@example.com`
- Email: `aissatou.diallo@example.com`

## 📊 Données de test disponibles

Le seed a créé :

- **10 examens** : BAC Maths, Physique, Philo, BEPC, etc.
- **8 questions** : Questions à choix multiples avec explications
- **2 quiz** : Quiz de mathématiques
- **3 achievements** : Badges à débloquer

## 🔍 Vérifications rapides

### Backend fonctionne ?

```bash
# Test 1: Health check
curl http://localhost:4000/api/health

# Test 2: Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pedja.app","password":"Password123!"}'

# Test 3: Get exams
curl http://localhost:4000/api/exams
```

### Frontend fonctionne ?

1. Ouvrir http://localhost:3000
2. La landing page doit s'afficher
3. Cliquer sur "Connexion"
4. Se connecter avec admin@pedja.app
5. Le dashboard doit s'afficher

### Docker tourne ?

```bash
docker ps

# Devrait afficher:
# pedja_postgres
# pedja_redis
```

## 🐛 Résolution de problèmes

### Port déjà utilisé (EADDRINUSE)

**Backend (port 4000) :**
```bash
lsof -i :4000
kill -9 <PID>
```

**Frontend (port 3000) :**
```bash
lsof -i :3000
kill -9 <PID>
```

### PostgreSQL ne démarre pas

```bash
# Arrêter et redémarrer Docker
npm run docker:down
npm run docker:up

# Vérifier les logs
npm run docker:logs
```

### Erreur Prisma "Environment variable not found"

Vérifier que le fichier `.env` existe à la racine et contient :
```
DATABASE_URL=postgresql://pedja:pedja_secret@localhost:5432/pedja_db?schema=public
```

### Erreur "Cannot find module"

```bash
# Réinstaller les dépendances
cd backend
rm -rf node_modules package-lock.json
npm install

cd ../frontend
rm -rf node_modules package-lock.json
npm install
```

### Migration Prisma échoue

```bash
cd backend

# Reset complet (⚠️ supprime toutes les données)
npx prisma migrate reset

# Puis refaire :
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
```

## 📝 Scripts utiles

```bash
# Voir les logs Docker
npm run docker:logs

# Arrêter Docker
npm run docker:down

# Redémarrer Docker
npm run docker:restart

# Ouvrir Prisma Studio
npm run prisma:studio

# Re-seed la base
npm run prisma:seed
```

## 🎯 Prochaines étapes

Une fois que tout fonctionne :

1. **Explorer l'API** - Tester les endpoints avec Swagger
2. **Modifier le code** - Le backend/frontend se rechargent automatiquement
3. **Ajouter des features** - Suivre la roadmap dans ROADMAP.md
4. **Lire la doc** - Consulter PLAN_ARCHITECTURE.md pour comprendre l'archi

## ✅ Checklist finale

- [ ] Docker tourne (`docker ps` montre postgres et redis)
- [ ] Backend installé (`cd backend && npm list`)
- [ ] Frontend installé (`cd frontend && npm list`)
- [ ] Base de données migrée (`npx prisma studio` fonctionne)
- [ ] Seed exécuté (10 examens visibles dans Prisma Studio)
- [ ] Backend démarre (`npm run dev:backend`)
- [ ] Frontend démarre (`npm run dev:frontend`)
- [ ] Login fonctionne (connexion avec admin@pedja.app)
- [ ] Dashboard s'affiche après login

## 🎉 Vous êtes prêt !

Si toutes les étapes ont fonctionné :
- ✅ Backend API tourne sur http://localhost:4000
- ✅ Frontend Web tourne sur http://localhost:3000
- ✅ Base de données PostgreSQL opérationnelle
- ✅ 10 examens et données de test disponibles

**Bon développement ! 🚀**
