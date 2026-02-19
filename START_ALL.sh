#!/bin/bash

echo "🚀 Démarrage de Pédja - Panneau Admin"
echo "======================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour nettoyer les processus
cleanup() {
    echo -e "\n${YELLOW}Arrêt des services...${NC}"
    pkill -f "nest start" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Vérifier si on est dans le bon dossier
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Erreur: Ce script doit être exécuté depuis /home/dao-wakilou/Documents/Pédja${NC}"
    exit 1
fi

# Démarrer le backend
echo -e "${YELLOW}📦 Démarrage du Backend...${NC}"
cd backend
npm run start:dev > /tmp/pedja-backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Attendre que le backend démarre
echo "⏳ Attente du backend (30 secondes)..."
sleep 30

# Vérifier si le backend écoute
if lsof -i :4000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend démarré avec succès sur http://localhost:4000${NC}"
else
    echo -e "${RED}❌ Le backend n'a pas démarré. Vérifiez /tmp/pedja-backend.log${NC}"
    echo "Logs récents:"
    tail -20 /tmp/pedja-backend.log
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Tous les services sont démarrés !${NC}"
echo ""
echo "📊 URLs disponibles:"
echo "   - Frontend:      http://localhost:3000"
echo "   - Backend API:   http://localhost:4000/api"
echo "   - Swagger Docs:  http://localhost:4000/api/docs"
echo "   - Prisma Studio: http://localhost:5555"
echo ""
echo "👤 Compte Admin:"
echo "   - Email:    admin@pedja.com"
echo "   - Password: Admin@123"
echo ""
echo -e "${YELLOW}Appuyez sur Ctrl+C pour arrêter tous les services${NC}"
echo ""

# Afficher les logs en temps réel
tail -f /tmp/pedja-backend.log
