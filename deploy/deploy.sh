#!/bin/bash

set -e

PROJECT_PATH="/home/ubuntu/noma-project"

echo "==================================="
echo "NORA DEPLOY START"
echo "==================================="

cd "$PROJECT_PATH"

echo "CURRENT PATH:"
pwd

echo "GIT STATUS:"
git status

echo "GIT PULL:"
git pull origin main

echo "ROOT NPM INSTALL:"
npm install

echo "CLIENT INSTALL:"
cd client

npm install

echo "CLIENT BUILD:"
npm run build

cd ..

echo "NODE CHECK:"
node --check server.js

echo "PM2 RELOAD:"
pm2 reload ecosystem.config.js --update-env || pm2 restart ecosystem.config.js --update-env

echo "PM2 STATUS:"
pm2 list

echo "NGINX TEST:"
sudo nginx -t

echo "NGINX RELOAD:"
sudo systemctl reload nginx

echo "API HEALTH CHECK:"
curl -s https://api.nora365.co.kr/api/

echo "MAIN CHECK:"
curl -I https://nora365.co.kr

echo "ADMIN CHECK:"
curl -I https://nora365.co.kr/admin

echo "DASHBOARD CHECK:"
curl -I https://nora365.co.kr/admin/dashboard

echo "==================================="
echo "NORA DEPLOY COMPLETE"
echo "==================================="
