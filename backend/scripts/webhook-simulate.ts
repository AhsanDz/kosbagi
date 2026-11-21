// Mengirim notifikasi Midtrans bertanda tangan ke server lokal, supaya pembayaran dari simulator
// sandbox bisa diproses tanpa ngrok. Skrip ini hanya pengganti pengiriman notifikasi: server tetap
// memverifikasi signature dan mengecek ulang status ke Midtrans.
//
//   npm run webhook:simulate -- <order_id> [opsi]
//   Berlaku untuk order RENT- dan BUY-.
//
//   --gross-amount <teks>  Mengganti gross_amount yang ditandatangani (uji nominal tidak cocok)
//   --bad-signature        Mengirim signature palsu (uji penolakan)
//   --url <alamat>         Bawaan http://localhost:<PORT>/api/webhooks/midtrans
import { parseArgs } from 'node:util';
import { env } from '../src/config/env.js';
import { midtrans } from '../src/modules/payments/midtrans.js';
import { sendSignedNotification } from './lib/notification.js';

function fail(message: string): never {
  console.error(`Gagal: ${message}`);
  process.exit(1);
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'gross-amount': { type: 'string' },
    'bad-signature': { type: 'boolean', default: false },
    url: { type: 'string', default: `http://localhost:${env.PORT}/api/webhooks/midtrans` },
  },
});

const orderId = positionals[0];
if (!orderId) fail('sebutkan order_id, mis. npm run webhook:simulate -- RENT-SMR01-K03-2026-11');

const serverKey = midtrans.serverKey();
if (!serverKey) fail('MIDTRANS_SERVER_KEY belum diisi di backend/.env.');

// Isi notifikasi diambil dari Midtrans, sama seperti notifikasi aslinya.
const status = await midtrans.getTransactionStatus(orderId);
if (!status) fail(`Midtrans belum mengenal ${orderId}. Pilih metode bayar di Snap lebih dulu.`);

console.log(`Mengirim ${status.transaction_status} untuk ${orderId} ke ${values.url}`);

const response = await sendSignedNotification(values.url, orderId, status, serverKey, {
  ...(values['gross-amount'] === undefined ? {} : { grossAmount: values['gross-amount'] }),
  badSignature: values['bad-signature'],
});
console.log(`HTTP ${response.status}: ${response.body}`);

if (response.status < 200 || response.status >= 300) process.exitCode = 1;
