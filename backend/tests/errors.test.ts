// Test integrasi format error JSON. Memakai modul contoh di tests/fixtures/modules.
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { errorHandler } from '../src/middleware/error-handler.js';

const FIXTURE_MODULES = fileURLToPath(new URL('./fixtures/modules/', import.meta.url));

let app: Express;

beforeAll(async () => {
  app = await createApp({ modulesDir: FIXTURE_MODULES });
});

describe('format error', () => {
  it('membalas 404 berformat JSON untuk rute yang tidak ada', async () => {
    const res = await request(app).get('/api/tidak-ada');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Rute GET /api/tidak-ada tidak ditemukan.',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('memakai format 404 yang sama di aplikasi asli', async () => {
    const realApp = await createApp();
    const res = await request(realApp).post('/api/health');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND', message: 'Rute POST /api/health tidak ditemukan.' });
  });

  it('menolak body yang bukan JSON valid', async () => {
    const res = await request(app).post('/api/sample/periods').set('Content-Type', 'application/json').send('{"period":');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'INVALID_JSON', message: 'Body permintaan bukan JSON yang valid.' });
  });

  it('menolak body yang melebihi batas 100kb', async () => {
    const res = await request(app)
      .post('/api/sample/periods')
      .send({ period: '2026-11', catatan: 'x'.repeat(120 * 1024) });

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('melaporkan field yang gagal validasi zod dalam Bahasa Indonesia', async () => {
    const res = await request(app).post('/api/sample/periods').send({ period: '2026-13' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Data yang dikirim tidak valid.',
      details: [{ path: 'period', message: expect.stringMatching(/tidak valid/i) }],
    });
  });

  it('meneruskan status dan kode dari AppError', async () => {
    const res = await request(app).get('/api/sample/conflict');

    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CONFLICT', message: 'Tagihan periode ini sudah ada.' });
  });

  it('menyembunyikan detail error tak terduga dari klien', async () => {
    for (const path of ['/api/sample/crash', '/api/sample/async-crash']) {
      const res = await request(app).get(path);

      expect(res.status).toBe(500);
      expect(res.body.error).toMatchObject({
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan pada server. Silakan coba lagi.',
      });
      expect(JSON.stringify(res.body)).not.toContain('detail internal');
    }
  });

  it('membalas 500 untuk error berstatus 4xx dari layanan luar, bukan meneruskannya ke klien', async () => {
    const res = await request(app).get('/api/sample/upstream-401');

    expect(res.status).toBe(500);
    expect(res.body.error).toMatchObject({ code: 'INTERNAL_ERROR' });
    expect(JSON.stringify(res.body)).not.toContain('server key');
  });

  it('meneruskan status error http-errors yang memang untuk klien (expose: true)', async () => {
    const res = await request(app).get('/api/sample/client-error');

    expect(res.status).toBe(415);
    expect(res.body.error).toMatchObject({ code: 'BAD_REQUEST', message: 'Permintaan tidak dapat diproses.' });
  });

  it('respons sukses tetap valid saat berisi nominal BigInt', async () => {
    const res = await request(app).get('/api/sample/amount');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { amountIdr: 1_500_000 } });
  });
});

// Dipanggil langsung (tanpa HTTP) supaya pencatatan log bisa diamati.
describe('errorHandler: pencatatan log', () => {
  function handle(error: unknown) {
    const log = { error: vi.fn() };
    const res = { headersSent: false, status: vi.fn().mockReturnThis(), json: vi.fn() };
    errorHandler(error, { log, id: 'uji-1' } as never, res as never, vi.fn());
    return { log, res };
  }

  it('mencatat error berstatus 4xx dari layanan luar sebagai error server', () => {
    const { log, res } = handle(Object.assign(new Error('Midtrans membalas 401'), { status: 401 }));

    expect(res.status).toHaveBeenCalledWith(500);
    expect(log.error).toHaveBeenCalledOnce();
  });

  it('tidak mencatat error body-parser sebagai error server', () => {
    const { log, res } = handle(
      Object.assign(new Error('Unexpected end of JSON input'), { status: 400, type: 'entity.parse.failed', expose: true }),
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: 'INVALID_JSON', message: 'Body permintaan bukan JSON yang valid.', requestId: 'uji-1' },
    });
    expect(log.error).not.toHaveBeenCalled();
  });
});
