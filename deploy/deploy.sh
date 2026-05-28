#!/bin/bash

set -e

PROJECT_PATH="/home/ubuntu/noma-project"
PM2_APP_NAME="nora-api"
BRANCH_NAME="main"

echo "==================================="
echo "NORA AUTO DEPLOY START"
echo "==================================="

echo "[1] MOVE PROJECT"
cd "$PROJECT_PATH"
pwd

echo "[2] GIT STATUS"
git status

echo "[3] GIT PULL"
git pull origin "$BRANCH_NAME"

echo "[4] ROOT NPM INSTALL"
npm install

echo "[5] SERVER SYNTAX CHECK"
node --check server.js
if [ -f "src/server.js" ]; then
  node --check src/server.js
fi

echo "[6] CLIENT INSTALL"
cd "$PROJECT_PATH/client"
npm install

echo "[7] CLIENT BUILD"
npm run build

echo "[8] DIST CHECK"
test -f "$PROJECT_PATH/client/dist/index.html"

echo "[9] NGINX TEST"
sudo nginx -t

echo "[10] PM2 RELOAD"
cd "$PROJECT_PATH"
if [ -f "$PROJECT_PATH/ecosystem.config.js" ]; then
  pm2 reload "$PROJECT_PATH/ecosystem.config.js" --update-env || pm2 restart "$PROJECT_PATH/ecosystem.config.js" --update-env
else
  pm2 restart "$PM2_APP_NAME" --update-env
fi

echo "[11] PM2 STATUS"
pm2 list

echo "[12] NGINX RELOAD"
sudo systemctl reload nginx

echo "[13] LOCAL API CHECK"
curl -fsS http://127.0.0.1:10000/api

echo ""
echo "[14] PRODUCTION API CHECK"
curl -fsS https://api.nora365.co.kr/api/

echo ""
echo "[15] PRODUCTION WEB CHECK"
curl -fsSI https://nora365.co.kr | head -n 1
curl -fsSI https://nora365.co.kr/admin | head -n 1
curl -fsSI https://nora365.co.kr/admin/dashboard | head -n 1
curl -fsSI https://cdn.nora365.co.kr | head -n 1 || true
curl -fsSI https://m.nora365.co.kr | head -n 1 || true

echo "[16] PM2 RECENT LOGS"
pm2 logs "$PM2_APP_NAME" --lines 50 --nostream

echo "[17] NGINX RECENT ERROR LOG"
sudo tail -n 50 /var/log/nginx/error.log

echo "==================================="
echo "NORA AUTO DEPLOY COMPLETE"
echo "==================================="
