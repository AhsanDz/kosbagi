// Endpoint rekonsiliasi tanpa basis data: DATABASE_URL di vitest.config.ts menunjuk port kosong.
// Yang diuji di sini adalah penolakan sebelum data disentuh (peran, validasi, konfigurasi). Alur
// lengkap dengan PostgreSQL dan Hardhat ada di reconciliation.integration.test.ts.
//
// Konfigurasi test: MIDTRANS_SERVER_KEY dan KOS_LEDGER_ADDRESS diisi, SEPOLIA_RPC_URL dan
// KOS_TOKEN_ADDRESS kosong, jadi Sepolia belum dikonfigurasi.
import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../app.js';
import type { Role } from '../../generated/prisma/enums.js';
import { signAccessToken } from '../../lib/jwt.js';
import { midtrans } from '../payments/midtrans.js';

const USER_ID = '01a18897-fb42-70b8-abc0-43d131ddbe3c';
let app: Express;

beforeAll(async () => {
  app = await createApp();
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function bearer(role: Role): Promise<string> {
  return `Bearer ${(await signAccessToken({ id: USER_ID, role })).token}`;
}

const paths = ['/api/reconciliation', '/api/reconciliation/summary'];

describe.each(paths)('GET %s', (path) => {
  it('menolak tanpa token', async () => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it.each<Role>(['INVESTOR', 'TENANT', 'MANAGER'])('menolak peran %s', async (role) => {
    const res = await request(app).get(path).set('Authorization', await bearer(role));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it.each([
    ['period=2026-13', 'period'],
    ['period=November', 'period'],
    ['only=semua', 'only'],
    ['refresh=ya', 'refresh'],
  ])('menolak query %s', async (query, field) => {
    const res = await request(app).get(`${path}?${query}`).set('Authorization', await bearer('ADMIN'));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual([expect.objectContaining({ path: field })]);
  });

  it('503 bila Sepolia belum dikonfigurasi, tanpa menyentuh basis data', async () => {
    const res = await request(app).get(`${path}?period=2026-11`).set('Authorization', await bearer('ADMIN'));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CHAIN_NOT_CONFIGURED');
  });

  it('503 bila server key Midtrans belum diisi', async () => {
    vi.spyOn(midtrans, 'serverKey').mockReturnValue(undefined);
    const res = await request(app).get(path).set('Authorization', await bearer('ADMIN'));
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('MIDTRANS_NOT_CONFIGURED');
  });
});
