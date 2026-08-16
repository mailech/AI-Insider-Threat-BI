# ============================================================
# ITBIS — Next.js Frontend Dockerfile
# ============================================================

# ── Stage 1: Dependencies ────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Install dependencies needed by node-gyp / sharp (if used)
RUN apk add --no-cache libc6-compat

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# ── Stage 2: Builder ─────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Receive build-time public env vars so Next.js can embed them
ARG NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Copy installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy all source files
COPY . .

# Build the production Next.js bundle
RUN npm run build

# ── Stage 3: Runner (production-optimised) ───────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy only the files needed to run the production server
COPY --from=builder /app/public ./public

# Leverage Next.js standalone output (if enabled in next.config)
# Falls back to standard .next + node_modules approach
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs

# Expose Next.js port
EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME="0.0.0.0"

# Health check — polls the Next.js root route
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
    CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npm", "run", "start"]
