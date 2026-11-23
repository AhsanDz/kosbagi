// Bagian skrip demo P4: pesanan token dengan VA Core API (demo:siapkan-investor) dan skrip
// demo:catat-biaya yang dijalankan sungguhan sebagai proses terpisah terhadap server uji.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import type { Express } from 'express';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NOVEMBER_DEMO_EXPENSE, NOVEMBER_PREPARED_EXPENSES, notaPath } from '../../scripts/demo/data.js';
import { createApp } from '../../src/app.js';
import { AppError } from '../../src/lib/errors.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  continuePurchaseBankTransfer,
  openBankTransferAttempt,
  openPurchaseBankTransfer,
} from '../../src/modules/payments/bank-transfer.js';
import { MidtransUnavailableError } from '../../src/modules/payments/midtrans.js';
import { writeClosePeriodJob } from '../../src/queue/outbox.js';
import {
  approveInvestor,
  createOffering,
  createPaidPurchase,
  DEMO_PASSWORD,
  FakeMidtrans,
  notifyStatus,
  purchaseStatus,
  resetDatabase,
  seedFixture,
} from './helpers.js';

const run = promisify(execFile);
const BACKEND = fileURLToPath(new URL('../../', import.meta.url));

let app: Express;
let fake: FakeMidtrans;
let fixture: Awaited<ReturnType<typeof seedFixture>>;
let offeringId: string;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  fake = new FakeMidtrans();
  offeringId = (await createOffering(fixture.property.id)).id;
  await approveInvestor(fixture.investor);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('openPurchaseBankTransfer (demo:siapkan-investor)', () => {
  it('pesanan 1.800 token dengan VA Rp180.000.000, tanpa Snap, token disisihkan sampai batas bayar', async () => {
    const { purchaseId, attempt } = await openPurchaseBankTransfer(offeringId, fixture.investor.id, 1_800, 'bca');

    expect(attempt.kind).toBe('ready');
    if (attempt.kind !== 'ready') return;
    expect(attempt.payment).toMatchObject({ orderId: 'BUY-SMR01-0001', status: 'PENDING', snapToken: null, bank: 'bca' });
    expect(fake.createSnap).not.toHaveBeenCalled();
    expect(fake.charge.mock.calls[0]?.[0]).toMatchObject({
      orderId: 'BUY-SMR01-0001',
      amountIdr: 180_000_000n,
      itemName: 'Token KB-SMR01 x1800',
      bank: 'bca',
    });
    const purchase = await prisma.tokenPurchase.findUniqueOrThrow({ where: { id: purchaseId } });
    expect(purchase).toMatchObject({ status: 'PENDING_PAYMENT', tokenAmount: 1_800, reservedUntil: attempt.payment.expiresAt });

    // Jalankan ulang: VA yang sama dipakai lagi.
    const again = await continuePurchaseBankTransfer(purchaseId, fixture.investor.id, 'bca');
    expect(again).toMatchObject({ kind: 'ready', created: false, vaNumber: attempt.vaNumber });
    expect(fake.charge).toHaveBeenCalledOnce();

    // Pelunasan tetap lewat webhook biasa: pesanan PAID dan job TRANSFER_TOKENS.
    const settled = await notifyStatus(app, fake, 'BUY-SMR01-0001', purchaseStatus(1_800));
    expect(settled.body.data.outcome).toBe('SETTLED');
    expect(await prisma.outboxJob.count({ where: { type: 'TRANSFER_TOKENS' } })).toBe(1);
  });

  it('skenario 9 tetap ditolak sebelum VA dibuat: memegang 1.500, memesan 500', async () => {
    await createPaidPurchase(offeringId, fixture.investor.id, 1_500);

    const error = await openPurchaseBankTransfer(offeringId, fixture.investor.id, 500, 'bca').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ code: 'HOLDING_CAP_EXCEEDED', details: { remainingQuota: 300 } });
    expect(fake.charge).not.toHaveBeenCalled();
    expect(await prisma.payment.count({ where: { tokenPurchaseId: { not: null } } })).toBe(0);
  });

  it('order_id yang sudah dipakai di Midtrans dilewati ke sufiks -2', async () => {
    fake.setStatus('BUY-SMR01-0001', { transaction_status: 'expire', status_code: '407' });

    const { attempt } = await openPurchaseBankTransfer(offeringId, fixture.investor.id, 100, 'bca');

    expect(attempt).toMatchObject({ kind: 'ready', skippedOrderIds: ['BUY-SMR01-0001'], payment: { orderId: 'BUY-SMR01-0001-2' } });
  });

  it('VA gagal dibuat: sisihan dilepas dan skrip mendapat MIDTRANS_UNAVAILABLE untuk memecah pesanan', async () => {
    fake.charge.mockRejectedValueOnce(new MidtransUnavailableError('ditolak sandbox'));

    const error = await openPurchaseBankTransfer(offeringId, fixture.investor.id, 1_800, 'bca').catch((caught: unknown) => caught);

    expect(error).toMatchObject({ code: 'MIDTRANS_UNAVAILABLE' });
    expect(await prisma.tokenPurchase.findFirstOrThrow()).toMatchObject({ status: 'FAILED' });
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'FAILED' });

    // Pesanan pecahan berikutnya mendapat nomor baru dan kuota penuh lagi.
    const { attempt } = await openPurchaseBankTransfer(offeringId, fixture.investor.id, 900, 'bca');
    expect(attempt).toMatchObject({ kind: 'ready', payment: { orderId: 'BUY-SMR01-0002', amountIdr: 90_000_000n } });
  });
});

describe('openBankTransferAttempt (demo:bayar-sewa) setelah periode ditutup', () => {
  it('409 PERIOD_CLOSED tanpa VA', async () => {
    await prisma.$transaction(async (tx) => {
      const job = await writeClosePeriodJob(tx, { propertyCode: 'SMR01', period: '2026-11' });
      await tx.periodClosing.create({ data: { propertyId: fixture.property.id, period: '2026-11', outboxJobId: job.id, requestedById: fixture.admin.id } });
    });

    await expect(openBankTransferAttempt(fixture.bill.id, 'bca')).rejects.toMatchObject({ code: 'PERIOD_CLOSED' });
    expect(fake.charge).not.toHaveBeenCalled();
  });
});

describe('npm run demo:catat-biaya', () => {
  it('mencatat empat nota persiapan lewat API pengelola, dijalankan ulang tanpa ganda', { timeout: 120_000 }, async () => {
    const server = app.listen(0, '127.0.0.1');
    await new Promise((resolve) => server.once('listening', resolve));
    const { port } = server.address() as AddressInfo;
    const args = [
      '--import',
      'tsx',
      'scripts/demo-catat-biaya.ts',
      '--period',
      '2026-11',
      '--url',
      `http://127.0.0.1:${port}`,
      '--email',
      'pengelola@kosbagi.test',
      '--password',
      DEMO_PASSWORD,
    ];
    try {
      const first = await run(process.execPath, args, { cwd: BACKEND, env: process.env });
      const second = await run(process.execPath, args, { cwd: BACKEND, env: process.env });

      expect(first.stdout).toContain('Selesai: 4 biaya baru');
      expect(second.stdout).toContain('Selesai: 0 biaya baru');
      expect(second.stdout.match(/sudah tercatat/g)).toHaveLength(4);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    const expenses = await prisma.expense.findMany({ orderBy: { receiptDate: 'asc' } });
    expect(expenses.map((expense) => [expense.categoryCode, Number(expense.amountIdr), expense.receiptDate.toISOString().slice(0, 10)])).toEqual(
      NOVEMBER_PREPARED_EXPENSES.map((expense) => [expense.categoryCode, expense.amountIdr, expense.receiptDate]),
    );
    expect(expenses.reduce((sum, expense) => sum + expense.amountIdr, 0n)).toBe(2_400_000n);
    // Hash dihitung server dari isi file nota di repo; nota K07 tidak ikut.
    for (const [index, expected] of NOVEMBER_PREPARED_EXPENSES.entries()) {
      const content = await readFile(notaPath(expected.file));
      expect(expenses[index]?.receiptHash).toBe(`0x${createHash('sha256').update(content).digest('hex')}`);
    }
    const k07 = createHash('sha256').update(await readFile(notaPath(NOVEMBER_DEMO_EXPENSE.file))).digest('hex');
    expect(expenses.some((expense) => expense.receiptHash === `0x${k07}`)).toBe(false);
    expect(await prisma.outboxJob.count({ where: { type: 'RECORD_EXPENSE' } })).toBe(4);
  });
});
