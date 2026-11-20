// Percobaan virtual account untuk skrip demo:bayar-sewa. Pelunasannya tetap lewat webhook biasa.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { openBankTransferAttempt } from '../../src/modules/payments/bank-transfer.js';
import { MidtransUnavailableError, OrderIdTakenError } from '../../src/modules/payments/midtrans.js';
import { ORDER_ID_TAKEN } from '../../src/modules/payments/service.js';
import { bearer, FakeMidtrans, notifyStatus, resetDatabase, seedFixture, startPayment } from './helpers.js';

const ORDER_1 = 'RENT-SMR01-K03-2026-11';

let app: Express;
let fake: FakeMidtrans;
let fixture: Awaited<ReturnType<typeof seedFixture>>;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  fake = new FakeMidtrans();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('openBankTransferAttempt', () => {
  it('membuat VA lewat Core API dengan order_id dan batas bayar yang sama dengan tombol Bayar', async () => {
    const attempt = await openBankTransferAttempt(fixture.bill.id, 'bca');

    expect(attempt.kind).toBe('ready');
    if (attempt.kind !== 'ready') return;
    expect(attempt.created).toBe(true);
    expect(attempt.vaNumber).toMatch(/^\d+$/);
    expect(attempt.payment).toMatchObject({
      orderId: ORDER_1,
      status: 'PENDING',
      snapToken: null,
      providerTransactionId: `trx-${ORDER_1}`,
      bank: 'bca',
    });
    expect(fake.charge).toHaveBeenCalledOnce();
    expect(fake.charge.mock.calls[0]?.[0]).toMatchObject({ orderId: ORDER_1, amountIdr: 1_500_000n, bank: 'bca' });
    expect(fake.createSnap).not.toHaveBeenCalled();
  });

  it('jalankan ulang selama VA masih berlaku: VA yang sama dipakai lagi', async () => {
    const first = await openBankTransferAttempt(fixture.bill.id, 'bca');

    const second = await openBankTransferAttempt(fixture.bill.id, 'bca');

    expect(second).toMatchObject({ kind: 'ready', created: false });
    expect(second.kind === 'ready' && first.kind === 'ready' && second.vaNumber === first.vaNumber).toBe(true);
    expect(fake.charge).toHaveBeenCalledOnce();
  });

  it('VA kedaluwarsa: percobaan baru bersufiks -2', async () => {
    await openBankTransferAttempt(fixture.bill.id, 'bca');
    await prisma.payment.update({ where: { orderId: ORDER_1 }, data: { expiresAt: new Date(Date.now() - 1_000) } });

    const next = await openBankTransferAttempt(fixture.bill.id, 'bca');

    expect(next).toMatchObject({ kind: 'ready', created: true, payment: { orderId: `${ORDER_1}-2` } });
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({ status: 'EXPIRED' });
  });

  it('order_id terpakai di Midtrans dilewati: VA dibuat dengan sufiks -2', async () => {
    fake.setStatus(ORDER_1);

    const attempt = await openBankTransferAttempt(fixture.bill.id, 'bca');

    expect(attempt).toMatchObject({ kind: 'ready', created: true, skippedOrderIds: [ORDER_1], payment: { orderId: `${ORDER_1}-2` } });
    expect(fake.charge).toHaveBeenCalledOnce();
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({
      status: 'FAILED',
      providerStatus: ORDER_ID_TAKEN,
    });
  });

  it('Core API menolak dengan kode 406: percobaan itu dilewati', async () => {
    fake.charge.mockRejectedValueOnce(new OrderIdTakenError(ORDER_1));

    const attempt = await openBankTransferAttempt(fixture.bill.id, 'bca');

    expect(attempt).toMatchObject({ kind: 'ready', skippedOrderIds: [ORDER_1], payment: { orderId: `${ORDER_1}-2` } });
  });

  it('penghuni sedang membayar lewat Snap: tagihan dilewati tanpa mengganggu percobaannya', async () => {
    await startPayment(app, fixture.bill.id, await bearer(fixture.tenant));

    const attempt = await openBankTransferAttempt(fixture.bill.id, 'bca');

    expect(attempt).toMatchObject({ kind: 'busy', payment: { orderId: ORDER_1 } });
    expect(fake.charge).not.toHaveBeenCalled();
  });

  it('tagihan lunas: tidak ada yang dibuat', async () => {
    await prisma.bill.update({ where: { id: fixture.bill.id }, data: { status: 'PAID', paidAt: new Date() } });

    await expect(openBankTransferAttempt(fixture.bill.id, 'bca')).resolves.toEqual({ kind: 'already-paid' });
    await expect(prisma.payment.count()).resolves.toBe(0);
  });

  it('Midtrans gagal: percobaan FAILED dan error 502', async () => {
    fake.charge.mockRejectedValueOnce(new MidtransUnavailableError('putus'));

    await expect(openBankTransferAttempt(fixture.bill.id, 'bca')).rejects.toMatchObject({ code: 'MIDTRANS_UNAVAILABLE' });
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({ status: 'FAILED' });
  });

  it('dibayar lalu notifikasi masuk: lunas lewat webhook biasa dengan satu outbox', async () => {
    await openBankTransferAttempt(fixture.bill.id, 'bca');

    const res = await notifyStatus(app, fake, ORDER_1, { va_numbers: [{ bank: 'bca', va_number: '1' }] });

    expect(res.body.data.outcome).toBe('SETTLED');
    await expect(prisma.bill.findUniqueOrThrow({ where: { id: fixture.bill.id } })).resolves.toMatchObject({ status: 'PAID' });
    await expect(prisma.outboxJob.count({ where: { type: 'RECORD_RENT' } })).resolves.toBe(1);
  });

  it('tombol Bayar penghuni saat VA skrip masih aktif: VA ditutup dan Snap baru dibuat', async () => {
    await openBankTransferAttempt(fixture.bill.id, 'bca');

    const res = await startPayment(app, fixture.bill.id, await bearer(fixture.tenant));

    expect(res.status).toBe(201);
    expect(res.body.data.payment.orderId).toBe(`${ORDER_1}-2`);
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({ status: 'FAILED' });
    // Bila VA lama tetap dibayar, settlement tetap diterima seperti percobaan lain.
    const late = await request(app)
      .get(`/api/bills/${fixture.bill.id}`)
      .set('Authorization', await bearer(fixture.tenant));
    expect(late.body.data.bill.paymentState).toBe('PENDING');
  });
});
