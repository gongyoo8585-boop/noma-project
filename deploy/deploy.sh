#!/bin/bash

set -e

echo "=================================="
echo "NORA AUTO DEPLOY START"
echo "=================================="

PROJECT_ROOT="/home/ubuntu/noma-project"
CLIENT_ROOT="$PROJECT_ROOT/client"
DIST_ROOT="/var/www/nora"

cd "$PROJECT_ROOT"

echo "=================================="
echo "CURRENT PATH"
echo "=================================="
pwd

echo "=================================="
echo "GIT SYNC"
echo "=================================="
git fetch origin main
git reset --hard origin/main
git clean -fd --exclude=.env --exclude=.env.production --exclude=uploads --exclude=client/dist

echo "=================================="
echo "ROOT INSTALL"
echo "=================================="
npm install

echo "=================================="
echo "SERVER SYNTAX CHECK"
echo "=================================="

if [ -f "$PROJECT_ROOT/server.js" ]; then
  node --check "$PROJECT_ROOT/server.js"
fi

if [ -f "$PROJECT_ROOT/src/server.js" ]; then
  node --check "$PROJECT_ROOT/src/server.js"
fi

echo "=================================="
echo "CLIENT INSTALL"
echo "=================================="

if [ -d "$CLIENT_ROOT" ]; then
  cd "$CLIENT_ROOT"

  npm install
  npm install @rollup/rollup-linux-x64-gnu --save-dev || true
  chmod +x node_modules/.bin/vite || true

  echo "=================================="
  echo "CLIENT BUILD"
  echo "=================================="

  CI=false npm run build

  if [ ! -d "$CLIENT_ROOT/dist" ]; then
    echo "client/dist not found"
    exit 1
  fi
else
  echo "client directory not found"
  exit 1
fi

echo "=================================="
echo "DEPLOY DIST TO NGINX ROOT"
echo "=================================="

sudo mkdir -p "$DIST_ROOT"
sudo rsync -av --delete "$CLIENT_ROOT/dist/" "$DIST_ROOT/"

echo "=================================="
echo "ENV CHECK"
echo "=================================="

cd "$PROJECT_ROOT"

if [ ! -f ".env" ] && [ ! -f ".env.production" ]; then
  echo ".env or .env.production not found"
  exit 1
fi

if ! grep -q "^JWT_SECRET=" .env .env.production 2>/dev/null; then
  echo "JWT_SECRET not found"
  exit 1
fi

echo "=================================="
echo "PM2 RESTART"
echo "=================================="

if pm2 describe nora-api > /dev/null 2>&1; then
  pm2 restart ecosystem.config.js --only nora-api --env production --update-env
else
  pm2 start ecosystem.config.js --only nora-api --env production
fi

pm2 save

echo "=================================="
echo "WAIT SERVER START"
echo "=================================="
sleep 20

pm2 describe nora-api
pm2 logs nora-api --lines 100 --nostream

if ! pm2 pid nora-api > /dev/null 2>&1; then
  echo "nora-api pm2 pid not found"
  exit 1
fi

echo "=================================="
echo "NGINX CHECK"
echo "=================================="
sudo nginx -t

echo "=================================="
echo "NGINX RELOAD"
echo "=================================="
sudo systemctl reload nginx

echo "=================================="
echo "LOCAL API HEALTH CHECK"
echo "=================================="

for i in 1 2 3 4 5; do
  if curl -f --max-time 30 http://127.0.0.1:10000/api/health; then
    break
  fi

  if [ "$i" = "5" ]; then
    echo "local api health check failed"
    exit 1
  fi

  sleep 5
done

echo ""
echo "=================================="
echo "PUBLIC API HEALTH CHECK"
echo "=================================="
curl -f --max-time 30 https://api.nora365.co.kr/api/health

echo ""
echo "=================================="
echo "PRODUCTION SITE CHECK"
echo "=================================="
curl -f --max-time 30 https://nora365.co.kr
curl -f --max-time 30 https://nora365.co.kr/admin || true
curl -f --max-time 30 https://nora365.co.kr/admin/dashboard || true
curl -f --max-time 30 https://m.nora365.co.kr || true

echo ""
echo "=================================="
echo "PM2 STATUS"
echo "=================================="
pm2 status

echo "=================================="
echo "NORA AUTO DEPLOY COMPLETE"
echo "=================================="

