// Batas permintaan diuji dengan permintaan yang ditolak validasi, jadi tidak butuh basis data.
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { signAccessToken } from '../src/lib/jwt.js';

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

/** Setiap test memakai IP sendiri lewat X-Forwarded-For, supaya penghitungnya tidak tercampur. */
function post(path: string, ip: string, body: object = {}) {
  return request(app).post(path).set('X-Forwarded-For', ip).send(body);
}

describe('rate limit per IP', () => {
  it('login: permintaan ke-11 dalam semenit ditolak dengan format error yang sama', async () => {
    for (let i = 0; i < 10; i += 1) {
      const res = await post('/api/auth/login', '203.0.113.1');
      expect(res.status).toBe(400);
    }

    const res = await post('/api/auth/login', '203.0.113.1');

    expect(res.status).toBe(429);
    expect(res.body.error).toMatchObject({ code: 'RATE_LIMITED', requestId: res.headers['x-request-id'] });
    expect(res.headers['ratelimit-policy'] ?? res.headers['ratelimit']).toBeDefined();
  });

  it('owner-applications: permintaan ke-11 ditolak', async () => {
    for (let i = 0; i < 10; i += 1) await post('/api/owner-applications', '203.0.113.2');

    const res = await post('/api/owner-applications', '203.0.113.2');

    expect(res.status).toBe(429);
  });

  it('webhook: permintaan ke-121 ditolak', async () => {
    const results = await Promise.all(
      Array.from({ length: 120 }, () => post('/api/webhooks/midtrans', '203.0.113.3')),
    );
    expect(results.every((res) => res.status === 400)).toBe(true);

    const res = await post('/api/webhooks/midtrans', '203.0.113.3');

    expect(res.status).toBe(429);
  });

  it('membaca IP asli di balik proxy: IP lain punya penghitung sendiri', async () => {
    for (let i = 0; i < 11; i += 1) await post('/api/auth/login', '203.0.113.4');

    const res = await post('/api/auth/login', '203.0.113.5');

    expect(res.status).toBe(400);
  });
});

describe('rate limit per pengguna di POST /api/bills/:id/payments', () => {
  // Id bukan UUID dibalas 404 tanpa basis data, tetapi tetap dihitung pembatas.
  async function pay(userId: string, ip: string) {
    const { token } = await signAccessToken({ id: userId, role: 'TENANT' });
    return request(app)
      .post('/api/bills/bukan-uuid/payments')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Forwarded-For', ip);
  }

  it('permintaan ke-31 ditolak walau IP berganti, sedangkan pengguna lain tidak terdampak', async () => {
    const first = '01a18897-fb42-70b8-abc0-43d131ddbe31';
    const second = '01a18897-fb42-70b8-abc0-43d131ddbe32';

    for (let i = 0; i < 30; i += 1) {
      const res = await pay(first, `203.0.113.${100 + (i % 5)}`);
      expect(res.status).toBe(404);
    }

    const blocked = await pay(first, '203.0.113.200');

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    await expect(pay(second, '203.0.113.200')).resolves.toMatchObject({ status: 404 });
  });
});
