// Persetujuan KYC P3 dengan PostgreSQL sungguhan: dompet kustodian dan job whitelist ditulis dalam
// satu transaksi dengan perubahan status, pemeriksaan otomatis, dan jumlah per status.
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import type { User } from '../../src/generated/prisma/client.js';
import { prisma } from '../../src/lib/prisma.js';
import { custodialWallets, deriveCustodialAddress } from '../../src/modules/kyc/wallet.js';
import { whitelistDedupeKey } from '../../src/queue/outbox.js';
import { bearer, resetDatabase, seedFixture, TEST_MNEMONIC } from './helpers.js';

const HARDHAT_0 = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const HARDHAT_1 = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

let app: Express;
let fixture: Awaited<ReturnType<typeof seedFixture>>;
let admin: string;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  fixture = await seedFixture();
  admin = await bearer(fixture.admin);
});

afterEach(() => {
  vi.restoreAllMocks();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function submit(user: User, body: object = { fullName: user.name, dummyIdNumber: 'DUMMY-0042' }) {
  const res = await request(app).post('/api/kyc').set('Authorization', await bearer(user)).send(body);
  expect(res.status).toBe(201);
  return res.body.data.kyc;
}

function approve(id: string) {
  return request(app).post(`/api/kyc/${id}/approve`).set('Authorization', admin);
}

async function newInvestor(name: string, email: string) {
  return prisma.user.create({ data: { name, email, role: 'INVESTOR', passwordHash: 'x' } });
}

describe('POST /api/kyc/:id/approve', () => {
  it('satu transaksi: APPROVED, dompet indeks 0 dari mnemonic, dan job WHITELIST_KYC', async () => {
    const kyc = await submit(fixture.investor);

    const res = await approve(kyc.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      kyc: expect.objectContaining({ id: kyc.id, status: 'APPROVED' }),
      wallet: { address: HARDHAT_0, whitelist: { status: 'PENDING', txHash: null, blockNumber: null } },
    });
    await expect(prisma.custodialWallet.findUniqueOrThrow({ where: { userId: fixture.investor.id } })).resolves.toMatchObject({
      address: HARDHAT_0,
      derivationIndex: 0,
    });
    const jobs = await prisma.outboxJob.findMany();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({
      type: 'WHITELIST_KYC',
      status: 'PENDING',
      dedupeKey: whitelistDedupeKey(HARDHAT_0),
      payload: { walletAddress: HARDHAT_0, approved: true },
    });
    // Tidak ada nama, email, atau nomor identitas di isi job.
    expect(JSON.stringify(jobs[0]?.payload)).not.toMatch(/Investor|DUMMY|kosbagi\.test/);
  });

  it('investor berikutnya mendapat indeks berikutnya', async () => {
    const second = await newInvestor('Rani Aulia', 'rani.dummy@kosbagi.test');
    await approve((await submit(fixture.investor)).id);

    const res = await approve((await submit(second, { fullName: 'Rani Aulia', dummyIdNumber: 'DUMMY-0043' })).id);

    expect(res.body.data.wallet.address).toBe(HARDHAT_1);
    expect(deriveCustodialAddress(TEST_MNEMONIC, 1)).toBe(HARDHAT_1);
  });

  it('dua persetujuan bersamaan untuk dua investor: indeks tidak kembar', async () => {
    const others = await Promise.all(
      ['a', 'b', 'c'].map((suffix) => newInvestor(`Investor ${suffix}`, `investor.${suffix}@kosbagi.test`)),
    );
    const submissions = await Promise.all(
      others.map((user, index) => submit(user, { fullName: user.name, dummyIdNumber: `DUMMY-10${index}` })),
    );

    const results = await Promise.all(submissions.map((kyc) => approve(kyc.id)));

    expect(results.every((res) => res.status === 200)).toBe(true);
    const wallets = await prisma.custodialWallet.findMany({ orderBy: { derivationIndex: 'asc' } });
    expect(wallets.map((wallet) => wallet.derivationIndex)).toEqual([0, 1, 2]);
    await expect(prisma.outboxJob.count()).resolves.toBe(3);
  });

  it('bila job whitelist gagal ditulis, persetujuan dan dompet ikut batal', async () => {
    const kyc = await submit(fixture.investor);
    await prisma.outboxJob.create({
      data: { type: 'WHITELIST_KYC', dedupeKey: whitelistDedupeKey(HARDHAT_0), payload: {} },
    });

    const res = await approve(kyc.id);

    expect(res.status).toBe(500);
    await expect(prisma.kycSubmission.findUniqueOrThrow({ where: { id: kyc.id } })).resolves.toMatchObject({
      status: 'SUBMITTED',
      reviewedAt: null,
    });
    await expect(prisma.custodialWallet.count()).resolves.toBe(0);
  });

  it('bila dompet gagal dibuat, persetujuan batal dan tidak ada job', async () => {
    const kyc = await submit(fixture.investor);
    // Alamat indeks 1 sudah dipakai baris lain, jadi dompet baru (indeks 1) melanggar constraint unik.
    await prisma.custodialWallet.create({ data: { userId: fixture.admin.id, derivationIndex: 0, address: HARDHAT_1 } });

    const res = await approve(kyc.id);

    expect(res.status).toBe(500);
    await expect(prisma.kycSubmission.findUniqueOrThrow({ where: { id: kyc.id } })).resolves.toMatchObject({ status: 'SUBMITTED' });
    await expect(prisma.outboxJob.count()).resolves.toBe(0);
  });

  it('tanpa mnemonic: 503 CUSTODIAL_WALLET_NOT_CONFIGURED dan tidak ada yang berubah', async () => {
    const kyc = await submit(fixture.investor);
    vi.spyOn(custodialWallets, 'mnemonic').mockReturnValue(undefined);

    const res = await approve(kyc.id);

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CUSTODIAL_WALLET_NOT_CONFIGURED');
    await expect(prisma.kycSubmission.findUniqueOrThrow({ where: { id: kyc.id } })).resolves.toMatchObject({ status: 'SUBMITTED' });
    await expect(prisma.custodialWallet.count()).resolves.toBe(0);
    await expect(prisma.outboxJob.count()).resolves.toBe(0);
  });

  it('persetujuan kedua: 409 tanpa dompet atau job tambahan', async () => {
    const kyc = await submit(fixture.investor);
    await approve(kyc.id);

    const res = await approve(kyc.id);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('KYC_ALREADY_REVIEWED');
    await expect(prisma.custodialWallet.count()).resolves.toBe(1);
    await expect(prisma.outboxJob.count()).resolves.toBe(1);
  });
});

describe('GET /api/kyc/me', () => {
  it('belum mengajukan: kyc dan wallet null', async () => {
    const res = await request(app).get('/api/kyc/me').set('Authorization', await bearer(fixture.investor));

    expect(res.body.data).toEqual({ kyc: null, wallet: null });
  });

  it('disetujui: whitelist PENDING lalu RECORDED setelah worker mencatat', async () => {
    const investor = await bearer(fixture.investor);
    await approve((await submit(fixture.investor)).id);

    const pending = await request(app).get('/api/kyc/me').set('Authorization', investor);
    expect(pending.body.data.wallet).toEqual({ address: HARDHAT_0, whitelist: { status: 'PENDING', txHash: null, blockNumber: null } });

    const job = await prisma.outboxJob.findFirstOrThrow();
    await prisma.chainTransaction.create({
      data: { outboxJobId: job.id, reference: HARDHAT_0, status: 'RECORDED', txHash: '0x3d9a', blockNumber: 7_140_552n },
    });

    const recorded = await request(app).get('/api/kyc/me').set('Authorization', investor);
    expect(recorded.body.data).toMatchObject({
      kyc: { status: 'APPROVED' },
      wallet: { address: HARDHAT_0, whitelist: { status: 'RECORDED', txHash: '0x3d9a', blockNumber: 7_140_552 } },
    });
  });

  it('ditolak: alasan tampil dan wallet null', async () => {
    const kyc = await submit(fixture.investor);
    await request(app).post(`/api/kyc/${kyc.id}/reject`).set('Authorization', admin).send({ reason: 'Nama tidak sesuai akun.' });

    const res = await request(app).get('/api/kyc/me').set('Authorization', await bearer(fixture.investor));

    expect(res.body.data).toMatchObject({ kyc: { status: 'REJECTED', rejectionReason: 'Nama tidak sesuai akun.' }, wallet: null });
  });
});

describe('GET /api/kyc (admin)', () => {
  it('jumlah per status, pemeriksaan otomatis, urutan pengajuan, dan dompet untuk yang disetujui', async () => {
    const rani = await newInvestor('Rani Aulia', 'rani.dummy@kosbagi.test');
    const bagas = await newInvestor('Bagas Wicaksono', 'bagas.dummy@kosbagi.test');

    const rejected = await submit(rani, { fullName: 'Rani A', dummyIdNumber: 'DUMMY-0100' });
    await request(app).post(`/api/kyc/${rejected.id}/reject`).set('Authorization', admin).send({ reason: 'Nama tidak sesuai.' });
    const resubmitted = await submit(rani, { fullName: ' rani aulia ', dummyIdNumber: 'DUMMY-0100' });
    // Bagas memakai nomor identitas yang sama dengan pengajuan Rani yang masih berlaku.
    const duplicate = await submit(bagas, { fullName: 'Bagas Wicaksono', dummyIdNumber: 'DUMMY-0100' });
    const approved = await submit(fixture.investor);
    await approve(approved.id);

    const submitted = await request(app).get('/api/kyc?status=SUBMITTED').set('Authorization', admin);

    expect(submitted.status).toBe(200);
    expect(submitted.body.data.counts).toEqual({ SUBMITTED: 2, APPROVED: 1, REJECTED: 1 });
    const rows = new Map(submitted.body.data.submissions.map((row: { id: string }) => [row.id, row]));
    expect(rows.get(resubmitted.id)).toMatchObject({
      attempt: 2,
      user: { name: 'Rani Aulia', email: 'rani.dummy@kosbagi.test' },
      checks: { dummyPrefix: true, nameMatchesAccount: true, noOtherActive: false },
      wallet: null,
    });
    expect(rows.get(duplicate.id)).toMatchObject({ attempt: 1, checks: { nameMatchesAccount: true, noOtherActive: false } });

    const approvedTab = await request(app).get('/api/kyc?status=APPROVED').set('Authorization', admin);
    expect(approvedTab.body.data.submissions).toEqual([
      expect.objectContaining({
        id: approved.id,
        checks: { dummyPrefix: true, nameMatchesAccount: true, noOtherActive: true },
        wallet: { address: HARDHAT_0, whitelist: { status: 'PENDING', txHash: null, blockNumber: null, lastError: null } },
      }),
    ]);

    const rejectedTab = await request(app).get('/api/kyc?status=REJECTED').set('Authorization', admin);
    expect(rejectedTab.body.data.submissions).toEqual([
      expect.objectContaining({ id: rejected.id, attempt: 1, checks: expect.objectContaining({ nameMatchesAccount: false }) }),
    ]);
  });

  it('pesan galat worker hanya tampil di daftar admin; investor melihat FAILED sebagai PENDING (P4)', async () => {
    await approve((await submit(fixture.investor)).id);
    const job = await prisma.outboxJob.findFirstOrThrow();
    await prisma.chainTransaction.create({
      data: { outboxJobId: job.id, reference: HARDHAT_0, status: 'FAILED', attempts: 5, lastError: 'RPC tidak menjawab.' },
    });

    const list = await request(app).get('/api/kyc?status=APPROVED').set('Authorization', admin);
    const mine = await request(app).get('/api/kyc/me').set('Authorization', await bearer(fixture.investor));

    expect(list.body.data.submissions[0].wallet.whitelist).toEqual({
      status: 'FAILED',
      txHash: null,
      blockNumber: null,
      lastError: 'RPC tidak menjawab.',
    });
    expect(mine.body.data.wallet.whitelist).toEqual({ status: 'PENDING', txHash: null, blockNumber: null });
  });

  it('daftar kosong tetap membawa counts', async () => {
    const res = await request(app).get('/api/kyc?status=SUBMITTED').set('Authorization', admin);

    expect(res.body.data).toEqual({ submissions: [], counts: { SUBMITTED: 0, APPROVED: 0, REJECTED: 0 } });
  });
});

describe('POST /api/kyc/:id/reject', () => {
  it.each([
    ['kurang dari 3 karakter', 'ab'],
    ['lebih dari 300 karakter', 'x'.repeat(301)],
  ])('alasan %s: 400', async (_name, reason) => {
    const kyc = await submit(fixture.investor);

    const res = await request(app).post(`/api/kyc/${kyc.id}/reject`).set('Authorization', admin).send({ reason });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('reason');
  });

  it('alasan 300 karakter diterima', async () => {
    const kyc = await submit(fixture.investor);

    const res = await request(app).post(`/api/kyc/${kyc.id}/reject`).set('Authorization', admin).send({ reason: 'x'.repeat(300) });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ kyc: { status: 'REJECTED' }, wallet: null });
  });
});
