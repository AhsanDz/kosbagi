import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { LOCAL_TRUST_PROXY, parseTrustProxy, TrustProxyError, type TrustProxySetting } from './trust-proxy.js';

describe('parseTrustProxy', () => {
  it('menerima jumlah proxy, false, dan 0', () => {
    expect(parseTrustProxy('1')).toBe(1);
    expect(parseTrustProxy(' 2 ')).toBe(2);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('0')).toBe(false);
  });

  it('menerima daftar rentang bawaan, alamat IP, dan CIDR dipisah koma', () => {
    expect(parseTrustProxy('loopback')).toEqual(['loopback']);
    expect(parseTrustProxy('Loopback, 10.0.0.0/8, 100.64.0.0/10, fd00::/8, 192.0.2.7')).toEqual([
      'loopback',
      '10.0.0.0/8',
      '100.64.0.0/10',
      'fd00::/8',
      '192.0.2.7',
    ]);
  });

  it('menolak true karena klien bisa memalsukan IP', () => {
    expect(() => parseTrustProxy('true')).toThrow(TrustProxyError);
    expect(() => parseTrustProxy('TRUE')).toThrow(/terlalu longgar/);
  });

  it.each(['', ' , ', 'semua', '10.0.0.0/33', 'fd00::/129', '10.0.0.0/8/1', '10.0.0.0/abc', '11'])(
    'menolak %j',
    (value) => {
      expect(() => parseTrustProxy(value)).toThrow(TrustProxyError);
    },
  );

  it('menyebut entri yang salah di pesan', () => {
    expect(() => parseTrustProxy('loopback, proxy-railway')).toThrow(/proxy-railway bukan alamat IP/);
  });
});

/** Aplikasi kecil yang memantulkan IP klien menurut Express dengan pengaturan trust proxy tertentu. */
function echoIp(setting: TrustProxySetting) {
  const app = express();
  app.set('trust proxy', setting);
  app.get('/ip', (req, res) => {
    res.json({ ip: req.ip });
  });
  return (forwardedFor?: string) => {
    const req = request(app).get('/ip');
    return (forwardedFor ? req.set('X-Forwarded-For', forwardedFor) : req).then((res) => res.body.ip as string);
  };
}

// Supertest terhubung dari 127.0.0.1, jadi koneksinya sendiri berperan sebagai proxy lokal.
describe('hasil parseTrustProxy dipakai Express', () => {
  it('bawaan loopback: IP dari proxy lokal (ngrok, Next.js) dipakai', async () => {
    const ip = echoIp(LOCAL_TRUST_PROXY);
    await expect(ip('203.0.113.10')).resolves.toBe('203.0.113.10');
  });

  it('bawaan loopback: alamat palsu yang disisipkan klien di depan ngrok tidak dipercaya', async () => {
    // ngrok menambahkan IP pengirim di kanan; isian klien ada di kiri.
    const ip = echoIp(LOCAL_TRUST_PROXY);
    await expect(ip('198.51.100.66, 203.0.113.11')).resolves.toBe('203.0.113.11');
  });

  it('1 (Railway): hanya entri paling kanan yang ditulis proxy hosting yang dipakai', async () => {
    const ip = echoIp(parseTrustProxy('1'));
    await expect(ip('198.51.100.66, 203.0.113.12')).resolves.toBe('203.0.113.12');
  });

  it('false: X-Forwarded-For diabaikan, IP = alamat koneksi', async () => {
    const ip = echoIp(parseTrustProxy('false'));
    await expect(ip('203.0.113.13')).resolves.toMatch(/127\.0\.0\.1|::1/);
  });

  it('daftar rentang tanpa loopback: koneksi lokal bukan proxy tepercaya', async () => {
    const ip = echoIp(parseTrustProxy('10.0.0.0/8'));
    await expect(ip('203.0.113.14')).resolves.toMatch(/127\.0\.0\.1|::1/);
  });
});
