#!/bin/bash

# =====================================================
# 🔥 START SCRIPT (FINAL COMPLETE)
# ✔ 서비스 시작
# ✔ 컨테이너 자동 실행
# ✔ 상태 확인
# ✔ 로그 확인
# ✔ 운영용 실행 스크립트
# =====================================================

set -e

echo "========================================="
echo "🚀 START SERVICES"
echo "========================================="

APP_DIR="/home/ubuntu/app"
cd $APP_DIR

echo "🔍 1. Docker 상태 확인"
if ! command -v docker &> /dev/null; then
  echo "❌ Docker가 설치되어 있지 않습니다"
  exit 1
fi

if ! command -v docker-compose &> /dev/null; then
  echo "❌ docker-compose가 설치되어 있지 않습니다"
  exit 1
fi

echo "📦 2. 컨테이너 실행"
docker-compose up -d

echo "⏳ 3. 컨테이너 상태 확인"
sleep 5
docker ps

echo "📜 4. 주요 로그 출력"
docker-compose logs --tail=30

echo "========================================="
echo "✅ SERVICES STARTED"
echo "========================================="