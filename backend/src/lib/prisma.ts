// Satu instance PrismaClient untuk seluruh proses. Setiap instance membuka pool koneksi
// sendiri, jadi modul lain cukup mengimpor `prisma` dari file ini, jangan membuat baru.
// Koneksi baru dibuka saat query pertama, sehingga mengimpor file ini tidak butuh
// PostgreSQL yang sedang jalan.
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';
import { PrismaClient } from '../generated/prisma/client.js';

// Prisma 7 terhubung ke PostgreSQL lewat driver adapter (paket `pg`).
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
