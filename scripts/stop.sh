#!/bin/bash

# =====================================================
# 🔥 STOP SCRIPT (FINAL COMPLETE)
# ✔ 서비스 안전 종료
# ✔ 컨테이너 정리
# ✔ 네트워크 유지 (필요 시 옵션)
# ✔ 운영용 종료 스크립트
# =====================================================

set -e

echo "========================================="
echo "🛑 STOP SERVICES"
echo "========================================="

APP_DIR="/home/ubuntu/app"
cd $APP_DIR

echo "🔍 1. 실행 중 컨테이너 확인"
docker ps

echo "🛑 2. 컨테이너 종료"
docker-compose stop

echo "🧹 3. 컨테이너 정리 (선택)"
docker-compose down

echo "📦 4. 정리 상태 확인"
docker ps -a

echo "========================================="
echo "✅ SERVICES STOPPED"
echo "========================================="