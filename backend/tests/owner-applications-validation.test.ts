// Penolakan form pengajuan pemilik kos. Tidak butuh basis data karena berhenti di validasi.
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

describe('POST /api/owner-applications', () => {
  it('membalas 422 VALIDATION_ERROR dengan details per field', async () => {
    const res = await request(app)
      .post('/api/owner-applications')
      .send({ ownerName: 'B', contact: 'bukan-kontak', roomCount: 0, consent: false });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const details = res.body.error.details as { path: string; message: string }[];
    expect(details.map((detail) => detail.path).sort()).toEqual(
      ['consent', 'contact', 'monthlyRentIdr', 'occupancyPercent', 'ownerName', 'propertyAddress', 'roomCount'].sort(),
    );
    expect(details.find((detail) => detail.path === 'consent')?.message).toBe('Persetujuan wajib dicentang.');
  });

  it('body kosong juga 422', async () => {
    const res = await request(app).post('/api/owner-applications').send();

    expect(res.status).toBe(422);
  });

  it('JSON rusak tetap INVALID_JSON', async () => {
    const res = await request(app)
      .post('/api/owner-applications')
      .set('Content-Type', 'application/json')
      .send('{"ownerName":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });
});
