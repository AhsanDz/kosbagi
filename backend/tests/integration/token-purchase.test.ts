// Pembelian token lewat HTTP dengan PostgreSQL sungguhan: skenario uji 8 dan 9 proposal, sisihan
// token selama menunggu bayar, pelepasan sisihan, dan pelunasan BUY- lewat webhook. Hanya Midtrans
// yang ditiru.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { Offering, User } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  midtrans,
  MidtransUnavailableError,
  OrderIdTakenError,
  SNAP_ENABLED_PAYMENTS,
  VIRTUAL_ACCOUNT_PAYMENTS,
} from '../../src/modules/payments/midtrans.js';
import { paymentReference } from '../../src/queue/jobs.js';
import {
  approveInvestor,
  bearer,
  createOffering,
  createPaidPurchase,
  deliver,
  FakeMidtrans,
  notifyStatus,
  purchaseStatus,
  resetDatabase,
  seedFixture,
  signedNotification,
} from './helpers.js';

const ORDER_1 = 'BUY-SMR01-0001';

let app: Express;
let fake: FakeMidtrans;
let fixture: Awaited<ReturnType<typeof seedFixture>>;
let offering: Offering;
let investor: User;
let authorization: string;
let walletAddress: string;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  investor = fixture.investor;
  offering = await createOffering(fixture.property.id);
  walletAddress = (await approveInvestor(investor)).address;
  authorization = await bearer(investor);
  fake = new FakeMidtrans();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

function buy(tokenAmount: unknown, auth = authorization, offeringId = offering.id) {
  return request(app).post(`/api/offerings/${offeringId}/purchases`).set('Authorization', auth).send({ tokenAmount });
}

async function current(auth = authorization) {
  const res = await request(app).get('/api/offerings/current').set('Authorization', auth);
  expect(res.status).toBe(200);
  return res.body.data;
}

async function readPurchase(id: string, auth = authorization) {
  const res = await request(app).get(`/api/purchases/${id}`).set('Authorization', auth);
  expect(res.status).toBe(200);
  return res.body.data.purchase;
}

function continuePayment(id: string, auth = authorization) {
  return request(app).post(`/api/purchases/${id}/payments`).set('Authorization', auth);
}

/** Investor kedua yang sudah siap membeli. */
async function otherInvestor() {
  const user = await prisma.user.create({
    data: { name: 'Rani Aulia', email: 'rani.dummy@kosbagi.test', role: 'INVESTOR', passwordHash: 'x' },
  });
  await approveInvestor(user, { index: 1 });
  return { user, authorization: await bearer(user) };
}

async function nothingCreated() {
  await expect(prisma.tokenPurchase.count({ where: { status: { not: 'PAID' } } })).resolves.toBe(0);
  await expect(prisma.payment.count()).resolves.toBe(0);
  expect(fake.createSnap).not.toHaveBeenCalled();
}

/** Job TRANSFER_TOKENS saja; approveInvestor sudah menulis job WHITELIST_KYC. */
function transferJobs() {
  return prisma.outboxJob.count({ where: { type: 'TRANSFER_TOKENS' } });
}

/** Menggeser batas bayar pesanan dan percobaannya ke masa lalu, seperti 5 menit sudah lewat. */
async function lapseReservation(purchaseId: string) {
  const past = new Date(Date.now() - 1_000);
  await prisma.tokenPurchase.update({ where: { id: purchaseId }, data: { reservedUntil: past } });
  await prisma.payment.updateMany({ where: { tokenPurchaseId: purchaseId }, data: { expiresAt: past } });
}

describe('GET /api/offerings/current', () => {
  it('angka penawaran, kesiapan investor, dan tanpa pesanan aktif', async () => {
    const data = await current();

    expect(data.offering).toMatchObject({
      id: offering.id,
      propertyCode: 'SMR01',
      tokenSymbol: 'KB-SMR01',
      pricePerTokenIdr: 100_000,
      tokensOffered: 12_600,
      tokensSold: 0,
      tokensReserved: 0,
      tokensRemaining: 12_600,
      status: 'OPEN',
    });
    expect(data.investor).toEqual({
      kycStatus: 'APPROVED',
      walletReady: true,
      walletAddress,
      holdingTokens: 0,
      reservedTokens: 0,
      remainingQuota: 1_800,
      maxPerInvestor: 1_800,
    });
    expect(data.activePurchase).toBeNull();
  });

  it('investor tanpa KYC: NONE dan dompet belum siap', async () => {
    const newcomer = await prisma.user.create({
      data: { name: 'Bagas Wicaksono', email: 'bagas.dummy@kosbagi.test', role: 'INVESTOR', passwordHash: 'x' },
    });

    const data = await current(await bearer(newcomer));

    expect(data.investor).toMatchObject({ kycStatus: 'NONE', walletReady: false, walletAddress: null });
  });

  it('whitelist belum tercatat: dompet belum siap', async () => {
    const pending = await prisma.user.create({
      data: { name: 'Citra Lestari', email: 'citra.dummy@kosbagi.test', role: 'INVESTOR', passwordHash: 'x' },
    });
    await approveInvestor(pending, { index: 2, whitelist: 'PENDING' });

    const data = await current(await bearer(pending));

    expect(data.investor).toMatchObject({ kycStatus: 'APPROVED', walletReady: false });
  });

  it('belum ada penawaran: 404', async () => {
    await prisma.offering.deleteMany();

    const res = await request(app).get('/api/offerings/current').set('Authorization', authorization);

    expect(res.status).toBe(404);
  });
});

describe('membuat pesanan', () => {
  it('201: pesanan PENDING_PAYMENT, order_id BUY-SMR01-0001, batas 5 menit, Snap dengan jumlah token', async () => {
    const before = Date.now();
    const res = await buy(100);

    expect(res.status).toBe(201);
    const { purchase } = res.body.data;
    expect(purchase).toMatchObject({
      orderNumber: ORDER_1,
      tokenAmount: 100,
      amountIdr: 10_000_000,
      status: 'PENDING_PAYMENT',
      transfer: null,
      payment: { orderId: ORDER_1, amountIdr: 10_000_000, status: 'PENDING', snapToken: `snap-${ORDER_1}` },
    });
    expect(purchase.reservedUntil).toBe(purchase.payment.expiresAt);
    const reservedFor = Date.parse(purchase.reservedUntil) - before;
    expect(reservedFor).toBeGreaterThanOrEqual(5 * 60_000 - 1_000);
    expect(reservedFor).toBeLessThanOrEqual(5 * 60_000 + 5_000);

    expect(fake.createSnap).toHaveBeenCalledOnce();
    expect(fake.createSnap.mock.calls[0]?.[0]).toMatchObject({
      orderId: ORDER_1,
      amountIdr: 10_000_000n,
      itemName: 'Token KB-SMR01',
      quantity: 100,
      enabledPayments: SNAP_ENABLED_PAYMENTS,
    });
  });

  it('di atas 100 token Snap hanya menawarkan virtual account', async () => {
    await buy(101);

    expect(fake.createSnap.mock.calls[0]?.[0].enabledPayments).toEqual(VIRTUAL_ACCOUNT_PAYMENTS);
  });

  it('nomor pesanan berurutan per properti', async () => {
    const other = await otherInvestor();
    await buy(10);

    const res = await buy(10, other.authorization);

    expect(res.body.data.purchase.orderNumber).toBe('BUY-SMR01-0002');
  });

  it('pesanan yang menunggu bayar menyisihkan token dari sisa penawaran dan kuota investor', async () => {
    const created = await buy(100);

    const data = await current();

    expect(data.offering).toMatchObject({ tokensSold: 0, tokensReserved: 100, tokensRemaining: 12_500 });
    expect(data.investor).toMatchObject({ reservedTokens: 100, remainingQuota: 1_700 });
    expect(data.activePurchase).toMatchObject({ id: created.body.data.purchase.id, status: 'PENDING_PAYMENT' });
  });

  it('skenario 8: sisa 120 token, memesan 200, ditolak sebelum pembayaran dibuat', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { tokensSold: 12_480 } });

    const res = await buy(200);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: 'OFFERING_EXCEEDED', details: { tokensRemaining: 120 } });
    expect(res.body.error.message).toContain('Sisa penawaran 120 token');
    await nothingCreated();
  });

  it('skenario 8: sisihan investor lain ikut mengurangi sisa penawaran', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { tokensSold: 12_400 } });
    const other = await otherInvestor();
    expect((await buy(150, other.authorization)).status).toBe(201);
    fake.createSnap.mockClear();

    const res = await buy(100);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: 'OFFERING_EXCEEDED', details: { tokensRemaining: 50 } });
    expect(fake.createSnap).not.toHaveBeenCalled();
  });

  it('skenario 9: memegang 1.500 token dan memesan 500, ditolak dengan sisa kuota 300', async () => {
    await createPaidPurchase(offering.id, investor.id, 1_500);

    const res = await buy(500);

    expect(res.status).toBe(422);
    expect(res.body.error).toMatchObject({ code: 'HOLDING_CAP_EXCEEDED', details: { remainingQuota: 300 } });
    expect(res.body.error.message).toContain('Sisa kuota kamu 300 token');
    await nothingCreated();

    // "Pakai 300 token" diterima.
    expect((await buy(300)).status).toBe(201);
  });

  it('skenario 9: pesanan sendiri yang menunggu bayar ikut dihitung di kuota', async () => {
    await createPaidPurchase(offering.id, investor.id, 1_500);
    await prisma.tokenPurchase.create({
      data: {
        offeringId: offering.id,
        investorId: investor.id,
        tokenAmount: 200,
        amountIdr: 20_000_000n,
        reservedUntil: new Date(Date.now() + 60_000),
      },
    });

    const data = await current();
    expect(data.investor).toMatchObject({ holdingTokens: 1_500, reservedTokens: 200, remainingQuota: 100 });
  });

  it('403 KYC_REQUIRED untuk investor yang belum disetujui, walau sudah mengajukan', async () => {
    const applicant = await prisma.user.create({
      data: { name: 'Eko Saputra', email: 'eko.dummy@kosbagi.test', role: 'INVESTOR', passwordHash: 'x' },
    });
    await prisma.kycSubmission.create({ data: { userId: applicant.id, fullName: 'Eko Saputra', dummyIdNumber: 'DUMMY-7' } });

    const res = await buy(10, await bearer(applicant));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('KYC_REQUIRED');
    await nothingCreated();
  });

  it('409 WALLET_NOT_READY selama whitelist belum tercatat', async () => {
    const pending = await prisma.user.create({
      data: { name: 'Fajar Nugroho', email: 'fajar.dummy@kosbagi.test', role: 'INVESTOR', passwordHash: 'x' },
    });
    await approveInvestor(pending, { index: 3, whitelist: 'PENDING' });

    const res = await buy(10, await bearer(pending));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WALLET_NOT_READY');
    await nothingCreated();
  });

  it.each([
    ['berstatus CLOSED', { status: 'CLOSED' as const }],
    ['lewat batas waktu', { closesAt: new Date(Date.now() - 60_000) }],
  ])('409 OFFERING_CLOSED bila penawaran %s', async (_name, data) => {
    await prisma.offering.update({ where: { id: offering.id }, data });

    const res = await buy(10);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OFFERING_CLOSED');
    await nothingCreated();
  });

  it('KYC diperiksa sebelum status penawaran', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { status: 'CLOSED' } });
    const newcomer = await prisma.user.create({
      data: { name: 'Hendra Kusuma', email: 'hendra.dummy@kosbagi.test', role: 'INVESTOR', passwordHash: 'x' },
    });

    expect((await buy(10, await bearer(newcomer))).body.error.code).toBe('KYC_REQUIRED');
  });

  it('409 PURCHASE_PENDING bila masih ada pesanan aktif', async () => {
    const first = await buy(100);

    const res = await buy(100);

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'PURCHASE_PENDING', details: { purchaseId: first.body.data.purchase.id } });
    expect(fake.createSnap).toHaveBeenCalledOnce();
  });

  it('klik ganda bersamaan: satu pesanan', async () => {
    const results = await Promise.all([buy(100), buy(100)]);

    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
    await expect(prisma.tokenPurchase.count()).resolves.toBe(1);
  });

  it('dua investor berebut 100 token terakhir: hanya satu yang mendapat sisihan', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { tokensSold: 12_500 } });
    const other = await otherInvestor();

    const results = await Promise.all([buy(100), buy(100, other.authorization)]);

    expect(results.map((res) => res.status).sort()).toEqual([201, 422]);
    expect(fake.createSnap).toHaveBeenCalledOnce();
  });

  it.each([0, -5, 1.5, '100', null])('jumlah token %s tidak valid: 400', async (tokenAmount) => {
    const res = await buy(tokenAmount);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('server key kosong: 503 dan tidak ada pesanan yang dibuat', async () => {
    vi.spyOn(midtrans, 'serverKey').mockReturnValue(undefined);

    const res = await buy(100);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MIDTRANS_NOT_CONFIGURED');
    await nothingCreated();
  });

  it('Midtrans gagal: 502, pesanan FAILED, sisihan lepas, dan bisa memesan lagi', async () => {
    fake.createSnap.mockRejectedValueOnce(new MidtransUnavailableError('putus'));

    const res = await buy(100);

    expect(res.status).toBe(502);
    await expect(prisma.tokenPurchase.findFirstOrThrow()).resolves.toMatchObject({ status: 'FAILED' });
    await expect(prisma.payment.findFirstOrThrow()).resolves.toMatchObject({ status: 'FAILED' });
    expect((await current()).offering.tokensReserved).toBe(0);

    const retry = await buy(100);
    expect(retry.status).toBe(201);
    expect(retry.body.data.purchase.orderNumber).toBe('BUY-SMR01-0002');
  });

  it('penawaran yang tidak ada: 404', async () => {
    const res = await buy(10, authorization, '01a18897-fb42-70b8-abc0-43d131ddbe3c');

    expect(res.status).toBe(404);
  });
});

describe('webhook BUY-: pelunasan', () => {
  async function paidPurchase(tokenAmount = 100) {
    const res = await buy(tokenAmount);
    const purchase = res.body.data.purchase;
    const notified = await notifyStatus(app, fake, purchase.payment.orderId, purchaseStatus(tokenAmount));
    return { purchase, notified };
  }

  it('settlement: pesanan lunas, tokensSold bertambah, satu outbox TRANSFER_TOKENS', async () => {
    const { purchase, notified } = await paidPurchase(100);

    expect(notified.status).toBe(200);
    expect(notified.body.data).toEqual({ orderId: ORDER_1, outcome: 'SETTLED' });

    await expect(readPurchase(purchase.id)).resolves.toMatchObject({
      status: 'PAID',
      payment: { status: 'PAID', method: 'bank_transfer', snapToken: null },
      transfer: { status: 'PENDING', txHash: null, blockNumber: null },
    });
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({
      tokensSold: 100,
      status: 'OPEN',
    });

    const outbox = await prisma.outboxJob.findMany({ where: { type: 'TRANSFER_TOKENS' } });
    expect(outbox).toHaveLength(1);
    expect(outbox[0]).toMatchObject({ dedupeKey: `transfer-tokens:${purchase.id}`, status: 'PENDING' });
    // Isi job hanya kode properti, alamat dompet, jumlah, dan hash; tanpa nama atau email.
    expect(outbox[0]?.payload).toEqual({
      propertyCode: 'SMR01',
      walletAddress,
      tokenAmount: 100,
      paymentRef: paymentReference(ORDER_1),
    });
    expect(JSON.stringify(outbox[0]?.payload)).not.toMatch(/Investor|kosbagi\.test/);

    const data = await current();
    expect(data.investor).toMatchObject({ holdingTokens: 100, reservedTokens: 0, remainingQuota: 1_700 });
    expect(data.offering).toMatchObject({ tokensSold: 100, tokensReserved: 0, tokensRemaining: 12_500 });
    expect(data.activePurchase).toBeNull();
  });

  it('transfer menampilkan tx hash setelah worker mencatat', async () => {
    const { purchase } = await paidPurchase(100);
    const job = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'TRANSFER_TOKENS' } });
    await prisma.chainTransaction.create({
      data: { outboxJobId: job.id, reference: paymentReference(ORDER_1), status: 'RECORDED', txHash: '0x6a20', blockNumber: 7_149_031n },
    });

    await expect(readPurchase(purchase.id)).resolves.toMatchObject({
      transfer: { status: 'RECORDED', txHash: '0x6a20', blockNumber: 7_149_031 },
    });
  });

  it('webhook ganda berurutan: hanya satu pelunasan dan satu outbox', async () => {
    await paidPurchase(100);

    const second = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100));

    expect(second.status).toBe(200);
    expect(second.body.data.outcome).toBe('ALREADY_PAID');
    await expect(prisma.outboxJob.count({ where: { type: 'TRANSFER_TOKENS' } })).resolves.toBe(1);
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({ tokensSold: 100 });
  });

  it('webhook ganda bersamaan: tepat satu SETTLED', async () => {
    await buy(100);
    const notification = signedNotification(ORDER_1, fake.setStatus(ORDER_1, purchaseStatus(100)));

    const results = await Promise.all(Array.from({ length: 5 }, () => deliver(app, notification)));

    expect(results.map((res) => res.body.data.outcome).sort()).toEqual([
      'ALREADY_PAID',
      'ALREADY_PAID',
      'ALREADY_PAID',
      'ALREADY_PAID',
      'SETTLED',
    ]);
    await expect(transferJobs()).resolves.toBe(1);
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({ tokensSold: 100 });
  });

  it('pesanan yang menghabiskan penawaran menutupnya', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { tokensSold: 12_500 } });

    await paidPurchase(100);

    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({
      tokensSold: 12_600,
      status: 'CLOSED',
    });
    const other = await otherInvestor();
    expect((await buy(1, other.authorization)).body.error.code).toBe('OFFERING_CLOSED');
  });

  it('lunas: bayar lagi dibalas 409 PURCHASE_ALREADY_PAID', async () => {
    const { purchase } = await paidPurchase(100);

    const res = await continuePayment(purchase.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PURCHASE_ALREADY_PAID');
  });

  it('nominal tidak cocok: 400, anomali, pesanan tidak berubah', async () => {
    const res = await buy(100);

    const notified = await notifyStatus(app, fake, ORDER_1, { gross_amount: '1000.00' });

    expect(notified.status).toBe(400);
    expect(notified.body.error.code).toBe('AMOUNT_MISMATCH');
    await expect(readPurchase(res.body.data.purchase.id)).resolves.toMatchObject({ status: 'PENDING_PAYMENT' });
    await expect(prisma.paymentAnomaly.findFirstOrThrow()).resolves.toMatchObject({
      type: 'AMOUNT_MISMATCH',
      orderId: ORDER_1,
      expectedAmountIdr: 10_000_000n,
      receivedAmountIdr: 1_000n,
    });
    await expect(transferJobs()).resolves.toBe(0);
  });

  it('pending atau expire yang terlambat tidak menimpa status lunas', async () => {
    const { purchase } = await paidPurchase(100);

    const pending = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100, { status_code: '201', transaction_status: 'pending' }));
    const expire = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100, { status_code: '407', transaction_status: 'expire' }));

    expect(pending.body.data.outcome).toBe('NO_CHANGE');
    expect(expire.body.data.outcome).toBe('NO_CHANGE');
    await expect(readPurchase(purchase.id)).resolves.toMatchObject({ status: 'PAID', payment: { status: 'PAID' } });
  });

  it('outbox gagal ditulis: pesanan, pembayaran, dan tokensSold tidak berubah', async () => {
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;
    await prisma.outboxJob.create({
      data: { type: 'TRANSFER_TOKENS', dedupeKey: `transfer-tokens:${purchaseId}`, payload: {} },
    });

    const notified = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100));

    expect(notified.status).toBe(500);
    await expect(prisma.tokenPurchase.findUniqueOrThrow({ where: { id: purchaseId } })).resolves.toMatchObject({
      status: 'PENDING_PAYMENT',
    });
    await expect(prisma.payment.findFirstOrThrow()).resolves.toMatchObject({ status: 'PENDING', paidAt: null });
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({ tokensSold: 0 });
  });
});

describe('webhook BUY-: pelepasan sisihan', () => {
  it.each([
    ['expire', '407', 'EXPIRED'],
    ['cancel', '202', 'FAILED'],
    ['deny', '202', 'FAILED'],
    ['failure', '202', 'FAILED'],
  ])('%s: pesanan %s dan token kembali ke sisa penawaran', async (transactionStatus, statusCode, expected) => {
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;

    const notified = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100, { status_code: statusCode, transaction_status: transactionStatus }));

    expect(notified.status).toBe(200);
    expect(notified.body.data.outcome).toBe('ATTEMPT_UPDATED');
    await expect(readPurchase(purchaseId)).resolves.toMatchObject({ status: expected, transfer: null });
    const data = await current();
    expect(data.offering).toMatchObject({ tokensReserved: 0, tokensRemaining: 12_600 });
    expect(data.investor).toMatchObject({ reservedTokens: 0, remainingQuota: 1_800 });
    expect(data.activePurchase).toBeNull();
    await expect(transferJobs()).resolves.toBe(0);

    // Sisihan lepas, jadi investor boleh membuat pesanan baru.
    expect((await buy(100)).status).toBe(201);
  });

  it('batas bayar lewat tanpa notifikasi: sisihan lepas dan pesanan terbaca EXPIRED', async () => {
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;
    await lapseReservation(purchaseId);

    await expect(readPurchase(purchaseId)).resolves.toMatchObject({ status: 'EXPIRED', payment: { status: 'EXPIRED' } });
    expect((await current()).offering.tokensReserved).toBe(0);
    expect((await buy(100)).status).toBe(201);
  });

  it('bayar ulang setelah kedaluwarsa: order_id bersufiks -2 dan token disisihkan lagi', async () => {
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;
    await notifyStatus(app, fake, ORDER_1, purchaseStatus(100, { status_code: '407', transaction_status: 'expire' }));

    const retry = await continuePayment(purchaseId);

    expect(retry.status).toBe(201);
    expect(retry.body.data.payment).toMatchObject({ orderId: `${ORDER_1}-2`, status: 'PENDING' });
    expect(retry.body.data.purchase).toMatchObject({ status: 'PENDING_PAYMENT', reservedUntil: retry.body.data.payment.expiresAt });
    expect((await current()).offering.tokensReserved).toBe(100);
  });

  it('lanjutkan pembayaran aktif: 200 dengan token yang sama', async () => {
    const res = await buy(100);

    const resumed = await continuePayment(res.body.data.purchase.id);

    expect(resumed.status).toBe(200);
    expect(resumed.body.data.payment.snapToken).toBe(res.body.data.purchase.payment.snapToken);
    expect(fake.createSnap).toHaveBeenCalledOnce();
  });

  it('bayar ulang ditolak bila tokennya sudah diambil investor lain', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { tokensSold: 12_500 } });
    const res = await buy(100);
    await notifyStatus(app, fake, ORDER_1, purchaseStatus(100, { status_code: '407', transaction_status: 'expire' }));
    const other = await otherInvestor();
    expect((await buy(100, other.authorization)).status).toBe(201);

    const retry = await continuePayment(res.body.data.purchase.id);

    expect(retry.status).toBe(422);
    expect(retry.body.error).toMatchObject({ code: 'OFFERING_EXCEEDED', details: { tokensRemaining: 0 } });
  });

  it('expire untuk percobaan lama tidak melepas sisihan percobaan baru', async () => {
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;
    await lapseReservation(purchaseId);
    await continuePayment(purchaseId);

    const notified = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100, { status_code: '407', transaction_status: 'expire' }));

    expect(notified.body.data.outcome).toBe('NO_CHANGE');
    await expect(readPurchase(purchaseId)).resolves.toMatchObject({ status: 'PENDING_PAYMENT' });
    expect((await current()).offering.tokensReserved).toBe(100);
  });
});

describe('webhook BUY-: pelunasan terlambat dan ganda', () => {
  it('settlement setelah sisihan lepas, token masih tersedia: tetap lunas', async () => {
    const res = await buy(100);
    await lapseReservation(res.body.data.purchase.id);

    const notified = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100));

    expect(notified.body.data.outcome).toBe('SETTLED');
    await expect(readPurchase(res.body.data.purchase.id)).resolves.toMatchObject({ status: 'PAID' });
  });

  it('settlement setelah sisihan lepas dan token sudah habis: tidak dipenuhi, dicatat anomali', async () => {
    await prisma.offering.update({ where: { id: offering.id }, data: { tokensSold: 12_500 } });
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;
    await lapseReservation(purchaseId);
    const other = await otherInvestor();
    expect((await buy(100, other.authorization)).status).toBe(201);

    const notified = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100));

    expect(notified.status).toBe(200);
    expect(notified.body.data.outcome).toBe('PURCHASE_UNFULFILLABLE');
    await expect(prisma.tokenPurchase.findUniqueOrThrow({ where: { id: purchaseId } })).resolves.toMatchObject({ status: 'EXPIRED' });
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({ status: 'UNFULFILLED' });
    await expect(prisma.paymentAnomaly.findFirstOrThrow()).resolves.toMatchObject({
      type: 'PURCHASE_UNFULFILLABLE',
      orderId: ORDER_1,
      expectedAmountIdr: 10_000_000n,
    });
    await expect(transferJobs()).resolves.toBe(0);
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({ tokensSold: 12_500 });

    // Notifikasi ulang tidak menambah apa pun.
    expect((await notifyStatus(app, fake, ORDER_1, purchaseStatus(100))).body.data.outcome).toBe('ALREADY_PAID');
  });

  it('dua percobaan sama-sama terbayar: satu pelunasan, satu anomali, satu outbox', async () => {
    const res = await buy(100);
    const purchaseId = res.body.data.purchase.id;
    await lapseReservation(purchaseId);
    await continuePayment(purchaseId);

    const first = await notifyStatus(app, fake, `${ORDER_1}-2`, purchaseStatus(100));
    const second = await notifyStatus(app, fake, ORDER_1, purchaseStatus(100));

    expect(first.body.data.outcome).toBe('SETTLED');
    expect(second.body.data.outcome).toBe('DUPLICATE_PURCHASE_PAYMENT');
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({
      status: 'DUPLICATE_PAID',
    });
    await expect(prisma.paymentAnomaly.findMany()).resolves.toMatchObject([
      { type: 'DUPLICATE_PURCHASE_PAYMENT', orderId: ORDER_1 },
    ]);
    await expect(transferJobs()).resolves.toBe(1);
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({ tokensSold: 100 });
    // Layar menampilkan percobaan yang melunasi.
    await expect(readPurchase(purchaseId)).resolves.toMatchObject({ payment: { orderId: `${ORDER_1}-2` } });
  });
});

describe('order_id pesanan sudah dipakai di Midtrans', () => {
  it('BUY-SMR01-0001 terpakai: pesanan tetap dibuat dengan percobaan -2 dan sisihan utuh', async () => {
    fake.setStatus(ORDER_1, purchaseStatus(100));

    const res = await buy(100);

    expect(res.status).toBe(201);
    expect(res.body.data.purchase).toMatchObject({
      orderNumber: ORDER_1,
      status: 'PENDING_PAYMENT',
      payment: { orderId: `${ORDER_1}-2`, status: 'PENDING' },
    });
    expect(res.body.data.purchase.reservedUntil).toBe(res.body.data.purchase.payment.expiresAt);
    expect((await current()).offering.tokensReserved).toBe(100);
  });

  it('Snap menolak dengan kode 406: lanjut ke -2', async () => {
    fake.createSnap.mockRejectedValueOnce(new OrderIdTakenError(ORDER_1));

    const res = await buy(100);

    expect(res.status).toBe(201);
    expect(res.body.data.purchase.payment.orderId).toBe(`${ORDER_1}-2`);
  });

  it('settlement untuk order_id terpakai tidak melunasi pesanan dan tidak menambah tokensSold', async () => {
    fake.setStatus(ORDER_1, purchaseStatus(100));
    const res = await buy(100);

    const notified = await deliver(app, signedNotification(ORDER_1, fake.transactions.get(ORDER_1)!));

    expect(notified.status).toBe(200);
    expect(notified.body.data.outcome).toBe('ORDER_ID_TAKEN');
    await expect(readPurchase(res.body.data.purchase.id)).resolves.toMatchObject({ status: 'PENDING_PAYMENT', transfer: null });
    await expect(prisma.offering.findUniqueOrThrow({ where: { id: offering.id } })).resolves.toMatchObject({ tokensSold: 0 });
    await expect(transferJobs()).resolves.toBe(0);
    await expect(prisma.paymentAnomaly.findFirstOrThrow()).resolves.toMatchObject({ type: 'UNKNOWN_ORDER', orderId: ORDER_1 });
  });
});

describe('pesanan milik sendiri', () => {
  it('GET /api/purchases hanya milik sendiri, terbaru lebih dulu', async () => {
    const other = await otherInvestor();
    await buy(10, other.authorization);
    const mine = await buy(20);

    const res = await request(app).get('/api/purchases').set('Authorization', authorization);

    expect(res.status).toBe(200);
    expect(res.body.data.purchases.map((purchase: { id: string }) => purchase.id)).toEqual([mine.body.data.purchase.id]);
  });

  it('pesanan investor lain dibalas 404, sama dengan yang tidak ada', async () => {
    const other = await otherInvestor();
    const theirs = await buy(10, other.authorization);
    const id = theirs.body.data.purchase.id;

    const read = await request(app).get(`/api/purchases/${id}`).set('Authorization', authorization);
    const pay = await continuePayment(id);
    const missing = await request(app).get('/api/purchases/01a18897-fb42-70b8-abc0-43d131ddbe3c').set('Authorization', authorization);

    expect(read.status).toBe(404);
    expect(pay.status).toBe(404);
    expect(missing.status).toBe(404);
    expect(read.body.error.message).toBe(missing.body.error.message);
  });
});
