# QwickServices CIS Backend — Multi-stage Docker build
# Usage: docker build -t qcis-backend .

# ─── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src/ ./src/

RUN npm run build

# ─── Stage 2: Production ─────────────────────────────────────
FROM node:20-alpine AS runtime

RUN apk add --no-cache dumb-init

WORKDIR /app

# Non-root user for security
RUN addgroup -S cis && adduser -S cis -G cis

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY src/database/migrations ./dist/database/migrations

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

USER cis

EXPOSE 3001

# Use dumb-init for proper signal handling (SIGTERM/SIGINT)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
