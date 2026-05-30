#!/bin/bash

echo ""
echo "=================================================="
echo "NORA HEALTH CHECK"
echo "=================================================="
echo ""

FAILED=0

check_url() {
  NAME="$1"
  URL="$2"

  HTTP_CODE=$(curl -k -L -s -o /dev/null -w "%{http_code}" "$URL")

  if [[ "$HTTP_CODE" =~ ^(200|301|302|401|403)$ ]]; then
    echo "[OK] $NAME ($HTTP_CODE)"
  else
    echo "[FAIL] $NAME ($HTTP_CODE)"
    FAILED=1
  fi
}

echo "===================="
echo "PM2 STATUS"
echo "===================="
pm2 status

echo ""
echo "===================="
echo "PORT 10000"
echo "===================="
ss -lntp | grep 10000 || echo "[FAIL] PORT 10000 NOT LISTENING"

echo ""
echo "===================="
echo "LOCAL API"
echo "===================="
curl -s http://127.0.0.1:10000/api || echo "[FAIL] LOCAL API"

echo ""
echo "===================="
echo "PUBLIC URL CHECK"
echo "===================="

check_url "MAIN" "https://www.nora365.co.kr"
check_url "ADMIN" "https://www.nora365.co.kr/admin"
check_url "DASHBOARD" "https://www.nora365.co.kr/admin/dashboard"
check_url "API" "https://api.nora365.co.kr/api/"
check_url "CDN" "https://cdn.nora365.co.kr"
check_url "MOBILE" "https://m.nora365.co.kr"

echo ""
echo "===================="
echo "API TEST"
echo "===================="

curl -s https://api.nora365.co.kr/api/
echo ""

echo ""
echo "===================="
echo "NGINX ERROR LOG"
echo "===================="
tail -20 /var/log/nginx/error.log 2>/dev/null

echo ""
echo "===================="
echo "PM2 ERROR LOG"
echo "===================="
pm2 logs nora-api --lines 20 --nostream

echo ""
echo "===================="
echo "DISK"
echo "===================="
df -h /

echo ""
echo "===================="
echo "MEMORY"
echo "===================="
free -h

echo ""
echo "===================="
echo "RESULT"
echo "===================="

if [ "$FAILED" -eq 0 ]; then
  echo "NORA HEALTH CHECK PASSED"
  exit 0
else
  echo "NORA HEALTH CHECK FAILED"
  exit 1
fi
