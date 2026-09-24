#!/bin/bash
set -euo pipefail

# VeritaBox VPS Deployment Script
# Run this on your VPS from the project root: bash deploy.sh
#
# Prerequisites:
#   - Node.js 20+, npm
#   - Docker & Docker Compose
#   - nginx installed and running
#   - SSL certs via certbot for veritabox.com + api.veritabox.com
#   - backend/.env filled from backend/.env.production.example
#   - PM2 installed globally: npm install -g pm2

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$APP_DIR/frontend"
BACKEND_DIR="$APP_DIR/backend"
DEPLOY_DIR="/var/www/veritabox"

echo "=== VeritaBox Deployment ==="
echo "App directory: $APP_DIR"

# 1. Pull latest code
echo ""
echo "[1/7] Pulling latest code..."
git pull origin main

# 2. Start infrastructure (MongoDB, Redis, Piston)
echo ""
echo "[2/7] Starting Docker services..."
cd "$APP_DIR"
docker compose up -d

# 3. Install backend dependencies
echo ""
echo "[3/7] Installing backend dependencies..."
cd "$BACKEND_DIR"
npm ci --omit=dev

# 4. Build frontend
echo ""
echo "[4/7] Building frontend for production..."
cd "$FRONTEND_DIR"
npm ci
npm run build

# 5. Deploy frontend build to serve directory
echo ""
echo "[5/7] Deploying frontend build..."
mkdir -p "$DEPLOY_DIR/frontend"
rm -rf "$DEPLOY_DIR/frontend/dist"
cp -r "$FRONTEND_DIR/dist" "$DEPLOY_DIR/frontend/dist"

# 6. Restart backend with PM2
echo ""
echo "[6/7] Restarting backend with PM2..."
cd "$APP_DIR"
mkdir -p /var/log/veritabox
if pm2 describe veritabox-api > /dev/null 2>&1; then
  pm2 restart ecosystem.config.cjs
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

# 7. Reload nginx
echo ""
echo "[7/7] Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== Deployment complete ==="
echo "Frontend: https://veritabox.com"
echo "API:      https://api.veritabox.com/api/health"
echo ""
echo "Useful commands:"
echo "  pm2 logs veritabox-api    — view backend logs"
echo "  pm2 monit                 — monitor CPU/memory"
echo "  docker compose logs -f    — view MongoDB/Redis/Piston logs"
