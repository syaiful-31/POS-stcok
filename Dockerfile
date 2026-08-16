# Develer POS — image produksi monolitik (Next.js + SQLite via Drizzle).
# Data persisten di volume /app/data.
#
# Catatan: python3/make/g++ dipasang di stage deps & runner karena
# better-sqlite3 adalah native module — bila prebuilt tidak tersedia untuk
# platform/ABI target, npm ci/rebuild harus bisa mengompilasi dari sumber.

# ---------- stage 1: dependensi ----------
FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------- stage 2: build ----------
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- stage 3: runtime ----------
FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

# build tools untuk rebuild native module better-sqlite3 di stage ini
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/src/db ./src/db
COPY --from=build /app/src/lib ./src/lib
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh \
  && npm rebuild better-sqlite3

VOLUME /app/data
EXPOSE 3000

# cek kesehatan: server Next menjawab pada port 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/login').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
