// Konfigurasi Prisma CLI (generate, migrate, db seed, studio).
// Prisma 7 tidak lagi membaca .env sendiri, jadi .env dimuat di sini.
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ quiet: true });

// Versi Prisma sengaja dipin di package.json. Saran "Update available ... prisma@latest" dari
// Prisma CLI disembunyikan karena tag latest di npm saat ini menunjuk versi 8 yang belum stabil.
process.env.PRISMA_HIDE_UPDATE_MESSAGE ??= 'true';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Data dummy Kos Sumbersari 01 (prisma/seed.ts, disusun mulai progress 2).
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // `prisma generate` dan `prisma validate` tidak butuh koneksi, jadi boleh kosong
    // saat npm install di laptop baru. Perintah migrate butuh DATABASE_URL di .env.
    url: process.env.DATABASE_URL ?? '',
  },
});
