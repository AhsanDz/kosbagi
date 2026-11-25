# Image backend KosBagi untuk deploy online (Railway; lihat docs/deploy/online.md).
# Satu image dipakai dua layanan:
#   API     perintah bawaan di bawah (isi skrip npm start), dengan pre-deploy: npm run db:deploy
#   worker  perintah start diganti menjadi: node --enable-source-maps dist/worker.js
#           (isi skrip npm run worker:start)
#
# Perintah start memanggil node langsung, bukan lewat npm. npm menjalankan skrip lewat sh, dan saat
# hosting mengirim SIGTERM, sh berhenti tanpa meneruskannya ke node. Akibatnya penutupan rapi
# (server.ts, worker.ts) tidak jalan, dan worker bisa terputus di tengah mengirim transaksi.
#
# Mencoba di laptop (dari folder backend/, setelah npm run db:up dan npm run db:deploy):
#   docker build -t kosbagi-backend .
#   docker run --rm -p 4001:4000 --network kosbagi_default --env-file .env \
#     -e NODE_ENV=production -e TRUST_PROXY=false -e JWT_SECRET=<nilai acak> \
#     -e "DATABASE_URL=postgresql://kosbagi:kosbagi@postgres:5432/kosbagi?schema=public" \
#     -e REDIS_URL=redis://redis:6379 kosbagi-backend
#   lalu buka http://localhost:4001/api/health
# Tiga hal yang berbeda dari npm run dev:
# - Nilai -e menimpa isi .env. JWT_SECRET contoh dari .env.example sengaja ditolak saat
#   NODE_ENV=production; buat nilai acak dengan perintah di .env.example.
# - localhost di dalam container menunjuk container itu sendiri, jadi PostgreSQL dan Redis dihubungi
#   lewat nama layanan docker-compose (postgres, redis) di jaringan kosbagi_default.
# - Port 4001 dipakai supaya tidak bentrok dengan npm run dev di port 4000.
# Di PowerShell, ganti \ di akhir baris dengan ` (backtick), atau tulis semuanya dalam satu baris.
#
# Isi .env tidak pernah masuk image (.dockerignore); semua variabel diberikan saat container jalan.

# ---- Tahap 1: pasang dependensi dan kompilasi TypeScript ----
FROM node:24.22.3-trixie-slim AS build
WORKDIR /app

# OpenSSL dibutuhkan mesin skema Prisma (prisma migrate deploy); image slim tidak membawanya.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Berkas dependensi lebih dulu, supaya lapisan npm ci dipakai ulang selama lockfile tidak berubah.
# Skema dan prisma.config.ts ikut karena npm ci menjalankan prisma generate (postinstall).
COPY package.json package-lock.json .npmrc prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build

# ---- Tahap 2: image yang dijalankan ----
FROM node:24.22.3-trixie-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production NPM_CONFIG_UPDATE_NOTIFIER=false

# Dependensi pengembangan sengaja ikut: CLI prisma (devDependency) dipakai pre-deploy untuk
# menjalankan migrasi, dan prisma.config.ts membutuhkan paket prisma/config.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma

# Folder nota bawaan (UPLOAD_DIR kosong). Di Railway folder ini diganti volume.
RUN mkdir -p uploads && chown node:node uploads

# Tidak berjalan sebagai root. Volume Railway dipasang milik root, jadi layanan API yang memakai
# volume perlu RAILWAY_RUN_UID=0 (lihat docs/deploy/online.md).
USER node

EXPOSE 4000
CMD ["node", "--enable-source-maps", "dist/server.js"]
