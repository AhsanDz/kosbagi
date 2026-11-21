// Alur penuh worker terhadap jaringan Hardhat lokal, PostgreSQL, dan Redis sungguhan.
// Dilewati di `npm test` biasa. Cara menjalankan ada di komentar bawah dan di PENJELASAN jalur 3:
//
//   1. contracts/:  npx hardhat node                    (port 8545, biarkan jalan)
//   2. contracts/:  npx hardhat ignition deploy ignition/modules/LocalDeployment.ts --network localhost
//   3. backend/:    BLOCKCHAIN_E2E=1 npx vitest run src/blockchain/local-chain.e2e.test.ts
//
// Konfigurasi worker di test ini tetap, tidak dibaca dari .env: RPC http://127.0.0.1:8545, CHAIN_ID
// 31337, operator akun #1 bawaan Hardhat, mnemonic bawaan Hardhat, dan alamat kontrak hasil deploy
// pertama di node yang baru dinyalakan (selalu sama karena diturunkan dari alamat dan nonce admin).
// Node di alamat lain bisa diberikan lewat BLOCKCHAIN_E2E_RPC_URL (mis. http://127.0.0.1:8547), dan
// alamat kontrak lain lewat BLOCKCHAIN_E2E_TOKEN_ADDRESS dan BLOCKCHAIN_E2E_LEDGER_ADDRESS.
//
// Basis data bawaan kosbagi_j3 dan Redis db 5, supaya data jalur lain tidak tersentuh. Test ini
// mengosongkan tabel basis data itu, jadi namanya wajib berakhiran _j3 atau _e2e.
//
// BLOCKCHAIN_E2E_EXTERNAL_WORKER=1: worker tidak dijalankan di dalam test, tetapi diharapkan sudah
// berjalan sebagai proses terpisah (npx tsx src/worker.ts) dengan konfigurasi, basis data, dan
// Redis yang sama.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Contract, JsonRpcProvider, type TransactionReceipt, Wallet } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '../generated/prisma/client.js';
import type { OutboxJobType } from '../generated/prisma/enums.js';
import { type BlockchainQueue, createBlockchainQueue } from '../queue/blockchain-queue.js';
import { BLOCKCHAIN_QUEUE_NAME, type BlockchainJobData, paymentReference } from '../queue/jobs.js';
import { writeRecordRentJob } from '../queue/outbox.js';
import { type BlockchainConfig, parseBlockchainConfig } from './config.js';
import { KosContracts, kosLedgerInterface, kosTokenInterface } from './contracts.js';
import { createCustodialDeriver } from './custodial-wallet.js';
import { HARDHAT_CHAIN_ID } from './networks.js';
import { HARDHAT_MNEMONIC, HARDHAT_OPERATOR_KEY } from './testing/fakes.js';
import { type RunningBlockchainWorker, startBlockchainWorker } from './worker-runtime.js';

const enabled = process.env['BLOCKCHAIN_E2E'] === '1';
const external = process.env['BLOCKCHAIN_E2E_EXTERNAL_WORKER'] === '1';
const DATABASE_URL =
  process.env['BLOCKCHAIN_E2E_DATABASE_URL'] ?? 'postgresql://kosbagi:kosbagi@localhost:5432/kosbagi_j3?schema=public';
const REDIS_URL = process.env['BLOCKCHAIN_E2E_REDIS_URL'] ?? 'redis://localhost:6379/5';
/** Akun #0 bawaan Hardhat: admin di modul Ignition lokal. Kunci publik, khusus jaringan lokal. */
const HARDHAT_ADMIN_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TIMEOUT = { timeout: 90_000 };

/** Variabel worker untuk Hardhat lokal. Tidak memakai process.env karena vitest.config.ts ikut mengisinya. */
const WORKER_ENV = {
  SEPOLIA_RPC_URL: process.env['BLOCKCHAIN_E2E_RPC_URL'] ?? 'http://127.0.0.1:8545',
  CHAIN_ID: String(31_337),
  OPERATOR_PRIVATE_KEY: HARDHAT_OPERATOR_KEY,
  CUSTODIAL_WALLET_MNEMONIC: HARDHAT_MNEMONIC,
  KOS_TOKEN_ADDRESS: process.env['BLOCKCHAIN_E2E_TOKEN_ADDRESS'] ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  KOS_LEDGER_ADDRESS: process.env['BLOCKCHAIN_E2E_LEDGER_ADDRESS'] ?? '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
};

let config: BlockchainConfig;
let db: PrismaClient;
let provider: JsonRpcProvider;
let contracts: KosContracts;
let queue: BlockchainQueue;
let running: RunningBlockchainWorker | undefined;
let operator: string;
let propertyId: string;

// Nilai unik per putaran: state kontrak di node lokal tetap ada walau basis data dikosongkan.
const year = 2100 + Math.floor(Math.random() * 7_800);
const month = 1 + Math.floor(Math.random() * 12);
const PERIOD = `${year}-${String(month).padStart(2, '0')}`;
const PERIOD_NUMBER = year * 100 + month;
const RUN = randomUUID().slice(0, 8);
const custodialIndex = () => 1_000 + Math.floor(Math.random() * 2_000_000_000);

const state: { rentJob?: string; rentTx?: string; whitelistJob?: string; transferJob?: string; wallet?: string; investorId?: string } = {};

async function ensureDatabase(): Promise<void> {
  const url = new URL(DATABASE_URL);
  const name = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_(j3|e2e)$/.test(name)) {
    throw new Error(`Test alur penuh mengosongkan basis data; namanya harus berakhiran _j3 atau _e2e, bukan ${name}.`);
  }
  url.pathname = '/postgres';
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const found = await admin.$queryRaw<unknown[]>`SELECT 1 FROM pg_database WHERE datname = ${name}`;
    if (found.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.$disconnect();
  }
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL }, stdio: 'pipe' });
}

async function latestChainTx(outboxJobId: string) {
  return db.chainTransaction.findFirst({ where: { outboxJobId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
}

async function waitFor<T>(read: () => Promise<T>, accept: (value: T) => boolean, label: string, timeoutMs = 45_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await read();
    if (accept(value)) return value;
    if (Date.now() > deadline) throw new Error(`Menunggu ${label} melewati batas waktu. Terakhir: ${JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))}`);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
}

const waitForStatus = (outboxJobId: string, status: 'RECORDED' | 'FAILED') =>
  waitFor(() => latestChainTx(outboxJobId), (row) => row?.status === status, `status ${status}`);

async function receiptOf(txHash: string): Promise<TransactionReceipt> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) throw new Error('receipt tidak ada');
  return receipt;
}

async function createUser(role: 'TENANT' | 'INVESTOR', label: string) {
  return db.user.create({ data: { name: `Uji ${label}`, email: `${label}.${RUN}@kosbagi.test`, role, passwordHash: 'tidak-dipakai' } });
}

/** Tagihan lunas dengan pembayaran Midtrans dan baris outbox RECORD_RENT, seperti hasil webhook. */
async function paidRent(roomNumber: string, attempt = 1): Promise<{ outboxJobId: string; orderId: string }> {
  const tenant = await createUser('TENANT', `penghuni-${roomNumber.toLowerCase()}-${attempt}`);
  const room =
    (await db.room.findFirst({ where: { propertyId, number: roomNumber } })) ??
    (await db.room.create({ data: { propertyId, number: roomNumber, monthlyRentIdr: 1_500_000n, status: 'OCCUPIED' } }));
  const bill =
    (await db.bill.findFirst({ where: { roomId: room.id, period: PERIOD } })) ??
    (await db.bill.create({
      data: { roomId: room.id, tenantId: tenant.id, period: PERIOD, amountIdr: 1_500_000n, status: 'PAID', dueDate: new Date(), paidAt: new Date() },
    }));
  const orderId = `RENT-SMR01-${roomNumber}-${PERIOD}${attempt > 1 ? `-${attempt}` : ''}`;
  const payment = await db.payment.create({
    data: {
      orderId,
      billId: bill.id,
      attempt,
      amountIdr: 1_500_000n,
      // Satu tagihan hanya boleh punya satu pembayaran PAID; percobaan kedua yang ikut lunas DUPLICATE_PAID.
      status: attempt === 1 ? 'PAID' : 'DUPLICATE_PAID',
      method: 'bank_transfer',
      expiresAt: new Date(),
      paidAt: new Date(),
    },
  });
  if (attempt === 1) {
    await db.$transaction((tx) =>
      writeRecordRentJob(tx, {
        billId: bill.id,
        paymentId: payment.id,
        orderId,
        propertyCode: 'SMR01',
        roomNumber,
        period: PERIOD,
        amountIdr: 1_500_000n,
      }),
    );
  } else {
    // Percobaan kedua yang ikut lunas: backend seharusnya mencatat anomali tanpa job. Baris ini
    // sengaja dibuat untuk menguji lapis terakhir di kontrak.
    await db.outboxJob.create({
      data: {
        type: 'RECORD_RENT',
        dedupeKey: `uji-sewa-ganda:${payment.id}`,
        paymentId: payment.id,
        payload: { propertyCode: 'SMR01', roomNumber, period: PERIOD, amountIdr: 1_500_000, paymentRef: paymentReference(orderId) },
      },
    });
  }
  const outbox = await db.outboxJob.findUniqueOrThrow({ where: { paymentId: payment.id } });
  return { outboxJobId: outbox.id, orderId };
}

async function addCustodialWallet(userId: string, index: number) {
  const deriver = createCustodialDeriver(config.custodialMnemonic as string);
  return db.custodialWallet.create({ data: { userId, address: deriver.addressAt(index), derivationIndex: index } });
}

async function addOutbox(type: OutboxJobType, payload: object, status: 'PENDING' | 'DISPATCHED' = 'PENDING') {
  return db.outboxJob.create({ data: { type, dedupeKey: `uji:${randomUUID()}`, payload, status } });
}

/** Menunggu job BullMQ dengan id tertentu selesai atau gagal, lalu mengembalikan keadaannya. */
async function settledJob(jobId: string) {
  return waitFor(
    async () => {
      const job = await queue.getJob(jobId);
      return job ? { state: await job.getState(), returnvalue: job.returnvalue, failedReason: job.failedReason, attemptsMade: job.attemptsMade } : null;
    },
    (value) => value?.state === 'completed' || value?.state === 'failed',
    `job ${jobId}`,
  );
}

const operatorNonce = () => provider.getTransactionCount(operator, 'latest');

/** Meloloskan karakter khusus regex, mis. titik di 127.0.0.1. */
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe.skipIf(!enabled)('alur penuh worker di Hardhat lokal', () => {
  beforeAll(async () => {
    config = parseBlockchainConfig(WORKER_ENV);
    if (config.chainId !== HARDHAT_CHAIN_ID) throw new Error('Test alur penuh hanya boleh memakai Hardhat lokal.');

    await ensureDatabase();
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL }) });
    await db.$executeRaw`
      TRUNCATE TABLE chain_transactions, outbox_jobs, payment_anomalies, payments, token_purchases,
        offerings, custodial_wallets, kyc_submissions, owner_applications, bills, rooms, properties, users
      RESTART IDENTITY CASCADE`;

    provider = new JsonRpcProvider(config.rpcUrls[0], HARDHAT_CHAIN_ID, { staticNetwork: true });
    contracts = new KosContracts(config.tokenAddress, config.ledgerAddress, provider);
    operator = new Wallet(config.operatorPrivateKey).address;

    const property = await db.property.create({
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
      },
    });
    propertyId = property.id;

    const queueName = external ? BLOCKCHAIN_QUEUE_NAME : `blockchain-e2e-${RUN}`;
    queue = createBlockchainQueue(queueName, { url: REDIS_URL, maxRetriesPerRequest: 1, enableOfflineQueue: false });
    await queue.waitUntilReady();
    if (!external) {
      running = await startBlockchainWorker({ config, db, queueName, redisUrl: REDIS_URL, dispatchIntervalMs: 200 });
    }
  }, 120_000);

  afterAll(async () => {
    await running?.stop();
    if (!external) await queue?.obliterate({ force: true }).catch(() => undefined);
    await queue?.close();
    provider?.destroy();
    await db?.$disconnect();
  });

  it('sewa lunas: recordRent tercatat di KosLedger dengan tx hash dan nomor blok', TIMEOUT, async () => {
    const { outboxJobId, orderId } = await paidRent('K03');
    state.rentJob = outboxJobId;

    const row = await waitForStatus(outboxJobId, 'RECORDED');
    expect(row?.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(row?.blockNumber).toBeGreaterThan(0n);
    expect(row?.reference).toBe(paymentReference(orderId));
    state.rentTx = row?.txHash as string;

    await expect(contracts.isPaymentRefRecorded(paymentReference(orderId))).resolves.toBe(true);
    await expect(contracts.isRentRecorded(3, PERIOD_NUMBER)).resolves.toBe(true);
    const receipt = await receiptOf(state.rentTx);
    expect(receipt.from).toBe(operator);
    const event = receipt.logs.map((log) => kosLedgerInterface.parseLog(log)).find((parsed) => parsed?.name === 'RentRecorded');
    expect(event?.args.toArray()).toEqual([BigInt(PERIOD_NUMBER), 3n, paymentReference(orderId), 1_500_000n]);
    await expect(db.outboxJob.findUniqueOrThrow({ where: { id: outboxJobId } })).resolves.toMatchObject({ status: 'DISPATCHED' });
  });

  it('KYC disetujui: dompet kustodian di-whitelist lewat setKycStatus', TIMEOUT, async () => {
    const investor = await createUser('INVESTOR', 'investor');
    state.investorId = investor.id;
    await db.kycSubmission.create({
      data: { userId: investor.id, fullName: 'Uji investor', dummyIdNumber: 'DUMMY-0001', status: 'APPROVED', reviewedAt: new Date() },
    });
    const wallet = await addCustodialWallet(investor.id, custodialIndex());
    state.wallet = wallet.address;
    const outbox = await addOutbox('WHITELIST_KYC', { walletAddress: wallet.address, approved: true });
    state.whitelistJob = outbox.id;

    const row = await waitForStatus(outbox.id, 'RECORDED');
    await expect(contracts.isKycApproved(wallet.address)).resolves.toBe(true);
    const receipt = await receiptOf(row?.txHash as string);
    const event = receipt.logs.map((log) => kosTokenInterface.parseLog(log)).find((parsed) => parsed?.name === 'KycStatusUpdated');
    expect(event?.args.toArray()).toEqual([wallet.address, true]);
  });

  it('pembelian lunas: transferFromTreasury memindahkan 100 token ke dompet kustodian', TIMEOUT, async () => {
    const wallet = state.wallet as string;
    const offering = await db.offering.create({ data: { propertyId, tokensOffered: 12_600, tokensSold: 100, closesAt: new Date('2026-12-31T16:59:00Z') } });
    const purchase = await db.tokenPurchase.create({
      data: { offeringId: offering.id, investorId: state.investorId as string, tokenAmount: 100, amountIdr: 10_000_000n, status: 'PAID' },
    });
    const orderId = `BUY-SMR01-${RUN}`;
    const payment = await db.payment.create({
      data: { orderId, tokenPurchaseId: purchase.id, amountIdr: 10_000_000n, status: 'PAID', expiresAt: new Date(), paidAt: new Date() },
    });
    const outbox = await db.outboxJob.create({
      data: {
        type: 'TRANSFER_TOKENS',
        dedupeKey: `transfer-tokens:${purchase.id}`,
        paymentId: payment.id,
        payload: { propertyCode: 'SMR01', walletAddress: wallet, tokenAmount: 100, paymentRef: paymentReference(orderId) },
      },
    });
    state.transferJob = outbox.id;

    const row = await waitForStatus(outbox.id, 'RECORDED');
    await expect(contracts.balanceOf(wallet)).resolves.toBe(100n);
    await expect(contracts.isPurchaseRefUsed(paymentReference(orderId))).resolves.toBe(true);
    const receipt = await receiptOf(row?.txHash as string);
    const event = receipt.logs.map((log) => kosTokenInterface.parseLog(log)).find((parsed) => parsed?.name === 'TreasuryTransfer');
    expect(event?.args.toArray()).toEqual([paymentReference(orderId), wallet, 100n]);
  });

  it('job yang diulang tidak mengirim transaksi kedua', TIMEOUT, async () => {
    const nonceBefore = await operatorNonce();
    const jobs = [
      [state.rentJob, 'RECORD_RENT'],
      [state.whitelistJob, 'WHITELIST_KYC'],
      [state.transferJob, 'TRANSFER_TOKENS'],
    ] as const;

    for (const [outboxJobId, type] of jobs) {
      const outbox = await db.outboxJob.findUniqueOrThrow({ where: { id: outboxJobId as string } });
      const data: BlockchainJobData = { outboxJobId: outbox.id, type, payload: outbox.payload as never };
      await queue.add(type, data, { jobId: `${outbox.id}-ulang` });
      const settled = await settledJob(`${outbox.id}-ulang`);
      expect(settled?.state).toBe('completed');
      expect(settled?.returnvalue).toMatchObject({ outcome: 'ALREADY_RECORDED' });
    }

    // Dispatcher mengirim baris yang sama lagi (mis. proses mati sebelum menandainya): BullMQ
    // mengabaikannya karena id job sama dengan id baris outbox.
    await db.outboxJob.update({ where: { id: state.rentJob as string }, data: { status: 'PENDING' } });
    await waitFor(() => db.outboxJob.findUniqueOrThrow({ where: { id: state.rentJob as string } }), (row) => row.status === 'DISPATCHED', 'dispatch ulang');
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    await expect(operatorNonce()).resolves.toBe(nonceBefore);
    for (const [outboxJobId] of jobs) {
      await expect(db.chainTransaction.count({ where: { outboxJobId: outboxJobId as string } })).resolves.toBe(1);
    }
    await expect(contracts.balanceOf(state.wallet as string)).resolves.toBe(100n);
  });

  it('riwayat transaksi di basis data hilang: worker tidak mengirim ulang dan menemukan tx asal dari log', TIMEOUT, async () => {
    const nonceBefore = await operatorNonce();
    await db.chainTransaction.deleteMany({ where: { outboxJobId: state.rentJob as string } });
    const outbox = await db.outboxJob.findUniqueOrThrow({ where: { id: state.rentJob as string } });

    await queue.add('RECORD_RENT', { outboxJobId: outbox.id, type: 'RECORD_RENT', payload: outbox.payload as never }, { jobId: `${outbox.id}-pulih` });
    const settled = await settledJob(`${outbox.id}-pulih`);

    expect(settled?.returnvalue).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: state.rentTx });
    await expect(latestChainTx(outbox.id)).resolves.toMatchObject({ status: 'RECORDED', txHash: state.rentTx });
    await expect(operatorNonce()).resolves.toBe(nonceBefore);
  });

  it('isi job di Redis dipalsukan: worker memakai isi outbox, token tidak ke alamat penyerang', TIMEOUT, async () => {
    const wallet = state.wallet as string;
    const attacker = Wallet.createRandom().address;
    const paymentRef = paymentReference(`BUY-SMR01-${RUN}-B`);
    // Baris sudah DISPATCHED supaya dispatcher tidak ikut mengirimnya; job dipalsukan langsung di Redis.
    const outbox = await addOutbox('TRANSFER_TOKENS', { propertyCode: 'SMR01', walletAddress: wallet, tokenAmount: 50, paymentRef }, 'DISPATCHED');
    const forged: BlockchainJobData = {
      outboxJobId: outbox.id,
      type: 'TRANSFER_TOKENS',
      payload: { propertyCode: 'SMR01', walletAddress: attacker, tokenAmount: 1_800, paymentRef },
    };

    await queue.add('TRANSFER_TOKENS', forged, { jobId: outbox.id });
    await settledJob(outbox.id);

    await expect(contracts.balanceOf(attacker)).resolves.toBe(0n);
    await expect(contracts.balanceOf(wallet)).resolves.toBe(150n);
  });

  it('kamar yang sudah tercatat lewat referensi lain: gagal permanen tanpa transaksi dan tanpa diulang', TIMEOUT, async () => {
    const nonceBefore = await operatorNonce();
    const { outboxJobId } = await paidRent('K03', 2);

    const row = await waitForStatus(outboxJobId, 'FAILED');
    expect(row).toMatchObject({ txHash: null, lastError: expect.stringContaining('referensi lain') });
    const settled = await settledJob(outboxJobId);
    expect(settled).toMatchObject({ state: 'failed', attemptsMade: 1 });
    await expect(operatorNonce()).resolves.toBe(nonceBefore);
  });

  it('dompet perbendaharaan tidak bisa dijadikan tujuan job, walau tercatat di tabel dompet', TIMEOUT, async () => {
    const treasury = running?.deployment.treasury ?? (await contracts.readDeployment()).treasury;
    const user = await createUser('INVESTOR', 'bukan-investor');
    // Dengan mnemonic bawaan Hardhat, indeks 3 adalah dompet perbendaharaan deploy lokal.
    const wallet = await addCustodialWallet(user.id, 3);
    expect(wallet.address).toBe(treasury);
    const outbox = await addOutbox('WHITELIST_KYC', { walletAddress: treasury, approved: false });

    const row = await waitForStatus(outbox.id, 'FAILED');
    expect(row?.lastError).toContain('perbendaharaan');
    await expect(contracts.isKycApproved(treasury)).resolves.toBe(true);
  });

  it('kontrak dijeda: job diulang dengan jeda dan tercatat setelah jeda dicabut', TIMEOUT, async () => {
    const admin = new Wallet(HARDHAT_ADMIN_KEY, provider);
    const ledger = new Contract(config.ledgerAddress, kosLedgerInterface, admin);
    await (await ledger.getFunction('pause')()).wait();
    try {
      const { outboxJobId } = await paidRent('K04');
      const waiting = await waitFor(() => latestChainTx(outboxJobId), (row) => Boolean(row?.lastError?.includes('dijeda')), 'pesan dijeda');
      expect(waiting?.status).toBe('PENDING');
      await (await ledger.getFunction('unpause')()).wait();

      const row = await waitForStatus(outboxJobId, 'RECORDED');
      expect(row?.attempts).toBeGreaterThanOrEqual(2);
      await expect(contracts.isRentRecorded(4, PERIOD_NUMBER)).resolves.toBe(true);
    } finally {
      if (await ledger.getFunction('paused')()) await (await ledger.getFunction('unpause')()).wait();
    }
  });

  it('worker kedua untuk dompet operator yang sama menolak jalan', TIMEOUT, async () => {
    await expect(
      startBlockchainWorker({ config, db, queueName: `blockchain-e2e-kedua-${RUN}`, redisUrl: REDIS_URL, lockWaitMs: 1_000 }),
    ).rejects.toThrow(/Worker blockchain lain sedang berjalan/);
  });

  it('worker menolak jalan bila CHAIN_ID tidak cocok dengan RPC atau alamat kontrak salah', TIMEOUT, async () => {
    const sepolia = parseBlockchainConfig({ ...WORKER_ENV, CHAIN_ID: '11155111' });
    // Host diambil dari URL RPC yang dipakai, supaya test tetap benar di port selain 8545.
    const rpcHost = escapeRegExp(new URL(WORKER_ENV.SEPOLIA_RPC_URL).host);
    await expect(startBlockchainWorker({ config: sepolia, db, redisUrl: REDIS_URL })).rejects.toThrow(
      new RegExp(`RPC menunjuk jaringan lain \\(RPC utama ${rpcHost} = 31337\\), padahal CHAIN_ID 11155111`),
    );

    const noCode = parseBlockchainConfig({ ...WORKER_ENV, KOS_TOKEN_ADDRESS: Wallet.createRandom().address });
    await expect(startBlockchainWorker({ config: noCode, db, redisUrl: REDIS_URL })).rejects.toThrow(
      'Tidak ada kontrak di KOS_TOKEN_ADDRESS pada jaringan Hardhat lokal.',
    );

    const swapped = parseBlockchainConfig({ ...WORKER_ENV, KOS_TOKEN_ADDRESS: config.ledgerAddress, KOS_LEDGER_ADDRESS: config.tokenAddress });
    await expect(startBlockchainWorker({ config: swapped, db, redisUrl: REDIS_URL })).rejects.toThrow(/tidak bisa dibaca sebagai KosToken/);
  });

  it.skipIf(external)('berhenti rapi dan melepas kunci, sehingga worker baru langsung bisa mengambil alih', TIMEOUT, async () => {
    await running?.stop();
    expect(running?.worker.isRunning()).toBe(false);
    running = await startBlockchainWorker({ config, db, queueName: `blockchain-e2e-${RUN}`, redisUrl: REDIS_URL, lockWaitMs: 0 });
    expect(running.operatorAddress).toBe(operator);
  });
});
