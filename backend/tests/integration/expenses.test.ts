// Biaya dan nota (P4) lewat HTTP dengan PostgreSQL sungguhan: unggahan multipart, hash SHA-256
// dihitung server, baris biaya dan job RECORD_EXPENSE dalam satu transaksi, nota ganda, periode
// ditutup, dan unduhan nota.
import { createHash } from 'node:crypto';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { env } from '../../src/config/env.js';
import { prisma } from '../../src/lib/prisma.js';
import { writeClosePeriodJob } from '../../src/queue/outbox.js';
import { bearer, resetDatabase } from './helpers.js';
import { dummyPdf, type November, PERIOD, seedNovember, setChain } from './p4-helpers.js';

let app: Express;
let data: November;
let manager: string;

const LISTRIK = dummyPdf('listrik dan air November');
const sha256 = (content: Buffer) => `0x${createHash('sha256').update(content).digest('hex')}`;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  await rm(env.UPLOAD_DIR, { recursive: true, force: true });
  data = await seedNovember();
  manager = await bearer(data.manager);
});

afterAll(async () => {
  await prisma.$disconnect();
});

interface ExpenseFields {
  period?: string;
  categoryCode?: string;
  description?: string;
  amountIdr?: string;
  receiptDate?: string;
}

const LISTRIK_FIELDS: Required<ExpenseFields> = {
  period: PERIOD,
  categoryCode: '1',
  description: 'Token listrik dan tagihan PDAM',
  amountIdr: '1150000',
  receiptDate: '2026-11-05',
};

function post(fields: ExpenseFields, file: { content: Buffer; name: string } | null = { content: LISTRIK, name: 'nota-listrik-nov-2026.pdf' }, authorization = manager) {
  let req = request(app).post('/api/expenses').set('Authorization', authorization);
  for (const [key, value] of Object.entries(fields)) req = req.field(key, value);
  if (file) req = req.attach('file', file.content, file.name);
  return req;
}

describe('POST /api/expenses', () => {
  it('mencatat biaya, menghitung hash dari isi file, dan menulis job RECORD_EXPENSE dalam satu transaksi', async () => {
    const res = await post(LISTRIK_FIELDS);

    expect(res.status).toBe(201);
    const hash = sha256(LISTRIK);
    expect(res.body.data.expense).toMatchObject({
      period: PERIOD,
      category: { code: 1, label: 'Listrik dan air' },
      description: 'Token listrik dan tagihan PDAM',
      amountIdr: 1_150_000,
      receiptDate: '2026-11-05',
      receiptHash: hash,
      fileName: 'nota-listrik-nov-2026.pdf',
      createdBy: { name: 'Hadi Santoso' },
      chain: { status: 'PENDING', txHash: null, blockNumber: null, lastError: null },
    });

    const expense = await prisma.expense.findUniqueOrThrow({ where: { receiptHash: hash }, include: { outboxJob: true } });
    expect(expense.outboxJob).toMatchObject({
      type: 'RECORD_EXPENSE',
      dedupeKey: `record-expense:${hash}`,
      status: 'PENDING',
      // Hanya kode properti, periode, kode kategori, nominal, dan hash: tanpa nama atau file.
      payload: { propertyCode: 'SMR01', period: PERIOD, category: 1, amountIdr: 1_150_000, receiptHash: hash },
    });
    const stored = await readFile(path.join(env.UPLOAD_DIR, `${hash.slice(2)}.pdf`));
    expect(stored.equals(LISTRIK)).toBe(true);
  });

  it('nota yang sama ditolak 409 dengan data biaya pertama, tanpa baris atau job baru', async () => {
    const first = await post(LISTRIK_FIELDS);
    const second = await post({ ...LISTRIK_FIELDS, categoryCode: '2', description: 'Coba nota sama', amountIdr: '99000' }, {
      content: LISTRIK,
      name: 'nama-lain.pdf',
    });

    expect(second.status).toBe(409);
    expect(second.body.error).toMatchObject({
      code: 'RECEIPT_ALREADY_RECORDED',
      details: {
        expenseId: first.body.data.expense.id,
        categoryLabel: 'Listrik dan air',
        description: 'Token listrik dan tagihan PDAM',
        receiptDate: '2026-11-05',
        amountIdr: 1_150_000,
      },
    });
    expect(second.body.error.message).toContain('Listrik dan air');
    expect(await prisma.expense.count()).toBe(1);
    expect(await prisma.outboxJob.count({ where: { type: 'RECORD_EXPENSE' } })).toBe(1);
  });

  it('dua unggahan nota yang sama bersamaan: hanya satu tercatat', async () => {
    const results = await Promise.all([post(LISTRIK_FIELDS), post(LISTRIK_FIELDS), post(LISTRIK_FIELDS)]);

    expect(results.map((res) => res.status).sort()).toEqual([201, 409, 409]);
    expect(await prisma.expense.count()).toBe(1);
  });

  it('periode yang sudah ditutup admin: 409 PERIOD_CLOSED', async () => {
    await prisma.$transaction(async (tx) => {
      const job = await writeClosePeriodJob(tx, { propertyCode: 'SMR01', period: PERIOD });
      await tx.periodClosing.create({ data: { propertyId: data.property.id, period: PERIOD, outboxJobId: job.id, requestedById: data.admin.id } });
    });

    const res = await post(LISTRIK_FIELDS);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PERIOD_CLOSED');
    expect(await prisma.expense.count()).toBe(0);
  });

  it('file selain PDF, JPG, PNG ditolak 415, walau namanya .pdf', async () => {
    const res = await post(LISTRIK_FIELDS, { content: Buffer.from('bukan nota, hanya teks'), name: 'nota.pdf' });

    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');
  });

  it('PNG dan JPG diterima, jenisnya dibaca dari isi file', async () => {
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from('DUMMY png')]);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from('DUMMY jpg')]);

    const a = await post({ ...LISTRIK_FIELDS, categoryCode: '2' }, { content: png, name: 'foto' });
    const b = await post({ ...LISTRIK_FIELDS, categoryCode: '3' }, { content: jpg, name: '../../rahasia.jpg' });

    expect([a.status, b.status]).toEqual([201, 201]);
    expect(b.body.data.expense.fileName).toBe('rahasia.jpg');
    const stored = await prisma.expense.findMany({ orderBy: { categoryCode: 'asc' }, select: { contentType: true, storedFileName: true } });
    expect(stored.map((row) => row.contentType)).toEqual(['image/png', 'image/jpeg']);
    expect(stored[1]?.storedFileName).toMatch(/^[0-9a-f]{64}\.jpg$/);
  });

  it('file lebih dari 5 MB ditolak 413 FILE_TOO_LARGE', async () => {
    const big = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024)]);
    const res = await post(LISTRIK_FIELDS, { content: big, name: 'besar.pdf' });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it.each([
    ['tanpa file', LISTRIK_FIELDS, null, 'file'],
    ['kategori tidak dikenal', { ...LISTRIK_FIELDS, categoryCode: '9' }, undefined, 'categoryCode'],
    ['nominal 0', { ...LISTRIK_FIELDS, amountIdr: '0' }, undefined, 'amountIdr'],
    ['nominal pecahan', { ...LISTRIK_FIELDS, amountIdr: '1500,5' }, undefined, 'amountIdr'],
    ['nominal lebih dari Rp100 juta', { ...LISTRIK_FIELDS, amountIdr: '100000001' }, undefined, 'amountIdr'],
    ['keterangan terlalu pendek', { ...LISTRIK_FIELDS, description: 'ab' }, undefined, 'description'],
    ['tanggal nota tidak valid', { ...LISTRIK_FIELDS, receiptDate: '2026-11-31' }, undefined, 'receiptDate'],
    ['periode tidak valid', { ...LISTRIK_FIELDS, period: '2026-13' }, undefined, 'period'],
  ] as const)('%s: 400 VALIDATION_ERROR', async (_name, fields, file, field) => {
    const res = await post(fields, file === undefined ? undefined : file);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(expect.arrayContaining([expect.objectContaining({ path: field })]));
    expect(await prisma.expense.count()).toBe(0);
  });

  it.each([
    ['nominal 0', '0', 'Nominal minimal Rp1.'],
    ['nominal di atas batas', '100000001', 'Nominal maksimal Rp100.000.000 per nota.'],
    ['nominal pecahan', '1500.5', 'Nominal harus rupiah bulat, tanpa koma.'],
    ['nominal bukan angka', 'seribu', 'Nominal harus angka.'],
  ])('%s: pesan nominal yang tepat', async (_name, amountIdr, message) => {
    const res = await post({ ...LISTRIK_FIELDS, amountIdr });

    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ path: 'amountIdr', message }]);
  });

  it('periode tanpa tagihan ditolak, walau tanggal notanya sesuai', async () => {
    const res = await post({ ...LISTRIK_FIELDS, period: '2027-01', receiptDate: '2027-01-05' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION_ERROR', details: [{ path: 'period' }] });
    expect(res.body.error.details[0].message).toContain('belum punya tagihan');
    expect(await prisma.expense.count()).toBe(0);
  });

  it('tanggal nota lebih dari satu bulan dari periode ditolak; satu bulan sebelum atau sesudahnya diterima', async () => {
    const far = await post({ ...LISTRIK_FIELDS, receiptDate: '2026-09-30' });
    expect(far.status).toBe(400);
    expect(far.body.error.details).toEqual([
      { path: 'receiptDate', message: 'Tanggal nota harus di bulan periode, atau satu bulan sebelum atau sesudahnya.' },
    ]);

    const before = await post({ ...LISTRIK_FIELDS, receiptDate: '2026-10-28' }, { content: dummyPdf('oktober'), name: 'a.pdf' });
    const after = await post({ ...LISTRIK_FIELDS, receiptDate: '2026-12-02' }, { content: dummyPdf('desember'), name: 'b.pdf' });
    expect([before.status, after.status]).toEqual([201, 201]);
  });

  it('pengelola tanpa properti mendapat 404', async () => {
    const res = await post(LISTRIK_FIELDS, undefined, await bearer(data.otherManager));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/expenses', () => {
  it('daftar, kategori, total tercatat dan menunggu, serta status FAILED untuk pengelola', async () => {
    await post(LISTRIK_FIELDS);
    await post(
      { period: PERIOD, categoryCode: '4', description: 'Ganti keran kamar mandi K07', amountIdr: '300000', receiptDate: '2026-11-12' },
      { content: dummyPdf('perbaikan K07'), name: 'perbaikan-k07.pdf' },
    );
    const [listrik, k07] = await prisma.expense.findMany({ orderBy: { receiptDate: 'asc' } });
    await setChain(listrik!.outboxJobId, 'RECORDED', { txHash: '0xc4b9'.padEnd(66, '1') });
    await setChain(k07!.outboxJobId, 'FAILED');

    const res = await request(app).get(`/api/expenses?period=${PERIOD}`).set('Authorization', manager);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      period: PERIOD,
      closed: false,
      totals: { recordedIdr: 1_150_000, pendingIdr: 300_000, totalIdr: 1_450_000, count: 2 },
      categories: [
        { code: 1, label: 'Listrik dan air' },
        { code: 2, label: 'Kebersihan' },
        { code: 3, label: 'Internet' },
        { code: 4, label: 'Perbaikan' },
        { code: 5, label: 'Keamanan' },
      ],
    });
    // Nota terbaru lebih dulu.
    expect(res.body.data.expenses.map((row: { receiptDate: string }) => row.receiptDate)).toEqual(['2026-11-12', '2026-11-05']);
    expect(res.body.data.expenses[0].chain).toMatchObject({ status: 'FAILED', lastError: 'RPC tidak menjawab.' });
    expect(res.body.data.expenses[1].chain).toMatchObject({ status: 'RECORDED', txHash: '0xc4b9'.padEnd(66, '1') });
  });

  it('tanpa ?period memakai periode tagihan terbaru; admin ikut membaca', async () => {
    await post(LISTRIK_FIELDS);
    const res = await request(app).get('/api/expenses').set('Authorization', await bearer(data.admin));

    expect(res.status).toBe(200);
    expect(res.body.data.period).toBe(PERIOD);
    expect(res.body.data.expenses).toHaveLength(1);
  });
});

describe('GET /api/expenses/:id/receipt', () => {
  it('mengirim file nota apa adanya ke pengelola dan admin, 404 untuk pengelola properti lain', async () => {
    const created = await post(LISTRIK_FIELDS);
    const id = created.body.data.expense.id as string;

    const mine = await request(app).get(`/api/expenses/${id}/receipt`).set('Authorization', manager).buffer(true);
    const admin = await request(app).get(`/api/expenses/${id}/receipt`).set('Authorization', await bearer(data.admin));
    const other = await request(app).get(`/api/expenses/${id}/receipt`).set('Authorization', await bearer(data.otherManager));

    expect(mine.status).toBe(200);
    expect(mine.headers['content-type']).toContain('application/pdf');
    expect(mine.headers['content-disposition']).toBe('inline; filename="nota-listrik-nov-2026.pdf"');
    expect(Buffer.from(mine.body).equals(LISTRIK)).toBe(true);
    expect(admin.status).toBe(200);
    expect(other.status).toBe(404);
  });
});
