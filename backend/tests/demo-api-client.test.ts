// Klien HTTP skrip demo (P4): login menunggu Retry-After sekali saat kena batas 10 per menit.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { login, retryAfterSeconds } from '../scripts/lib/api-client.js';

let server: Server | undefined;

afterEach(async () => {
  vi.restoreAllMocks();
  await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
  server = undefined;
});

/** Server kecil yang membalas login dengan urutan status yang ditentukan. */
async function loginServer(statuses: number[]): Promise<{ url: string; calls: () => number }> {
  let calls = 0;
  server = createServer((_req, res) => {
    const status = statuses[Math.min(calls, statuses.length - 1)] ?? 200;
    calls += 1;
    if (status === 429) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '37' });
      res.end(JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Terlalu banyak permintaan.' } }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: { token: 'token-uji', user: { id: 'u1', name: 'Hadi Santoso' } } }));
  });
  await new Promise<void>((resolve) => server?.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, calls: () => calls };
}

describe('retryAfterSeconds', () => {
  it('membaca detik dari header, dibatasi 90, bawaan 60', () => {
    expect(retryAfterSeconds('37')).toBe(37);
    expect(retryAfterSeconds('2.2')).toBe(3);
    expect(retryAfterSeconds('600')).toBe(90);
    expect(retryAfterSeconds(null)).toBe(60);
    expect(retryAfterSeconds('besok')).toBe(60);
  });
});

describe('login skrip demo', () => {
  it('kena batas login: menunggu Retry-After sekali lalu berhasil', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { url, calls } = await loginServer([429, 200]);
    const waits: number[] = [];

    const client = await login(url, 'pengelola.dummy@kosbagi.test', 'demo-kosbagi', async (ms) => void waits.push(ms));

    expect(client).toMatchObject({ userId: 'u1', name: 'Hadi Santoso' });
    expect(waits).toEqual([37_000]);
    expect(calls()).toBe(2);
  });

  it('masih kena batas setelah menunggu: gagal dengan pesan API, tanpa menunggu kedua kali', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const { url, calls } = await loginServer([429, 429]);
    const waits: number[] = [];

    await expect(login(url, 'a@kosbagi.test', 'x', async (ms) => void waits.push(ms))).rejects.toMatchObject({ status: 429, code: 'RATE_LIMITED' });
    expect(waits).toHaveLength(1);
    expect(calls()).toBe(2);
  });
});
