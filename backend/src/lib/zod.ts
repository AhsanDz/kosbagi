// Titik impor zod untuk seluruh backend. Pesan validasi diatur ke Bahasa Indonesia
// sekali di sini, jadi modul lain cukup menulis: import { z } from '../lib/zod.js'.
import { z } from 'zod';

z.config(z.locales.id());

export { z };

/** PostgreSQL menolak karakter NUL di kolom teks, jadi teks bebas diperiksa sebelum disimpan. */
export const noNulCharacter = {
  check: (value: string): boolean => !value.includes('\0'),
  message: 'Teks berisi karakter yang tidak diizinkan.',
};
