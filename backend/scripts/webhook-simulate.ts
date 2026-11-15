// Mengirim notifikasi Midtrans bertanda tangan ke server lokal, supaya pembayaran dari simulator
// sandbox bisa diproses tanpa ngrok. Skrip ini hanya pengganti pengiriman notifikasi: server tetap
// memverifikasi signature dan mengecek ulang status ke Midtrans.
//
//   npm run webhook:simulate -- <order_id> [opsi]
//
//   --gross-amount <teks>  Mengganti gross_amount yang ditandatangani (uji nominal tidak cocok)
//   --bad-signature        Mengirim signature palsu (uji penolakan)
//   --url <alamat>         Bawaan http://localhost:<PORT>/api/webhooks/midtrans
import { parseArgs } from 'node:util';
import { env } from '../src/config/env.js';
import { midtrans } from '../src/modules/payments/midtrans.js';
import { computeSignature } from '../src/modules/webhooks/signature.js';

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

const fields = {
  order_id: orderId,
  status_code: status.status_code,
  gross_amount: values['gross-amount'] ?? status.gross_amount,
};
const notification = {
  ...fields,
  transaction_status: status.transaction_status,
  payment_type: status.payment_type,
  fraud_status: status.fraud_status,
  signature_key: values['bad-signature'] ? 'signature-palsu' : computeSignature(fields, serverKey),
};

console.log(`Mengirim ${status.transaction_status} untuk ${orderId} ke ${values.url}`);

const response = await fetch(values.url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(notification),
});
console.log(`HTTP ${response.status}: ${await response.text()}`);

if (!response.ok) process.exitCode = 1;
