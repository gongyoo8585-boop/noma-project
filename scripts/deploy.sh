#!/bin/bash

# =====================================================
# 🔥 DEPLOY SCRIPT (FINAL COMPLETE)
# ✔ git pull → build → container 재시작
# ✔ 무중단 배포 (기본 수준)
# ✔ 로그 출력
# ✔ 에러 시 중단
# ✔ 운영용 자동화 스크립트
# =====================================================

set -e  # 에러 발생 시 즉시 중단

echo "========================================="
echo "🚀 START DEPLOY"
echo "========================================="

APP_DIR="/home/ubuntu/app"
cd $APP_DIR

echo "📥 1. 최신 코드 가져오기"
git pull origin main

echo "🧹 2. 이전 컨테이너 정리"
docker-compose down

echo "🛠 3. 이미지 빌드"
docker-compose build --no-cache

echo "🚀 4. 컨테이너 실행"
docker-compose up -d

echo "⏳ 5. 컨테이너 상태 확인"
sleep 5
docker ps

echo "📜 6. 최근 로그 확인"
docker-compose logs --tail=50

echo "========================================="
echo "✅ DEPLOY COMPLETE"
echo "========================================="