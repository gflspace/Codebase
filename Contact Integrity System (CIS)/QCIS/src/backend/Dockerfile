# ═══════════════════════════════════════════════════════════════
#  QwickServices CIS — Production Dockerfile
# ═══════════════════════════════════════════════════════════════
#
# Multi-stage build for optimal image size and security:
#   - Stage 1: Build TypeScript to JavaScript
#   - Stage 2: Production runtime with minimal footprint
#
# Usage:
#   docker build -t qcis-backend:latest .
#   docker run -p 3001:3001 --env-file .env.production qcis-backend:latest
#
# ═══════════════════════════════════════════════════════════════

# ─── Stage 1: Build ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci --ignore-scripts

# Copy TypeScript configuration and source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript to JavaScript
RUN npm run build

# ─── Stage 2: Production Runtime ─────────────────────────────
FROM node:20-alpine

LABEL maintainer="QwickServices CIS Team"
LABEL description="Contact Integrity System - Backend API"
LABEL version="0.1.0"

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init wget

WORKDIR /app

# Create non-root user for security
RUN addgroup -S cis && adduser -S cis -G cis

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy migrations (needed for migration runner and verification)
COPY --from=builder /app/src/database/migrations ./src/database/migrations

# Set ownership to non-root user
RUN chown -R cis:cis /app

# Switch to non-root user
USER cis

# Expose application port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

# Use dumb-init for proper signal handling (SIGTERM/SIGINT)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
