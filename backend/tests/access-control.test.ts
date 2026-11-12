// RBAC diuji tanpa basis data: DATABASE_URL di vitest.config.ts menunjuk port kosong, jadi
// permintaan yang sampai ke query akan membalas 500. Balasan 401 dan 403 di sini membuktikan
// penolakan terjadi sebelum data disentuh.
import type { Express } from 'express';
import { SignJWT } from 'jose';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Role } from '../src/generated/prisma/enums.js';
import { signAccessToken } from '../src/lib/jwt.js';

const USER_ID = '01a18897-fb42-70b8-abc0-43d131ddbe3c';
const SOME_ID = '01a18897-fb42-70b8-abc0-43d131ddbe3d';

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

async function bearer(role: Role): Promise<string> {
  return `Bearer ${(await signAccessToken({ id: USER_ID, role })).token}`;
}

function send(method: 'get' | 'post', path: string) {
  return request(app)[method](path);
}

const protectedRoutes: ['get' | 'post', string, Role[]][] = [
  ['get', '/api/auth/me', []],
  ['get', '/api/bills/current', ['TENANT']],
  ['get', '/api/bills', ['TENANT']],
  ['get', `/api/bills/${SOME_ID}`, ['TENANT']],
  ['post', `/api/bills/${SOME_ID}/payments`, ['TENANT']],
  ['post', '/api/kyc', ['INVESTOR']],
  ['get', '/api/kyc/me', ['INVESTOR']],
  ['get', '/api/kyc', ['ADMIN']],
  ['post', `/api/kyc/${SOME_ID}/approve`, ['ADMIN']],
  ['post', `/api/kyc/${SOME_ID}/reject`, ['ADMIN']],
];

describe('tanpa token', () => {
  it.each(protectedRoutes)('%s %s membalas 401', async (method, path) => {
    const res = await send(method, path);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});

describe('token tidak sah', () => {
  it.each([
    ['bukan JWT', 'Bearer bukan-token'],
    ['bukan skema Bearer', 'Basic dXNlcjpwYXNz'],
    ['kosong', 'Bearer '],
  ])('%s membalas 401', async (_name, header) => {
    const res = await request(app).get('/api/bills').set('Authorization', header);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('token kedaluwarsa membalas 401', async () => {
    const { token } = await signAccessToken({ id: USER_ID, role: 'TENANT' }, new Date(Date.now() - 9 * 3_600_000));
    const res = await request(app).get('/api/bills').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });

  it('token bertanda tangan kunci lain membalas 401', async () => {
    const token = await new SignJWT({ role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USER_ID)
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('kunci-penyerang-yang-panjangnya-tiga-puluh-dua'));
    const res = await request(app).get('/api/kyc').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(401);
  });
});

describe('peran salah', () => {
  const ALL_ROLES: Role[] = ['INVESTOR', 'TENANT', 'MANAGER', 'ADMIN'];
  const cases = protectedRoutes.flatMap(([method, path, allowed]) =>
    allowed.length === 0
      ? []
      : ALL_ROLES.filter((role) => !allowed.includes(role)).map((role) => [method, path, role] as const),
  );

  it.each(cases)('%s %s dengan peran %s membalas 403', async (method, path, role) => {
    const res = await send(method, path).set('Authorization', await bearer(role));

    expect(res.status).toBe(403);
    expect(res.body.error).toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('id bukan UUID', () => {
  it('tagihan dibalas 404 tanpa menyentuh basis data', async () => {
    const authorization = await bearer('TENANT');

    const read = await request(app).get('/api/bills/bukan-uuid').set('Authorization', authorization);
    const pay = await request(app).post('/api/bills/bukan-uuid/payments').set('Authorization', authorization);

    expect(read.status).toBe(404);
    expect(pay.status).toBe(404);
  });

  it('KYC dibalas 404 tanpa menyentuh basis data', async () => {
    const res = await request(app).post('/api/kyc/bukan-uuid/approve').set('Authorization', await bearer('ADMIN'));

    expect(res.status).toBe(404);
  });
});

describe('validasi body', () => {
  it('KYC menolak nomor identitas yang tidak berawalan DUMMY-', async () => {
    const res = await request(app)
      .post('/api/kyc')
      .set('Authorization', await bearer('INVESTOR'))
      .send({ fullName: 'Dimas Pratama', dummyIdNumber: '3507123456789012' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'VALIDATION_ERROR',
      details: [{ path: 'dummyIdNumber', message: expect.stringContaining('DUMMY-') }],
    });
  });

  it('penolakan KYC wajib menyebut alasan', async () => {
    const res = await request(app)
      .post(`/api/kyc/${SOME_ID}/reject`)
      .set('Authorization', await bearer('ADMIN'))
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].path).toBe('reason');
  });

  it('daftar KYC menolak status yang tidak dikenal', async () => {
    const res = await request(app).get('/api/kyc?status=ANEH').set('Authorization', await bearer('ADMIN'));

    expect(res.status).toBe(400);
  });
});
