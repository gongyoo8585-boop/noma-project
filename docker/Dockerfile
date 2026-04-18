# =====================================================
# 🔥 BASE IMAGE (경량 + 보안)
# =====================================================
FROM node:20-alpine AS base

# timezone
ENV TZ=Asia/Seoul

# 작업 디렉토리
WORKDIR /app

# =====================================================
# 🔥 DEPENDENCY INSTALL (캐시 최적화)
# =====================================================
FROM base AS deps

# package 파일 먼저 복사 (캐시 활용)
COPY package*.json ./

# production install
RUN npm install --omit=dev && npm cache clean --force

# =====================================================
# 🔥 BUILD STAGE (필요시 확장 가능)
# =====================================================
FROM base AS builder

COPY . .

# (추후 TS/빌드 필요시 여기에 추가)
# RUN npm run build

# =====================================================
# 🔥 FINAL RUNTIME
# =====================================================
FROM node:20-alpine AS runner

WORKDIR /app

# 보안: non-root user 생성
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# 필요한 파일만 복사
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app ./

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000

# 권한 설정
RUN chown -R appuser:appgroup /app

USER appuser

# =====================================================
# 🔥 HEALTH CHECK
# =====================================================
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# =====================================================
# 🔥 PORT
# =====================================================
EXPOSE 3000

# =====================================================
# 🔥 START COMMAND
# =====================================================
CMD ["node", "index.js"]