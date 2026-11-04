// Modul contoh khusus test. Pemuat router memasangnya di /api/sample.
import { Router } from 'express';
import { AppError } from '../../../../src/lib/errors.js';
import { z } from '../../../../src/lib/zod.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: { module: 'sample' } });
});

// Nominal BigInt dari Prisma harus terkirim sebagai number biasa.
router.get('/amount', (_req, res) => {
  res.json({ data: { amountIdr: 1_500_000n } });
});

router.get('/conflict', () => {
  throw new AppError(409, 'CONFLICT', 'Tagihan periode ini sudah ada.');
});

router.get('/crash', () => {
  throw new Error('detail internal yang tidak boleh bocor ke klien');
});

// Meniru error dari layanan luar (mis. klien HTTP Midtrans) yang kebetulan membawa status 401.
// Ini kesalahan server, bukan kesalahan klien, jadi harus dibalas 500.
router.get('/upstream-401', () => {
  throw Object.assign(new Error('Midtrans membalas 401: server key salah'), { status: 401 });
});

// Error http-errors yang memang ditujukan ke klien (expose: true), mis. 415.
router.get('/client-error', () => {
  throw Object.assign(new Error('Jenis konten tidak didukung'), { status: 415, expose: true });
});

// Express 5 meneruskan Promise yang gagal ke error handler secara otomatis.
router.get('/async-crash', async () => {
  await Promise.resolve();
  throw new Error('detail internal async');
});

router.post('/periods', (req, res) => {
  const body = z.object({ period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) }).parse(req.body);
  res.status(201).json({ data: body });
});

export default router;
