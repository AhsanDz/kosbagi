// Data persiapan demo P4 (keputusan pengguna 16 Nov 2026), dipakai skrip demo:siapkan-investor,
// demo:catat-biaya, dan test-nya.
//
// Nota di scripts/demo/nota/ adalah PDF kecil bertulisan DUMMY dengan isi tetap, jadi hash SHA-256
// tiap nota selalu sama di semua laptop (file .pdf ditandai biner di .gitattributes, sehingga git
// tidak mengubah akhir barisnya).
import { fileURLToPath } from 'node:url';

export const DEMO_PROPERTY_CODE = 'SMR01';
export const DEMO_PERIOD = '2026-11';

/** Kata sandi semua akun demo, sama dengan prisma/seed/data.ts. */
export const DEMO_PASSWORD = 'demo-kosbagi';
export const ADMIN_EMAIL = 'admin.dummy@kosbagi.test';
export const MANAGER_EMAIL = 'pengelola.dummy@kosbagi.test';

/** Target kepemilikan token investor sebelum demo (keputusan 2). Dimas membeli 100 token saat demo. */
export const INVESTOR_TARGETS = [
  { key: 'bagas', name: 'Bagas Wicaksono', email: 'bagas.dummy@kosbagi.test', tokens: 1_800 },
  { key: 'citra', name: 'Citra Lestari', email: 'citra.dummy@kosbagi.test', tokens: 1_200 },
  { key: 'eko', name: 'Eko Saputra', email: 'eko.dummy@kosbagi.test', tokens: 800 },
  { key: 'fajar', name: 'Fajar Nugroho', email: 'fajar.dummy@kosbagi.test', tokens: 560 },
] as const;

export interface DemoExpense {
  /** Nama file di scripts/demo/nota/. */
  file: string;
  categoryCode: number;
  description: string;
  amountIdr: number;
  receiptDate: string;
}

/**
 * Biaya November dari frame Figma "Biaya, semua tercatat" (145-429). Empat baris pertama dicatat
 * skrip demo:catat-biaya (Rp2.400.000); nota perbaikan K07 (Rp300.000) dicatat pengelola lewat UI
 * saat demo, sehingga totalnya Rp2.700.000 dan struk menghasilkan Rp438,75 per token.
 */
export const NOVEMBER_PREPARED_EXPENSES: readonly DemoExpense[] = [
  { file: 'listrik-air.pdf', categoryCode: 1, description: 'Token listrik dan tagihan PDAM', amountIdr: 1_150_000, receiptDate: '2026-11-05' },
  { file: 'kebersihan.pdf', categoryCode: 2, description: 'Jasa kebersihan dan sampah', amountIdr: 600_000, receiptDate: '2026-11-06' },
  { file: 'internet.pdf', categoryCode: 3, description: 'Langganan internet 100 Mbps', amountIdr: 450_000, receiptDate: '2026-11-07' },
  { file: 'keamanan.pdf', categoryCode: 5, description: 'Honor penjaga malam November', amountIdr: 200_000, receiptDate: '2026-11-14' },
];

/** Nota yang diunggah pengelola lewat UI saat demo. Tidak dicatat skrip. */
export const NOVEMBER_DEMO_EXPENSE: DemoExpense = {
  file: 'perbaikan-k07.pdf',
  categoryCode: 4,
  description: 'Ganti keran kamar mandi K07',
  amountIdr: 300_000,
  receiptDate: '2026-11-12',
};

/** Path absolut file nota. */
export function notaPath(file: string): string {
  return fileURLToPath(new URL(`./nota/${file}`, import.meta.url));
}
