# =====================================================
# 🔥 BASE IMAGE
# =====================================================
FROM node:20-alpine AS base

ENV TZ=Asia/Seoul
WORKDIR /app

# 필수 패키지 (healthcheck + 안정성)
RUN apk add --no-cache curl

# =====================================================
# 🔥 DEPENDENCY INSTALL
# =====================================================
FROM base AS deps

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

# =====================================================
# 🔥 BUILD STAGE
# =====================================================
FROM base AS builder

COPY . .

# 필요시 빌드 (현재는 유지)
# RUN npm run build

# =====================================================
# 🔥 FINAL RUNTIME
# =====================================================
FROM node:20-alpine AS runner

WORKDIR /app

# curl 설치 (healthcheck)
RUN apk add --no-cache curl

# non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# node_modules
COPY --from=deps /app/node_modules ./node_modules

# 소스 복사 (불필요 파일 제외)
COPY --from=builder /app/server ./server
COPY --from=builder /app/package*.json ./

# logs / uploads 디렉토리 생성 (없으면 에러남)
RUN mkdir -p logs uploads

# 환경 변수
ENV NODE_ENV=production
ENV PORT=3000

# 권한
RUN chown -R appuser:appgroup /app

USER appuser

# =====================================================
# 🔥 HEALTH CHECK (수정됨)
# =====================================================
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# =====================================================
# 🔥 PORT
# =====================================================
EXPOSE 3000

# =====================================================
# 🔥 START (🔥 핵심 수정)
# =====================================================
CMD ["node", "server/server.js"]