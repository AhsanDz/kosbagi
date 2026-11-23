// Penutupan periode dan distribusi (P4) lewat HTTP dengan PostgreSQL sungguhan dan kontrak tiruan:
// struk sementara, syarat penutupan, Tutup periode, pembayaran telat (keputusan 4), struk dari
// kontrak, dan distribusi November dengan angka persis KONTRAK_P4 bagian 1. Versi yang membaca
// kontrak sungguhan di Hardhat node ada di distribution-chain.test.ts.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { chainAccess } from '../../src/modules/periods/chain.js';
import { bearer, FakeMidtrans, notifyStatus, resetDatabase, startPayment } from './helpers.js';
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

const OCCUPIED = ROOM_NUMBERS.filter((room) => room !== 'K06');

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
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

const getPeriod = () => request(app).get(`/api/periods/${PERIOD}`).set('Authorization', admin);
const closePeriod = () => request(app).post(`/api/periods/${PERIOD}/close`).set('Authorization', admin);
const distribute = () => request(app).post(`/api/periods/${PERIOD}/distribute`).set('Authorization', admin);

/** Sembilan sewa dan lima nota November tercatat semua, enam investor memegang token. */
async function readyNovember() {
  for (const room of OCCUPIED) await payRent(data, room);
  await addNovemberExpenses(data);
  const holders = [
    await addHolder(data, { name: 'Bagas Wicaksono', email: 'bagas@kosbagi.test' }, 1, 1_800),
    await addHolder(data, { name: 'Citra Lestari', email: 'citra@kosbagi.test' }, 2, 1_200),
    await addHolder(data, { name: 'Eko Saputra', email: 'eko@kosbagi.test' }, 3, 800),
    await addHolder(data, { name: 'Fajar Nugroho', email: 'fajar@kosbagi.test' }, 4, 560),
    await addHolder(data, data.investor, 5, 100),
  ];
  // Rani lolos KYC tetapi belum membeli: dompetnya ikut dibaca dan saldonya 0.
  await addHolder(data, { name: 'Rani Aulia', email: 'rani@kosbagi.test' }, 6, 0);
  return holders;
}

/** Saldo di blok snapshot sesuai KONTRAK_P4 bagian 1. */
function setNovemberBalances(holders: Awaited<ReturnType<typeof readyNovember>>) {
  reader.setBalance(OWNER_WALLET, 5_400n);
  reader.setBalance(TREASURY_WALLET, 8_140n);
  const tokens = [1_800n, 1_200n, 800n, 560n, 100n];
  holders.forEach((holder, index) => reader.setBalance(holder.address, tokens[index] ?? 0n));
}

/** Worker jalur 3 mencatat closePeriod. */
async function recordClose(status: 'RECORDED' | 'FAILED' = 'RECORDED') {
  const job = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'CLOSE_PERIOD' } });
  await setChain(job.id, status, status === 'RECORDED' ? { txHash: `0x5e21${'0'.repeat(56)}7c0a`, blockNumber: 7_312_885n } : {});
  return job;
}

describe('GET /api/periods/:period sebelum ditutup', () => {
  it('struk sementara dari data yang sudah tercatat saja (Rp390 per token) dan syarat yang belum terpenuhi', async () => {
    // Tujuh sewa tercatat, K08 gagal dicatat, K09 belum dikerjakan worker, nota K07 menunggu.
    for (const room of ['K01', 'K02', 'K03', 'K04', 'K05', 'K07', 'K10'] as const) await payRent(data, room);
    await payRent(data, 'K08', { chain: 'FAILED' });
    await payRent(data, 'K09', { chain: 'NONE' });
    await addNovemberExpenses(data, 'NONE');

    const res = await getPeriod();

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      period: PERIOD,
      status: 'OPEN',
      receipt: {
        provisional: true,
        grossRentIdr: 10_500_000,
        roomsRecorded: 7,
        roomsTotal: 9,
        expensesIdr: 2_400_000,
        expensesRecorded: 4,
        totalSupply: 18_000,
      },
      requirements: [
        { key: 'RENT_UNRECORDED', ok: false, count: 2 },
        { key: 'EXPENSE_UNRECORDED', ok: false, count: 1 },
        { key: 'TRANSFER_UNRECORDED', ok: true, count: 0 },
        { key: 'JOB_FAILED', ok: false, count: 1 },
      ],
      unpaidBills: 0,
      close: null,
      distribution: null,
    });
  });

  it('angka struk sementara mengikuti closePeriod: Rp12.000.000 dan Rp2.400.000 menjadi 39000 sen', async () => {
    for (const room of OCCUPIED.slice(0, 8)) await payRent(data, room);
    await addNovemberExpenses(data, 'NONE');

    const res = await getPeriod();

    expect(res.body.data.receipt).toEqual({
      provisional: true,
      grossRentIdr: 12_000_000,
      roomsRecorded: 8,
      roomsTotal: 9,
      expensesIdr: 2_400_000,
      expensesRecorded: 4,
      platformFeeIdr: 600_000,
      taxableProfitIdr: 9_000_000,
      taxIdr: 1_980_000,
      netRentIdr: 7_020_000,
      totalSupply: 18_000,
      valuePerTokenSen: 39_000,
    });
    expect(res.body.data.unpaidBills).toBe(1);
  });

  it('JOB_FAILED hanya job yang memengaruhi periode: whitelist gagal dan sewa periode lain tidak menghalangi', async () => {
    for (const room of OCCUPIED) await payRent(data, room);
    await addNovemberExpenses(data);
    // Whitelist investor gagal permanen: tidak memengaruhi angka periode.
    const whitelist = await prisma.outboxJob.create({
      data: { type: 'WHITELIST_KYC', dedupeKey: 'whitelist-kyc:uji', payload: { walletAddress: `0x${'1'.repeat(40)}`, approved: true } },
    });
    await setChain(whitelist.id, 'FAILED');
    // Sewa periode lain gagal dicatat.
    const october = await prisma.bill.create({
      data: { roomId: data.rooms.get('K01')!.id, tenantId: data.bills.get('K01')!.tenantId, period: '2026-10', amountIdr: 1_500_000n, dueDate: new Date('2026-10-10'), status: 'PAID', paidAt: new Date('2026-10-05') },
    });
    const payment = await prisma.payment.create({
      data: { orderId: 'RENT-SMR01-K01-2026-10', billId: october.id, attempt: 1, amountIdr: 1_500_000n, status: 'PAID', expiresAt: new Date(), paidAt: new Date() },
    });
    const octoberJob = await prisma.outboxJob.create({
      data: { type: 'RECORD_RENT', dedupeKey: `record-rent:${october.id}`, paymentId: payment.id, payload: {} },
    });
    await setChain(octoberJob.id, 'FAILED');

    const res = await getPeriod();

    expect(res.body.data.requirements.every((requirement: { ok: boolean }) => requirement.ok)).toBe(true);
    expect((await closePeriod()).status).toBe(202);
  });

  it('sewa gagal dicatat permanen yang ditandai ditangani admin tidak lagi menghalangi penutupan', async () => {
    for (const room of OCCUPIED) await payRent(data, room, { chain: room === 'K08' ? 'FAILED' : 'RECORDED' });
    await addNovemberExpenses(data);
    const k08 = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'RECORD_RENT', chainTransactions: { some: { status: 'FAILED' } } } });

    const before = await getPeriod();
    expect(before.body.data.requirements).toEqual(
      expect.arrayContaining([
        { key: 'RENT_UNRECORDED', ok: false, count: 1 },
        { key: 'JOB_FAILED', ok: false, count: 1 },
      ]),
    );

    await request(app).post(`/api/admin/jobs/${k08.id}/resolve`).set('Authorization', admin).send({ note: 'K08 sudah tercatat lewat order lain.' });
    const after = await getPeriod();

    expect(after.body.data.requirements.every((requirement: { ok: boolean }) => requirement.ok)).toBe(true);
    expect((await closePeriod()).status).toBe(202);
  });

  it('pesanan token lunas yang tokennya belum pindah menghalangi penutupan', async () => {
    await payRent(data, 'K01');
    await addHolder(data, data.investor, 5, 100, { transfer: 'NONE' });

    const res = await getPeriod();

    expect(res.body.data.requirements).toContainEqual({ key: 'TRANSFER_UNRECORDED', ok: false, count: 1 });
  });
});

describe('POST /api/periods/:period/close', () => {
  it('belum siap: 409 PERIOD_NOT_READY dengan daftar syarat, tanpa job', async () => {
    for (const room of OCCUPIED) await payRent(data, room, { chain: room === 'K08' ? 'FAILED' : 'RECORDED' });

    const res = await closePeriod();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PERIOD_NOT_READY');
    expect(res.body.error.details.requirements).toContainEqual({ key: 'RENT_UNRECORDED', ok: false, count: 1 });
    expect(await prisma.outboxJob.count({ where: { type: 'CLOSE_PERIOD' } })).toBe(0);
    expect(await prisma.periodClosing.count()).toBe(0);
  });

  it('periode tanpa sewa dan biaya tercatat: 409 PERIOD_EMPTY (closePeriod pasti revert EmptyPeriod)', async () => {
    const res = await closePeriod();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PERIOD_EMPTY');
  });

  it('siap: 202, job CLOSE_PERIOD dan baris penutupan ditulis bersama, status CLOSING', async () => {
    await readyNovember();

    const res = await closePeriod();

    expect(res.status).toBe(202);
    expect(res.body.data).toMatchObject({
      status: 'CLOSING',
      close: { job: { status: 'QUEUED', attempts: 0, lastError: null }, txHash: null, snapshotBlock: null },
    });
    const job = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'CLOSE_PERIOD' } });
    expect(job).toMatchObject({ dedupeKey: `close-period:SMR01:${PERIOD}`, payload: { propertyCode: 'SMR01', period: PERIOD } });
    expect(await prisma.periodClosing.findFirstOrThrow()).toMatchObject({ outboxJobId: job.id, requestedById: data.admin.id });
  });

  it('ditekan dua kali (termasuk bersamaan): hanya satu penutupan, sisanya 409 PERIOD_ALREADY_CLOSED', async () => {
    await readyNovember();

    const results = await Promise.all([closePeriod(), closePeriod(), closePeriod()]);

    expect(results.map((res) => res.status).sort()).toEqual([202, 409, 409]);
    expect(results.find((res) => res.status === 409)?.body.error.code).toBe('PERIOD_ALREADY_CLOSED');
    expect(await prisma.outboxJob.count({ where: { type: 'CLOSE_PERIOD' } })).toBe(1);
  });

  it('closePeriod gagal: CLOSE_FAILED dengan pesan worker, Coba lagi admin mengembalikannya ke CLOSING', async () => {
    await readyNovember();
    await closePeriod();
    const job = await recordClose('FAILED');

    const failed = await getPeriod();
    expect(failed.body.data).toMatchObject({
      status: 'CLOSE_FAILED',
      close: { job: { id: job.id, status: 'FAILED', attempts: 5, lastError: 'RPC tidak menjawab.' } },
    });

    const retry = await request(app).post(`/api/admin/jobs/${job.id}/retry`).set('Authorization', admin);
    expect(retry.status).toBe(202);
    expect((await getPeriod()).body.data).toMatchObject({ status: 'CLOSING', close: { job: { status: 'QUEUED' } } });
  });
});

describe('periode yang sudah ditutup (keputusan 4)', () => {
  it('tagihan periode tertutup tidak bisa dibayar: 409 PERIOD_CLOSED tanpa percobaan baru', async () => {
    await readyNovember();
    // Penghuni baru di K06 dengan tagihan November yang belum dibayar.
    const tenant = await prisma.user.create({ data: { name: 'Penghuni Telat', email: 'telat@kosbagi.test', role: 'TENANT', passwordHash: 'x' } });
    const room = await prisma.room.update({ where: { id: data.rooms.get('K06')!.id }, data: { status: 'OCCUPIED', tenantId: tenant.id } });
    const bill = await prisma.bill.create({
      data: { roomId: room.id, tenantId: tenant.id, period: PERIOD, amountIdr: 1_500_000n, dueDate: new Date('2026-11-10') },
    });
    await closePeriod();

    const res = await startPayment(app, bill.id, await bearer(tenant));

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PERIOD_CLOSED');
    expect(await prisma.payment.count({ where: { billId: bill.id } })).toBe(0);
  });

  it('dibayar sebelum penutupan, lunas sesudahnya: anomali untuk dikembalikan, tagihan tetap, tanpa job on-chain', async () => {
    const fake = new FakeMidtrans();
    for (const room of OCCUPIED.filter((room) => room !== 'K09')) await payRent(data, room);
    await addNovemberExpenses(data);
    const k09 = data.bills.get('K09')!;
    const tenant = await bearer({ id: k09.tenantId, role: 'TENANT' });

    // Penghuni K09 membuka Snap sebelum admin menutup periode.
    const opened = await startPayment(app, k09.id, tenant);
    expect(opened.status).toBe(201);
    const orderId = opened.body.data.payment.orderId as string;
    expect((await closePeriod()).status).toBe(202);

    const notified = await notifyStatus(app, fake, orderId);
    const again = await notifyStatus(app, fake, orderId);

    expect(notified.status).toBe(200);
    expect(notified.body.data.outcome).toBe('PAID_AFTER_PERIOD_CLOSED');
    expect(again.body.data.outcome).toBe('ALREADY_PAID');
    expect(await prisma.bill.findUniqueOrThrow({ where: { id: k09.id } })).toMatchObject({ status: 'UNPAID', paidAt: null });
    expect(await prisma.payment.findUniqueOrThrow({ where: { orderId } })).toMatchObject({ status: 'PAID_AFTER_CLOSE' });
    expect(await prisma.paymentAnomaly.findMany()).toEqual([
      expect.objectContaining({ type: 'PAID_AFTER_PERIOD_CLOSED', orderId, expectedAmountIdr: 1_500_000n, occurrences: 1 }),
    ]);
    expect(await prisma.outboxJob.count({ where: { type: 'RECORD_RENT', payment: { orderId } } })).toBe(0);

    // Penghuni melihat status khusus: uang diterima setelah periode ditutup, dana akan dikembalikan.
    const tenantView = await request(app).get('/api/bills/current').set('Authorization', tenant);
    expect(tenantView.body.data.bill).toMatchObject({
      status: 'UNPAID',
      paymentState: 'PAID_AFTER_CLOSE',
      periodClosed: true,
      refund: { status: 'PENDING', amountIdr: 1_500_000, orderId, paidAt: expect.any(String) },
    });
    const detail = await request(app).get(`/api/bills/${k09.id}`).set('Authorization', tenant);
    expect(detail.body.data.bill).toMatchObject({ paymentState: 'PAID_AFTER_CLOSE', periodClosed: true, receipt: null });
    const summary = await request(app).get('/api/admin/summary').set('Authorization', admin);
    expect(summary.body.data.attention.refundsPending).toBe(1);
  });

  it('penghuni tidak pernah menerima FAILED untuk pencatatan sewanya', async () => {
    await payRent(data, 'K03', { chain: 'FAILED' });
    const k03 = data.bills.get('K03')!;
    const tenant = await bearer({ id: k03.tenantId, role: 'TENANT' });

    const current = await request(app).get('/api/bills/current').set('Authorization', tenant);
    const list = await request(app).get('/api/bills').set('Authorization', tenant);
    const detail = await request(app).get(`/api/bills/${k03.id}`).set('Authorization', tenant);

    expect(current.body.data.bill.chain).toEqual({ status: 'PENDING', txHash: null, blockNumber: null });
    expect(detail.body.data.bill.periodClosed).toBe(false);
    expect(JSON.stringify([current.body, list.body, detail.body])).not.toContain('FAILED');
  });

  it('pelunasan yang masuk lebih dulu membuat Tutup periode ditolak, jadi sewa itu tidak tertinggal', async () => {
    const fake = new FakeMidtrans();
    for (const room of OCCUPIED.filter((room) => room !== 'K09')) await payRent(data, room);
    await addNovemberExpenses(data);
    const k09 = data.bills.get('K09')!;
    const opened = await startPayment(app, k09.id, await bearer({ id: k09.tenantId, role: 'TENANT' }));
    await notifyStatus(app, fake, opened.body.data.payment.orderId);

    const res = await closePeriod();

    expect(res.status).toBe(409);
    expect(res.body.error.details.requirements).toContainEqual({ key: 'RENT_UNRECORDED', ok: false, count: 1 });
  });
});

describe('setelah closePeriod tercatat', () => {
  it('struk memakai angka KosLedger.periods, disalin sekali ke basis data', async () => {
    await readyNovember();
    await closePeriod();
    await recordClose();

    const res = await getPeriod();

    expect(res.body.data).toMatchObject({
      status: 'CLOSED',
      receipt: {
        provisional: false,
        grossRentIdr: 13_500_000,
        roomsRecorded: 9,
        roomsTotal: 9,
        expensesIdr: 2_700_000,
        expensesRecorded: 5,
        platformFeeIdr: 675_000,
        taxableProfitIdr: 10_125_000,
        taxIdr: 2_227_500,
        netRentIdr: 7_897_500,
        totalSupply: 18_000,
        valuePerTokenSen: 43_875,
      },
      close: { txHash: `0x5e21${'0'.repeat(56)}7c0a`, blockNumber: 7_312_885, snapshotBlock: 7_312_884, closedAt: expect.any(String) },
    });
    // Dibaca lagi tanpa kontrak: angka sudah tersalin.
    reader.unavailable = true;
    expect((await getPeriod()).body.data.receipt.valuePerTokenSen).toBe(43_875);
    expect(reader.calls.filter((call) => call === 'readPeriod')).toHaveLength(1);
  });

  it('pratinjau bagian pemegang sebelum distribusi, dihitung sama tanpa menyimpan apa pun', async () => {
    setNovemberBalances(await readyNovember());
    await closePeriod();
    await recordClose();

    const res = await getPeriod();

    expect(res.body.data.distribution).toBeNull();
    expect(res.body.data.preview).toMatchObject({
      netRentIdr: 7_897_500,
      valuePerTokenSen: 43_875,
      snapshotBlock: 7_312_884,
      treasury: { tokenBalance: 8_140, shareIdr: 3_571_425, creditedTo: 'ORIGINAL_OWNER' },
      roundingRemainderIdr: 0,
    });
    expect(res.body.data.preview.holders.map((holder: { label: string; shareIdr: number }) => [holder.label, holder.shareIdr])).toEqual([
      ['Pemilik lama', 2_369_250],
      ['Bagas Wicaksono', 789_750],
      ['Citra Lestari', 526_500],
      ['Eko Saputra', 351_000],
      ['Fajar Nugroho', 245_700],
      ['Dimas Pratama', 43_875],
    ]);
    expect(res.body.data.preview).not.toHaveProperty('distributedAt');
    expect(await prisma.distribution.count()).toBe(0);

    // Setelah distribusi, pratinjau tidak dikirim lagi dan angkanya sama dengan hasil distribusi.
    const distributed = await distribute();
    const after = await getPeriod();
    expect(after.body.data.preview).toBeNull();
    expect(distributed.body.data.distribution).toMatchObject(res.body.data.preview);
  });

  it('pratinjau null bila saldo pemegang tidak bisa dibaca', async () => {
    setNovemberBalances(await readyNovember());
    reader.setBalance(TREASURY_WALLET, 1n);
    await closePeriod();
    await recordClose();

    const res = await getPeriod();

    expect(res.body.data).toMatchObject({ status: 'CLOSED', preview: null });
  });

  it('kontrak belum bisa dibaca: status tetap CLOSED, struk sementara dipakai', async () => {
    await readyNovember();
    await closePeriod();
    await recordClose();
    reader.unavailable = true;

    const res = await getPeriod();

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'CLOSED', receipt: { provisional: true, valuePerTokenSen: 43_875 }, preview: null });
  });
});

describe('POST /api/periods/:period/distribute', () => {
  it('sebelum closePeriod tercatat: 409 PERIOD_NOT_CLOSED', async () => {
    await readyNovember();
    expect((await distribute()).body.error.code).toBe('PERIOD_NOT_CLOSED');
    await closePeriod();
    expect((await distribute()).body.error.code).toBe('PERIOD_NOT_CLOSED');
  });

  it('November: angka per pemegang persis KONTRAK_P4, perbendaharaan untuk pemilik lama, sisa Rp0, hanya sekali', async () => {
    setNovemberBalances(await readyNovember());
    await closePeriod();
    await recordClose();

    const res = await distribute();

    expect(res.status).toBe(200);
    const { distribution } = res.body.data;
    expect(distribution.holders.map((holder: { label: string; tokenBalance: number; shareIdr: number }) => [holder.label, holder.tokenBalance, holder.shareIdr])).toEqual([
      ['Pemilik lama', 5_400, 2_369_250],
      ['Bagas Wicaksono', 1_800, 789_750],
      ['Citra Lestari', 1_200, 526_500],
      ['Eko Saputra', 800, 351_000],
      ['Fajar Nugroho', 560, 245_700],
      ['Dimas Pratama', 100, 43_875],
    ]);
    expect(distribution).toMatchObject({
      distributedBy: { name: 'Laras Kusuma' },
      netRentIdr: 7_897_500,
      valuePerTokenSen: 43_875,
      snapshotBlock: 7_312_884,
      treasury: { walletAddress: TREASURY_WALLET, tokenBalance: 8_140, shareIdr: 3_571_425, creditedTo: 'ORIGINAL_OWNER' },
      roundingRemainderIdr: 0,
    });
    expect(distribution.holders[0]).toMatchObject({ holderType: 'ORIGINAL_OWNER', walletAddress: OWNER_WALLET });

    // Rani (saldo 0) tidak mendapat baris; total bagian = sewa bersih.
    const shares = await prisma.distributionShare.findMany();
    expect(shares).toHaveLength(7);
    expect(shares.reduce((sum, share) => sum + share.shareIdr, 0n)).toBe(7_897_500n);
    expect(shares.find((share) => share.holderType === 'TREASURY')).toMatchObject({ creditedTo: 'ORIGINAL_OWNER', userId: null });

    const view = await getPeriod();
    expect(view.body.data.status).toBe('DISTRIBUTED');
    expect(view.body.data.distribution).toEqual(distribution);

    const second = await distribute();
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('ALREADY_DISTRIBUTED');
    expect(await prisma.distribution.count()).toBe(1);
  });

  it('dua klik bersamaan: tepat satu distribusi', async () => {
    setNovemberBalances(await readyNovember());
    await closePeriod();
    await recordClose();

    const results = await Promise.all([distribute(), distribute(), distribute()]);

    expect(results.map((res) => res.status).sort()).toEqual([200, 409, 409]);
    expect(await prisma.distribution.count()).toBe(1);
    expect(await prisma.distributionShare.count()).toBe(7);
  });

  it('jumlah saldo tidak sama dengan total suplai: 409 HOLDERS_MISMATCH tanpa data tersimpan', async () => {
    setNovemberBalances(await readyNovember());
    reader.setBalance(TREASURY_WALLET, 8_000n);
    await closePeriod();
    await recordClose();

    const res = await distribute();

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'HOLDERS_MISMATCH', details: { totalBalance: 17_860, totalSupply: 18_000 } });
    expect(await prisma.distribution.count()).toBe(0);
  });

  it('kontrak tidak bisa dibaca: 502 CHAIN_UNAVAILABLE; kontrak milik properti lain juga ditolak', async () => {
    setNovemberBalances(await readyNovember());
    await closePeriod();
    await recordClose();

    reader.unavailable = true;
    const down = await distribute();
    reader.unavailable = false;
    reader.holders = { ...reader.holders, propertyCode: 'LAIN01' };
    const wrong = await distribute();

    expect([down.status, down.body.error.code]).toEqual([502, 'CHAIN_UNAVAILABLE']);
    expect([wrong.status, wrong.body.error.code]).toEqual([502, 'CHAIN_UNAVAILABLE']);
    expect(wrong.body.error.message).toContain('LAIN01');
    expect(await prisma.distribution.count()).toBe(0);
  });
});
