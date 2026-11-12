// Skenario uji 1 sampai 7 proposal (Tabel 4.3) dan kasus tepi pembayaran, lewat HTTP dengan
// PostgreSQL sungguhan. Hanya Midtrans yang ditiru.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { midtrans, MidtransUnavailableError } from '../../src/modules/payments/midtrans.js';
import { paymentReference } from '../../src/queue/jobs.js';
import {
  bearer,
  deliver,
  FakeMidtrans,
  notifyStatus,
  RENT_IDR,
  resetDatabase,
  seedFixture,
  signedNotification,
  snapshotPaymentData,
  startPayment,
} from './helpers.js';

const ORDER_1 = 'RENT-SMR01-K03-2026-11';
const ORDER_2 = 'RENT-SMR01-K03-2026-11-2';

let app: Express;
let fake: FakeMidtrans;
let fixture: Awaited<ReturnType<typeof seedFixture>>;
let authorization: string;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  authorization = await bearer(fixture.tenant);
  fake = new FakeMidtrans();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function readBill() {
  const res = await request(app).get(`/api/bills/${fixture.bill.id}`).set('Authorization', authorization);
  expect(res.status).toBe(200);
  return res.body.data.bill;
}

/** Percobaan yang sudah gagal lewat notifikasi cancel, lalu percobaan kedua dibuat. */
async function createSecondAttempt() {
  await startPayment(app, fixture.bill.id, authorization);
  await notifyStatus(app, fake, ORDER_1, { status_code: '202', transaction_status: 'cancel' });
  const res = await startPayment(app, fixture.bill.id, authorization);
  expect(res.body.data.payment.orderId).toBe(ORDER_2);
}

describe('membuat pembayaran', () => {
  it('percobaan pertama: 201, order_id tanpa sufiks, batas 5 menit, tersimpan PENDING', async () => {
    const before = Date.now();
    const res = await startPayment(app, fixture.bill.id, authorization);

    expect(res.status).toBe(201);
    expect(res.body.data.payment).toMatchObject({
      orderId: ORDER_1,
      amountIdr: RENT_IDR,
      status: 'PENDING',
      method: null,
      paidAt: null,
      snapToken: `snap-${ORDER_1}`,
    });

    const expiresAt = Date.parse(res.body.data.payment.expiresAt);
    expect(expiresAt - before).toBeGreaterThanOrEqual(5 * 60_000 - 1_000);
    expect(expiresAt - before).toBeLessThanOrEqual(5 * 60_000 + 5_000);

    expect(fake.createSnap).toHaveBeenCalledOnce();
    expect(fake.createSnap.mock.calls[0]?.[0]).toMatchObject({
      orderId: ORDER_1,
      amountIdr: BigInt(RENT_IDR),
      itemName: 'Sewa K03 2026-11',
    });
    await expect(readBill()).resolves.toMatchObject({ status: 'UNPAID', paymentState: 'PENDING' });
  });

  it('percobaan aktif dipakai lagi: 200, token sama, tanpa transaksi Midtrans baru', async () => {
    const first = await startPayment(app, fixture.bill.id, authorization);
    const second = await startPayment(app, fixture.bill.id, authorization);

    expect(second.status).toBe(200);
    expect(second.body.data.payment).toEqual(first.body.data.payment);
    expect(fake.createSnap).toHaveBeenCalledOnce();
  });

  it('dua klik bersamaan menghasilkan satu percobaan dan token yang sama', async () => {
    const results = await Promise.all([
      startPayment(app, fixture.bill.id, authorization),
      startPayment(app, fixture.bill.id, authorization),
    ]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 201]);
    expect(results[0]?.body.data.payment.snapToken).toBe(results[1]?.body.data.payment.snapToken);
    expect(fake.createSnap).toHaveBeenCalledOnce();
    await expect(prisma.payment.count()).resolves.toBe(1);
  });

  it('percobaan sudah tersimpan saat Midtrans dipanggil', async () => {
    fake.createSnap.mockImplementationOnce(async ({ orderId }) => {
      await expect(prisma.payment.findUnique({ where: { orderId } })).resolves.toMatchObject({
        status: 'PENDING',
        snapToken: null,
      });
      return { token: 'tok', redirectUrl: 'https://snap.test' };
    });

    const res = await startPayment(app, fixture.bill.id, authorization);

    expect(res.status).toBe(201);
    expect(fake.createSnap).toHaveBeenCalledOnce();
  });

  it('Midtrans gagal: 502, percobaan tercatat FAILED, dan bisa dicoba lagi dengan order_id baru', async () => {
    fake.createSnap.mockRejectedValueOnce(new MidtransUnavailableError('putus'));

    const failed = await startPayment(app, fixture.bill.id, authorization);

    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe('MIDTRANS_UNAVAILABLE');
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({
      status: 'FAILED',
    });
    await expect(readBill()).resolves.toMatchObject({ status: 'UNPAID', paymentState: 'FAILED' });

    const retry = await startPayment(app, fixture.bill.id, authorization);

    expect(retry.status).toBe(201);
    expect(retry.body.data.payment.orderId).toBe(ORDER_2);
  });

  it('server key kosong: 503, tidak ada percobaan yang dibuat', async () => {
    vi.spyOn(midtrans, 'serverKey').mockReturnValue(undefined);

    const res = await startPayment(app, fixture.bill.id, authorization);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MIDTRANS_NOT_CONFIGURED');
    await expect(prisma.payment.count()).resolves.toBe(0);
  });

  it('server key kosong tetap mengembalikan percobaan aktif yang sudah ada', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    vi.spyOn(midtrans, 'serverKey').mockReturnValue(undefined);

    const res = await startPayment(app, fixture.bill.id, authorization);

    expect(res.status).toBe(200);
  });

  it('tagihan lunas: 409 BILL_ALREADY_PAID', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, ORDER_1);

    const res = await startPayment(app, fixture.bill.id, authorization);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BILL_ALREADY_PAID');
  });

  it('tagihan orang lain: 404, dan tidak ada percobaan yang dibuat', async () => {
    const res = await startPayment(app, fixture.otherBill.id, authorization);

    expect(res.status).toBe(404);
    await expect(prisma.payment.count()).resolves.toBe(0);
    expect(fake.createSnap).not.toHaveBeenCalled();
  });

});

describe.each([
  ['skenario 1: virtual account', 'bank_transfer'],
  ['skenario 2: QRIS', 'qris'],
])('%s berhasil', (_name, paymentType) => {
  it('tagihan lunas, satu baris outbox recordRent, chain menunggu pencatatan', async () => {
    await startPayment(app, fixture.bill.id, authorization);

    const res = await notifyStatus(app, fake, ORDER_1, { payment_type: paymentType });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ orderId: ORDER_1, outcome: 'SETTLED' });
    // Keputusan memakai cek ulang ke API status, bukan isi notifikasi.
    expect(fake.getStatus).toHaveBeenCalledWith(ORDER_1);

    const bill = await readBill();
    expect(bill).toMatchObject({
      status: 'PAID',
      paymentState: 'PAID',
      payment: { orderId: ORDER_1, status: 'PAID', method: paymentType, snapToken: null },
      chain: { status: 'PENDING', txHash: null, blockNumber: null },
    });
    expect(bill.paidAt).not.toBeNull();

    const { outbox } = await snapshotPaymentData(fixture.bill.id);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ type: 'RECORD_RENT', status: 'PENDING', dedupeKey: `record-rent:${fixture.bill.id}` });
  });

  it('isi job hanya kode properti, kamar, periode, nominal, dan hash', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, ORDER_1, { payment_type: paymentType });

    const { outbox } = await snapshotPaymentData(fixture.bill.id);
    expect(outbox[0]?.payload).toEqual({
      propertyCode: 'SMR01',
      roomNumber: 'K03',
      period: '2026-11',
      amountIdr: RENT_IDR,
      paymentRef: paymentReference(ORDER_1),
    });
    expect(JSON.stringify(outbox[0]?.payload)).not.toContain('Penghuni');
  });
});

describe('notifikasi pending', () => {
  it('mencatat metode bayar, tagihan tetap menunggu', async () => {
    await startPayment(app, fixture.bill.id, authorization);

    const res = await notifyStatus(app, fake, ORDER_1, { status_code: '201', transaction_status: 'pending' });

    expect(res.body.data.outcome).toBe('ATTEMPT_UPDATED');
    await expect(readBill()).resolves.toMatchObject({
      status: 'UNPAID',
      paymentState: 'PENDING',
      payment: { status: 'PENDING', method: 'bank_transfer' },
    });
  });
});

describe('skenario 3: pembayaran dibatalkan', () => {
  it.each(['cancel', 'deny', 'failure'])('%s: tagihan tetap belum dibayar, tanpa outbox, bisa bayar ulang', async (transactionStatus) => {
    await startPayment(app, fixture.bill.id, authorization);

    const res = await notifyStatus(app, fake, ORDER_1, { status_code: '202', transaction_status: transactionStatus });

    expect(res.status).toBe(200);
    expect(res.body.data.outcome).toBe('ATTEMPT_UPDATED');
    await expect(readBill()).resolves.toMatchObject({
      status: 'UNPAID',
      paidAt: null,
      paymentState: 'FAILED',
      chain: null,
      payment: { status: 'FAILED', snapToken: null },
    });
    await expect(prisma.outboxJob.count()).resolves.toBe(0);

    const retry = await startPayment(app, fixture.bill.id, authorization);
    expect(retry.status).toBe(201);
    expect(retry.body.data.payment.orderId).toBe(ORDER_2);
  });

  it('deny lalu settlement pada order yang sama tetap lunas, sesuai percobaan ulang di dalam Snap', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, ORDER_1, { status_code: '202', transaction_status: 'deny' });

    const res = await notifyStatus(app, fake, ORDER_1);

    expect(res.body.data.outcome).toBe('SETTLED');
    await expect(readBill()).resolves.toMatchObject({ status: 'PAID' });
  });
});

describe('skenario 4: kedaluwarsa', () => {
  it('notifikasi expire: tetap belum dibayar, bayar ulang memakai sufiks -2', async () => {
    await startPayment(app, fixture.bill.id, authorization);

    const res = await notifyStatus(app, fake, ORDER_1, { status_code: '407', transaction_status: 'expire' });

    expect(res.status).toBe(200);
    await expect(readBill()).resolves.toMatchObject({
      status: 'UNPAID',
      paymentState: 'EXPIRED',
      payment: { status: 'EXPIRED', snapToken: null },
    });
    await expect(prisma.outboxJob.count()).resolves.toBe(0);

    const retry = await startPayment(app, fixture.bill.id, authorization);

    expect(retry.status).toBe(201);
    expect(retry.body.data.payment).toMatchObject({ orderId: ORDER_2, status: 'PENDING' });
    await expect(readBill()).resolves.toMatchObject({ paymentState: 'PENDING', payment: { orderId: ORDER_2 } });
  });

  it('batas waktu lewat tanpa notifikasi: terbaca EXPIRED, dan percobaan baru menutup yang lama', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    await prisma.payment.update({ where: { orderId: ORDER_1 }, data: { expiresAt: new Date(Date.now() - 1_000) } });

    await expect(readBill()).resolves.toMatchObject({ paymentState: 'EXPIRED', payment: { snapToken: null } });

    const retry = await startPayment(app, fixture.bill.id, authorization);

    expect(retry.status).toBe(201);
    expect(retry.body.data.payment.orderId).toBe(ORDER_2);
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({
      status: 'EXPIRED',
    });
  });

  it('sufiks terus naik: -2, lalu -3', async () => {
    await createSecondAttempt();
    await notifyStatus(app, fake, ORDER_2, { status_code: '407', transaction_status: 'expire' });

    const third = await startPayment(app, fixture.bill.id, authorization);

    expect(third.body.data.payment.orderId).toBe('RENT-SMR01-K03-2026-11-3');
  });
});

describe('skenario 5: webhook dikirim dua kali', () => {
  it('berurutan: satu pembayaran dan satu job, notifikasi kedua dibalas 200', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const first = await notifyStatus(app, fake, ORDER_1);
    const paidAt = (await snapshotPaymentData(fixture.bill.id)).bill.paidAt;

    const second = await notifyStatus(app, fake, ORDER_1);

    expect(first.body.data.outcome).toBe('SETTLED');
    expect(second.status).toBe(200);
    expect(second.body.data.outcome).toBe('ALREADY_PAID');

    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.bill.paidAt).toEqual(paidAt);
    expect(after.payments).toHaveLength(1);
    expect(after.outbox).toHaveLength(1);
    expect(after.anomalies).toHaveLength(0);
  });

  it('bersamaan: hanya satu yang melunasi', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const notification = signedNotification(ORDER_1, fake.setStatus(ORDER_1));

    const results = await Promise.all(Array.from({ length: 5 }, () => deliver(app, notification)));

    expect(results.every((res) => res.status === 200)).toBe(true);
    const outcomes = results.map((res) => res.body.data.outcome).sort();
    expect(outcomes).toEqual(['ALREADY_PAID', 'ALREADY_PAID', 'ALREADY_PAID', 'ALREADY_PAID', 'SETTLED']);

    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.outbox).toHaveLength(1);
    expect(after.anomalies).toHaveLength(0);
  });
});

describe('skenario 6: signature palsu', () => {
  it('ditolak, tidak ada perubahan apa pun, dan Midtrans tidak ditanya', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const before = await snapshotPaymentData(fixture.bill.id);
    fake.getStatus.mockClear();

    const res = await deliver(app, {
      ...signedNotification(ORDER_1, fake.setStatus(ORDER_1)),
      signature_key: 'a'.repeat(128),
    });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVALID_SIGNATURE');
    expect(fake.getStatus).not.toHaveBeenCalled();
    await expect(snapshotPaymentData(fixture.bill.id)).resolves.toEqual(before);
  });
});

describe('skenario 7: nominal tidak cocok', () => {
  it('API status melaporkan nominal lain: ditolak, dicatat anomali, tagihan tidak berubah', async () => {
    await startPayment(app, fixture.bill.id, authorization);

    const res = await notifyStatus(app, fake, ORDER_1, { gross_amount: '1000.00' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('AMOUNT_MISMATCH');

    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.bill.status).toBe('UNPAID');
    expect(after.payments[0]?.status).toBe('PENDING');
    expect(after.outbox).toHaveLength(0);
    expect(after.anomalies).toHaveLength(1);
    expect(after.anomalies[0]).toMatchObject({
      type: 'AMOUNT_MISMATCH',
      orderId: ORDER_1,
      paymentId: after.payments[0]?.id,
      expectedAmountIdr: BigInt(RENT_IDR),
      receivedAmountIdr: 1_000n,
      providerStatus: 'settlement',
      occurrences: 1,
    });
  });

  it('nominal notifikasi berbeda walau API status benar: tetap ditolak', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const status = fake.setStatus(ORDER_1);

    const res = await deliver(app, signedNotification(ORDER_1, { ...status, gross_amount: '1.00' }));

    expect(res.status).toBe(400);
    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.bill.status).toBe('UNPAID');
    expect(after.anomalies[0]).toMatchObject({ type: 'AMOUNT_MISMATCH', receivedAmountIdr: 1n });
  });

  it('pengiriman ulang tidak menambah baris anomali', async () => {
    await startPayment(app, fixture.bill.id, authorization);

    await notifyStatus(app, fake, ORDER_1, { gross_amount: '1000.00' });
    await notifyStatus(app, fake, ORDER_1, { gross_amount: '1000.00' });

    const { anomalies } = await snapshotPaymentData(fixture.bill.id);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]?.occurrences).toBe(2);
  });
});

describe('dua percobaan sama-sama terbayar', () => {
  it('percobaan kedua ditandai terbayar, dicatat anomali, tanpa outbox kedua', async () => {
    await createSecondAttempt();

    const first = await notifyStatus(app, fake, ORDER_2);
    const second = await notifyStatus(app, fake, ORDER_1);

    expect(first.body.data.outcome).toBe('SETTLED');
    expect(second.status).toBe(200);
    expect(second.body.data.outcome).toBe('DUPLICATE_BILL_PAYMENT');

    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.payments.map((payment) => payment.status)).toEqual(['DUPLICATE_PAID', 'PAID']);
    expect(after.outbox).toHaveLength(1);
    expect(after.outbox[0]?.paymentId).toBe(after.payments[1]?.id);
    expect(after.anomalies).toHaveLength(1);
    expect(after.anomalies[0]).toMatchObject({
      type: 'DUPLICATE_BILL_PAYMENT',
      orderId: ORDER_1,
      paymentId: after.payments[0]?.id,
    });

    // Layar menampilkan percobaan yang melunasi tagihan.
    await expect(readBill()).resolves.toMatchObject({ paymentState: 'PAID', payment: { orderId: ORDER_2 } });
  });

  it('notifikasi ulang untuk percobaan kedua tidak menambah anomali', async () => {
    await createSecondAttempt();
    await notifyStatus(app, fake, ORDER_2);
    await notifyStatus(app, fake, ORDER_1);

    const res = await notifyStatus(app, fake, ORDER_1);

    expect(res.body.data.outcome).toBe('ALREADY_PAID');
    const { anomalies } = await snapshotPaymentData(fixture.bill.id);
    expect(anomalies).toHaveLength(1);
  });

  it('bersamaan: satu melunasi dan satu menjadi anomali', async () => {
    await createSecondAttempt();
    const notifications = [ORDER_1, ORDER_2].map((orderId) => signedNotification(orderId, fake.setStatus(orderId)));

    const results = await Promise.all(notifications.map((notification) => deliver(app, notification)));

    expect(results.map((res) => res.body.data.outcome).sort()).toEqual(['DUPLICATE_BILL_PAYMENT', 'SETTLED']);
    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.outbox).toHaveLength(1);
    expect(after.anomalies).toHaveLength(1);
  });
});

describe('status monotonik', () => {
  it.each([
    ['pending', '201'],
    ['expire', '407'],
    ['cancel', '202'],
    ['deny', '202'],
    ['failure', '202'],
  ])('%s yang terlambat tidak menimpa status lunas', async (transactionStatus, statusCode) => {
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, ORDER_1);
    const before = await snapshotPaymentData(fixture.bill.id);

    const res = await notifyStatus(app, fake, ORDER_1, {
      status_code: statusCode,
      transaction_status: transactionStatus,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.outcome).toBe('NO_CHANGE');
    await expect(snapshotPaymentData(fixture.bill.id)).resolves.toEqual(before);
  });

  it('notifikasi pending yang tiba setelah settlement: API status tetap menjawab settlement', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const pending = signedNotification(ORDER_1, {
      status_code: '201',
      transaction_status: 'pending',
      gross_amount: `${RENT_IDR}.00`,
    });
    fake.setStatus(ORDER_1);

    const res = await deliver(app, pending);

    expect(res.body.data.outcome).toBe('SETTLED');
    await expect(readBill()).resolves.toMatchObject({ status: 'PAID' });
  });

  it('refund diabaikan dan tidak mengubah apa pun', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, ORDER_1);
    const before = await snapshotPaymentData(fixture.bill.id);

    const res = await notifyStatus(app, fake, ORDER_1, { transaction_status: 'refund' });

    expect(res.body.data.outcome).toBe('NO_CHANGE');
    await expect(snapshotPaymentData(fixture.bill.id)).resolves.toEqual(before);
  });

  it('expire tidak menimpa FAILED', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, ORDER_1, { status_code: '202', transaction_status: 'cancel' });

    const res = await notifyStatus(app, fake, ORDER_1, { status_code: '407', transaction_status: 'expire' });

    expect(res.body.data.outcome).toBe('NO_CHANGE');
    await expect(readBill()).resolves.toMatchObject({ paymentState: 'FAILED' });
  });
});

describe('order_id tidak dikenal', () => {
  it('signature sah: dicatat UNKNOWN_ORDER dan dibalas 200 supaya tidak dikirim ulang', async () => {
    const orderId = 'RENT-SMR01-K99-2026-11';

    const res = await notifyStatus(app, fake, orderId);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ orderId, outcome: 'UNKNOWN_ORDER' });
    await expect(prisma.paymentAnomaly.findMany()).resolves.toMatchObject([
      { type: 'UNKNOWN_ORDER', orderId, paymentId: null, receivedAmountIdr: BigInt(RENT_IDR) },
    ]);
  });

  it('Midtrans juga tidak mengenalnya, seperti notifikasi uji dari dashboard', async () => {
    const orderId = 'payment_notif_test_G123456789';

    const res = await deliver(
      app,
      signedNotification(orderId, { status_code: '200', transaction_status: 'capture', gross_amount: '105000.00' }),
    );

    expect(res.status).toBe(200);
    await expect(prisma.paymentAnomaly.count()).resolves.toBe(1);
  });

  it('order BUY- di P2 diperlakukan sebagai order tidak dikenal', async () => {
    const res = await notifyStatus(app, fake, 'BUY-SMR01-0001');

    expect(res.body.data.outcome).toBe('UNKNOWN_ORDER');
  });
});

describe('Midtrans bermasalah saat cek ulang', () => {
  it('order dikenal tetapi API status belum mengenalnya: 503, tidak ada perubahan', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const before = await snapshotPaymentData(fixture.bill.id);
    const notification = signedNotification(ORDER_1, fake.setStatus(ORDER_1));
    fake.transactions.clear();

    const res = await deliver(app, notification);

    expect(res.status).toBe(503);
    await expect(snapshotPaymentData(fixture.bill.id)).resolves.toEqual(before);
  });

  it('API status mati: 503, tidak ada perubahan', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    const before = await snapshotPaymentData(fixture.bill.id);
    const notification = signedNotification(ORDER_1, fake.setStatus(ORDER_1));
    fake.getStatus.mockRejectedValueOnce(new MidtransUnavailableError('putus'));

    const res = await deliver(app, notification);

    expect(res.status).toBe(503);
    await expect(snapshotPaymentData(fixture.bill.id)).resolves.toEqual(before);
  });
});

describe('transaksi DB pelunasan', () => {
  it('bila outbox gagal ditulis, tagihan dan pembayaran tidak ikut lunas', async () => {
    await startPayment(app, fixture.bill.id, authorization);
    // Baris dengan dedupeKey sama membuat penulisan outbox gagal di tengah transaksi.
    await prisma.outboxJob.create({
      data: { type: 'RECORD_RENT', dedupeKey: `record-rent:${fixture.bill.id}`, payload: {} },
    });

    const res = await notifyStatus(app, fake, ORDER_1);

    expect(res.status).toBe(500);
    const after = await snapshotPaymentData(fixture.bill.id);
    expect(after.bill).toMatchObject({ status: 'UNPAID', paidAt: null });
    expect(after.payments[0]).toMatchObject({ status: 'PENDING', paidAt: null });
  });
});

describe('aturan di basis data', () => {
  async function createPayment(orderId: string, attempt: number, status: 'PAID' | 'PENDING') {
    return prisma.payment.create({
      data: {
        orderId,
        attempt,
        status,
        billId: fixture.bill.id,
        amountIdr: BigInt(RENT_IDR),
        expiresAt: new Date(),
      },
    });
  }

  it('satu tagihan tidak bisa punya dua pembayaran PAID', async () => {
    await createPayment(ORDER_1, 1, 'PAID');

    await expect(createPayment(ORDER_2, 2, 'PAID')).rejects.toMatchObject({ code: 'P2002' });
  });

  it('order_id unik', async () => {
    await createPayment(ORDER_1, 1, 'PENDING');

    await expect(createPayment(ORDER_1, 2, 'PENDING')).rejects.toMatchObject({ code: 'P2002' });
  });

  it('pembayaran harus punya tepat satu sasaran', async () => {
    await expect(
      prisma.payment.create({
        data: { orderId: 'TANPA-SASARAN', amountIdr: 1n, expiresAt: new Date() },
      }),
    ).rejects.toThrow();
  });
});
