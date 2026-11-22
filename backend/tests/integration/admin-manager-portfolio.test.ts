// Ringkasan admin, antrean job dengan Coba lagi, status kamar pengelola, dan portofolio investor
// (P4) lewat HTTP dengan PostgreSQL sungguhan dan kontrak tiruan.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { chainAccess } from '../../src/modules/periods/chain.js';
import { dispatchOutboxBatch, type JobSink } from '../../src/queue/outbox-dispatcher.js';
import { bearer, resetDatabase } from './helpers.js';
import {
  addHolder,
  addNovemberExpenses,
  FakeLedgerReader,
  type November,
  OWNER_WALLET,
  payRent,
  PERIOD,
  ROOM_NUMBERS,
  seedNovember,
  setChain,
  TREASURY_WALLET,
} from './p4-helpers.js';

let app: Express;
let data: November;
let admin: string;
let reader: FakeLedgerReader;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  data = await seedNovember();
  admin = await bearer(data.admin);
  reader = new FakeLedgerReader();
  vi.spyOn(chainAccess, 'reader').mockReturnValue(reader);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

/** Cerita data frame "berjalan" (18 Nov 2026): K04 dan K09 belum bayar, K08 gagal dicatat, nota K07 menunggu. */
async function november18() {
  const paidAt = (day: number) => new Date(`2026-11-${String(day).padStart(2, '0')}T03:00:00.000Z`);
  await payRent(data, 'K01', { paidAt: paidAt(3) });
  await payRent(data, 'K02', { paidAt: paidAt(5) });
  await payRent(data, 'K10', { paidAt: paidAt(6) });
  await payRent(data, 'K05', { paidAt: paidAt(7) });
  await payRent(data, 'K03', { paidAt: paidAt(9) });
  await payRent(data, 'K07', { paidAt: paidAt(12) });
  const k08 = await payRent(data, 'K08', { paidAt: paidAt(14), chain: 'FAILED' });
  const k07 = await addNovemberExpenses(data, 'NONE');
  return { k08, k07 };
}

describe('GET /api/admin/summary', () => {
  it('periode berjalan dan hal yang perlu perhatian', async () => {
    await november18();
    await prisma.kycSubmission.create({ data: { userId: data.investor.id, fullName: 'Dimas Pratama', dummyIdNumber: 'DUMMY-0042' } });
    await prisma.paymentAnomaly.create({ data: { type: 'AMOUNT_MISMATCH', orderId: 'BUY-SMR01-0004' } });

    const res = await request(app).get('/api/admin/summary').set('Authorization', admin);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      currentPeriod: { period: PERIOD, status: 'OPEN', roomsRecorded: 6, roomsTotal: 9, expensesIdr: 2_400_000 },
      attention: { kycSubmitted: 1, jobsFailed: 1, jobsPending: 1, anomaliesOpen: 1, refundsPending: 0 },
    });
  });

  it('job gagal yang sudah ditangani tidak dihitung; pembayaran setelah periode ditutup dihitung refundsPending', async () => {
    const { k08 } = await november18();
    await request(app).post(`/api/admin/jobs/${k08.jobId}/resolve`).set('Authorization', admin).send({ note: 'Sudah tercatat lewat order lain.' });
    const bill = data.bills.get('K04')!;
    await prisma.payment.create({
      data: { orderId: 'RENT-SMR01-K04-2026-11', billId: bill.id, attempt: 1, amountIdr: 1_500_000n, status: 'PAID_AFTER_CLOSE', expiresAt: new Date(), paidAt: new Date() },
    });

    const res = await request(app).get('/api/admin/summary').set('Authorization', admin);

    expect(res.body.data.attention).toMatchObject({ jobsFailed: 0, refundsPending: 1 });
  });
});

describe('antrean job admin', () => {
  it('referensi per jenis job, tab Menunggu atau gagal dan Semua', async () => {
    const { k08, k07 } = await november18();
    const holder = await addHolder(data, data.investor, 5, 100);

    const open = await request(app).get('/api/admin/jobs').set('Authorization', admin);
    const all = await request(app).get('/api/admin/jobs?view=all').set('Authorization', admin);

    expect(open.status).toBe(200);
    expect(open.body.data.counts).toEqual({ open: 2, all: 14 });
    expect(open.body.data.jobs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: k08.jobId, type: 'RECORD_RENT', reference: 'RENT-SMR01-K08-2026-11', status: 'FAILED', attempts: 5, lastError: 'RPC tidak menjawab.' }),
        expect.objectContaining({ id: k07.outboxJobId, type: 'RECORD_EXPENSE', reference: k07.receiptHash, status: 'QUEUED', attempts: 0 }),
      ]),
    );
    expect(all.body.data.jobs).toHaveLength(14);
    const references = new Map(all.body.data.jobs.map((job: { type: string; reference: string }) => [job.type, job.reference]));
    expect(references.get('TRANSFER_TOKENS')).toBe(holder.orderId);
    expect(references.get('WHITELIST_KYC')).toBe(holder.address);
  });

  it('Coba lagi hanya untuk job FAILED, lalu dispatcher mengirimnya lagi dengan id job baru', async () => {
    const { k08 } = await november18();
    const recorded = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'RECORD_RENT', id: { not: k08.jobId } } });
    await prisma.outboxJob.updateMany({ data: { status: 'DISPATCHED', dispatchedAt: new Date() } });

    const notFailed = await request(app).post(`/api/admin/jobs/${recorded.id}/retry`).set('Authorization', admin);
    expect([notFailed.status, notFailed.body.error.code]).toEqual([409, 'JOB_NOT_FAILED']);
    const unknown = await request(app).post('/api/admin/jobs/01a18897-fb42-70b8-abc0-43d131ddbe3c/retry').set('Authorization', admin);
    expect(unknown.status).toBe(404);

    const retry = await request(app).post(`/api/admin/jobs/${k08.jobId}/retry`).set('Authorization', admin);
    expect(retry.status).toBe(202);
    expect(retry.body.data.job).toMatchObject({ id: k08.jobId, status: 'QUEUED', attempts: 0, lastError: null });
    expect(await prisma.outboxJob.findUniqueOrThrow({ where: { id: k08.jobId } })).toMatchObject({ status: 'PENDING', attempts: 0 });
    expect(await prisma.outboxJobRetry.count({ where: { outboxJobId: k08.jobId, requestedById: data.admin.id } })).toBe(1);

    // Ditekan lagi sebelum worker mengerjakannya: sudah tidak FAILED.
    const twice = await request(app).post(`/api/admin/jobs/${k08.jobId}/retry`).set('Authorization', admin);
    expect(twice.body.error.code).toBe('JOB_NOT_FAILED');

    const sink: JobSink & { calls: unknown[][] } = { calls: [], add: async (...args) => void sink.calls.push(args) };
    await dispatchOutboxBatch(sink);
    expect(sink.calls).toEqual([['RECORD_RENT', expect.objectContaining({ outboxJobId: k08.jobId }), { jobId: `${k08.jobId}-retry-1` }]]);

    // Pengelola melihat Menunggu pencatatan selama job diulang, lalu Tercatat setelah worker selesai.
    const manager = await bearer(data.manager);
    const during = await request(app).get('/api/manager/rooms').set('Authorization', manager);
    expect(during.body.data.rooms.find((room: { roomNumber: string }) => room.roomNumber === 'K08').chain.status).toBe('PENDING');
    await setChain(k08.jobId, 'RECORDED');
    const after = await request(app).get('/api/admin/jobs?view=all').set('Authorization', admin);
    expect(after.body.data.jobs.find((job: { id: string }) => job.id === k08.jobId).status).toBe('RECORDED');
  });
});

describe('Tandai ditangani untuk job yang gagal permanen', () => {
  it('menyimpan siapa, kapan, dan catatan; tab Menunggu atau gagal tidak lagi memuatnya', async () => {
    const { k08 } = await november18();

    const resolved = await request(app)
      .post(`/api/admin/jobs/${k08.jobId}/resolve`)
      .set('Authorization', admin)
      .send({ note: '  Kamar K08 sudah tercatat lewat order lain.  ' });

    expect(resolved.status).toBe(200);
    expect(resolved.body.data.job).toMatchObject({
      id: k08.jobId,
      status: 'FAILED',
      resolution: { resolvedBy: { name: 'Laras Kusuma' }, note: 'Kamar K08 sudah tercatat lewat order lain.', resolvedAt: expect.any(String) },
    });
    expect(await prisma.outboxJobResolution.findUniqueOrThrow({ where: { outboxJobId: k08.jobId } })).toMatchObject({
      resolvedById: data.admin.id,
    });

    const open = await request(app).get('/api/admin/jobs').set('Authorization', admin);
    const all = await request(app).get('/api/admin/jobs?view=all').set('Authorization', admin);
    expect(open.body.data.jobs.map((job: { id: string }) => job.id)).not.toContain(k08.jobId);
    expect(open.body.data.counts.open).toBe(1);
    expect(all.body.data.jobs.find((job: { id: string }) => job.id === k08.jobId).resolution.note).toContain('K08');

    // Pengelola tidak lagi diminta menindaklanjuti K08.
    const board = await request(app).get('/api/manager/rooms').set('Authorization', await bearer(data.manager));
    expect(board.body.data.followUps.map((item: { kind: string; roomNumber: string | null }) => `${item.kind}:${item.roomNumber}`)).not.toContain(
      'CHAIN_FAILED:K08',
    );
  });

  it('hanya untuk job FAILED yang belum ditangani; job ditangani tidak bisa dicoba lagi', async () => {
    const { k08 } = await november18();
    const recorded = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'RECORD_RENT', id: { not: k08.jobId } } });
    const resolve = (id: string, note = 'Sudah dicek manual di Etherscan.') =>
      request(app).post(`/api/admin/jobs/${id}/resolve`).set('Authorization', admin).send({ note });

    const tooShort = await resolve(k08.jobId, 'ok');
    expect([tooShort.status, tooShort.body.error.code]).toEqual([400, 'VALIDATION_ERROR']);
    const notFailed = await resolve(recorded.id);
    expect([notFailed.status, notFailed.body.error.code]).toEqual([409, 'JOB_NOT_FAILED']);
    expect((await resolve('01a18897-fb42-70b8-abc0-43d131ddbe3c')).status).toBe(404);

    const results = await Promise.all([resolve(k08.jobId), resolve(k08.jobId)]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(results.find((res) => res.status === 409)?.body.error.code).toBe('JOB_ALREADY_RESOLVED');
    expect(await prisma.outboxJobResolution.count()).toBe(1);

    const retry = await request(app).post(`/api/admin/jobs/${k08.jobId}/retry`).set('Authorization', admin);
    expect([retry.status, retry.body.error.code]).toEqual([409, 'JOB_RESOLVED']);
    expect(await prisma.outboxJobRetry.count()).toBe(0);
  });
});

describe('GET /api/manager/rooms', () => {
  it('ringkasan sewa masuk, papan 10 kamar, dan hal yang perlu ditindaklanjuti (18 Nov 2026)', async () => {
    const { k07 } = await november18();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-18T03:00:00.000Z'));

    const res = await request(app).get(`/api/manager/rooms?period=${PERIOD}`).set('Authorization', await bearer(data.manager));

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toEqual({
      expectedIdr: 13_500_000,
      paidIdr: 10_500_000,
      recordedIdr: 9_000_000,
      pendingIdr: 1_500_000,
      roomsPaid: 7,
      roomsRecorded: 6,
      roomsOccupied: 9,
    });
    const rooms = res.body.data.rooms as Array<Record<string, unknown>>;
    expect(rooms.map((room) => room.roomNumber)).toEqual([...ROOM_NUMBERS]);
    expect(rooms.find((room) => room.roomNumber === 'K04')).toMatchObject({
      status: 'OCCUPIED',
      tenantName: 'Penghuni K04',
      bill: { status: 'UNPAID', dueDate: '2026-11-10', paidAt: null, amountIdr: 1_500_000 },
      chain: null,
      daysOverdue: 8,
    });
    expect(rooms.find((room) => room.roomNumber === 'K06')).toEqual({
      roomNumber: 'K06',
      status: 'VACANT',
      tenantName: null,
      bill: null,
      chain: null,
      daysOverdue: 0,
    });
    expect(rooms.find((room) => room.roomNumber === 'K08')).toMatchObject({ chain: { status: 'FAILED', txHash: null }, daysOverdue: 0 });
    expect(rooms.find((room) => room.roomNumber === 'K01')).toMatchObject({ chain: { status: 'RECORDED', txHash: expect.stringMatching(/^0x[0-9a-f]{64}$/) } });
    expect(res.body.data.followUps).toEqual([
      { kind: 'OVERDUE', roomNumber: 'K04', expenseId: null },
      { kind: 'OVERDUE', roomNumber: 'K09', expenseId: null },
      { kind: 'CHAIN_FAILED', roomNumber: 'K08', expenseId: null },
      { kind: 'EXPENSE_PENDING', roomNumber: null, expenseId: k07.id },
    ]);
  });

  it('pengelola tanpa properti 404; admin ikut membaca', async () => {
    expect((await request(app).get('/api/manager/rooms').set('Authorization', await bearer(data.otherManager))).status).toBe(404);
    expect((await request(app).get('/api/manager/rooms').set('Authorization', admin)).status).toBe(200);
  });
});

describe('portofolio investor', () => {
  it('belum punya token: saldo 0, tanpa kepemilikan, sewa masuk tanpa nama penghuni, tarik saldo nonaktif', async () => {
    await november18();
    const res = await request(app).get('/api/portfolio/summary').set('Authorization', await bearer(data.investor));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      balanceIdr: 0,
      lastDistribution: null,
      holding: null,
      currentPeriod: { period: PERIOD, status: 'OPEN', recordedRentIdr: 9_000_000, roomsRecorded: 6, roomsTotal: 9 },
      withdraw: { enabled: false, reason: 'Penarikan dibuka setelah disbursement sandbox tersedia.' },
    });
    const { chart, rentFeed } = res.body.data.currentPeriod;
    expect(chart).toEqual([
      { date: '2026-11-03', amountIdr: 1_500_000 },
      { date: '2026-11-05', amountIdr: 1_500_000 },
      { date: '2026-11-06', amountIdr: 1_500_000 },
      { date: '2026-11-07', amountIdr: 1_500_000 },
      { date: '2026-11-09', amountIdr: 1_500_000 },
      { date: '2026-11-12', amountIdr: 1_500_000 },
    ]);
    expect(rentFeed.map((row: { roomNumber: string; status: string }) => `${row.roomNumber}:${row.status}`)).toEqual([
      'K01:RECORDED',
      'K02:RECORDED',
      'K03:RECORDED',
      'K04:UNPAID',
      'K05:RECORDED',
      'K06:VACANT',
      'K07:RECORDED',
      // Gagal dicatat tetap terbaca Menunggu pencatatan untuk investor.
      'K08:PENDING',
      'K09:UNPAID',
      'K10:RECORDED',
    ]);
    expect(rentFeed[0]).toMatchObject({ amountIdr: 1_500_000, recordedAt: '2026-11-03T03:00:00.000Z', paymentRef: expect.stringMatching(/^0x[0-9a-f]{64}$/) });
    expect(rentFeed[3]).toMatchObject({ dueDate: '2026-11-10', recordedAt: null, txHash: null });
    expect(JSON.stringify(res.body)).not.toContain('Penghuni');
  });

  it('setelah distribusi: saldo, kepemilikan, riwayat bagi hasil, dan transaksi dengan bukti on-chain', async () => {
    for (const room of ROOM_NUMBERS.filter((room) => room !== 'K06')) await payRent(data, room);
    await addNovemberExpenses(data);
    const dimas = await addHolder(data, data.investor, 5, 100);
    reader.setBalance(OWNER_WALLET, 5_400n);
    reader.setBalance(TREASURY_WALLET, 12_500n);
    reader.setBalance(dimas.address, 100n);
    expect((await request(app).post(`/api/periods/${PERIOD}/close`).set('Authorization', admin)).status).toBe(202);
    const close = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'CLOSE_PERIOD' } });
    const closeTx = `0x5e21${'0'.repeat(56)}7c0a`;
    await setChain(close.id, 'RECORDED', { txHash: closeTx });
    expect((await request(app).post(`/api/periods/${PERIOD}/distribute`).set('Authorization', admin)).status).toBe(200);

    const investor = await bearer(data.investor);
    const summary = await request(app).get('/api/portfolio/summary').set('Authorization', investor);
    const portfolio = await request(app).get('/api/portfolio').set('Authorization', investor);

    expect(summary.body.data).toMatchObject({
      balanceIdr: 43_875,
      lastDistribution: { period: PERIOD, amountIdr: 43_875 },
      holding: { tokenSymbol: 'KB-SMR01', tokenBalance: 100, percentOfSupply: 0.56, walletAddress: dimas.address },
      currentPeriod: { status: 'DISTRIBUTED', roomsRecorded: 9, recordedRentIdr: 13_500_000 },
    });
    expect(portfolio.body.data).toMatchObject({
      holding: { tokenBalance: 100 },
      wallet: { address: dimas.address },
      distributions: [{ period: PERIOD, tokenBalance: 100, valuePerTokenSen: 43_875, amountIdr: 43_875, snapshotBlock: 7_312_884, closeTxHash: closeTx }],
    });
    expect(portfolio.body.data.transactions).toEqual([
      expect.objectContaining({
        type: 'DISTRIBUTION',
        description: 'Distribusi November 2026, 100 token × Rp438,75',
        tokenAmount: 100,
        amountIdr: 43_875,
        chain: { status: 'RECORDED', txHash: closeTx },
      }),
      expect.objectContaining({
        type: 'KYC_APPROVED',
        description: `Dompet ${dimas.address.slice(0, 6)}…${dimas.address.slice(-4)} dicatat lolos KYC di KosToken`,
        tokenAmount: 0,
        amountIdr: 0,
        chain: { status: 'RECORDED', txHash: expect.stringMatching(/^0x/) },
      }),
      expect.objectContaining({
        type: 'PURCHASE',
        description: 'BUY-SMR01-0006, 100 token ke dompet kustodian',
        tokenAmount: 100,
        amountIdr: 10_000_000,
        chain: { status: 'RECORDED', txHash: expect.stringMatching(/^0x/) },
      }),
    ]);
  });

  it('transfer token yang gagal dicatat terbaca PENDING di portofolio dan pesanan investor', async () => {
    await addHolder(data, data.investor, 5, 100, { transfer: 'FAILED' });
    const investor = await bearer(data.investor);

    const portfolio = await request(app).get('/api/portfolio').set('Authorization', investor);
    const purchases = await request(app).get('/api/purchases').set('Authorization', investor);

    const purchase = portfolio.body.data.transactions.find((row: { type: string }) => row.type === 'PURCHASE');
    expect(purchase.chain).toEqual({ status: 'PENDING', txHash: null });
    expect(purchases.body.data.purchases[0].transfer).toMatchObject({ status: 'PENDING' });
    expect(JSON.stringify([portfolio.body, purchases.body])).not.toContain('FAILED');
  });
});
