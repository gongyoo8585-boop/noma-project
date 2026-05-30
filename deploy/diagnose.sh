#!/bin/bash

echo ""
echo "=================================================="
echo "NORA EMERGENCY DIAGNOSE"
echo "=================================================="
echo ""

echo "===================="
echo "1. DATE"
echo "===================="
date

echo ""
echo "===================="
echo "2. PROJECT PATH"
echo "===================="
pwd

echo ""
echo "===================="
echo "3. GIT STATUS"
echo "===================="
git status

echo ""
echo "===================="
echo "4. DISK"
echo "===================="
df -h
df -i

echo ""
echo "===================="
echo "5. MEMORY"
echo "===================="
free -h

echo ""
echo "===================="
echo "6. PM2 STATUS"
echo "===================="
pm2 status

echo ""
echo "===================="
echo "7. PM2 DESCRIBE"
echo "===================="
pm2 describe nora-api

echo ""
echo "===================="
echo "8. NODE PROCESS"
echo "===================="
ps -ef | grep node | grep -v grep

echo ""
echo "===================="
echo "9. PORT 10000"
echo "===================="
sudo ss -lntp | grep 10000 || echo "[FAIL] PORT 10000 NOT LISTENING"
sudo lsof -i :10000 || echo "[INFO] lsof no result for 10000"

echo ""
echo "===================="
echo "10. LOCAL API"
echo "===================="
curl -i http://127.0.0.1:10000/api

echo ""
echo "===================="
echo "11. PRODUCTION API"
echo "===================="
curl -i https://api.nora365.co.kr/api/

echo ""
echo "===================="
echo "12. LOGIN API EMPTY TEST"
echo "===================="
curl -i -X POST https://api.nora365.co.kr/api/auth/login \
-H "Content-Type: application/json" \
-d '{}'

echo ""
echo "===================="
echo "13. ADMIN DASHBOARD API"
echo "===================="
curl -i https://api.nora365.co.kr/api/admin/dashboard

echo ""
echo "===================="
echo "14. SHOPS API"
echo "===================="
curl -i "https://api.nora365.co.kr/api/shops?category=massage"

echo ""
echo "===================="
echo "15. CORS OPTIONS"
echo "===================="
curl -i -X OPTIONS https://api.nora365.co.kr/api/auth/login \
-H "Origin: https://www.nora365.co.kr" \
-H "Access-Control-Request-Method: POST" \
-H "Access-Control-Request-Headers: x-auth-token,content-type"

echo ""
echo "===================="
echo "16. PUBLIC URLS"
echo "===================="
curl -I https://www.nora365.co.kr
curl -I https://www.nora365.co.kr/admin
curl -I https://www.nora365.co.kr/admin/dashboard
curl -I https://m.nora365.co.kr
curl -I https://cdn.nora365.co.kr

echo ""
echo "===================="
echo "17. NGINX TEST"
echo "===================="
sudo nginx -t

echo ""
echo "===================="
echo "18. NGINX ERROR LOG"
echo "===================="
sudo tail -100 /var/log/nginx/error.log

echo ""
echo "===================="
echo "19. PM2 OUT LOG"
echo "===================="
pm2 logs nora-api --lines 100 --nostream

echo ""
echo "===================="
echo "20. ENV CHECK"
echo "===================="
grep -E "NODE_ENV|PORT|HOST|MONGO_URI|API_BASE_URL|CLIENT_URL|ADMIN_URL|MOBILE_URL|CDN_URL|CORS_ORIGIN" .env 2>/dev/null

echo ""
echo "===================="
echo "21. ECOSYSTEM CHECK"
echo "===================="
grep -E "name|script|PORT|HOST|MONGO_URI|NODE_ENV|CORS_ORIGIN" ecosystem.config.js 2>/dev/null

echo ""
echo "===================="
echo "22. SERVER SYNTAX"
echo "===================="
node --check server.js

echo ""
echo "===================="
echo "23. BUILD FILE CHECK"
echo "===================="
ls -la client/dist 2>/dev/null
ls -la client/dist/assets 2>/dev/null | tail -20

echo ""
echo "=================================================="
echo "NORA DIAGNOSE END"
echo "=================================================="

