#!/bin/bash

echo "🚀 Démarrage du backend Pédja..."
echo ""

# Kill any existing node processes on port 4000
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Wait a bit
sleep 2

# Start the backend
npm run start:dev
