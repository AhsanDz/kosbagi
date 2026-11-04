// Membaca dan memvalidasi environment variable sekali saat aplikasi start.
// Bila ada yang salah atau kurang, aplikasi langsung berhenti dengan pesan jelas
// (fail fast), bukan gagal diam-diam saat endpoint dipanggil.
import { config as loadEnv } from 'dotenv';
import { z } from '../lib/zod.js';

// Muat backend/.env bila ada. Variabel yang sudah diset di sistem tidak ditimpa.
loadEnv({ quiet: true });

const LOG_LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

// Pesan khusus bila variabel wajib belum diisi; kesalahan lain memakai pesan bawaan zod.
const required = { error: (issue: { input: unknown }) => (issue.input === undefined ? 'wajib diisi' : undefined) };

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
