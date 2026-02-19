# 🚀 Démarrage Rapide - Panneau Admin Pédja

## Problème Actuel

Les routes admin retournent des erreurs 404 car le backend doit être redémarré avec les nouveaux modules admin.

## ✅ Solution en 3 Étapes

### Étape 1 : Démarrer le Backend

Ouvrez un **nouveau terminal** et exécutez :

```bash
cd /home/dao-wakilou/Documents/Pédja/backend
./start-backend.sh
```

OU directement :

```bash
cd /home/dao-wakilou/Documents/Pédja/backend
npm run start:dev
```

**Attendez** de voir ce message :
```
🚀 Pédja Backend API is running!

📡 URL: http://localhost:4000/api
📚 Swagger Docs: http://localhost:4000/api/docs
```

⚠️ **Note** : Ignorez les warnings sur bcrypt/node-pre-gyp - ils n'empêchent pas le fonctionnement.

### Étape 2 : Vérifier que le Backend Fonctionne

Dans un autre terminal :

```bash
curl http://localhost:4000/api/health
```

Vous devriez voir :
```json
{"status":"ok","timestamp":"..."}
```

### Étape 3 : Tester une Route Admin

```bash
# Récupérer votre token JWT (connectez-vous d'abord sur le frontend)
curl -H "Authorization: Bearer VOTRE_TOKEN" http://localhost:4000/api/admin/analytics/dashboard
```

## 🌐 Accès au Panneau Admin

1. **Frontend** : http://localhost:3000
2. **Login** avec admin@pedja.com / Admin@123
3. Cliquez sur **"Panneau Admin"** dans la sidebar (bouton violet)
4. Accès direct : http://localhost:3000/admin/dashboard

## 📊 Routes Admin Disponibles

| Endpoint | Description |
|----------|-------------|
| `/api/admin/users` | Gestion utilisateurs |
| `/api/admin/users/stats` | Stats utilisateurs |
| `/api/admin/exams` | Gestion examens |
| `/api/admin/exams/stats` | Stats examens |
| `/api/admin/finance/subscriptions` | Abonnements |
| `/api/admin/finance/transactions` | Transactions |
| `/api/admin/finance/stats` | Stats finance |
| `/api/admin/analytics/dashboard` | Dashboard KPIs |
| `/api/admin/analytics/user-growth` | Croissance users |
| `/api/admin/analytics/revenue-chart` | Chart revenue |

## 🔍 Debug

### Backend ne démarre pas ?

```bash
# Vérifier les processus sur le port 4000
lsof -i :4000

# Tuer si nécessaire
kill -9 $(lsof -ti:4000)

# Redémarrer
cd /home/dao-wakilou/Documents/Pédja/backend
npm run start:dev
```

### Erreurs 404 persistent ?

1. Vérifiez que le backend est bien démarré
2. Vérifiez les logs du backend pour des erreurs
3. Ouvrez Swagger : http://localhost:4000/api/docs
4. Vérifiez que la section "admin" apparaît dans Swagger

### Token expiré ?

Si vous obtenez des erreurs 401:
1. Déconnectez-vous
2. Reconnectez-vous pour obtenir un nouveau token
3. Les tokens JWT expirent après 15 minutes

## 📝 Structure du Projet

```
backend/
├── src/
│   ├── modules/
│   │   ├── admin/           ← Nouveau module admin
│   │   │   ├── controllers/
│   │   │   ├── services/
│   │   │   └── dto/
│   │   ├── auth/
│   │   ├── users/
│   │   └── exams/
│   └── common/
│       ├── decorators/
│       │   └── roles.decorator.ts  ← Nouveau @Roles()
│       └── guards/
│           └── roles.guard.ts

frontend/
├── app/
│   ├── (admin)/            ← Nouveau route group
│   │   ├── layout.tsx      ← Layout admin avec role check
│   │   └── admin/
│   │       ├── dashboard/
│   │       ├── users/
│   │       ├── exams/
│   │       ├── finance/
│   │       └── analytics/
│   └── (dashboard)/
│       └── layout.tsx      ← Modifié (badge ADMIN + lien panneau)
└── components/
    └── admin/              ← Nouveaux composants
        ├── DataTable.tsx
        ├── StatsCard.tsx
        └── Charts.tsx
```

## 🎯 Checklist de Vérification

- [ ] Backend démarre sans erreur fatale
- [ ] http://localhost:4000/api/health retourne {"status":"ok"}
- [ ] http://localhost:4000/api/docs affiche Swagger
- [ ] Section "admin" visible dans Swagger
- [ ] Login sur frontend fonctionne
- [ ] Badge "ADMIN" visible dans sidebar
- [ ] Bouton "Panneau Admin" visible et cliquable
- [ ] Redirection vers /admin/dashboard fonctionne
- [ ] Dashboard affiche les KPIs (pas de 404)

## 💡 Astuces

- **Mode Watch** : Le backend redémarre automatiquement quand vous modifiez du code
- **Logs** : Surveillez le terminal du backend pour voir les requêtes entrantes
- **Prisma Studio** : Ouvert sur http://localhost:5555 pour visualiser la DB
- **Hot Reload** : Le frontend Next.js se recharge automatiquement

## 🆘 Aide

Si vous rencontrez toujours des problèmes :

1. Vérifiez que PostgreSQL tourne sur le port 5433
2. Vérifiez que Redis tourne sur le port 6380 (optionnel)
3. Vérifiez le fichier .env dans /backend/
4. Essayez de rebuild : `npm run build` dans /backend/

---

**Tout devrait fonctionner après avoir redémarré le backend !** 🎉
