// Mengirim notifikasi Midtrans bertanda tangan ke server lokal, dipakai webhook:simulate dan
// demo:bayar-sewa. Ini hanya pengganti pengiriman notifikasi oleh Midtrans saat belum memakai
// ngrok: server tetap memverifikasi signature dan mengecek ulang status ke Midtrans.
import type { TransactionStatus } from '../../src/modules/payments/midtrans.js';
import { computeSignature } from '../../src/modules/webhooks/signature.js';

export interface NotificationOptions {
  /** Mengganti gross_amount yang ditandatangani, untuk uji nominal tidak cocok. */
  grossAmount?: string;
  /** Mengirim signature palsu, untuk uji penolakan. */
  badSignature?: boolean;
}

export interface NotificationResult {
  status: number;
  body: string;
}

/** Isi notifikasi diambil dari jawaban API status Midtrans, sama seperti notifikasi aslinya. */
export async function sendSignedNotification(
  url: string,
  orderId: string,
  status: TransactionStatus,
  serverKey: string,
  options: NotificationOptions = {},
): Promise<NotificationResult> {
  const fields = {
    order_id: orderId,
    status_code: status.status_code,
    gross_amount: options.grossAmount ?? status.gross_amount,
  };
  const notification = {
    ...fields,
    transaction_status: status.transaction_status,
    payment_type: status.payment_type,
    fraud_status: status.fraud_status,
    signature_key: options.badSignature ? 'signature-palsu' : computeSignature(fields, serverKey),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(notification),
  });
  return { status: response.status, body: await response.text() };
}
