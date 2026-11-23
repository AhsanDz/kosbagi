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
// Kelompok "periode November" (P4) men-deploy KosToken dan KosLedger baru di setiap putaran dari
// artifact contracts/artifacts/ (dibuat saat langkah 2 atau npx hardhat build), lalu memindahkan
// worker ke kontrak baru itu. Dengan begitu saldo pemegang di blok snapshot selalu persis angka
// angka November yang disepakati 16 Nov 2026 (pemilik lama 5.400, perbendaharaan 8.140, dst.) walau
// node yang sama dipakai berulang kali.
//
// BLOCKCHAIN_E2E_EXTERNAL_WORKER=1: worker tidak dijalankan di dalam test, tetapi diharapkan sudah
// berjalan sebagai proses terpisah (npx tsx src/worker.ts) dengan konfigurasi, basis data, dan
// Redis yang sama.
import { execSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { PrismaPg } from '@prisma/adapter-pg';
import { Contract, ContractFactory, type InterfaceAbi, JsonRpcProvider, sha256, toUtf8Bytes, type TransactionReceipt, Wallet } from 'ethers';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { calculatePeriod, distribute } from '../finance/index.js';
import { PrismaClient } from '../generated/prisma/client.js';
import type { OutboxJobType } from '../generated/prisma/enums.js';
import { type BlockchainQueue, createBlockchainQueue } from '../queue/blockchain-queue.js';
import { BLOCKCHAIN_QUEUE_NAME, type BlockchainJobData, parseJobPayload, paymentReference } from '../queue/jobs.js';
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

const state: {
  rentJob?: string;
  rentTx?: string;
  whitelistJob?: string;
  transferJob?: string;
  wallet?: string;
  investorId?: string;
  expensePayload?: ExpensePayload;
  expenseTx?: string;
} = {};

type ExpensePayload = BlockchainJobData<'RECORD_EXPENSE'>['payload'];

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

const waitForStatus = (outboxJobId: string, status: 'PENDING' | 'RECORDED' | 'FAILED') =>
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
async function paidRent(roomNumber: string, attempt = 1, period = PERIOD): Promise<{ outboxJobId: string; orderId: string }> {
  const tenant = await createUser('TENANT', `penghuni-${roomNumber.toLowerCase()}-${period}-${attempt}`);
  const room =
    (await db.room.findFirst({ where: { propertyId, number: roomNumber } })) ??
    (await db.room.create({ data: { propertyId, number: roomNumber, monthlyRentIdr: 1_500_000n, status: 'OCCUPIED' } }));
  const bill =
    (await db.bill.findFirst({ where: { roomId: room.id, period } })) ??
    (await db.bill.create({
      data: { roomId: room.id, tenantId: tenant.id, period, amountIdr: 1_500_000n, status: 'PAID', dueDate: new Date(), paidAt: new Date() },
    }));
  const orderId = `RENT-SMR01-${roomNumber}-${period}${attempt > 1 ? `-${attempt}` : ''}`;
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
        period,
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
        payload: { propertyCode: 'SMR01', roomNumber, period, amountIdr: 1_500_000, paymentRef: paymentReference(orderId) },
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

/**
 * Isi job RECORD_EXPENSE seperti yang ditulis jalur 2 saat pengelola mencatat biaya. Hash nota di
 * sini SHA-256 dari teks unik per putaran (di aplikasi: SHA-256 isi file nota).
 */
function expensePayload(period: string, category: number, amountIdr: number, label: string): ExpensePayload {
  return parseJobPayload('RECORD_EXPENSE', {
    propertyCode: 'SMR01',
    period,
    category,
    amountIdr,
    receiptHash: sha256(toUtf8Bytes(`nota uji ${RUN} ${label}`)),
  });
}

/** Isi baris FAILED seperti yang ditulis processor saat percobaan terakhir habis. */
function failedRow(outboxJobId: string, reference: string, txHash: string) {
  return {
    outboxJobId,
    reference,
    txHash,
    status: 'FAILED' as const,
    attempts: 5,
    lastError: 'Transaksi belum masuk blok setelah 180 detik; ditunggu lagi di percobaan berikutnya.',
  };
}

const CONTRACT_ARTIFACTS = new URL('../../../contracts/artifacts/contracts/', import.meta.url);

/** ABI dan bytecode hasil kompilasi Hardhat di contracts/. */
function loadArtifact(name: 'KosToken' | 'KosLedger'): { abi: InterfaceAbi; bytecode: string } {
  const file = new URL(`${name}.sol/${name}.json`, CONTRACT_ARTIFACTS);
  if (!existsSync(file)) throw new Error(`Artifact ${name} belum ada. Jalankan npx hardhat build di folder contracts/.`);
  return JSON.parse(readFileSync(file, 'utf8')) as { abi: InterfaceAbi; bytecode: string };
}

/** Menunggu job BullMQ dengan id tertentu selesai atau gagal, lalu mengembalikan keadaannya. */
async function settledJob(jobId: string, from: BlockchainQueue = queue) {
  return waitFor(
    async () => {
      const job = await from.getJob(jobId);
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

    // Tanpa cache supaya nonce dan saldo yang dibaca test selalu terbaru.
    provider = new JsonRpcProvider(config.rpcUrls[0], HARDHAT_CHAIN_ID, { staticNetwork: true, cacheTimeout: -1 });
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

  it('biaya: recordExpense tercatat dengan hash nota dan menambah total biaya periode', TIMEOUT, async () => {
    const before = await contracts.readPeriod(PERIOD_NUMBER);
    const payload = expensePayload(PERIOD, 1, 450_000, 'listrik');
    const outbox = await addOutbox('RECORD_EXPENSE', payload);

    const row = await waitForStatus(outbox.id, 'RECORDED');
    expect(row).toMatchObject({ reference: payload.receiptHash, txHash: expect.stringMatching(/^0x[0-9a-f]{64}$/) });
    state.expensePayload = payload;
    state.expenseTx = row?.txHash as string;

    await expect(contracts.isReceiptRecorded(payload.receiptHash)).resolves.toBe(true);
    await expect(contracts.readPeriod(PERIOD_NUMBER)).resolves.toMatchObject({ totalExpenses: before.totalExpenses + 450_000n, closed: false });
    const receipt = await receiptOf(state.expenseTx);
    expect(receipt.from).toBe(operator);
    const event = receipt.logs.map((log) => kosLedgerInterface.parseLog(log)).find((parsed) => parsed?.name === 'ExpenseRecorded');
    expect(event?.args.toArray()).toEqual([BigInt(PERIOD_NUMBER), 1n, payload.receiptHash, 450_000n]);
  });

  it('nota yang sama di baris outbox lain: isi sama selesai tanpa transaksi, isi berbeda gagal permanen', TIMEOUT, async () => {
    const payload = state.expensePayload as ExpensePayload;
    const nonceBefore = await operatorNonce();
    const totalBefore = (await contracts.readPeriod(PERIOD_NUMBER)).totalExpenses;

    // Baris outbox kedua untuk nota yang sama dengan isi sama: selesai tanpa transaksi. Tx asal
    // sudah tercatat di baris job pertama (tx_hash unik), jadi baris job kedua tanpa tx hash.
    const same = await addOutbox('RECORD_EXPENSE', payload);
    const sameRow = await waitForStatus(same.id, 'RECORDED');
    const original = await receiptOf(state.expenseTx as string);
    expect(sameRow).toMatchObject({ txHash: null, blockNumber: BigInt(original.blockNumber) });
    const settled = await settledJob(same.id);
    expect(settled?.returnvalue).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: state.expenseTx });

    // Nota yang sama dipakai untuk biaya lain: tidak boleh dianggap tercatat.
    const other = await addOutbox('RECORD_EXPENSE', { ...payload, amountIdr: 500_000 });
    const otherRow = await waitForStatus(other.id, 'FAILED');
    expect(otherRow).toMatchObject({ txHash: null, lastError: expect.stringContaining('Satu nota hanya bisa dicatat sekali') });
    await expect(settledJob(other.id)).resolves.toMatchObject({ state: 'failed', attemptsMade: 1 });

    await expect(operatorNonce()).resolves.toBe(nonceBefore);
    await expect(contracts.readPeriod(PERIOD_NUMBER)).resolves.toMatchObject({ totalExpenses: totalBefore });
  });

  it('Coba lagi admin: baris FAILED yang transaksinya ternyata sudah masuk blok diakui RECORDED, tanpa transaksi baru', TIMEOUT, async () => {
    const payload = expensePayload(PERIOD, 2, 250_000, 'kebersihan');
    // Baris DISPATCHED: dispatcher belum mengirimnya sampai "admin" menekan Coba lagi.
    const outbox = await addOutbox('RECORD_EXPENSE', payload, 'DISPATCHED');

    // Keadaan setelah percobaan terakhir habis: worker sudah menandatangani dan menyiarkan
    // transaksinya, tetapi receipt belum terlihat sehingga barisnya ditandai FAILED. Transaksi itu
    // ternyata masuk blok belakangan.
    const signer = new Wallet(HARDHAT_OPERATOR_KEY, provider);
    const sentTx = await signer.sendTransaction({
      to: config.ledgerAddress,
      data: kosLedgerInterface.encodeFunctionData('recordExpense', [PERIOD_NUMBER, 2, 250_000n, payload.receiptHash]),
    });
    const mined = await sentTx.wait();
    await db.chainTransaction.create({ data: failedRow(outbox.id, payload.receiptHash, sentTx.hash) });
    const nonceBefore = await operatorNonce();

    // Coba lagi: baris outbox dikembalikan ke antrean lewat dispatcher.
    await db.outboxJob.update({ where: { id: outbox.id }, data: { status: 'PENDING' } });
    const row = await waitForStatus(outbox.id, 'RECORDED');

    expect(row).toMatchObject({ txHash: sentTx.hash, blockNumber: BigInt(mined?.blockNumber ?? -1), lastError: null });
    await expect(db.chainTransaction.count({ where: { outboxJobId: outbox.id } })).resolves.toBe(1);
    await expect(operatorNonce()).resolves.toBe(nonceBefore);
    await expect(settledJob(outbox.id)).resolves.toMatchObject({ state: 'completed', returnvalue: { outcome: 'PREVIOUS_TX' } });
  });

  it('Coba lagi admin: transaksi dari baris FAILED yang masih di mempool ditunggu sampai masuk blok, tidak dikirim ulang', TIMEOUT, async () => {
    const payload = expensePayload(PERIOD, 3, 400_000, 'internet');
    const outbox = await addOutbox('RECORD_EXPENSE', payload, 'DISPATCHED');
    const nonceBefore = await operatorNonce();

    // Penambangan otomatis dimatikan supaya transaksinya tertahan di mempool.
    await provider.send('evm_setAutomine', [false]);
    try {
      const signer = new Wallet(HARDHAT_OPERATOR_KEY, provider);
      const sentTx = await signer.sendTransaction({
        to: config.ledgerAddress,
        data: kosLedgerInterface.encodeFunctionData('recordExpense', [PERIOD_NUMBER, 3, 400_000n, payload.receiptHash]),
      });
      await db.chainTransaction.create({ data: failedRow(outbox.id, payload.receiptHash, sentTx.hash) });

      await db.outboxJob.update({ where: { id: outbox.id }, data: { status: 'PENDING' } });
      // Worker menemukan transaksinya masih di mempool: baris kembali PENDING (Menunggu pencatatan).
      await waitForStatus(outbox.id, 'PENDING');
      await provider.send('evm_mine', []);

      const row = await waitForStatus(outbox.id, 'RECORDED');
      expect(row).toMatchObject({ txHash: sentTx.hash, lastError: null });
      await expect(db.chainTransaction.count({ where: { outboxJobId: outbox.id } })).resolves.toBe(1);
      await expect(operatorNonce()).resolves.toBe(nonceBefore + 1);
      await expect(provider.getTransactionCount(operator, 'pending')).resolves.toBe(nonceBefore + 1);
      await expect(contracts.isReceiptRecorded(payload.receiptHash)).resolves.toBe(true);
    } finally {
      await provider.send('evm_setAutomine', [true]);
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

  // Angka November yang disepakati 16 Nov 2026 (sama dengan Figma dan docs/bisnis/perhitungan-distribusi.md).
  // Butuh worker di dalam test, karena worker dipindah ke kontrak baru.
  describe.skipIf(external)('periode November di kontrak baru: angka keputusan 16 Nov 2026', () => {
    const NOV = '2026-11';
    const NOV_NUMBER = 202_611;
    const INVESTORS = [
      { label: 'Bagas', tokens: 1_800n, share: 789_750n },
      { label: 'Citra', tokens: 1_200n, share: 526_500n },
      { label: 'Eko', tokens: 800n, share: 351_000n },
      { label: 'Fajar', tokens: 560n, share: 245_700n },
      { label: 'Dimas', tokens: 100n, share: 43_875n },
    ];
    // Biaya persiapan Rp2.400.000 (contoh rincian; rincian demo ditulis skrip jalur 2) dan nota
    // perbaikan K07 Rp300.000 yang dicatat saat demo. Kode kategori: 1 Listrik dan air,
    // 2 Kebersihan, 3 Internet, 4 Perbaikan, 5 Keamanan.
    const EXPENSES = [
      { label: 'listrik-air', category: 1, amountIdr: 1_200_000 },
      { label: 'kebersihan', category: 2, amountIdr: 450_000 },
      { label: 'internet', category: 3, amountIdr: 400_000 },
      { label: 'keamanan', category: 5, amountIdr: 350_000 },
      { label: 'perbaikan-k07', category: 4, amountIdr: 300_000 },
    ];

    let nov: KosContracts;
    let novQueue: BlockchainQueue;
    let owner: string;
    let treasury: string;
    const wallets = new Map<string, string>();
    const novState: { closeJob?: string; closeTx?: string; snapshotBlock?: bigint; netRent?: bigint } = {};

    const novStatus = (outboxJobId: string, status: 'RECORDED' | 'FAILED') => waitForStatus(outboxJobId, status);

    beforeAll(async () => {
      const admin = new Wallet(HARDHAT_ADMIN_KEY, provider);
      ({ originalOwner: owner, treasury } = await contracts.readDeployment());
      const tokenArtifact = loadArtifact('KosToken');
      const ledgerArtifact = loadArtifact('KosLedger');

      // Parameter sama dengan modul Ignition lokal: pemilik lama 5.400, perbendaharaan 12.600,
      // fee 5%, pajak 22%. Hash dokumen dummy khusus test.
      const token = await new ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode, admin).deploy(
        'SMR01',
        sha256(toUtf8Bytes(`dummy: sertifikat uji ${RUN}`)),
        sha256(toUtf8Bytes(`dummy: laporan penilaian uji ${RUN}`)),
        admin.address,
        operator,
        owner,
        treasury,
        5_400n,
        12_600n,
      );
      await token.waitForDeployment();
      const tokenAddress = await token.getAddress();
      const ledger = await new ContractFactory(ledgerArtifact.abi, ledgerArtifact.bytecode, admin).deploy(
        admin.address,
        operator,
        tokenAddress,
        500n,
        2_200n,
      );
      await ledger.waitForDeployment();
      const ledgerAddress = await ledger.getAddress();

      const novConfig = parseBlockchainConfig({ ...WORKER_ENV, KOS_TOKEN_ADDRESS: tokenAddress, KOS_LEDGER_ADDRESS: ledgerAddress });
      nov = new KosContracts(tokenAddress, ledgerAddress, provider);

      // Worker dipindah ke kontrak baru. Worker lama dihentikan dulu supaya dispatcher-nya tidak
      // mengirim baris outbox November ke kontrak lama, dan kunci tunggalnya dilepas.
      await running?.stop();
      const queueName = `blockchain-e2e-nov-${RUN}`;
      running = await startBlockchainWorker({ config: novConfig, db, queueName, redisUrl: REDIS_URL, dispatchIntervalMs: 200, lockWaitMs: 0 });
      novQueue = createBlockchainQueue(queueName, { url: REDIS_URL, maxRetriesPerRequest: 1, enableOfflineQueue: false });
      await novQueue.waitUntilReady();
    }, 120_000);

    afterAll(async () => {
      await novQueue?.obliterate({ force: true }).catch(() => undefined);
      await novQueue?.close();
    });

    it('lima investor menerima token lewat WHITELIST_KYC lalu TRANSFER_TOKENS', TIMEOUT, async () => {
      const whitelistJobs: string[] = [];
      for (const investor of INVESTORS) {
        const user = await createUser('INVESTOR', `investor-${investor.label.toLowerCase()}`);
        const wallet = await addCustodialWallet(user.id, custodialIndex());
        wallets.set(investor.label, wallet.address);
        whitelistJobs.push((await addOutbox('WHITELIST_KYC', { walletAddress: wallet.address, approved: true })).id);
      }
      for (const jobId of whitelistJobs) await novStatus(jobId, 'RECORDED');

      const transferJobs: string[] = [];
      for (const investor of INVESTORS) {
        const payload = {
          propertyCode: 'SMR01',
          walletAddress: wallets.get(investor.label),
          tokenAmount: Number(investor.tokens),
          paymentRef: paymentReference(`BUY-SMR01-${RUN}-${investor.label}`),
        };
        transferJobs.push((await addOutbox('TRANSFER_TOKENS', payload)).id);
      }
      for (const jobId of transferJobs) await novStatus(jobId, 'RECORDED');

      for (const investor of INVESTORS) {
        await expect(nov.balanceOf(wallets.get(investor.label) as string), investor.label).resolves.toBe(investor.tokens);
      }
      await expect(nov.balanceOf(owner)).resolves.toBe(5_400n);
      await expect(nov.balanceOf(treasury)).resolves.toBe(8_140n);
    });

    it('sembilan sewa November tercatat: sewa kotor Rp13.500.000', TIMEOUT, async () => {
      const jobs: string[] = [];
      for (let room = 1; room <= 9; room += 1) {
        jobs.push((await paidRent(`K${String(room).padStart(2, '0')}`, 1, NOV)).outboxJobId);
      }
      for (const jobId of jobs) await novStatus(jobId, 'RECORDED');

      await expect(nov.readPeriod(NOV_NUMBER)).resolves.toMatchObject({ grossRent: 13_500_000n, totalExpenses: 0n, closed: false });
      await expect(nov.isRentRecorded(10, NOV_NUMBER)).resolves.toBe(false);
    });

    it('biaya November tercatat: persiapan Rp2.400.000 dan nota perbaikan K07 Rp300.000', TIMEOUT, async () => {
      const jobs: Array<{ id: string; payload: ExpensePayload }> = [];
      for (const expense of EXPENSES) {
        const payload = expensePayload(NOV, expense.category, expense.amountIdr, `nov-${expense.label}`);
        jobs.push({ id: (await addOutbox('RECORD_EXPENSE', payload)).id, payload });
      }
      for (const job of jobs) {
        const row = await novStatus(job.id, 'RECORDED');
        const receipt = await receiptOf(row?.txHash as string);
        const event = receipt.logs.map((log) => kosLedgerInterface.parseLog(log)).find((parsed) => parsed?.name === 'ExpenseRecorded');
        expect(event?.args.toArray()).toEqual([
          BigInt(NOV_NUMBER),
          BigInt(job.payload.category),
          job.payload.receiptHash,
          BigInt(job.payload.amountIdr),
        ]);
      }

      await expect(nov.readPeriod(NOV_NUMBER)).resolves.toMatchObject({ grossRent: 13_500_000n, totalExpenses: 2_700_000n, closed: false });
    });

    it('CLOSE_PERIOD menutup 2026-11 dengan angka bisnis dan hitungan jalur 1', TIMEOUT, async () => {
      const outbox = await addOutbox('CLOSE_PERIOD', { propertyCode: 'SMR01', period: NOV });
      const row = await novStatus(outbox.id, 'RECORDED');
      expect(row?.reference).toBe('SMR01:2026-11');
      novState.closeJob = outbox.id;
      novState.closeTx = row?.txHash as string;

      const receipt = await receiptOf(novState.closeTx);
      expect(receipt.from).toBe(operator);
      const record = await nov.readPeriod(NOV_NUMBER);
      expect(record).toEqual({
        grossRent: 13_500_000n,
        totalExpenses: 2_700_000n,
        platformFee: 675_000n,
        tax: 2_227_500n,
        netRent: 7_897_500n,
        totalSupply: 18_000n,
        valuePerTokenSen: 43_875n,
        snapshotBlock: BigInt(receipt.blockNumber - 1),
        closed: true,
      });
      // Laba kena pajak tidak disimpan kontrak: sewa kotor - fee - biaya.
      expect(record.grossRent - record.platformFee - record.totalExpenses).toBe(10_125_000n);
      novState.snapshotBlock = record.snapshotBlock;
      novState.netRent = record.netRent;

      // Kalkulator jalur 1 (src/finance) menghasilkan angka yang sama.
      const summary = calculatePeriod({ grossRent: 13_500_000n, totalExpenses: 2_700_000n, totalSupply: 18_000n });
      expect(summary).toMatchObject({
        platformFee: record.platformFee,
        taxableProfit: 10_125_000n,
        tax: record.tax,
        netRent: record.netRent,
        valuePerTokenSen: record.valuePerTokenSen,
      });

      const event = receipt.logs.map((log) => kosLedgerInterface.parseLog(log)).find((parsed) => parsed?.name === 'PeriodClosed');
      expect(event?.args.toArray()).toEqual([
        BigInt(NOV_NUMBER),
        13_500_000n,
        2_700_000n,
        675_000n,
        2_227_500n,
        7_897_500n,
        18_000n,
        43_875n,
        record.snapshotBlock,
      ]);
    });

    it('shareOf tiap pemegang di blok snapshot cocok dengan hitungan jalur 1, sisa pembulatan Rp0', TIMEOUT, async () => {
      const snapshot = novState.snapshotBlock as bigint;
      const getPastVotes = (address: string) => nov.token.getFunction('getPastVotes').staticCall(address, snapshot) as Promise<bigint>;
      const shareOf = (balance: bigint) => nov.ledger.getFunction('shareOf').staticCall(NOV_NUMBER, balance) as Promise<bigint>;

      const holders = [
        { label: 'Pemilik lama', address: owner, tokens: 5_400n, share: 2_369_250n },
        ...INVESTORS.map((investor) => ({ ...investor, address: wallets.get(investor.label) as string })),
        { label: 'Perbendaharaan (8.140 token belum terjual)', address: treasury, tokens: 8_140n, share: 3_571_425n },
      ];

      const onChain: Array<{ label: string; balance: bigint; share: bigint }> = [];
      for (const holder of holders) {
        const balance = await getPastVotes(holder.address);
        expect(balance, holder.label).toBe(holder.tokens);
        const share = await shareOf(balance);
        expect(share, holder.label).toBe(holder.share);
        onChain.push({ label: holder.label, balance, share });
      }

      // Kalkulator jalur 1 dengan saldo snapshot yang sama.
      const expected = distribute(
        novState.netRent as bigint,
        18_000n,
        onChain.map(({ label, balance }) => ({ label, balance })),
      );
      expect(expected.holders).toEqual(onChain);
      expect(expected.totalShares).toBe(7_897_500n);
      expect(expected.reserve).toBe(0n);
      // Keputusan 1: bagian perbendaharaan dikreditkan ke pemilik lama (dicatat jalur 2 saat distribusi).
      expect(2_369_250n + 3_571_425n).toBe(5_940_675n);
    });

    it('token yang pindah setelah penutupan tidak mengubah saldo di blok snapshot', TIMEOUT, async () => {
      const dimas = wallets.get('Dimas') as string;
      const outbox = await addOutbox('TRANSFER_TOKENS', {
        propertyCode: 'SMR01',
        walletAddress: dimas,
        tokenAmount: 100,
        paymentRef: paymentReference(`BUY-SMR01-${RUN}-Dimas-2`),
      });
      await novStatus(outbox.id, 'RECORDED');

      await expect(nov.balanceOf(dimas)).resolves.toBe(200n);
      await expect(nov.token.getFunction('getPastVotes').staticCall(dimas, novState.snapshotBlock)).resolves.toBe(100n);
    });

    it('tutup periode diminta lagi: selesai tanpa transaksi, tx asal ditemukan dari event PeriodClosed', TIMEOUT, async () => {
      const nonceBefore = await operatorNonce();
      const outbox = await addOutbox('CLOSE_PERIOD', { propertyCode: 'SMR01', period: NOV });

      const row = await novStatus(outbox.id, 'RECORDED');
      const closeReceipt = await receiptOf(novState.closeTx as string);
      expect(row).toMatchObject({ txHash: null, blockNumber: BigInt(closeReceipt.blockNumber) });
      const settled = await settledJob(outbox.id, novQueue);
      expect(settled?.returnvalue).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: novState.closeTx });
      await expect(operatorNonce()).resolves.toBe(nonceBefore);
    });

    it('biaya dan sewa yang datang setelah periode ditutup gagal permanen tanpa transaksi', TIMEOUT, async () => {
      const nonceBefore = await operatorNonce();
      const expense = await addOutbox('RECORD_EXPENSE', expensePayload(NOV, 4, 125_000, 'nov-telat'));
      const { outboxJobId: rentJob } = await paidRent('K10', 1, NOV);

      for (const jobId of [expense.id, rentJob]) {
        const row = await novStatus(jobId, 'FAILED');
        expect(row).toMatchObject({ txHash: null, lastError: expect.stringContaining('Periode sudah ditutup') });
        await expect(settledJob(jobId, novQueue)).resolves.toMatchObject({ state: 'failed', attemptsMade: 1 });
      }
      await expect(operatorNonce()).resolves.toBe(nonceBefore);
      await expect(nov.readPeriod(NOV_NUMBER)).resolves.toMatchObject({ grossRent: 13_500_000n, totalExpenses: 2_700_000n });
    });

    it('periode tanpa catatan tidak bisa ditutup: EmptyPeriod gagal permanen tanpa transaksi', TIMEOUT, async () => {
      const nonceBefore = await operatorNonce();
      const outbox = await addOutbox('CLOSE_PERIOD', { propertyCode: 'SMR01', period: '2026-12' });

      const row = await novStatus(outbox.id, 'FAILED');
      expect(row).toMatchObject({ txHash: null, lastError: expect.stringContaining('belum punya sewa maupun biaya') });
      await expect(settledJob(outbox.id, novQueue)).resolves.toMatchObject({ state: 'failed', attemptsMade: 1 });
      await expect(operatorNonce()).resolves.toBe(nonceBefore);
      await expect(nov.readPeriod(202_612)).resolves.toMatchObject({ closed: false });
    });
  });
});
