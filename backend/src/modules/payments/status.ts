// Menerjemahkan status Midtrans ke keputusan KosBagi. Satu aturan ini dipakai semua alur,
// supaya arti "lunas" tidak berbeda antar tempat.
import type { TransactionStatus } from './midtrans.js';

export type PaymentVerdict =
  | 'PAID' // pembayaran sah
  | 'WAITING' // belum selesai
  | 'EXPIRED' // batas waktu habis
  | 'FAILED' // dibatalkan atau ditolak
  | 'IGNORED'; // status yang tidak mengubah percobaan, mis. refund

/**
 * Lunas bila status_code 200, transaction_status settlement atau capture, dan fraud_status
 * accept bila field itu ada. Beberapa metode tidak mengirim fraud_status.
 */
export function classifyTransaction(status: TransactionStatus): PaymentVerdict {
  const fraudCleared = status.fraud_status === undefined || status.fraud_status === 'accept';

  switch (status.transaction_status) {
    case 'settlement':
    case 'capture':
      return status.status_code === '200' && fraudCleared ? 'PAID' : 'WAITING';
    case 'pending':
    case 'authorize':
      return 'WAITING';
    case 'expire':
      return 'EXPIRED';
    case 'cancel':
    case 'deny':
    case 'failure':
      return 'FAILED';
    default:
      return 'IGNORED';
  }
}

/**
 * Mengubah gross_amount Midtrans (teks seperti "1500000.00") menjadi rupiah bilangan bulat.
 * Pecahan selain nol dianggap tidak valid karena tagihan selalu rupiah utuh.
 */
export function parseGrossAmount(raw: string): bigint | null {
  const match = /^(\d+)(?:\.0+)?$/.exec(raw);
  return match?.[1] ? BigInt(match[1]) : null;
}
