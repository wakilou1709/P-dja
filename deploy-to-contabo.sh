#!/bin/bash

# ============================================
# PEDJA.WAPIKI.COM - CONTABO DEPLOYMENT SCRIPT
# Déploie Pédja sur le même VPS que wapiki.com
# URL: https://www.pedja.wapiki.com
# ============================================

set -e

# ── Configuration ────────────────────────────────────────────────────────────
VPS_IP="38.242.237.149"
VPS_USER="root"
DOMAIN="pedja.wapiki.com"
WWW_DOMAIN="www.pedja.wapiki.com"
API_DOMAIN="api.pedja.wapiki.com"
CERT_EMAIL="contact@wapiki.com"
PROJECT_DIR="/home/dao-wakilou/Documents/Pédja"

# Secrets production (générés une fois, stockés sur le VPS dans /root/pedja/.env)
ANTHROPIC_API_KEY="***REMOVED***"

# ── Colors ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_step()    { echo -e "${BLUE}[STEP $1]${NC} $2"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error()   { echo -e "${RED}❌ $1${NC}"; }

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🚀 PÉDJA - DÉPLOIEMENT SUR CONTABO 🚀             ║${NC}"
echo -e "${GREEN}║  URL: https://www.pedja.wapiki.com                 ║${NC}"
echo -e "${GREEN}║  VPS: $VPS_IP                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 1 : Test connexion SSH
# ═══════════════════════════════════════════════════════════════════════════
log_step "1" "Test connexion SSH au VPS..."
if timeout 5 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "echo 'SSH OK'" &> /dev/null; then
    log_success "Connexion SSH OK"
else
    log_error "Impossible de se connecter au VPS ($VPS_IP)"
    echo "Vérifier que les clés SSH sont configurées: ssh-copy-id $VPS_USER@$VPS_IP"
    exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 2 : Upload des fichiers Pédja sur le VPS
# ═══════════════════════════════════════════════════════════════════════════
log_step "2" "Upload du projet Pédja vers /root/pedja/ ..."
ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "mkdir -p /root/pedja"

rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude 'backend/.env' \
  --exclude '.env' \
  -e "ssh -o StrictHostKeyChecking=no" \
  "$PROJECT_DIR/" $VPS_USER@$VPS_IP:/root/pedja/

log_success "Fichiers Pédja uploadés"

# Synchroniser aussi le docker-compose.yml wapiki-website (volume /var/pedja/uploads ajouté)
WAPIKI_DIR="/home/dao-wakilou/Documents/wapiki-website"
if [ -f "$WAPIKI_DIR/docker-compose.yml" ]; then
  scp -o StrictHostKeyChecking=no "$WAPIKI_DIR/docker-compose.yml" $VPS_USER@$VPS_IP:/root/wapiki-website/docker-compose.yml
  log_success "wapiki-website/docker-compose.yml mis à jour (volume pedja uploads)"
else
  log_warning "docker-compose.yml wapiki introuvable localement — montage nginx à configurer manuellement"
fi

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 3 : Créer .env de production sur le VPS
# ═══════════════════════════════════════════════════════════════════════════
log_step "3" "Génération du fichier .env de production..."

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << ENVEOF
# Générer des secrets si le .env n'existe pas encore
if [ ! -f /root/pedja/.env ]; then
    DB_PASSWORD=\$(openssl rand -hex 16)
    REDIS_PASSWORD=\$(openssl rand -hex 16)
    JWT_SECRET=\$(openssl rand -base64 48)
    JWT_REFRESH_SECRET=\$(openssl rand -base64 48)
    ADMIN_PASSWORD="Admin@Pedja2024!"

    cat > /root/pedja/.env << EOF
# === PÉDJA PRODUCTION .env ===
DB_PASSWORD=\${DB_PASSWORD}
REDIS_PASSWORD=\${REDIS_PASSWORD}
JWT_SECRET=\${JWT_SECRET}
JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
ADMIN_EMAIL=admin@pedja.wapiki.com
ADMIN_PASSWORD=\${ADMIN_PASSWORD}
EOF
    echo "✅ Nouveau .env créé avec secrets aléatoires"
    echo "   Admin: admin@pedja.wapiki.com / \${ADMIN_PASSWORD}"
else
    echo "✅ .env existant conservé"
fi
ENVEOF

log_success ".env production configuré"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 4 : SSL - Certificat pour pedja.wapiki.com
# ═══════════════════════════════════════════════════════════════════════════
log_step "4" "Certificat SSL pour $DOMAIN / $WWW_DOMAIN / $API_DOMAIN..."

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'SSLEOF'
# Vérifier si le cert existe déjà
if [ -d /etc/letsencrypt/live/pedja.wapiki.com ]; then
    echo "✅ Certificat SSL déjà présent - renouvellement si nécessaire"
    certbot renew --cert-name pedja.wapiki.com --quiet || true
else
    echo "🔒 Obtention du certificat SSL (arrêt temporaire nginx)..."
    docker stop wapiki-nginx 2>/dev/null || true
    sleep 2

    certbot certonly --standalone \
      -d pedja.wapiki.com \
      -d www.pedja.wapiki.com \
      -d api.pedja.wapiki.com \
      --non-interactive \
      --agree-tos \
      -m contact@wapiki.com

    echo "✅ Certificat SSL obtenu"
fi

# Copier les certs dans le dossier wapiki ssl (accessible par le nginx Docker)
mkdir -p /var/wapiki/ssl/pedja
cp /etc/letsencrypt/live/pedja.wapiki.com/fullchain.pem /var/wapiki/ssl/pedja/
cp /etc/letsencrypt/live/pedja.wapiki.com/privkey.pem /var/wapiki/ssl/pedja/
chmod 644 /var/wapiki/ssl/pedja/*.pem
echo "✅ Certificats copiés dans /var/wapiki/ssl/pedja/"
SSLEOF

log_success "SSL configuré"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 5 : Mise à jour nginx.conf (wapiki + pédja)
# ═══════════════════════════════════════════════════════════════════════════
log_step "5" "Mise à jour nginx.conf pour ajouter pedja.wapiki.com..."

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'NGINXEOF'
# Backup de la config actuelle
cp /root/wapiki-website/nginx.conf /root/wapiki-website/nginx.conf.bak

# Écriture du nouveau nginx.conf complet (wapiki + pédja)
cat > /root/wapiki-website/nginx.conf << 'NGINX'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=general_limit:10m rate=50r/s;

    # ── HTTP → HTTPS redirect (tous les domaines) ───────────────────────────
    server {
        listen 80;
        listen [::]:80;
        server_name wapiki.com www.wapiki.com api.wapiki.com
                    pedja.wapiki.com www.pedja.wapiki.com api.pedja.wapiki.com;
        return 301 https://$host$request_uri;
    }

    # ══════════════════════════════════════════════════════════════════════
    # WAPIKI.COM
    # ══════════════════════════════════════════════════════════════════════

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name wapiki.com www.wapiki.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        limit_req zone=general_limit burst=20 nodelay;

        location / {
            resolver 127.0.0.11 valid=30s;
            set $frontend_upstream frontend:3000;
            proxy_pass http://$frontend_upstream;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name api.wapiki.com;

        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;

        limit_req zone=api_limit burst=20 nodelay;

        location / {
            resolver 127.0.0.11 valid=30s;
            set $backend_upstream backend:8080;
            proxy_pass http://$backend_upstream;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }

        location /uploads/ {
            alias /var/www/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # ══════════════════════════════════════════════════════════════════════
    # PÉDJA.WAPIKI.COM
    # ══════════════════════════════════════════════════════════════════════

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name pedja.wapiki.com www.pedja.wapiki.com;

        ssl_certificate /etc/nginx/ssl/pedja/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/pedja/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer-when-downgrade" always;

        limit_req zone=general_limit burst=20 nodelay;

        location / {
            resolver 127.0.0.11 valid=30s;
            set $pedja_frontend pedja-frontend:3000;
            proxy_pass http://$pedja_frontend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }

    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        server_name api.pedja.wapiki.com;

        ssl_certificate /etc/nginx/ssl/pedja/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/pedja/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
        ssl_prefer_server_ciphers on;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;

        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;

        limit_req zone=api_limit burst=20 nodelay;

        # Serve uploaded PDFs directly from host filesystem (no proxy overhead)
        location /uploads/ {
            alias /var/pedja/uploads/;
            expires 30d;
            add_header Cache-Control "public, immutable";
            add_header Access-Control-Allow-Origin "*";
        }

        location / {
            resolver 127.0.0.11 valid=30s;
            set $pedja_backend pedja-backend:4000;
            proxy_pass http://$pedja_backend;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
    }
}
NGINX

echo "✅ nginx.conf mis à jour"

# Créer le dossier uploads pedja dès maintenant (nécessaire avant le restart nginx)
mkdir -p /var/pedja/uploads
chmod 755 /var/pedja/uploads
echo "✅ /var/pedja/uploads créé"

# Redémarrer nginx avec le nouveau volume monté
# (le docker-compose.yml wapiki-website doit déjà contenir le volume /var/pedja/uploads)
cd /root/wapiki-website
docker-compose --profile production up -d --force-recreate nginx
sleep 3

# Tester la config nginx
docker exec wapiki-nginx nginx -t 2>&1 && echo "✅ Config nginx valide" || echo "⚠️  Erreur config nginx"
docker exec wapiki-nginx nginx -s reload 2>/dev/null || true
echo "✅ Nginx rechargé avec montage /var/pedja/uploads"
NGINXEOF

log_success "Nginx mis à jour avec les blocs pedja.wapiki.com"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 6 : Build et démarrage des containers Pédja
# ═══════════════════════════════════════════════════════════════════════════
log_step "6" "Build et démarrage des containers Pédja..."

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'DEPLOYEOF'
cd /root/pedja

# Créer le dossier uploads persistant (PDFs épreuves)
mkdir -p /var/pedja/uploads
chmod 755 /var/pedja/uploads
echo "✅ Dossier /var/pedja/uploads prêt"

# Charger les variables d'env
set -a; source .env; set +a

# Arrêter les anciens containers si présents
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Build (peut prendre quelques minutes)
echo "🔨 Build des images Docker (cela peut prendre 5-10 minutes)..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Démarrer les services
echo "🚀 Démarrage des containers..."
docker-compose -f docker-compose.prod.yml up -d

# Attendre que les services soient prêts
echo "⏳ Attente démarrage des services (60s)..."
sleep 60

# Vérifier l'état
echo ""
echo "=== État des containers Pédja ==="
docker ps --filter "name=pedja" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
DEPLOYEOF

log_success "Containers Pédja démarrés"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 7 : Création du compte admin (seulement si inexistant)
# ═══════════════════════════════════════════════════════════════════════════
log_step "7" "Vérification du compte administrateur..."

ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP << 'ADMINEOF'
set -a; source /root/pedja/.env; set +a

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@pedja.wapiki.com}"

# Vérifier si l'admin existe déjà en DB via psql
ADMIN_EXISTS=$(docker exec pedja-postgres psql -U pedja_user -d pedja_db -tAc \
  "SELECT COUNT(*) FROM users WHERE email='${ADMIN_EMAIL}';" 2>/dev/null || echo "0")

if [ "${ADMIN_EXISTS}" = "1" ]; then
  echo "✅ Compte admin déjà existant (${ADMIN_EMAIL}) — aucune action nécessaire"
  exit 0
fi

echo "👤 Création du compte admin (premier déploiement)..."

# Attendre que le backend soit prêt
for i in $(seq 1 12); do
    if docker exec pedja-backend wget -qO- http://localhost:4000/api/health 2>/dev/null | grep -q "ok\|UP\|healthy" 2>/dev/null; then
        echo "✅ Backend prêt"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "⚠️  Backend pas encore prêt - créer l'admin manuellement plus tard"
        exit 0
    fi
    echo "  Attente... ($i/12)"
    sleep 10
done

ADMIN_PASSWORD="${ADMIN_PASSWORD:-Admin@Pedja2024!}"

# Créer l'admin directement via psql (hash bcrypt pré-calculé)
HASH=$(docker exec pedja-backend node -e \
  "const b=require('bcrypt');b.hash('${ADMIN_PASSWORD}',10).then(h=>console.log(h));" 2>/dev/null)

if [ -n "$HASH" ]; then
  docker exec pedja-postgres psql -U pedja_user -d pedja_db -c \
    "INSERT INTO users (id, email, password, \"firstName\", \"lastName\", role, \"createdAt\", \"updatedAt\")
     VALUES (gen_random_uuid(), '${ADMIN_EMAIL}', '${HASH}', 'Admin', 'Pédja', 'ADMIN', NOW(), NOW());" 2>/dev/null \
    && echo "✅ Admin créé: ${ADMIN_EMAIL}" \
    || echo "⚠️  Erreur lors de la création de l'admin"
else
  echo "⚠️  Impossible de hasher le mot de passe"
fi
ADMINEOF

log_success "Admin vérifié"

# ═══════════════════════════════════════════════════════════════════════════
# PHASE 8 : Vérification finale
# ═══════════════════════════════════════════════════════════════════════════
log_step "8" "Vérification du déploiement..."
sleep 5

FRONTEND_OK=false
BACKEND_OK=false

if ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "docker ps | grep pedja-frontend" &> /dev/null; then
    log_success "Container pedja-frontend en cours d'exécution"
    FRONTEND_OK=true
else
    log_warning "Container pedja-frontend non démarré"
fi

if ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_IP "docker ps | grep pedja-backend" &> /dev/null; then
    log_success "Container pedja-backend en cours d'exécution"
    BACKEND_OK=true
else
    log_warning "Container pedja-backend non démarré"
fi

# ═══════════════════════════════════════════════════════════════════════════
# RÉSUMÉ FINAL
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 DÉPLOIEMENT PÉDJA TERMINÉ ! 🎉                 ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}🌐 Frontend:${NC}  https://www.pedja.wapiki.com"
echo -e "${BLUE}🔌 API:${NC}       https://api.pedja.wapiki.com"
echo -e "${BLUE}📚 Swagger:${NC}   https://api.pedja.wapiki.com/api/docs"
echo ""
echo -e "${YELLOW}👤 Compte Admin:${NC}"
echo "   Email:    admin@pedja.wapiki.com"
echo "   Password: (voir /root/pedja/.env sur le VPS)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT - Enregistrements DNS à ajouter:${NC}"
echo "   pedja.wapiki.com     A  $VPS_IP"
echo "   www.pedja.wapiki.com A  $VPS_IP"
echo "   api.pedja.wapiki.com A  $VPS_IP"
echo ""
echo "Commandes de monitoring:"
echo "  ssh $VPS_USER@$VPS_IP 'docker logs pedja-backend -f'"
echo "  ssh $VPS_USER@$VPS_IP 'docker logs pedja-frontend -f'"
echo "  ssh $VPS_USER@$VPS_IP 'docker ps --filter name=pedja'"
echo ""
