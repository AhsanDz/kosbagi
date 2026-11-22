// Perlengkapan test integrasi P4: Kos Sumbersari 01 periode November 2026 dengan 10 kamar (K06
// kosong), pengelola, admin, investor, dan pembaca kontrak tiruan. Data dibuat langsung di basis
// data seperti hasil webhook dan worker, supaya test fokus pada aturan P4.
import { randomBytes } from 'node:crypto';
import type { ChainTransactionStatus } from '../../src/generated/prisma/enums.js';
import type { Role } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/lib/password.js';
import { prisma } from '../../src/lib/prisma.js';
import { deriveCustodialAddress } from '../../src/modules/kyc/wallet.js';
import { ChainUnavailableError, type LedgerPeriod, type LedgerReader, type TokenHolders } from '../../src/modules/periods/chain.js';
import { buildRentOrderId } from '../../src/modules/payments/order-id.js';
import {
  writeRecordExpenseJob,
  writeRecordRentJob,
  writeTransferTokensJob,
  writeWhitelistKycJob,
} from '../../src/queue/outbox.js';
import { DEMO_PASSWORD, TEST_MNEMONIC } from './helpers.js';

export const PERIOD = '2026-11';
export const RENT = 1_500_000n;
export const ROOM_NUMBERS = ['K01', 'K02', 'K03', 'K04', 'K05', 'K06', 'K07', 'K08', 'K09', 'K10'] as const;

let passwordHash: Promise<string> | undefined;

export async function createUser(name: string, email: string, role: Role) {
  passwordHash ??= hashPassword(DEMO_PASSWORD);
  return prisma.user.create({ data: { name, email, role, passwordHash: await passwordHash } });
}

/** 0x + 64 hex acak, untuk tx hash dan hash nota rekaan. */
export function randomHash(): string {
  return `0x${randomBytes(32).toString('hex')}`;
}

/** Menulis hasil worker untuk job: status transaksi chain terbaru. */
export async function setChain(
  outboxJobId: string,
  status: ChainTransactionStatus,
  options: { txHash?: string | null; blockNumber?: bigint | null; lastError?: string | null } = {},
) {
  const failed = status === 'FAILED';
  return prisma.chainTransaction.create({
    data: {
      outboxJobId,
      reference: 'uji',
      status,
      txHash: options.txHash === undefined ? (failed ? null : randomHash()) : options.txHash,
      blockNumber: options.blockNumber === undefined ? (status === 'RECORDED' ? 7_300_000n : null) : options.blockNumber,
      attempts: failed ? 5 : 1,
      lastError: options.lastError === undefined ? (failed ? 'RPC tidak menjawab.' : null) : options.lastError,
    },
  });
}

/** Kos Sumbersari 01: 10 kamar, K06 kosong, 9 tagihan November belum dibayar. */
export async function seedNovember() {
  const [manager, otherManager, admin, investor] = await Promise.all([
    createUser('Hadi Santoso', 'pengelola@kosbagi.test', 'MANAGER'),
    createUser('Pengelola Lain', 'pengelola.lain@kosbagi.test', 'MANAGER'),
    createUser('Laras Kusuma', 'admin@kosbagi.test', 'ADMIN'),
    createUser('Dimas Pratama', 'investor@kosbagi.test', 'INVESTOR'),
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
  const offering = await prisma.offering.create({
    data: { propertyId: property.id, tokensOffered: 12_600, closesAt: new Date('2026-12-31T16:59:00.000Z') },
  });

  const rooms = new Map<string, { id: string; tenantId: string | null }>();
  const bills = new Map<string, { id: string; tenantId: string }>();
  for (const number of ROOM_NUMBERS) {
    const vacant = number === 'K06';
    const tenant = vacant ? null : await createUser(`Penghuni ${number}`, `penghuni.${number.toLowerCase()}@kosbagi.test`, 'TENANT');
    const room = await prisma.room.create({
      data: { propertyId: property.id, number, monthlyRentIdr: RENT, status: vacant ? 'VACANT' : 'OCCUPIED', tenantId: tenant?.id ?? null },
    });
    rooms.set(number, { id: room.id, tenantId: tenant?.id ?? null });
    if (tenant) {
      const bill = await prisma.bill.create({
        data: { roomId: room.id, tenantId: tenant.id, period: PERIOD, amountIdr: RENT, dueDate: new Date(`${PERIOD}-10T00:00:00.000Z`) },
      });
      bills.set(number, { id: bill.id, tenantId: tenant.id });
    }
  }
  return { manager, otherManager, admin, investor, property, offering, rooms, bills };
}

export type November = Awaited<ReturnType<typeof seedNovember>>;

/**
 * Tagihan lunas seperti hasil webhook: percobaan PAID dan job RECORD_RENT. `chain` mengatur hasil
 * worker; NONE berarti worker belum mengerjakannya.
 */
export async function payRent(
  data: November,
  roomNumber: string,
  { chain = 'RECORDED', paidAt = new Date('2026-11-05T03:00:00.000Z') }: { chain?: ChainTransactionStatus | 'NONE'; paidAt?: Date } = {},
) {
  const bill = data.bills.get(roomNumber);
  if (!bill) throw new Error(`Kamar ${roomNumber} tidak punya tagihan`);
  const orderId = buildRentOrderId({ propertyCode: 'SMR01', roomNumber, period: PERIOD, attempt: 1 });
  const jobId = await prisma.$transaction(async (tx) => {
    await tx.bill.update({ where: { id: bill.id }, data: { status: 'PAID', paidAt } });
    const payment = await tx.payment.create({
      data: { orderId, billId: bill.id, attempt: 1, amountIdr: RENT, status: 'PAID', method: 'bank_transfer', bank: 'bca', expiresAt: paidAt, paidAt },
    });
    await writeRecordRentJob(tx, {
      billId: bill.id,
      paymentId: payment.id,
      orderId,
      propertyCode: 'SMR01',
      roomNumber,
      period: PERIOD,
      amountIdr: RENT,
    });
    return (await tx.outboxJob.findUniqueOrThrow({ where: { paymentId: payment.id } })).id;
  });
  if (chain !== 'NONE') await setChain(jobId, chain);
  return { orderId, jobId };
}

/** Biaya dengan job RECORD_EXPENSE, tanpa file (untuk test yang tidak mengunggah nota). */
export async function addExpense(
  data: November,
  { amountIdr, categoryCode = 1, chain = 'RECORDED', receiptHash = randomHash(), description = 'Biaya uji' }: {
    amountIdr: bigint;
    categoryCode?: number;
    chain?: ChainTransactionStatus | 'NONE';
    receiptHash?: string;
    description?: string;
  },
) {
  const expense = await prisma.$transaction(async (tx) => {
    const job = await writeRecordExpenseJob(tx, { propertyCode: 'SMR01', period: PERIOD, categoryCode, amountIdr, receiptHash });
    return tx.expense.create({
      data: {
        propertyId: data.property.id,
        period: PERIOD,
        categoryCode,
        description,
        amountIdr,
        receiptDate: new Date('2026-11-05T00:00:00.000Z'),
        receiptHash,
        fileName: 'nota.pdf',
        storedFileName: `${receiptHash.slice(2)}.pdf`,
        contentType: 'application/pdf',
        fileSizeBytes: 10,
        outboxJobId: job.id,
        createdById: data.manager.id,
      },
    });
  });
  if (chain !== 'NONE') await setChain(expense.outboxJobId, chain);
  return expense;
}

/** Empat biaya persiapan November (Rp2.400.000) dan nota perbaikan K07 (Rp300.000). */
export async function addNovemberExpenses(data: November, k07: ChainTransactionStatus | 'NONE' = 'RECORDED') {
  await addExpense(data, { amountIdr: 1_150_000n, categoryCode: 1 });
  await addExpense(data, { amountIdr: 600_000n, categoryCode: 2 });
  await addExpense(data, { amountIdr: 450_000n, categoryCode: 3 });
  await addExpense(data, { amountIdr: 200_000n, categoryCode: 5 });
  return addExpense(data, { amountIdr: 300_000n, categoryCode: 4, chain: k07, description: 'Ganti keran kamar mandi K07' });
}

/**
 * Investor lolos KYC dengan dompet kustodian dan pesanan lunas sejumlah `tokens` (0: tanpa pesanan).
 * `transfer` mengatur hasil worker untuk transferFromTreasury.
 */
export async function addHolder(
  data: November,
  user: { id: string; name: string } | { name: string; email: string },
  index: number,
  tokens: number,
  { transfer = 'RECORDED' as ChainTransactionStatus | 'NONE', sequence = index + 1 } = {},
) {
  const investor = 'id' in user ? user : await createUser(user.name, user.email, 'INVESTOR');
  const address = deriveCustodialAddress(TEST_MNEMONIC, index);
  await prisma.kycSubmission.create({
    data: { userId: investor.id, fullName: investor.name, dummyIdNumber: `DUMMY-${index}`, status: 'APPROVED', reviewedAt: new Date() },
  });
  await prisma.custodialWallet.create({ data: { userId: investor.id, address, derivationIndex: index } });
  if (tokens === 0) return { investor, address, orderId: null, transferJobId: null };
  const orderId = `BUY-SMR01-${String(sequence).padStart(4, '0')}`;
  const paidAt = new Date('2026-11-09T03:00:00.000Z');
  const jobId = await prisma.$transaction(async (tx) => {
    await writeWhitelistKycJob(tx, address);
    const purchase = await tx.tokenPurchase.create({
      data: {
        offeringId: data.offering.id,
        investorId: investor.id,
        orderNumber: orderId,
        tokenAmount: tokens,
        amountIdr: BigInt(tokens) * 100_000n,
        status: 'PAID',
        reservedUntil: paidAt,
      },
    });
    const payment = await tx.payment.create({
      data: { orderId, tokenPurchaseId: purchase.id, attempt: 1, amountIdr: purchase.amountIdr, status: 'PAID', expiresAt: paidAt, paidAt },
    });
    await writeTransferTokensJob(tx, {
      tokenPurchaseId: purchase.id,
      paymentId: payment.id,
      orderId,
      propertyCode: 'SMR01',
      walletAddress: address,
      tokenAmount: tokens,
    });
    return (await tx.outboxJob.findUniqueOrThrow({ where: { paymentId: payment.id } })).id;
  });
  const whitelist = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'WHITELIST_KYC', payload: { path: ['walletAddress'], equals: address } } });
  await setChain(whitelist.id, 'RECORDED');
  if (transfer !== 'NONE') await setChain(jobId, transfer);
  return { investor, address, orderId, transferJobId: jobId };
}

/** Angka KosLedger.periods(202611) setelah ditutup dengan sewa Rp13.500.000 dan biaya Rp2.700.000. */
export const NOVEMBER_CLOSED: LedgerPeriod = {
  grossRentIdr: 13_500_000n,
  totalExpensesIdr: 2_700_000n,
  platformFeeIdr: 675_000n,
  taxIdr: 2_227_500n,
  netRentIdr: 7_897_500n,
  totalSupply: 18_000,
  valuePerTokenSen: 43_875n,
  snapshotBlock: 7_312_884n,
  closed: true,
};

export const OWNER_WALLET = '0x2c900000000000000000000000000000000ea417';
export const TREASURY_WALLET = '0x7e5a00000000000000000000000000000000b001';

/** Pembaca kontrak tiruan. Saldo dibaca dari peta alamat (huruf kecil). */
export class FakeLedgerReader implements LedgerReader {
  period: LedgerPeriod = NOVEMBER_CLOSED;
  holders: TokenHolders = { propertyCode: 'SMR01', originalOwner: OWNER_WALLET, treasury: TREASURY_WALLET };
  readonly balances = new Map<string, bigint>();
  unavailable = false;
  readonly calls: string[] = [];

  setBalance(address: string, balance: bigint): void {
    this.balances.set(address.toLowerCase(), balance);
  }

  private check(what: string): void {
    this.calls.push(what);
    if (this.unavailable) throw new ChainUnavailableError('KosLedger gagal dibaca dari blockchain.');
  }

  async readPeriod(): Promise<LedgerPeriod> {
    this.check('readPeriod');
    return this.period;
  }

  async readHolders(): Promise<TokenHolders> {
    this.check('readHolders');
    return this.holders;
  }

  async pastBalances(addresses: readonly string[]): Promise<bigint[]> {
    this.check('pastBalances');
    return addresses.map((address) => this.balances.get(address.toLowerCase()) ?? 0n);
  }
}

/** Isi PDF kecil bertulisan DUMMY. `label` membuat hash tiap nota berbeda. */
export function dummyPdf(label: string): Buffer {
  return Buffer.from(`%PDF-1.4\n% NOTA DUMMY ${label}\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`);
}
