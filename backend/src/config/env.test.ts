import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const minimal = {
  DATABASE_URL: 'postgresql://kosbagi:kosbagi@localhost:5432/kosbagi?schema=public',
  REDIS_URL: 'redis://localhost:6379',
};

describe('parseEnv', () => {
  it('memakai nilai bawaan untuk variabel opsional', () => {
    const env = parseEnv(minimal);
    expect(env).toEqual({
      NODE_ENV: 'development',
      PORT: 4000,
      LOG_LEVEL: 'info',
      CORS_ORIGIN: ['http://localhost:3000'],
      ...minimal,
    });
  });

  it('mengubah PORT menjadi angka dan memecah CORS_ORIGIN berkoma', () => {
    const env = parseEnv({ ...minimal, PORT: '8080', CORS_ORIGIN: 'http://localhost:3000, https://kosbagi.vercel.app/' });
    expect(env.PORT).toBe(8080);
    // Garis miring di akhir dibuang supaya sama persis dengan header Origin dari peramban.
    expect(env.CORS_ORIGIN).toEqual(['http://localhost:3000', 'https://kosbagi.vercel.app']);
  });

  it('menolak konfigurasi tidak valid dengan pesan berbahasa Indonesia', () => {
    expect(() => parseEnv({ ...minimal, PORT: 'empat-ribu' })).toThrow(/Konfigurasi environment tidak valid[\s\S]*PORT/);
    expect(() => parseEnv({ ...minimal, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
    expect(() => parseEnv({ ...minimal, CORS_ORIGIN: '*' })).toThrow(/CORS_ORIGIN/);
  });

  it('mewajibkan DATABASE_URL PostgreSQL dan REDIS_URL', () => {
    expect(() => parseEnv({ REDIS_URL: minimal.REDIS_URL })).toThrow('DATABASE_URL: wajib diisi');
    expect(() => parseEnv({ ...minimal, DATABASE_URL: 'mysql://root@localhost/kosbagi' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: minimal.DATABASE_URL })).toThrow(/REDIS_URL/);
  });

  it('tidak menampilkan nilai rahasia di pesan error', () => {
    const secret = 'postgresql://kosbagi:sandi-rahasia@localhost:abc/kosbagi';
    expect(() => parseEnv({ ...minimal, DATABASE_URL: secret })).toThrow();
    try {
      parseEnv({ ...minimal, DATABASE_URL: secret });
    } catch (error) {
      expect((error as Error).message).not.toContain('sandi-rahasia');
    }
  });

  it('menghasilkan objek yang tidak bisa diubah', () => {
    const env = parseEnv(minimal);
    expect(Object.isFrozen(env)).toBe(true);
  });
});
