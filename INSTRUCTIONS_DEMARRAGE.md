# 🚨 Instructions de Démarrage du Backend - URGENT

## Problème Actuel
Le frontend fonctionne sur http://localhost:3000 ✅
Le backend ne démarre PAS sur http://localhost:4000 ❌

## ✅ Solution Garantie (2 étapes)

### Étape 1 : Ouvrir un Terminal Dédié au Backend

1. **Appuyez sur** : `Ctrl + Alt + T` (nouveau terminal)
2. **OU** cliquez sur Terminal dans votre barre de tâches

### Étape 2 : Copier-Coller Cette Commande

**Copiez EXACTEMENT cette ligne** et collez-la dans le nouveau terminal :

```bash
cd /home/dao-wakilou/Documents/Pédja/backend && npm run start:dev
```

**Appuyez sur Entrée** et **ATTENDEZ**

### ⏳ Temps d'Attente : ~30-45 secondes

Vous verrez d'abord des warnings rouges (NORMAL, ignorez-les), puis :

```
🚀 Pédja Backend API is running!

📡 URL: http://localhost:4000/api
📚 Swagger Docs: http://localhost:4000/api/docs
🌍 Environment: development

Ready to accept requests...
```

### ✅ Quand Vous Voyez Ce Message

1. **NE FERMEZ PAS** le terminal
2. **Retournez sur votre navigateur**
3. **Actualisez** la page (F5)
4. **Connectez-vous** : admin@pedja.com / Admin@123
5. ✨ **Ça marche !**

---

## 🔍 Si Ça Ne Démarre Toujours Pas

### Vérification 1 : PostgreSQL

```bash
sudo systemctl status postgresql
```

Si "inactive", démarrez-le :
```bash
sudo systemctl start postgresql
```

### Vérification 2 : Port 4000 Occupé

```bash
lsof -i :4000
```

Si un processus existe, tuez-le :
```bash
kill -9 $(lsof -ti:4000)
```

Puis redémarrez le backend.

### Vérification 3 : Variables d'Environnement

```bash
cd /home/dao-wakilou/Documents/Pédja/backend
cat .env | grep DATABASE_URL
```

Devrait afficher :
```
DATABASE_URL=postgresql://pedja:pedja_secret@localhost:5433/pedja_db?schema=public
```

---

## 📞 Debug Avancé

Si après tout ça, le backend ne démarre pas, envoyez-moi :

```bash
cd /home/dao-wakilou/Documents/Pédja/backend
npm run start:dev 2>&1 | tee backend-log.txt
```

Et montrez-moi le contenu de `backend-log.txt`

---

## ⚡ Alternative : Commande Directe (Sans Watch)

Si `npm run start:dev` ne fonctionne pas, essayez :

```bash
cd /home/dao-wakilou/Documents/Pédja/backend
node dist/main.js
```

Mais il faut d'abord compiler :
```bash
npm run build
```

---

## 🎯 Checklist Finale

- [ ] Terminal dédié ouvert
- [ ] Commande `cd /home/dao-wakilou/Documents/Pédja/backend && npm run start:dev` exécutée
- [ ] Attente de 30-45 secondes
- [ ] Message "Ready to accept requests..." visible
- [ ] Terminal laissé ouvert (ne pas fermer !)
- [ ] Navigateur actualisé
- [ ] Login admin@pedja.com fonctionne

**Une fois ces étapes suivies, TOUT fonctionnera !** 🚀
