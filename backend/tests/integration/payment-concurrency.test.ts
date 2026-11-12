// Banyak klik Bayar bersamaan. Pool koneksi berisi 10, jadi jumlah klik di sini sengaja melewati
// angka itu: bug pool habis hanya muncul mulai 10 permintaan, tidak terlihat oleh test 2 klik.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { MidtransUnavailableError } from '../../src/modules/payments/midtrans.js';
import {
  bearer,
  DEMO_PASSWORD,
  FakeMidtrans,
  notifyStatus,
  resetDatabase,
  seedFixture,
  snapshotPaymentData,
  startPayment,
} from './helpers.js';

const CLICKS = 20;
const ORDER_1 = 'RENT-SMR01-K03-2026-11';
const ORDER_2 = 'RENT-SMR01-K03-2026-11-2';
const OTHER_ORDER = 'RENT-SMR01-K04-2026-11';

// Batas longgar untuk laptop yang sibuk, tetapi jauh di bawah 29 detik saat pool habis.
const RESPONSIVE_MS = 2_000;

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

/** Menahan jawaban Midtrans sampai `release` dipanggil, seperti Midtrans yang sedang lambat. */
function holdSnap() {
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release: () => release() };
}

function clickMany(count: number) {
  return Array.from({ length: count }, () => startPayment(app, fixture.bill.id, authorization));
}

describe(`${CLICKS} klik bersamaan`, () => {
  it('menghasilkan satu percobaan, satu transaksi Snap, dan token yang sama', async () => {
    const results = await Promise.all(clickMany(CLICKS));

    const statuses = results.map((res) => res.status).sort();
    expect(statuses).toEqual([...Array<number>(CLICKS - 1).fill(200), 201]);

    const tokens = new Set(results.map((res) => res.body.data.payment.snapToken));
    expect(tokens).toEqual(new Set([`snap-${ORDER_1}`]));

    expect(fake.createSnap).toHaveBeenCalledOnce();
    const { payments } = await snapshotPaymentData(fixture.bill.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ status: 'PENDING', orderId: ORDER_1 });
  });

  it('endpoint lain dan webhook tetap menjawab cepat selama Midtrans masih diproses', async () => {
    const otherTenant = await bearer(fixture.otherTenant);
    await startPayment(app, fixture.otherBill.id, otherTenant);

    const snap = holdSnap();
    fake.createSnap.mockImplementationOnce(async ({ orderId }) => {
      await snap.gate;
      return { token: `snap-${orderId}`, redirectUrl: `https://snap.test/${orderId}` };
    });

    const clicks = clickMany(CLICKS);
    await vi.waitFor(() => expect(fake.createSnap).toHaveBeenCalledTimes(2));

    const started = Date.now();
    const [properties, health, login, bills, webhook] = await Promise.all([
      request(app).get('/api/properties'),
      request(app).get('/api/health'),
      request(app)
        .post('/api/auth/login')
        .set('X-Forwarded-For', '198.51.100.40')
        .send({ email: fixture.manager.email, password: DEMO_PASSWORD }),
      request(app).get('/api/bills').set('Authorization', otherTenant),
      notifyStatus(app, fake, OTHER_ORDER),
    ]);
    const elapsed = Date.now() - started;

    expect(properties.status).toBe(200);
    expect(health.status).toBe(200);
    expect(login.status).toBe(200);
    expect(bills.status).toBe(200);
    expect(webhook.status).toBe(200);
    expect(webhook.body.data.outcome).toBe('SETTLED');
    expect(elapsed).toBeLessThan(RESPONSIVE_MS);

    snap.release();
    const results = await Promise.all(clicks);

    expect(results.map((res) => res.status).sort()).toEqual([...Array<number>(CLICKS - 1).fill(200), 201]);
    expect(new Set(results.map((res) => res.body.data.payment.snapToken)).size).toBe(1);
    await expect(prisma.payment.count({ where: { billId: fixture.bill.id } })).resolves.toBe(1);
  });

  it('Midtrans gagal: semua klik dibalas 502, hanya satu percobaan, dan bisa dicoba lagi', async () => {
    const snap = holdSnap();
    fake.createSnap.mockImplementationOnce(async () => {
      await snap.gate;
      throw new MidtransUnavailableError('putus');
    });

    const clicks = clickMany(CLICKS);
    await vi.waitFor(() => expect(fake.createSnap).toHaveBeenCalledOnce());
    // Beri waktu semua klik bergabung. Klik yang tiba setelah percobaan gagal adalah klik baru,
    // dan memang berhak membuat percobaan baru.
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    snap.release();
    const results = await Promise.all(clicks);

    expect(results.every((res) => res.status === 502)).toBe(true);
    expect(results.every((res) => res.body.error.code === 'MIDTRANS_UNAVAILABLE')).toBe(true);
    expect(fake.createSnap).toHaveBeenCalledOnce();

    const { payments } = await snapshotPaymentData(fixture.bill.id);
    expect(payments).toHaveLength(1);
    expect(payments[0]).toMatchObject({ status: 'FAILED', snapToken: null });

    const retry = await startPayment(app, fixture.bill.id, authorization);

    expect(retry.status).toBe(201);
    expect(retry.body.data.payment.orderId).toBe(ORDER_2);
  });

  it('banyak penghuni bersamaan melewati ukuran pool', async () => {
    const otherTenant = await bearer(fixture.otherTenant);

    const results = await Promise.all([
      ...clickMany(CLICKS),
      ...Array.from({ length: CLICKS }, () => startPayment(app, fixture.otherBill.id, otherTenant)),
    ]);

    expect(results.every((res) => res.status === 200 || res.status === 201)).toBe(true);
    expect(fake.createSnap).toHaveBeenCalledTimes(2);
    await expect(prisma.payment.count()).resolves.toBe(2);
  });
});

describe('percobaan tanpa token', () => {
  /** Baris seperti yang ditinggalkan proses yang sedang atau pernah memanggil Midtrans. */
  function createAttemptWithoutToken(ageMs: number) {
    const createdAt = new Date(Date.now() - ageMs);
    return prisma.payment.create({
      data: {
        orderId: ORDER_1,
        billId: fixture.bill.id,
        amountIdr: fixture.bill.amountIdr,
        createdAt,
        expiresAt: new Date(createdAt.getTime() + 5 * 60_000),
      },
    });
  }

  it('masih muda: klik kedua menunggu dan mendapat token yang disimpan proses pertama', async () => {
    const attempt = await createAttemptWithoutToken(0);

    const click = startPayment(app, fixture.bill.id, authorization);
    await new Promise((resolve) => setTimeout(resolve, 200));
    await prisma.payment.update({ where: { id: attempt.id }, data: { snapToken: 'token-proses-pertama' } });

    const res = await click;

    expect(res.status).toBe(200);
    expect(res.body.data.payment.snapToken).toBe('token-proses-pertama');
    expect(fake.createSnap).not.toHaveBeenCalled();
  });

  it('proses pertama mati: klik yang menunggu dibalas 502, klik berikutnya membuat percobaan baru', async () => {
    // Umur hampir habis, supaya test tidak perlu menunggu 10 detik.
    await createAttemptWithoutToken(9_700);

    const waiting = await startPayment(app, fixture.bill.id, authorization);

    expect(waiting.status).toBe(502);
    await new Promise((resolve) => setTimeout(resolve, 400));

    const next = await startPayment(app, fixture.bill.id, authorization);

    expect(next.status).toBe(201);
    expect(next.body.data.payment.orderId).toBe(ORDER_2);
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({
      status: 'FAILED',
    });
  });

  it('sudah tua: langsung ditutup tanpa menunggu', async () => {
    await createAttemptWithoutToken(60_000);

    const res = await startPayment(app, fixture.bill.id, authorization);

    expect(res.status).toBe(201);
    expect(res.body.data.payment.orderId).toBe(ORDER_2);
    await expect(prisma.payment.findUniqueOrThrow({ where: { orderId: ORDER_1 } })).resolves.toMatchObject({
      status: 'FAILED',
    });
  });
});
