// Perlengkapan test integrasi: data uji kecil milik test sendiri, tiruan Midtrans, dan pengirim
// notifikasi bertanda tangan. Sengaja tidak memakai seed, supaya test tidak ikut berubah saat data
// demo berubah.
import type { Express } from 'express';
import request from 'supertest';
import { vi } from 'vitest';
import type { Role } from '../../src/generated/prisma/enums.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { hashPassword } from '../../src/lib/password.js';
import { prisma } from '../../src/lib/prisma.js';
import { midtrans, type TransactionStatus } from '../../src/modules/payments/midtrans.js';
import { computeSignature } from '../../src/modules/webhooks/signature.js';

export const SERVER_KEY = process.env['MIDTRANS_SERVER_KEY'] ?? '';
export const DEMO_PASSWORD = 'kata-sandi-uji';
export const RENT_IDR = 1_500_000;

// Hash dibuat sekali: scrypt sengaja lambat.
let passwordHash: Promise<string> | undefined;

/** Mengosongkan semua tabel aplikasi. Hanya menyentuh basis data test. */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRaw`
    TRUNCATE TABLE chain_transactions, outbox_jobs, payment_anomalies, payments, token_purchases,
      offerings, custodial_wallets, kyc_submissions, owner_applications, bills, rooms, properties, users
    RESTART IDENTITY CASCADE`;
}

async function createUser(name: string, email: string, role: Role) {
  passwordHash ??= hashPassword(DEMO_PASSWORD);
  return prisma.user.create({ data: { name, email, role, passwordHash: await passwordHash } });
}

/** Kos dengan dua penghuni, masing-masing satu tagihan belum dibayar, plus akun tiga peran lain. */
export async function seedFixture() {
  const [tenant, otherTenant, investor, manager, admin] = await Promise.all([
    createUser('Penghuni Uji', 'penghuni@kosbagi.test', 'TENANT'),
    createUser('Penghuni Lain', 'penghuni.lain@kosbagi.test', 'TENANT'),
    createUser('Investor Uji', 'investor@kosbagi.test', 'INVESTOR'),
    createUser('Pengelola Uji', 'pengelola@kosbagi.test', 'MANAGER'),
    createUser('Admin Uji', 'admin@kosbagi.test', 'ADMIN'),
  ]);

  const property = await prisma.property.create({
    data: {
      code: 'SMR01',
      slug: 'sumbersari-01',
      name: 'Kos Sumbersari 01',
      address: 'Jl. Sumbersari, Malang',
      valuationIdr: 1_800_000_000n,
      tokenSymbol: 'KB-SMR01',
      totalTokens: 18_000,
      tokenPriceIdr: 100_000n,
      ownerTokens: 5_400,
      maxTokensPerInvestor: 1_800,
      managerId: manager.id,
    },
  });

  const createRoom = (number: string, tenantId: string | null) =>
    prisma.room.create({
      data: {
        propertyId: property.id,
        number,
        monthlyRentIdr: BigInt(RENT_IDR),
        status: tenantId ? 'OCCUPIED' : 'VACANT',
        tenantId,
      },
    });
  const room = await createRoom('K03', tenant.id);
  const otherRoom = await createRoom('K04', otherTenant.id);
  await createRoom('K06', null);

  const createBill = (roomId: string, tenantId: string, period: string, dueDate: string) =>
    prisma.bill.create({
      data: { roomId, tenantId, period, amountIdr: BigInt(RENT_IDR), dueDate: new Date(dueDate) },
    });
  const bill = await createBill(room.id, tenant.id, '2026-11', '2026-11-10');
  const otherBill = await createBill(otherRoom.id, otherTenant.id, '2026-11', '2026-11-10');

  return { tenant, otherTenant, investor, manager, admin, property, room, otherRoom, bill, otherBill };
}

export async function bearer(user: { id: string; role: Role }): Promise<string> {
  return `Bearer ${(await signAccessToken(user)).token}`;
}

/** Keadaan Midtrans tiruan: API status menjawab dari sini, tanpa jaringan. */
export class FakeMidtrans {
  readonly transactions = new Map<string, TransactionStatus>();

  readonly createSnap = vi
    .spyOn(midtrans, 'createSnapTransaction')
    .mockImplementation(async ({ orderId }) => ({ token: `snap-${orderId}`, redirectUrl: `https://snap.test/${orderId}` }));

  readonly getStatus = vi
    .spyOn(midtrans, 'getTransactionStatus')
    .mockImplementation(async (orderId) => this.transactions.get(orderId) ?? null);

  /** Mengatur jawaban API status untuk `orderId`. */
  setStatus(orderId: string, overrides: Partial<TransactionStatus> = {}): TransactionStatus {
    const status: TransactionStatus = {
      status_code: '200',
      transaction_status: 'settlement',
      gross_amount: `${RENT_IDR}.00`,
      payment_type: 'bank_transfer',
      fraud_status: 'accept',
      transaction_id: `trx-${orderId}`,
      ...overrides,
    };
    this.transactions.set(orderId, status);
    return status;
  }
}

export function signedNotification(orderId: string, status: TransactionStatus) {
  const fields = { order_id: orderId, status_code: status.status_code, gross_amount: status.gross_amount };
  return {
    ...fields,
    transaction_status: status.transaction_status,
    payment_type: status.payment_type,
    signature_key: computeSignature(fields, SERVER_KEY),
  };
}

/** Mengirim notifikasi seperti Midtrans. */
export function deliver(app: Express, notification: object) {
  return request(app).post('/api/webhooks/midtrans').send(notification);
}

/** Mengatur status di Midtrans tiruan lalu mengirim notifikasinya. */
export function notifyStatus(
  app: Express,
  fake: FakeMidtrans,
  orderId: string,
  overrides: Partial<TransactionStatus> = {},
) {
  return deliver(app, signedNotification(orderId, fake.setStatus(orderId, overrides)));
}

/** Penghuni menekan Bayar. */
export async function startPayment(app: Express, billId: string, authorization: string) {
  return request(app).post(`/api/bills/${billId}/payments`).set('Authorization', authorization);
}

/** Ringkasan isi basis data untuk memastikan tidak ada yang berubah. */
export async function snapshotPaymentData(billId: string) {
  const [bill, payments, anomalies, outbox] = await Promise.all([
    prisma.bill.findUniqueOrThrow({ where: { id: billId } }),
    prisma.payment.findMany({ where: { billId }, orderBy: { attempt: 'asc' } }),
    prisma.paymentAnomaly.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.outboxJob.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);
  return { bill, payments, anomalies, outbox };
}
