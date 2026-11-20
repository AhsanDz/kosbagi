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
import { deriveCustodialAddress } from '../../src/modules/kyc/wallet.js';
import { midtrans, type TransactionStatus } from '../../src/modules/payments/midtrans.js';
import { computeSignature } from '../../src/modules/webhooks/signature.js';
import { whitelistDedupeKey } from '../../src/queue/outbox.js';

export const SERVER_KEY = process.env['MIDTRANS_SERVER_KEY'] ?? '';
export const DEMO_PASSWORD = 'kata-sandi-uji';
export const RENT_IDR = 1_500_000;
export const TOKEN_PRICE_IDR = 100_000;
/** Mnemonic uji publik bawaan Hardhat, sama dengan CUSTODIAL_WALLET_MNEMONIC di konfigurasi test. */
export const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

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

  /** Core API virtual account (skrip demo:bayar-sewa). Status pending langsung tercatat. */
  readonly charge = vi.spyOn(midtrans, 'chargeBankTransfer').mockImplementation(async ({ orderId, bank, amountIdr }) => {
    const vaNumber = `8800${orderId.length}${Number(amountIdr) % 1000}`;
    this.setStatus(orderId, {
      status_code: '201',
      transaction_status: 'pending',
      gross_amount: `${amountIdr}.00`,
      va_numbers: [{ bank, va_number: vaNumber }],
    });
    return { transactionId: `trx-${orderId}`, bank, vaNumber };
  });

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

/** Penawaran KB-SMR01 di properti fixture. */
export async function createOffering(
  propertyId: string,
  overrides: { tokensOffered?: number; tokensSold?: number; status?: 'OPEN' | 'CLOSED' | 'CANCELLED'; closesAt?: Date } = {},
) {
  return prisma.offering.create({
    data: {
      propertyId,
      tokensOffered: overrides.tokensOffered ?? 12_600,
      tokensSold: overrides.tokensSold ?? 0,
      status: overrides.status ?? 'OPEN',
      closesAt: overrides.closesAt ?? new Date('2026-12-31T16:59:00.000Z'),
    },
  });
}

/**
 * Investor yang sudah lolos KYC dengan dompet kustodian. `whitelist` mengatur status job
 * WHITELIST_KYC: RECORDED berarti dompet sudah tercatat di KosToken dan siap membeli.
 */
export async function approveInvestor(
  user: { id: string; name: string },
  { index = 0, whitelist = 'RECORDED' }: { index?: number; whitelist?: 'RECORDED' | 'PENDING' | 'NONE' } = {},
) {
  await prisma.kycSubmission.create({
    data: { userId: user.id, fullName: user.name, dummyIdNumber: `DUMMY-${index}`, status: 'APPROVED', reviewedAt: new Date() },
  });
  const wallet = await prisma.custodialWallet.create({
    data: { userId: user.id, derivationIndex: index, address: deriveCustodialAddress(TEST_MNEMONIC, index) },
  });
  if (whitelist !== 'NONE') {
    const job = await prisma.outboxJob.create({
      data: {
        type: 'WHITELIST_KYC',
        dedupeKey: whitelistDedupeKey(wallet.address),
        payload: { walletAddress: wallet.address, approved: true },
        status: 'DISPATCHED',
      },
    });
    if (whitelist === 'RECORDED') {
      await prisma.chainTransaction.create({
        data: { outboxJobId: job.id, reference: wallet.address, status: 'RECORDED', txHash: `0x${String(index).padStart(64, '3')}`, blockNumber: 7_140_552n },
      });
    }
  }
  return wallet;
}

/** Pesanan lunas yang dibuat langsung, untuk menyiapkan kepemilikan awal (mis. 1.500 token). */
export async function createPaidPurchase(offeringId: string, investorId: string, tokenAmount: number) {
  return prisma.tokenPurchase.create({
    data: {
      offeringId,
      investorId,
      tokenAmount,
      amountIdr: BigInt(tokenAmount * TOKEN_PRICE_IDR),
      status: 'PAID',
      reservedUntil: new Date(Date.now() - 60_000),
    },
  });
}

/** Status Midtrans settlement untuk pesanan token sejumlah `tokenAmount`. */
export function purchaseStatus(tokenAmount: number, overrides: Partial<TransactionStatus> = {}): Partial<TransactionStatus> {
  return { gross_amount: `${tokenAmount * TOKEN_PRICE_IDR}.00`, ...overrides };
}
