// Modul webhooks: POST /api/webhooks/midtrans, tujuan notifikasi HTTP Midtrans.
//
// Balasan menentukan perilaku kirim ulang Midtrans: 2xx berarti selesai, 400 dikirim ulang dua
// kali, 503 empat kali. Yang masih mungkin berhasil nanti dibalas 503.
import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { noNulCharacter, z } from '../../lib/zod.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';
import { midtrans } from '../payments/midtrans.js';
import { handleVerifiedNotification } from './service.js';
import { isValidSignature } from './signature.js';

// Satu pembayaran menghasilkan beberapa notifikasi, jadi batas ini longgar untuk Midtrans
// tetapi tetap membatasi banjir permintaan dari luar.
const webhookLimiter = createRateLimiter({ limit: 120 });

// Field lain diabaikan, supaya field baru dari Midtrans tidak memutus webhook.
const notificationSchema = z.object({
  order_id: z.string().min(1).max(100).refine(noNulCharacter.check, noNulCharacter.message),
  status_code: z.string().min(1).max(10),
  gross_amount: z.string().min(1).max(30),
  signature_key: z.string().min(1).max(200),
});

const router = Router();

router.post('/midtrans', webhookLimiter, async (req, res) => {
  const serverKey = midtrans.serverKey();
  if (!serverKey) throw new AppError(503, 'MIDTRANS_NOT_CONFIGURED', 'Pembayaran belum dikonfigurasi di server.');

  const notification = notificationSchema.parse(req.body);
  if (!isValidSignature(notification, notification.signature_key, serverKey)) {
    req.log.warn({ orderId: notification.order_id }, 'Notifikasi Midtrans dengan signature tidak valid ditolak');
    throw new AppError(403, 'INVALID_SIGNATURE', 'Signature notifikasi tidak valid.');
  }

  const outcome = await handleVerifiedNotification(notification);
  res.json({ data: { orderId: notification.order_id, outcome } });
});

export default router;
