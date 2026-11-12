// Dijalankan sekali sebelum test integrasi: memastikan basis data test ada dan migrasinya terbaru.
// Sekaligus menguji bahwa semua migrasi bisa dipasang berurutan dari basis data kosong.
import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { TEST_DATABASE_URL } from './test-env.js';

async function ensureDatabaseExists(): Promise<void> {
  const url = new URL(TEST_DATABASE_URL);
  const databaseName = url.pathname.slice(1);
  if (!/^[a-z0-9_]+$/.test(databaseName)) throw new Error(`Nama basis data test tidak valid: ${databaseName}`);

  url.pathname = '/postgres';
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const existing = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${databaseName}`;
    if (existing.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${databaseName}"`);
  } catch (error) {
    throw new Error('PostgreSQL tidak bisa dihubungi. Jalankan npm run db:up di folder backend, lalu ulangi.', {
      cause: error,
    });
  } finally {
    await admin.$disconnect();
  }
}

export default async function setup(): Promise<void> {
  await ensureDatabaseExists();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'pipe',
  });
}
