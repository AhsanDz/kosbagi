// Mengisi basis data dengan data dummy Kos Sumbersari 01. Jalankan: npm run db:seed
//
// Seed idempoten, jadi aman dijalankan berulang:
// - akun, properti, dan kamar disamakan dengan prisma/seed/data.ts;
// - tagihan hanya dibuat bila belum ada. Tagihan yang sudah ada tidak disentuh, sehingga
//   pembayaran yang terjadi saat demo tidak kembali menjadi belum dibayar.
//
// Sengaja membuat PrismaClient sendiri, tidak memakai src/lib/prisma.ts, karena file itu
// memvalidasi seluruh environment server. Seed hanya butuh DATABASE_URL.
import { PrismaPg } from '@prisma/adapter-pg';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword, verifyPassword } from '../src/lib/password.js';
import {
  DEMO_PASSWORD,
  MANAGER_ACCOUNT,
  MONTHLY_RENT_IDR,
  SEED_ACCOUNTS,
  SEED_BILLS,
  SEED_PROPERTY,
  SEED_ROOMS,
} from './seed/data.js';

// Nilai yang sudah ada di environment shell tidak ditimpa oleh .env.
loadEnv({ quiet: true });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL belum diisi. Salin backend/.env.example menjadi backend/.env, lalu ulangi.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

/**
 * Hash kata sandi tiap akun. Hash lama dipakai lagi selama masih cocok dengan DEMO_PASSWORD;
 * bila tidak cocok, dibuat hash baru sehingga kata sandi demo selalu berlaku setelah seed.
 * Dikerjakan di luar transaksi karena scrypt lambat.
 */
async function buildPasswordHashes(): Promise<Map<string, string>> {
  const existing = await prisma.user.findMany({
    where: { email: { in: SEED_ACCOUNTS.map((account) => account.email) } },
    select: { email: true, passwordHash: true },
  });
  const storedHashes = new Map(existing.map((user) => [user.email, user.passwordHash]));

  const hashes = new Map<string, string>();
  for (const { email } of SEED_ACCOUNTS) {
    const stored = storedHashes.get(email);
    const stillValid = stored !== undefined && (await verifyPassword(DEMO_PASSWORD, stored));
    hashes.set(email, stillValid ? stored : await hashPassword(DEMO_PASSWORD));
  }
  return hashes;
}

async function main(): Promise<void> {
  const passwordHashes = await buildPasswordHashes();

  const summary = await prisma.$transaction(
    async (tx) => {
      const userIdByEmail = new Map<string, string>();
      for (const account of SEED_ACCOUNTS) {
        const passwordHash = passwordHashes.get(account.email);
        if (!passwordHash) throw new Error(`Hash kata sandi ${account.email} tidak ditemukan.`);

        const user = await tx.user.upsert({
          where: { email: account.email },
          create: { ...account, passwordHash },
          update: { name: account.name, role: account.role, passwordHash },
          select: { id: true },
        });
        userIdByEmail.set(account.email, user.id);
      }

      const findUserId = (email: string): string => {
        const id = userIdByEmail.get(email);
        if (!id) throw new Error(`Akun ${email} tidak ada di data seed.`);
        return id;
      };

      const managerId = findUserId(MANAGER_ACCOUNT.email);
      const property = await tx.property.upsert({
        where: { code: SEED_PROPERTY.code },
        create: { ...SEED_PROPERTY, managerId },
        update: { ...SEED_PROPERTY, managerId },
        select: { id: true },
      });

      const roomByNumber = new Map<string, { id: string; tenantId: string | null }>();
      for (const room of SEED_ROOMS) {
        const tenantId = room.tenantEmail ? findUserId(room.tenantEmail) : null;
        const fields = { monthlyRentIdr: MONTHLY_RENT_IDR, status: room.status, tenantId };
        const saved = await tx.room.upsert({
          where: { propertyId_number: { propertyId: property.id, number: room.number } },
          create: { propertyId: property.id, number: room.number, ...fields },
          update: fields,
          select: { id: true, tenantId: true },
        });
        roomByNumber.set(room.number, saved);
      }

      const billsBefore = await tx.bill.count();
      for (const { room: roomNumber, ...bill } of SEED_BILLS) {
        const room = roomByNumber.get(roomNumber);
        if (!room?.tenantId) throw new Error(`Tagihan ${roomNumber} ${bill.period} menunjuk kamar tanpa penghuni.`);

        // `update: {}` disengaja: tagihan yang sudah ada dibiarkan apa adanya.
        await tx.bill.upsert({
          where: { roomId_period: { roomId: room.id, period: bill.period } },
          create: { ...bill, roomId: room.id, tenantId: room.tenantId },
          update: {},
          select: { id: true },
        });
      }
      const billsAfter = await tx.bill.count();

      return {
        accounts: SEED_ACCOUNTS.length,
        rooms: SEED_ROOMS.length,
        billsCreated: billsAfter - billsBefore,
        billsKept: SEED_BILLS.length - (billsAfter - billsBefore),
      };
    },
    { timeout: 30_000 },
  );

  console.log(
    `Seed selesai: ${summary.accounts} akun, 1 properti, ${summary.rooms} kamar, ` +
      `${summary.billsCreated} tagihan baru, ${summary.billsKept} tagihan lama dibiarkan.`,
  );
  console.log(`Kata sandi semua akun demo: ${DEMO_PASSWORD}`);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
