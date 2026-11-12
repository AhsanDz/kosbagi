import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const minimal = {
  DATABASE_URL: 'postgresql://kosbagi:kosbagi@localhost:5432/kosbagi?schema=public',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'nilai-uji-env-minimal-tiga-puluh-dua-karakter',
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
    expect(() => parseEnv({ ...minimal, DATABASE_URL: undefined })).toThrow('DATABASE_URL: wajib diisi');
    expect(() => parseEnv({ ...minimal, DATABASE_URL: 'mysql://root@localhost/kosbagi' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...minimal, REDIS_URL: undefined })).toThrow(/REDIS_URL/);
  });

  it('mewajibkan JWT_SECRET minimal 32 karakter', () => {
    expect(() => parseEnv({ ...minimal, JWT_SECRET: undefined })).toThrow('JWT_SECRET: wajib diisi');
    expect(() => parseEnv({ ...minimal, JWT_SECRET: 'terlalu-pendek' })).toThrow('JWT_SECRET: minimal 32 karakter');
  });

  it('tidak menampilkan nilai rahasia di pesan error', () => {
    const secret = 'postgresql://kosbagi:sandi-rahasia@localhost:abc/kosbagi';
    expect(() => parseEnv({ ...minimal, DATABASE_URL: secret })).toThrow();
    try {
      parseEnv({ ...minimal, DATABASE_URL: secret, MIDTRANS_SERVER_KEY: 'Mid-server-rahasia-produksi' });
    } catch (error) {
      expect((error as Error).message).not.toContain('sandi-rahasia');
      expect((error as Error).message).not.toContain('rahasia-produksi');
    }
  });

  it('menghasilkan objek yang tidak bisa diubah', () => {
    const env = parseEnv(minimal);
    expect(Object.isFrozen(env)).toBe(true);
  });
});

describe('.env.example', () => {
  it('lolos validasi apa adanya, supaya salinannya langsung bisa dipakai', () => {
    const example = parse(readFileSync(new URL('../../.env.example', import.meta.url)));

    expect(() => parseEnv(example)).not.toThrow();
    expect(parseEnv(example).MIDTRANS_SERVER_KEY).toBeUndefined();
  });
});

describe('parseEnv: MIDTRANS_SERVER_KEY', () => {
  it('boleh kosong supaya server tetap jalan tanpa kunci', () => {
    expect(parseEnv(minimal).MIDTRANS_SERVER_KEY).toBeUndefined();
    expect(parseEnv({ ...minimal, MIDTRANS_SERVER_KEY: '' }).MIDTRANS_SERVER_KEY).toBeUndefined();
  });

  it('menerima kunci sandbox', () => {
    const env = parseEnv({ ...minimal, MIDTRANS_SERVER_KEY: 'SB-Mid-server-contoh' });
    expect(env.MIDTRANS_SERVER_KEY).toBe('SB-Mid-server-contoh');
  });

  it('menolak kunci yang tidak berawalan SB-Mid-server-', () => {
    expect(() => parseEnv({ ...minimal, MIDTRANS_SERVER_KEY: 'Mid-server-contoh' })).toThrow(
      'MIDTRANS_SERVER_KEY: harus kunci sandbox berawalan SB-Mid-server-',
    );
  });
});

describe('parseEnv: variabel worker blockchain', () => {
  it('semuanya opsional di server API, dan baris kosong dianggap belum diisi', () => {
    const env = parseEnv({ ...minimal, SEPOLIA_RPC_URL: '', OPERATOR_PRIVATE_KEY: '', KOS_LEDGER_ADDRESS: '' });
    expect(env.SEPOLIA_RPC_URL).toBeUndefined();
    expect(env.OPERATOR_PRIVATE_KEY).toBeUndefined();
    expect(env.KOS_LEDGER_ADDRESS).toBeUndefined();
  });

  it('memeriksa format bila diisi', () => {
    expect(() => parseEnv({ ...minimal, OPERATOR_PRIVATE_KEY: 'ganti-dengan-private-key' })).toThrow(/OPERATOR_PRIVATE_KEY/);
    expect(() => parseEnv({ ...minimal, KOS_TOKEN_ADDRESS: '0x123' })).toThrow(/KOS_TOKEN_ADDRESS/);
    expect(() => parseEnv({ ...minimal, SEPOLIA_RPC_URL: 'bukan-url' })).toThrow(/SEPOLIA_RPC_URL/);
  });
});
