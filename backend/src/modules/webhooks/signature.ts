// Tanda tangan notifikasi Midtrans: SHA-512 dari order_id + status_code + gross_amount + server key.
// gross_amount harus teks mentah dari notifikasi ("1500000.00"). Mengubah formatnya menghasilkan
// hash yang berbeda.
import { createHash, timingSafeEqual } from 'node:crypto';

export interface SignedFields {
  order_id: string;
  status_code: string;
  gross_amount: string;
}

export function computeSignature(fields: SignedFields, serverKey: string): string {
  return createHash('sha512')
    .update(`${fields.order_id}${fields.status_code}${fields.gross_amount}${serverKey}`)
    .digest('hex');
}

/** Perbandingan waktu-konstan, supaya lama proses tidak membocorkan berapa karakter yang cocok. */
export function isValidSignature(fields: SignedFields, signature: string, serverKey: string): boolean {
  const expected = Buffer.from(computeSignature(fields, serverKey));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
