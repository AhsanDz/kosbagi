// Test integrasi GET /api/health memakai aplikasi asli (modul dari src/modules).
// DATABASE_URL di vitest.config.ts menunjuk port kosong, jadi test ini sekaligus
// membuktikan health tidak bergantung pada basis data.
import { readFileSync } from 'node:fs';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string };

let app: Express;

beforeAll(async () => {
  app = await createApp();
});

describe('GET /api/health', () => {
  it('membalas 200 dengan status layanan, versi, dan waktu', async () => {
    const before = Date.now();
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^application\/json/);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).toEqual({
      data: {
        status: 'ok',
        service: 'kosbagi-backend',
        version,
        environment: 'test',
        time: expect.any(String),
        uptimeSeconds: expect.any(Number),
      },
    });

    const time = Date.parse(res.body.data.time);
    expect(time).toBeGreaterThanOrEqual(before - 1000);
    expect(time).toBeLessThanOrEqual(Date.now() + 1000);
  });

  it('memasang header keamanan dan ID permintaan', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('memakai ulang X-Request-Id dari klien bila formatnya aman', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', 'uji-123');
    expect(res.headers['x-request-id']).toBe('uji-123');

    const unsafe = await request(app).get('/api/health').set('X-Request-Id', '<script>');
    expect(unsafe.headers['x-request-id']).not.toBe('<script>');
  });
});

describe('CORS', () => {
  it('mengizinkan origin frontend yang terdaftar', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:3000');
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('tidak memberi izin CORS ke origin lain', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://situs-lain.test');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
