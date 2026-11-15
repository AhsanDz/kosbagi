// Penolakan webhook yang terjadi sebelum basis data disentuh (skenario 6). DATABASE_URL menunjuk
// port kosong, jadi balasan selain 500 membuktikan tidak ada query yang dijalankan.
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { midtrans, MidtransUnavailableError } from '../src/modules/payments/midtrans.js';
import { computeSignature } from '../src/modules/webhooks/signature.js';

const SERVER_KEY = process.env['MIDTRANS_SERVER_KEY'] ?? '';
const fields = { order_id: 'RENT-SMR01-K03-2026-11', status_code: '200', gross_amount: '1500000.00' };

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function notify(body: object) {
  return request(app).post('/api/webhooks/midtrans').send(body);
}

describe('POST /api/webhooks/midtrans sebelum menyentuh data', () => {
  it('signature palsu ditolak 403, tanpa bertanya ke Midtrans', async () => {
    const statusCheck = vi.spyOn(midtrans, 'getTransactionStatus');

    const res = await notify({ ...fields, signature_key: 'a'.repeat(128) });

    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({ code: 'INVALID_SIGNATURE' });
    expect(statusCheck).not.toHaveBeenCalled();
  });

  it('signature dari nominal lain ditolak', async () => {
    const statusCheck = vi.spyOn(midtrans, 'getTransactionStatus');
    const signature_key = computeSignature({ ...fields, gross_amount: '1.00' }, SERVER_KEY);

    const res = await notify({ ...fields, signature_key });

    expect(res.status).toBe(403);
    expect(statusCheck).not.toHaveBeenCalled();
  });

  it('field wajib yang kurang ditolak 400', async () => {
    const res = await notify({ order_id: fields.order_id });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('gross_amount berupa angka ditolak, karena signature butuh teks mentah', async () => {
    const res = await notify({ ...fields, gross_amount: 1_500_000, signature_key: 'x' });

    expect(res.status).toBe(400);
  });

  it('server key kosong dibalas 503, bukan diterima tanpa verifikasi', async () => {
    vi.spyOn(midtrans, 'serverKey').mockReturnValue(undefined);

    const res = await notify({ ...fields, signature_key: 'x' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MIDTRANS_NOT_CONFIGURED');
  });

  it('Midtrans tidak bisa dihubungi dibalas 503 supaya notifikasi dikirim ulang', async () => {
    vi.spyOn(midtrans, 'getTransactionStatus').mockRejectedValue(new MidtransUnavailableError('putus'));
    const signature_key = computeSignature(fields, SERVER_KEY);

    const res = await notify({ ...fields, signature_key });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MIDTRANS_UNAVAILABLE');
  });
});
