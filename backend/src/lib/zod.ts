// Titik impor zod untuk seluruh backend. Pesan validasi diatur ke Bahasa Indonesia
// sekali di sini, jadi modul lain cukup menulis: import { z } from '../lib/zod.js'.
import { z } from 'zod';

z.config(z.locales.id());

export { z };
