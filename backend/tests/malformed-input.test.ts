// Masukan rusak harus dibalas 4xx, bukan 500. DATABASE_URL menunjuk port kosong, jadi balasan
// 4xx sekaligus membuktikan nilai rusak ini berhenti sebelum sampai ke PostgreSQL.
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';

const USER_ID = '01a18897-fb42-70b8-abc0-43d131ddbe3c';
const NUL = 'A\u0000B';

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

async function bearer(role: 'TENANT' | 'INVESTOR' | 'ADMIN'): Promise<string> {
  return `Bearer ${(await signAccessToken({ id: USER_ID, role })).token}`;
}

describe('URL dengan percent-encoding rusak', () => {
  it.each(['/api/properties/%E0%A4%A', '/api/properties/%E0%A4%A/rooms'])('%s dibalas 400', async (path) => {
    const res = await request(app).get(path);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'BAD_REQUEST', message: 'Alamat permintaan tidak valid.' });
  });

  it('tagihan dibalas 400 setelah lolos login dan peran', async () => {
    const authorization = await bearer('TENANT');

    const read = await request(app).get('/api/bills/%E0%A4%A').set('Authorization', authorization);
    const pay = await request(app).post('/api/bills/%E0%A4%A/payments').set('Authorization', authorization);

    expect(read.status).toBe(400);
    expect(read.body.error.code).toBe('BAD_REQUEST');
    expect(pay.status).toBe(400);
  });

  it('tanpa token tetap 401, jadi rute tidak terbaca oleh pengunjung tanpa akses', async () => {
    const res = await request(app).get('/api/bills/%E0%A4%A');

    expect(res.status).toBe(401);
  });

  it('KYC dibalas 400', async () => {
    const res = await request(app).post('/api/kyc/%E0%A4%A/approve').set('Authorization', await bearer('ADMIN'));

    expect(res.status).toBe(400);
  });
});

describe('karakter NUL', () => {
  it.each(['/api/properties/%00', '/api/properties/%00/rooms', '/api/properties/a%00b'])('%s dibalas 404', async (path) => {
    const res = await request(app).get(path);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('slug berformat salah dibalas 404 tanpa menyentuh basis data', async () => {
    const res = await request(app).get('/api/properties/SUMBERSARI_01');

    expect(res.status).toBe(404);
  });

  it('tagihan dengan NUL dibalas 404', async () => {
    const res = await request(app).get('/api/bills/%00').set('Authorization', await bearer('TENANT'));

    expect(res.status).toBe(404);
  });

  it('nama KYC ditolak validasi', async () => {
    const res = await request(app)
      .post('/api/kyc')
      .set('Authorization', await bearer('INVESTOR'))
      .send({ fullName: NUL, dummyIdNumber: 'DUMMY-0001' });

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('fullName');
  });

  it('alasan penolakan KYC ditolak validasi', async () => {
    const res = await request(app)
      .post(`/api/kyc/${USER_ID}/reject`)
      .set('Authorization', await bearer('ADMIN'))
      .send({ reason: `alasan ${NUL}` });

    expect(res.status).toBe(400);
  });

  it('form pengajuan pemilik ditolak 422 per field', async () => {
    const res = await request(app)
      .post('/api/owner-applications')
      .send({
        ownerName: `Budi ${NUL}`,
        contact: '081234567890',
        propertyAddress: `Jl. Sumbersari ${NUL}`,
        roomCount: 10,
        monthlyRentIdr: 1_500_000,
        occupancyPercent: 90,
        consent: true,
      });

    expect(res.status).toBe(422);
    const paths = (res.body.error.details as { path: string }[]).map((detail) => detail.path).sort();
    expect(paths).toEqual(['ownerName', 'propertyAddress']);
  });

  it('order_id webhook ditolak validasi', async () => {
    const res = await request(app)
      .post('/api/webhooks/midtrans')
      .send({ order_id: NUL, status_code: '200', gross_amount: '1500000.00', signature_key: 'x' });

    expect(res.status).toBe(400);
  });
});
