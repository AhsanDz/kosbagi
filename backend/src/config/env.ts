// Membaca dan memvalidasi environment variable sekali saat aplikasi start.
// Bila ada yang salah atau kurang, aplikasi langsung berhenti dengan pesan jelas
// (fail fast), bukan gagal diam-diam saat endpoint dipanggil.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { Mnemonic } from 'ethers';
import { z } from '../lib/zod.js';

// Muat backend/.env bila ada. Variabel yang sudah diset di sistem tidak ditimpa.
loadEnv({ quiet: true });

/** Folder backend/, baik saat dijalankan dari src/ (tsx) maupun dari dist/ (hasil build). */
export const BACKEND_ROOT = fileURLToPath(new URL('../../', import.meta.url));

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

// Pesan khusus bila variabel wajib belum diisi; kesalahan lain memakai pesan bawaan zod.
const required = { error: (issue: { input: unknown }) => (issue.input === undefined ? 'wajib diisi' : undefined) };

// Baris `NAMA=` tanpa nilai di .env terbaca sebagai teks kosong; anggap saja belum diisi.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  LOG_LEVEL: z.enum(LOG_LEVELS).default('info'),
  // Origin frontend yang boleh memanggil API, dipisah koma. Disimpan sebagai daftar origin
  // tanpa garis miring di akhir, karena peramban mengirim header Origin dalam bentuk itu.
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:3000')
    .transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean))
    .pipe(z.array(z.url({ protocol: /^https?$/ }).transform((url) => new URL(url).origin)).min(1)),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/, ...required }),
  REDIS_URL: z.url({ protocol: /^rediss?$/, ...required }),
  JWT_SECRET: z.string(required).min(32, 'minimal 32 karakter'),
  // Boleh kosong: server tetap jalan, endpoint pembayaran membalas 503 MIDTRANS_NOT_CONFIGURED.
  // Awalan SB-Mid-server- memastikan yang terpasang kunci sandbox, bukan kunci produksi.
  MIDTRANS_SERVER_KEY: optional(z.string().startsWith('SB-Mid-server-', 'harus kunci sandbox berawalan SB-Mid-server-')),
  // Dipakai worker blockchain (P3). Nama tiga variabel Sepolia sama dengan contracts/.env.example.
  SEPOLIA_RPC_URL: optional(z.url({ protocol: /^https?$/ })),
  SEPOLIA_RPC_URL_FALLBACK: optional(z.url({ protocol: /^https?$/ })),
  OPERATOR_PRIVATE_KEY: optional(z.string().regex(/^0x[0-9a-fA-F]{64}$/, 'harus 64 karakter heksadesimal berawalan 0x')),
  // Dipakai server API saat admin menyetujui KYC: alamat dompet kustodian diturunkan dari sini.
  // Bila kosong, persetujuan KYC dibalas 503 CUSTODIAL_WALLET_NOT_CONFIGURED.
  CUSTODIAL_WALLET_MNEMONIC: optional(
    z
      .string()
      .trim()
      .refine((phrase) => Mnemonic.isValidMnemonic(phrase), 'harus mnemonic BIP-39 yang valid (12 atau 24 kata)'),
  ),
  KOS_TOKEN_ADDRESS: optional(z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'harus alamat Ethereum berawalan 0x')),
  KOS_LEDGER_ADDRESS: optional(z.string().regex(/^0x[0-9a-fA-F]{40}$/, 'harus alamat Ethereum berawalan 0x')),
  // Folder file nota biaya (P4). Path relatif dibaca dari folder backend/, bukan dari folder
  // tempat perintah dijalankan, supaya npm run dev dan skrip demo menyimpan ke tempat yang sama.
  UPLOAD_DIR: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z
      .string()
      .default('uploads')
      .transform((dir) => path.resolve(BACKEND_ROOT, dir)),
  ),
  // Jaringan yang diharapkan worker: 11155111 untuk Sepolia, 31337 untuk Hardhat lokal.
  CHAIN_ID: z.preprocess(
    (value) => (value === '' ? undefined : value),
    z.coerce.number().int().positive().default(11155111),
  ),
});

export type Env = z.output<typeof envSchema>;

/** Memvalidasi sumber variabel (biasanya process.env). Melempar Error berbahasa Indonesia bila tidak valid. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    // Hanya nama variabel dan alasan yang ditampilkan, tidak pernah nilainya (bisa berisi kata sandi).
    const detail = result.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(
      `Konfigurasi environment tidak valid:\n${detail}\n` +
        'Salin backend/.env.example menjadi backend/.env, lalu periksa nilainya.',
    );
  }
  return Object.freeze(result.data);
}

export const env = parseEnv(process.env);
