#!/bin/bash
cd "$(dirname "$0")"
echo "🚀 Démarrage du Backend Pédja..."
echo "================================"
echo ""
npx ts-node -r tsconfig-paths/register src/main.ts
