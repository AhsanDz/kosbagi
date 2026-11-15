// Endpoint selain alur pembayaran, dengan PostgreSQL sungguhan.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { verifyAccessToken } from '../../src/lib/jwt.js';
import { bearer, DEMO_PASSWORD, FakeMidtrans, notifyStatus, RENT_IDR, resetDatabase, seedFixture, startPayment } from './helpers.js';

let app: Express;
let fixture: Awaited<ReturnType<typeof seedFixture>>;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/auth/login', () => {
  // Batas login 10 per menit, jadi test di sini memakai IP berbeda.
  function login(ip: string, body: object) {
    return request(app).post('/api/auth/login').set('X-Forwarded-For', ip).send(body);
  }

  it('membalas token 8 jam dan data pengguna tanpa hash kata sandi', async () => {
    const res = await login('198.51.100.1', { email: fixture.tenant.email, password: DEMO_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.user).toEqual({
      id: fixture.tenant.id,
      name: 'Penghuni Uji',
      email: fixture.tenant.email,
      role: 'TENANT',
    });
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');

    await expect(verifyAccessToken(res.body.data.token)).resolves.toEqual({ id: fixture.tenant.id, role: 'TENANT' });
    const hours = (Date.parse(res.body.data.expiresAt) - Date.now()) / 3_600_000;
    expect(hours).toBeGreaterThan(7.9);
    expect(hours).toBeLessThanOrEqual(8);
  });

  it('email tidak membedakan huruf besar', async () => {
    const res = await login('198.51.100.2', { email: 'PENGHUNI@kosbagi.test', password: DEMO_PASSWORD });

    expect(res.status).toBe(200);
  });

  it('kata sandi salah dan email tidak terdaftar dibalas sama persis', async () => {
    const wrongPassword = await login('198.51.100.3', { email: fixture.tenant.email, password: 'salah' });
    const unknownEmail = await login('198.51.100.4', { email: 'tidak.ada@kosbagi.test', password: 'salah' });

    expect(wrongPassword.status).toBe(401);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.status).toBe(401);
    expect(unknownEmail.body.error.message).toBe(wrongPassword.body.error.message);
  });
});

describe('GET /api/auth/me', () => {
  it('membalas pengguna dari token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', await bearer(fixture.admin));

    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ id: fixture.admin.id, role: 'ADMIN' });
  });

  it('token sah untuk akun yang sudah tidak ada: 401', async () => {
    const authorization = await bearer({ id: '01a18897-fb42-70b8-abc0-43d131ddbe3c', role: 'ADMIN' });

    const res = await request(app).get('/api/auth/me').set('Authorization', authorization);

    expect(res.status).toBe(401);
  });
});

describe('tagihan penghuni', () => {
  function get(path: string, authorization: string) {
    return request(app).get(path).set('Authorization', authorization);
  }

  it('GET /api/bills/current: tagihan terbaru dan data kamar', async () => {
    await prisma.bill.create({
      data: {
        roomId: fixture.room.id,
        tenantId: fixture.tenant.id,
        period: '2026-08',
        amountIdr: BigInt(RENT_IDR),
        status: 'PAID',
        paidAt: new Date('2026-08-06T03:00:00.000Z'),
        dueDate: new Date('2026-08-10'),
      },
    });

    const res = await get('/api/bills/current', await bearer(fixture.tenant));

    expect(res.status).toBe(200);
    expect(res.body.data.bill).toMatchObject({
      id: fixture.bill.id,
      period: '2026-11',
      amountIdr: RENT_IDR,
      status: 'UNPAID',
      dueDate: '2026-11-10',
      paidAt: null,
      paymentState: 'NONE',
      payment: null,
      chain: null,
    });
    expect(res.body.data.room).toEqual({
      number: 'K03',
      propertyName: 'Kos Sumbersari 01',
      propertyCode: 'SMR01',
      monthlyRentIdr: RENT_IDR,
      leaseStart: '2026-08',
      leaseEnd: '2027-07',
      dueDay: 10,
    });
  });

  it('GET /api/bills/current: penghuni tanpa kamar dan tagihan mendapat null', async () => {
    const newcomer = await prisma.user.create({
      data: { name: 'Baru', email: 'baru@kosbagi.test', role: 'TENANT', passwordHash: 'x' },
    });

    const res = await get('/api/bills/current', await bearer(newcomer));

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ bill: null, room: null });
  });

  it('GET /api/bills: hanya milik sendiri, terbaru lebih dulu', async () => {
    await prisma.bill.create({
      data: {
        roomId: fixture.room.id,
        tenantId: fixture.tenant.id,
        period: '2026-10',
        amountIdr: BigInt(RENT_IDR),
        dueDate: new Date('2026-10-10'),
      },
    });

    const res = await get('/api/bills', await bearer(fixture.tenant));

    expect(res.status).toBe(200);
    expect(res.body.data.bills.map((bill: { period: string }) => bill.period)).toEqual(['2026-11', '2026-10']);
  });

  it('GET /api/bills/:id: tagihan orang lain 404, sama dengan tagihan yang tidak ada', async () => {
    const authorization = await bearer(fixture.tenant);

    const foreign = await get(`/api/bills/${fixture.otherBill.id}`, authorization);
    const missing = await get('/api/bills/01a18897-fb42-70b8-abc0-43d131ddbe3c', authorization);

    expect(foreign.status).toBe(404);
    expect(foreign.body.error.code).toBe('NOT_FOUND');
    expect(missing.status).toBe(404);
    expect(foreign.body.error.message).toBe(missing.body.error.message);
  });

  it('chain menampilkan tx hash setelah worker mencatat', async () => {
    const fake = new FakeMidtrans();
    const authorization = await bearer(fixture.tenant);
    await startPayment(app, fixture.bill.id, authorization);
    await notifyStatus(app, fake, 'RENT-SMR01-K03-2026-11');
    const job = await prisma.outboxJob.findFirstOrThrow();
    await prisma.chainTransaction.create({
      data: { outboxJobId: job.id, reference: '0xref', status: 'RECORDED', txHash: '0xabc', blockNumber: 123n },
    });

    const res = await get(`/api/bills/${fixture.bill.id}`, authorization);

    expect(res.body.data.bill.chain).toEqual({ status: 'RECORDED', txHash: '0xabc', blockNumber: 123 });
  });
});

describe('properti publik', () => {
  it('GET /api/properties tanpa login', async () => {
    const res = await request(app).get('/api/properties');

    expect(res.status).toBe(200);
    expect(res.body.data.properties).toEqual([
      {
        code: 'SMR01',
        slug: 'sumbersari-01',
        name: 'Kos Sumbersari 01',
        address: 'Jl. Sumbersari, Malang',
        valuationIdr: 1_800_000_000,
        tokenSymbol: 'KB-SMR01',
        totalTokens: 18_000,
        tokenPriceIdr: 100_000,
        ownerTokens: 5_400,
        maxTokensPerInvestor: 1_800,
        roomCount: 3,
        occupiedRoomCount: 2,
      },
    ]);
  });

  it('GET /api/properties/:slug', async () => {
    const res = await request(app).get('/api/properties/sumbersari-01');

    expect(res.status).toBe(200);
    expect(res.body.data.property.code).toBe('SMR01');
  });

  it('GET /api/properties/:slug/rooms tanpa data penghuni', async () => {
    const res = await request(app).get('/api/properties/sumbersari-01/rooms');

    expect(res.status).toBe(200);
    expect(res.body.data.rooms).toEqual([
      { number: 'K03', status: 'OCCUPIED', monthlyRentIdr: RENT_IDR },
      { number: 'K04', status: 'OCCUPIED', monthlyRentIdr: RENT_IDR },
      { number: 'K06', status: 'VACANT', monthlyRentIdr: RENT_IDR },
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/tenant|Penghuni/i);
  });

  it('slug tidak dikenal: 404', async () => {
    const detail = await request(app).get('/api/properties/tidak-ada');
    const rooms = await request(app).get('/api/properties/tidak-ada/rooms');

    expect(detail.status).toBe(404);
    expect(rooms.status).toBe(404);
  });
});

describe('KYC dummy', () => {
  const submission = { fullName: 'Investor Uji', dummyIdNumber: 'DUMMY-3507-0001' };

  function submit(authorization: string, body: object = submission) {
    return request(app).post('/api/kyc').set('Authorization', authorization).send(body);
  }

  it('alur disetujui: ajukan, muncul di daftar admin, disetujui', async () => {
    const investor = await bearer(fixture.investor);
    const admin = await bearer(fixture.admin);

    const before = await request(app).get('/api/kyc/me').set('Authorization', investor);
    expect(before.body.data.kyc).toBeNull();

    const created = await submit(investor);
    expect(created.status).toBe(201);
    expect(created.body.data.kyc).toMatchObject({ ...submission, status: 'SUBMITTED', rejectionReason: null, reviewedAt: null });

    const list = await request(app).get('/api/kyc?status=SUBMITTED').set('Authorization', admin);
    expect(list.body.data.submissions).toHaveLength(1);
    expect(list.body.data.submissions[0].user).toEqual({
      id: fixture.investor.id,
      name: fixture.investor.name,
      email: fixture.investor.email,
    });

    const approved = await request(app)
      .post(`/api/kyc/${created.body.data.kyc.id}/approve`)
      .set('Authorization', admin);
    expect(approved.status).toBe(200);
    expect(approved.body.data.kyc.status).toBe('APPROVED');
    expect(approved.body.data.kyc.reviewedAt).not.toBeNull();

    const after = await request(app).get('/api/kyc/me').set('Authorization', investor);
    expect(after.body.data.kyc.status).toBe('APPROVED');
    await expect(prisma.kycSubmission.findFirstOrThrow()).resolves.toMatchObject({ reviewedById: fixture.admin.id });
  });

  it('ditolak dengan alasan, lalu boleh mengajukan lagi', async () => {
    const investor = await bearer(fixture.investor);
    const created = await submit(investor);

    const rejected = await request(app)
      .post(`/api/kyc/${created.body.data.kyc.id}/reject`)
      .set('Authorization', await bearer(fixture.admin))
      .send({ reason: 'Nama tidak sesuai.' });

    expect(rejected.status).toBe(200);
    expect(rejected.body.data.kyc).toMatchObject({ status: 'REJECTED', rejectionReason: 'Nama tidak sesuai.' });
    expect((await submit(investor)).status).toBe(201);
  });

  it('pengajuan kedua saat masih berlaku: 409', async () => {
    const investor = await bearer(fixture.investor);
    await submit(investor);

    const res = await submit(investor);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('KYC_ALREADY_SUBMITTED');
  });

  it('dua pengajuan bersamaan: hanya satu yang tersimpan', async () => {
    const investor = await bearer(fixture.investor);

    const results = await Promise.all([submit(investor), submit(investor)]);

    expect(results.map((res) => res.status).sort()).toEqual([201, 409]);
    await expect(prisma.kycSubmission.count()).resolves.toBe(1);
  });

  it('pengajuan yang sudah ditinjau tidak bisa ditinjau lagi', async () => {
    const created = await submit(await bearer(fixture.investor));
    const admin = await bearer(fixture.admin);
    const path = `/api/kyc/${created.body.data.kyc.id}`;
    await request(app).post(`${path}/approve`).set('Authorization', admin);

    const res = await request(app).post(`${path}/reject`).set('Authorization', admin).send({ reason: 'Terlambat.' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('KYC_ALREADY_REVIEWED');
    await expect(prisma.kycSubmission.findFirstOrThrow()).resolves.toMatchObject({ status: 'APPROVED' });
  });

  it('id tidak ada: 404', async () => {
    const res = await request(app)
      .post('/api/kyc/01a18897-fb42-70b8-abc0-43d131ddbe3c/approve')
      .set('Authorization', await bearer(fixture.admin));

    expect(res.status).toBe(404);
  });
});

describe('POST /api/owner-applications', () => {
  const application = {
    ownerName: 'Budi Santoso',
    contact: '+62 812-3456-7890',
    propertyAddress: 'Jl. Sumbersari Gang 3 No. 12, Malang',
    roomCount: 12,
    monthlyRentIdr: 1_200_000,
    occupancyPercent: 87.5,
    consent: true,
  };

  function apply(ip: string) {
    return request(app).post('/api/owner-applications').set('X-Forwarded-For', ip).send(application);
  }

  it('membalas 201 dengan nomor pengajuan dan menyimpan data', async () => {
    const res = await apply('198.51.100.20');
    const year = new Date().getFullYear();

    expect(res.status).toBe(201);
    expect(res.body.data).toEqual({
      applicationNumber: `AJU-SMR-${year}-0001`,
      status: 'SUBMITTED',
      submittedAt: expect.any(String),
    });
    await expect(prisma.ownerApplication.findFirstOrThrow()).resolves.toMatchObject({
      ownerName: 'Budi Santoso',
      contact: '6281234567890',
      roomCount: 12,
      monthlyRentIdr: 1_200_000n,
      occupancyPercent: 87.5,
      sequence: 1,
    });
  });

  it('nomor berurutan dan tidak kembar walau dikirim bersamaan', async () => {
    const results = await Promise.all(
      ['198.51.100.21', '198.51.100.22', '198.51.100.23', '198.51.100.24', '198.51.100.25'].map(apply),
    );

    expect(results.every((res) => res.status === 201)).toBe(true);
    const sequences = results.map((res) => Number(res.body.data.applicationNumber.slice(-4))).sort();
    expect(sequences).toEqual([1, 2, 3, 4, 5]);
  });

  it('urutan mulai lagi dari 1 di tahun baru', async () => {
    await prisma.ownerApplication.create({
      data: {
        applicationNumber: 'AJU-SMR-2000-0009',
        year: 2000,
        sequence: 9,
        ownerName: 'Lama',
        contact: '081234567890',
        propertyAddress: 'Alamat lama',
        roomCount: 1,
        monthlyRentIdr: 1n,
        occupancyPercent: 0,
      },
    });

    const res = await apply('198.51.100.26');

    expect(res.body.data.applicationNumber.endsWith('-0001')).toBe(true);
  });
});
