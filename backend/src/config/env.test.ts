import { readFileSync } from 'node:fs';
import { parse } from 'dotenv';
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { BACKEND_ROOT, PUBLIC_JWT_SECRETS, parseEnv } from './env.js';

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
      CHAIN_ID: 11155111,
      UPLOAD_DIR: path.resolve(BACKEND_ROOT, 'uploads'),
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

describe('parseEnv: CHAIN_ID', () => {
  it('bawaan Sepolia 11155111, termasuk bila barisnya kosong', () => {
    expect(parseEnv(minimal).CHAIN_ID).toBe(11155111);
    expect(parseEnv({ ...minimal, CHAIN_ID: '' }).CHAIN_ID).toBe(11155111);
  });

  it('menerima jaringan Hardhat lokal dan menolak nilai bukan bilangan bulat positif', () => {
    expect(parseEnv({ ...minimal, CHAIN_ID: '31337' }).CHAIN_ID).toBe(31337);
    expect(() => parseEnv({ ...minimal, CHAIN_ID: 'sepolia' })).toThrow(/CHAIN_ID/);
    expect(() => parseEnv({ ...minimal, CHAIN_ID: '0' })).toThrow(/CHAIN_ID/);
  });
});

describe('parseEnv: CUSTODIAL_WALLET_MNEMONIC', () => {
  // Mnemonic uji publik bawaan Hardhat, bukan rahasia.
  const HARDHAT_MNEMONIC = 'test test test test test test test test test test test junk';

  it('menerima mnemonic BIP-39 dan membuang spasi di tepi', () => {
    expect(parseEnv({ ...minimal, CUSTODIAL_WALLET_MNEMONIC: ` ${HARDHAT_MNEMONIC} ` }).CUSTODIAL_WALLET_MNEMONIC).toBe(
      HARDHAT_MNEMONIC,
    );
  });

  it('menolak teks yang bukan mnemonic tanpa menampilkan isinya', () => {
    const bad = 'kata rahasia yang salah ketik test test test test test test test';
    expect(() => parseEnv({ ...minimal, CUSTODIAL_WALLET_MNEMONIC: bad })).toThrow(/CUSTODIAL_WALLET_MNEMONIC/);
    try {
      parseEnv({ ...minimal, CUSTODIAL_WALLET_MNEMONIC: bad });
    } catch (error) {
      expect((error as Error).message).not.toContain('rahasia');
    }
  });
});

describe('parseEnv: UPLOAD_DIR', () => {
  it('bawaan folder uploads di dalam backend/, termasuk bila barisnya kosong', () => {
    expect(parseEnv(minimal).UPLOAD_DIR).toBe(path.join(BACKEND_ROOT, 'uploads'));
    expect(parseEnv({ ...minimal, UPLOAD_DIR: '' }).UPLOAD_DIR).toBe(path.join(BACKEND_ROOT, 'uploads'));
  });

  it('path relatif dibaca dari folder backend/, path absolut dipakai apa adanya', () => {
    expect(parseEnv({ ...minimal, UPLOAD_DIR: 'data/nota' }).UPLOAD_DIR).toBe(path.join(BACKEND_ROOT, 'data', 'nota'));
    const absolute = path.resolve('/srv/kosbagi-nota');
    expect(parseEnv({ ...minimal, UPLOAD_DIR: absolute }).UPLOAD_DIR).toBe(absolute);
  });

  it('BACKEND_ROOT menunjuk folder yang berisi package.json backend', () => {
    expect(readFileSync(path.join(BACKEND_ROOT, 'package.json'), 'utf8')).toContain('"name": "kosbagi-backend"');
  });
});

describe('parseEnv: TRUST_PROXY', () => {
  it('kosong berarti belum diisi; aplikasi lalu hanya memercayai proxy lokal', () => {
    expect(parseEnv(minimal).TRUST_PROXY).toBeUndefined();
    expect(parseEnv({ ...minimal, TRUST_PROXY: '' }).TRUST_PROXY).toBeUndefined();
  });

  it('membaca jumlah proxy, false, dan daftar alamat', () => {
    expect(parseEnv({ ...minimal, TRUST_PROXY: '1' }).TRUST_PROXY).toBe(1);
    expect(parseEnv({ ...minimal, TRUST_PROXY: 'false' }).TRUST_PROXY).toBe(false);
    expect(parseEnv({ ...minimal, TRUST_PROXY: 'loopback, 100.64.0.0/10' }).TRUST_PROXY).toEqual(['loopback', '100.64.0.0/10']);
  });

  it('menolak true dan nilai yang bukan alamat dengan pesan menyebut variabelnya', () => {
    expect(() => parseEnv({ ...minimal, TRUST_PROXY: 'true' })).toThrow(/TRUST_PROXY: true terlalu longgar/);
    expect(() => parseEnv({ ...minimal, TRUST_PROXY: 'railway' })).toThrow(/TRUST_PROXY: railway bukan alamat IP/);
  });
});

describe('parseEnv: JWT_SECRET saat NODE_ENV=production', () => {
  const example = parse(readFileSync(new URL('../../.env.example', import.meta.url)));

  it('menolak nilai contoh .env.example dan nilai test yang tertulis di repo', () => {
    expect(PUBLIC_JWT_SECRETS.has(example['JWT_SECRET'] ?? '')).toBe(true);
    for (const secret of PUBLIC_JWT_SECRETS) {
      expect(() => parseEnv({ ...minimal, NODE_ENV: 'production', JWT_SECRET: secret })).toThrow(
        /JWT_SECRET: nilai contoh dari repo tidak boleh dipakai saat NODE_ENV=production/,
      );
    }
  });

  it('pesan tolakannya tidak menampilkan nilai JWT_SECRET', () => {
    try {
      parseEnv({ ...example, NODE_ENV: 'production' });
      expect.unreachable('seharusnya ditolak');
    } catch (error) {
      expect((error as Error).message).not.toContain(example['JWT_SECRET']);
    }
  });

  it('tetap menerima nilai contoh saat development dan test, serta nilai acak saat production', () => {
    expect(() => parseEnv({ ...example, NODE_ENV: 'development' })).not.toThrow();
    expect(() => parseEnv({ ...minimal, NODE_ENV: 'test', JWT_SECRET: example['JWT_SECRET'] })).not.toThrow();
    const random = 'uji-produksi-nilai-di-luar-daftar-contoh-repo';
    expect(parseEnv({ ...minimal, NODE_ENV: 'production', JWT_SECRET: random }).JWT_SECRET).toBe(random);
  });
});
