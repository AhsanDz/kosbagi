// Rekonsiliasi lewat HTTP terhadap PostgreSQL dan jaringan Hardhat lokal sungguhan. Midtrans tetap
// ditiru, jadi test ini tidak pernah memanggil sandbox. Dilewati di `npm test` biasa.
//
// Cara menjalankan (setiap perintah dari folder kosbagi, terminal terpisah untuk Hardhat node):
//
//   1. backend/:    npm run db:up
//   2. contracts/:  npx hardhat build
//   3. contracts/:  npx hardhat node --port 8549                (biarkan jalan)
//   4. backend/:    RECONCILIATION_INTEGRATION=1 npx vitest run src/modules/reconciliation/reconciliation.integration.test.ts
//      PowerShell:  $env:RECONCILIATION_INTEGRATION=1; npx vitest run src/modules/reconciliation/reconciliation.integration.test.ts
//
// Test men-deploy KosToken dan KosLedger baru dari artefak contracts/artifacts setiap kali jalan,
// jadi Hardhat node tidak perlu di-deploy manual. Akun yang dipakai adalah akun bawaan Hardhat
// (kunci publik, khusus jaringan lokal): #0 admin, #1 operator, #2 pemilik lama, #3 perbendaharaan.
//
// Basis data bawaan kosbagi_j1 (dibuat dan dimigrasi otomatis). Test ini mengosongkan tabelnya,
// jadi namanya wajib berakhiran _j1 atau _e2e. Alamat lain lewat RECONCILIATION_DATABASE_URL dan
// RECONCILIATION_RPC_URL.
import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  type Contract,
  ContractFactory,
  HDNodeWallet,
  type InterfaceAbi,
  id as keccak256OfText,
  JsonRpcProvider,
  NonceManager,
  Wallet,
} from 'ethers';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from 'vitest';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { TransactionStatus } from '../payments/midtrans.js';

const enabled = process.env['RECONCILIATION_INTEGRATION'] === '1';
const DATABASE_URL =
  process.env['RECONCILIATION_DATABASE_URL'] ?? 'postgresql://kosbagi:kosbagi@localhost:5432/kosbagi_j1?schema=public';
const RPC_URL = process.env['RECONCILIATION_RPC_URL'] ?? 'http://127.0.0.1:8549';
const ARTIFACTS = new URL('../../../../contracts/artifacts/contracts/', import.meta.url);
/** Mnemonic publik bawaan Hardhat. Hanya untuk jaringan lokal. */
const HARDHAT_MNEMONIC = 'test test test test test test test test test test test junk';
const PERIOD = '2026-11';
const TIMEOUT = { timeout: 60_000 };

const account = (index: number) => HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, undefined, `m/44'/60'/0'/0/${index}`);

let db: PrismaClient;
let app: Express;
let provider: JsonRpcProvider;
let ledger: Contract;
let token: Contract;
let statusSpy: MockInstance<(orderId: string) => Promise<TransactionStatus | null>>;
const midtransAnswers = new Map<string, TransactionStatus>();
const txHashes = new Map<string, string>();

async function ensureDatabase(): Promise<void> {
  const url = new URL(DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_(j1|e2e)$/.test(name)) {
    throw new Error(`Test ini mengosongkan basis data; namanya harus berakhiran _j1 atau _e2e, bukan ${name}.`);
  }
  url.pathname = '/postgres';
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const existing = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (existing.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.$disconnect();
  }
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL }, stdio: 'pipe' });
}

async function deployContracts() {
  const read = async (name: string) =>
    JSON.parse(await readFile(new URL(`${name}.sol/${name}.json`, ARTIFACTS), 'utf8')) as { abi: InterfaceAbi; bytecode: string };
  const [tokenArtifact, ledgerArtifact] = await Promise.all([read('KosToken'), read('KosLedger')]);

  const admin = new NonceManager(new Wallet(account(0).privateKey, provider));
  const operator = account(1).address;
  const deployedToken = await new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, admin).deploy(
    'SMR01',
    keccak256OfText('uji: sertifikat'),
    keccak256OfText('uji: laporan penilaian'),
    account(0).address,
    operator,
    account(2).address,
    account(3).address,
    5_400n,
    12_600n,
  );
  await deployedToken.waitForDeployment();
  const deployedLedger = await new ContractFactory(ledgerArtifact.abi, ledgerArtifact.bytecode, admin).deploy(
    account(0).address,
    operator,
    await deployedToken.getAddress(),
    500n,
    2_200n,
  );
  await deployedLedger.waitForDeployment();

  const signer = new NonceManager(new Wallet(account(1).privateKey, provider));
  token = deployedToken.connect(signer) as Contract;
  ledger = deployedLedger.connect(signer) as Contract;
}

/** Mengirim transaksi operator dan mengembalikan tx hash serta nomor bloknya. */
async function send(contract: Contract, method: string, ...args: unknown[]) {
  const tx = await contract.getFunction(method)(...args);
  const receipt = await tx.wait();
  return { txHash: receipt.hash as string, blockNumber: receipt.blockNumber as number };
}

function midtransStatus(orderId: string, transactionStatus: string, grossAmount: string): void {
  midtransAnswers.set(orderId, {
    status_code: transactionStatus === 'settlement' ? '200' : '202',
    transaction_status: transactionStatus,
    gross_amount: grossAmount,
  });
}

async function seed(): Promise<void> {
  await db.$executeRaw`
    TRUNCATE TABLE chain_transactions, outbox_jobs, payment_anomalies, payments, token_purchases,
      offerings, custodial_wallets, kyc_submissions, owner_applications, bills, rooms, properties, users
    RESTART IDENTITY CASCADE`;

  const user = (name: string, email: string, role: 'ADMIN' | 'TENANT' | 'INVESTOR') =>
    db.user.create({ data: { name, email, role, passwordHash: 'tidak-dipakai' } });
  await user('Admin Uji', 'admin@uji.test', 'ADMIN');
  const investor = await user('Investor Uji', 'investor@uji.test', 'INVESTOR');
  const property = await db.property.create({
    data: {
      code: 'SMR01',
      slug: 'sumbersari-01',
      name: 'Kos Uji',
      address: 'Alamat uji',
      valuationIdr: 1_800_000_000n,
      tokenSymbol: 'KB-SMR01',
      totalTokens: 18_000,
      tokenPriceIdr: 100_000n,
      ownerTokens: 5_400,
      maxTokensPerInvestor: 1_800,
    },
  });

  const bill = async (room: string, period = PERIOD) => {
    const tenant = await user(`Penghuni ${room} ${period}`, `${room}.${period}@uji.test`, 'TENANT');
    const created = await db.room.upsert({
      where: { propertyId_number: { propertyId: property.id, number: room } },
      create: { propertyId: property.id, number: room, monthlyRentIdr: 1_500_000n, status: 'OCCUPIED', tenantId: tenant.id },
      update: {},
    });
    return db.bill.create({
      data: { roomId: created.id, tenantId: tenant.id, period, amountIdr: 1_500_000n, dueDate: new Date(`${period}-10`) },
    });
  };
  const payment = (orderId: string, data: Record<string, unknown>) =>
    db.payment.create({
      data: {
        orderId,
        amountIdr: 1_500_000n,
        expiresAt: new Date('2026-11-05T03:05:00.000Z'),
        createdAt: new Date('2026-11-05T03:00:00.000Z'),
        ...data,
      },
    });
  const job = (paymentId: string, type: 'RECORD_RENT' | 'TRANSFER_TOKENS', chainTx: Record<string, unknown> | null) =>
    db.outboxJob.create({
      data: {
        type,
        dedupeKey: `${type}:${paymentId}`,
        paymentId,
        payload: {},
        status: 'DISPATCHED',
        ...(chainTx ? { chainTransactions: { create: { reference: 'ref', ...chainTx } } } : {}),
      },
    });

  // K03: lunas dan tercatat. Cocok.
  const k03 = await bill('K03');
  const k03Payment = await payment('RENT-SMR01-K03-2026-11', { billId: k03.id, status: 'PAID', paidAt: new Date() });
  const k03Tx = await send(ledger, 'recordRent', 3, 202611, 1_500_000n, keccak256OfText('RENT-SMR01-K03-2026-11'));
  txHashes.set('K03', k03Tx.txHash);
  await job(k03Payment.id, 'RECORD_RENT', { status: 'RECORDED', ...k03Tx });
  midtransStatus('RENT-SMR01-K03-2026-11', 'settlement', '1500000.00');

  // K07: percobaan pertama kedaluwarsa (Cocok), percobaan kedua lunas dan tercatat. Blok di job
  // sengaja salah supaya pembaca kontrak mencari lokasi log sendiri.
  const k07 = await bill('K07');
  await payment('RENT-SMR01-K07-2026-11', { billId: k07.id, status: 'EXPIRED' });
  midtransStatus('RENT-SMR01-K07-2026-11', 'expire', '1500000.00');
  const k07Retry = await payment('RENT-SMR01-K07-2026-11-2', { billId: k07.id, attempt: 2, status: 'PAID', paidAt: new Date() });
  const k07Tx = await send(ledger, 'recordRent', 7, 202611, 1_500_000n, keccak256OfText('RENT-SMR01-K07-2026-11-2'));
  txHashes.set('K07', k07Tx.txHash);
  await job(k07Retry.id, 'RECORD_RENT', { status: 'RECORDED', txHash: k07Tx.txHash, blockNumber: 1n });
  midtransStatus('RENT-SMR01-K07-2026-11-2', 'settlement', '1500000.00');
  // Skenario 7: notifikasi bernominal palsu ditolak dan dicatat sebagai anomali, sedangkan ketiga
  // sumber tetap sepakat. Sengaja tanpa payment_id supaya pencarian anomali lewat order_id teruji.
  // Keputusan 20 November 2026: order beranomali tetap Selisih.
  await db.paymentAnomaly.create({
    data: {
      type: 'AMOUNT_MISMATCH',
      orderId: 'RENT-SMR01-K07-2026-11-2',
      expectedAmountIdr: 1_500_000n,
      receivedAmountIdr: 15_000n,
      providerStatus: 'settlement',
      note: 'Notifikasi 15000.00, API status 1500000.00.',
    },
  });

  // K08: lunas 14 Nov tetapi recordRent gagal. Selisih.
  const k08 = await bill('K08');
  const k08Payment = await payment('RENT-SMR01-K08-2026-11', { billId: k08.id, status: 'PAID', paidAt: new Date() });
  await job(k08Payment.id, 'RECORD_RENT', { status: 'FAILED', attempts: 5, lastError: 'nonce has already been used' });
  midtransStatus('RENT-SMR01-K08-2026-11', 'settlement', '1500000.00');

  // K10: nomor pertama sudah terpakai di Midtrans sebelum basis data ini ada (tidak ikut), percobaan
  // kedua belum memilih metode bayar (Midtrans 404). Cocok.
  const k10 = await bill('K10');
  await payment('RENT-SMR01-K10-2026-11', { billId: k10.id, status: 'FAILED', providerStatus: 'ORDER_ID_TAKEN' });
  midtransStatus('RENT-SMR01-K10-2026-11', 'settlement', '1500000.00');
  await payment('RENT-SMR01-K10-2026-11-2', { billId: k10.id, attempt: 2, status: 'PENDING' });

  // Tagihan Oktober tidak ikut periode November.
  const october = await bill('K03', '2026-10');
  await payment('RENT-SMR01-K03-2026-10', { billId: october.id, status: 'PAID' });

  // Order RENT tak dikenal: hanya ada anomali UNKNOWN_ORDER. November ikut (Selisih), Oktober tidak.
  await db.paymentAnomaly.create({ data: { type: 'UNKNOWN_ORDER', orderId: 'RENT-SMR01-K05-2026-11', receivedAmountIdr: 1_500_000n } });
  await db.paymentAnomaly.create({ data: { type: 'UNKNOWN_ORDER', orderId: 'RENT-SMR01-K05-2026-10', receivedAmountIdr: 1_500_000n } });
  midtransStatus('RENT-SMR01-K05-2026-11', 'settlement', '1500000.00');

  // Pembelian token.
  const wallet = account(5).address;
  await db.custodialWallet.create({ data: { userId: investor.id, address: wallet, derivationIndex: 5 } });
  await send(token, 'setKycStatus', wallet, true);
  const offering = await db.offering.create({
    data: { propertyId: property.id, tokensOffered: 12_600, closesAt: new Date('2026-12-31T16:59:00.000Z') },
  });
  const purchase = (orderNumber: string, status: 'PAID' | 'PENDING_PAYMENT' | 'FAILED') =>
    db.tokenPurchase.create({
      data: { offeringId: offering.id, investorId: investor.id, orderNumber, tokenAmount: 100, amountIdr: 10_000_000n, status },
    });
  const buyPayment = (orderId: string, tokenPurchaseId: string, status: 'PAID' | 'PENDING' | 'FAILED') =>
    payment(orderId, { tokenPurchaseId, billId: null, status, amountIdr: 10_000_000n, createdAt: new Date('2026-11-06T03:00:00.000Z') });

  // BUY-SMR01-0003: lunas dan token pindah. Cocok.
  const buy3 = await purchase('BUY-SMR01-0003', 'PAID');
  const buy3Payment = await buyPayment('BUY-SMR01-0003', buy3.id, 'PAID');
  const buy3Tx = await send(token, 'transferFromTreasury', wallet, 100n, keccak256OfText('BUY-SMR01-0003'));
  txHashes.set('BUY3', buy3Tx.txHash);
  await job(buy3Payment.id, 'TRANSFER_TOKENS', { status: 'RECORDED', ...buy3Tx });
  midtransStatus('BUY-SMR01-0003', 'settlement', '10000000.00');

  // BUY-SMR01-0004: Midtrans menyebut Rp20.000.000 untuk pesanan Rp10.000.000. Selisih.
  const buy4 = await purchase('BUY-SMR01-0004', 'PENDING_PAYMENT');
  const buy4Payment = await buyPayment('BUY-SMR01-0004', buy4.id, 'PENDING');
  await db.paymentAnomaly.create({
    data: {
      type: 'AMOUNT_MISMATCH',
      orderId: 'BUY-SMR01-0004',
      paymentId: buy4Payment.id,
      expectedAmountIdr: 10_000_000n,
      receivedAmountIdr: 20_000_000n,
      providerStatus: 'settlement',
      note: 'Notifikasi 20000000.00, API status 20000000.00.',
    },
  });
  midtransStatus('BUY-SMR01-0004', 'settlement', '20000000.00');

  // BUY-SMR01-0005: dibatalkan. Cocok.
  const buy5 = await purchase('BUY-SMR01-0005', 'FAILED');
  await buyPayment('BUY-SMR01-0005', buy5.id, 'FAILED');
  midtransStatus('BUY-SMR01-0005', 'cancel', '10000000.00');

}

async function adminToken(): Promise<string> {
  const { signAccessToken } = await import('../../lib/jwt.js');
  const admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@uji.test' } });
  return `Bearer ${(await signAccessToken({ id: admin.id, role: 'ADMIN' })).token}`;
}

describe.skipIf(!enabled)('rekonsiliasi dengan PostgreSQL dan Hardhat lokal', () => {
  beforeAll(async () => {
    await ensureDatabase();
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
    provider = new JsonRpcProvider(RPC_URL, 31_337, { staticNetwork: true, cacheTimeout: -1 });
    await deployContracts();
    await seed();

    // Variabel aplikasi dipasang sebelum kode aplikasi dimuat: src/config/env.ts membacanya sekali.
    process.env['DATABASE_URL'] = DATABASE_URL;
    process.env['SEPOLIA_RPC_URL'] = RPC_URL;
    process.env['CHAIN_ID'] = '31337';
    process.env['KOS_TOKEN_ADDRESS'] = await token.getAddress();
    process.env['KOS_LEDGER_ADDRESS'] = await ledger.getAddress();

    const { midtrans } = await import('../payments/midtrans.js');
    statusSpy = vi
      .spyOn(midtrans, 'getTransactionStatus')
      .mockImplementation(async (orderId) => midtransAnswers.get(orderId) ?? null);
    const { createApp } = await import('../../app.js');
    app = await createApp();
  }, TIMEOUT.timeout);

  afterAll(async () => {
    await db?.$disconnect();
    provider?.destroy();
    const prisma = await import('../../lib/prisma.js').catch(() => null);
    await prisma?.prisma.$disconnect();
  });

  it('mencocokkan setiap order November dari ketiga sumber', TIMEOUT, async () => {
    const res = await request(app).get(`/api/reconciliation?period=${PERIOD}`).set('Authorization', await adminToken());

    expect(res.status).toBe(200);
    const { period, summary, rows } = res.body.data;
    expect(period).toBe(PERIOD);
    expect(summary).toMatchObject({ total: 9, matched: 5, mismatched: 4 });
    expect(rows.map((row: { orderId: string; result: string }) => [row.orderId, row.result])).toEqual([
      ['RENT-SMR01-K03-2026-11', 'MATCH'],
      ['RENT-SMR01-K05-2026-11', 'MISMATCH'],
      ['RENT-SMR01-K07-2026-11', 'MATCH'],
      ['RENT-SMR01-K07-2026-11-2', 'MISMATCH'],
      ['RENT-SMR01-K08-2026-11', 'MISMATCH'],
      ['RENT-SMR01-K10-2026-11-2', 'MATCH'],
      ['BUY-SMR01-0003', 'MATCH'],
      ['BUY-SMR01-0004', 'MISMATCH'],
      ['BUY-SMR01-0005', 'MATCH'],
    ]);

    const byOrder = new Map(rows.map((row: { orderId: string }) => [row.orderId, row]));
    expect(byOrder.get('RENT-SMR01-K03-2026-11')).toMatchObject({
      amountIdr: 1_500_000,
      midtrans: { status: 'settlement', grossAmountIdr: 1_500_000 },
      database: { status: 'PAID', amountIdr: 1_500_000 },
      chain: { status: 'RECORDED', amountIdr: 1_500_000, txHash: txHashes.get('K03'), explorerUrl: null, jobStatus: 'RECORDED' },
    });
    // Blok yang salah di job tidak menghalangi: log dicari lewat KosContracts. Ketiga sumber sepakat,
    // tetapi anomali skenario 7 membuatnya Selisih tanpa menandai sumber mana pun.
    expect(byOrder.get('RENT-SMR01-K07-2026-11-2')).toMatchObject({
      chain: { status: 'RECORDED', amountIdr: 1_500_000, txHash: txHashes.get('K07') },
      flagged: [],
      reasons: ['Ada anomali AMOUNT_MISMATCH.'],
      anomalies: [expect.objectContaining({ type: 'AMOUNT_MISMATCH', note: 'Notifikasi 15000.00, API status 1500000.00.' })],
    });
    expect(byOrder.get('RENT-SMR01-K07-2026-11')).toMatchObject({
      midtrans: { status: 'expire' },
      database: { status: 'EXPIRED' },
      chain: { status: 'NONE' },
    });
    expect(byOrder.get('RENT-SMR01-K08-2026-11')).toMatchObject({
      chain: { status: 'PENDING', jobStatus: 'FAILED', lastError: 'nonce has already been used' },
      flagged: ['CHAIN'],
    });
    expect(byOrder.get('RENT-SMR01-K05-2026-11')).toMatchObject({
      amountIdr: 1_500_000,
      database: { status: 'NOT_FOUND', amountIdr: null },
      subject: { roomNumber: 'K05', period: PERIOD },
    });
    expect(byOrder.get('RENT-SMR01-K10-2026-11-2')).toMatchObject({ midtrans: { status: 'not_found' } });
    expect(byOrder.get('BUY-SMR01-0003')).toMatchObject({
      chain: { status: 'RECORDED', amountIdr: 10_000_000, txHash: txHashes.get('BUY3') },
      subject: { tokenAmount: 100 },
    });
    expect(byOrder.get('BUY-SMR01-0004')).toMatchObject({
      amountIdr: 10_000_000,
      midtrans: { status: 'settlement', grossAmountIdr: 20_000_000 },
      database: { status: 'PENDING', amountIdr: 10_000_000 },
      chain: { status: 'NONE' },
      flagged: ['MIDTRANS'],
      anomalies: [expect.objectContaining({ type: 'AMOUNT_MISMATCH', receivedAmountIdr: 20_000_000 })],
    });
    expect(byOrder.get('BUY-SMR01-0005')).toMatchObject({ midtrans: { status: 'cancel' }, database: { status: 'FAILED' } });
  });

  it('only=mismatch hanya menyaring baris, ringkasan tetap menghitung semua', TIMEOUT, async () => {
    const res = await request(app)
      .get(`/api/reconciliation?period=${PERIOD}&only=mismatch`)
      .set('Authorization', await adminToken());

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({ total: 9, mismatched: 4 });
    expect(res.body.data.rows.map((row: { orderId: string }) => row.orderId)).toEqual([
      'RENT-SMR01-K05-2026-11',
      'RENT-SMR01-K07-2026-11-2',
      'RENT-SMR01-K08-2026-11',
      'BUY-SMR01-0004',
    ]);
  });

  it('ringkasan untuk kartu Perlu perhatian memakai laporan yang sama dari cache', TIMEOUT, async () => {
    const before = statusSpy.mock.calls.length;
    const res = await request(app).get(`/api/reconciliation/summary?period=${PERIOD}`).set('Authorization', await adminToken());

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ total: 9, matched: 5, mismatched: 4, checkedAt: expect.any(String) });
    expect(statusSpy.mock.calls.length).toBe(before);
  });

  it('Periksa ulang menanyakan Midtrans lagi dan melihat perubahan terbaru', TIMEOUT, async () => {
    // Worker berhasil mencatat K08 lewat Coba lagi.
    const k08 = await send(ledger, 'recordRent', 8, 202611, 1_500_000n, keccak256OfText('RENT-SMR01-K08-2026-11'));
    const payment = await db.payment.findUniqueOrThrow({ where: { orderId: 'RENT-SMR01-K08-2026-11' }, include: { outboxJob: true } });
    await db.chainTransaction.create({
      data: { outboxJobId: payment.outboxJob!.id, reference: 'ref', status: 'RECORDED', ...k08, createdAt: new Date(Date.now() + 1_000) },
    });

    const before = statusSpy.mock.calls.length;
    const res = await request(app)
      .get(`/api/reconciliation/summary?period=${PERIOD}&refresh=1`)
      .set('Authorization', await adminToken());

    expect(res.body.data).toMatchObject({ total: 9, matched: 6, mismatched: 3 });
    expect(statusSpy.mock.calls.length).toBe(before + 9);
  });

  it('tanpa period memakai periode tagihan terbaru, bukan bulan berjalan', TIMEOUT, async () => {
    // Tagihan terbaru di data uji adalah November 2026; Oktober juga ada.
    const res = await request(app).get('/api/reconciliation/summary').set('Authorization', await adminToken());
    const full = await request(app).get('/api/reconciliation').set('Authorization', await adminToken());

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(9);
    expect(full.body.data.period).toBe(PERIOD);
  });

  it('periode tanpa transaksi', TIMEOUT, async () => {
    const res = await request(app).get('/api/reconciliation?period=2027-01').set('Authorization', await adminToken());
    expect(res.body.data).toMatchObject({ period: '2027-01', summary: { total: 0, matched: 0, mismatched: 0 }, rows: [] });
  });

  it('tidak mengubah data apa pun', TIMEOUT, async () => {
    const snapshot = async () =>
      Promise.all([
        db.payment.findMany({ orderBy: { orderId: 'asc' } }),
        db.bill.findMany({ orderBy: { id: 'asc' } }),
        db.tokenPurchase.findMany({ orderBy: { id: 'asc' } }),
        db.outboxJob.findMany({ orderBy: { id: 'asc' } }),
        db.paymentAnomaly.findMany({ orderBy: { id: 'asc' } }),
      ]);
    const before = await snapshot();
    await request(app).get(`/api/reconciliation?period=${PERIOD}&refresh=1`).set('Authorization', await adminToken());
    expect(await snapshot()).toEqual(before);
  });
});
