// Bentuk data pembayaran yang dikirim ke frontend.
import type { Payment } from '../../generated/prisma/client.js';

export type PaymentDtoStatus = 'PENDING' | 'PAID' | 'EXPIRED' | 'FAILED';

export interface PaymentDto {
  id: string;
  orderId: string;
  amountIdr: number;
  status: PaymentDtoStatus;
  method: string | null;
  expiresAt: Date;
  paidAt: Date | null;
  snapToken: string | null;
}

/**
 * Status yang dilihat pengguna. Percobaan yang melewati batas waktu dibaca kedaluwarsa walau
 * notifikasi expire dari Midtrans belum tiba. DUPLICATE_PAID, UNFULFILLED, dan PAID_AFTER_CLOSE
 * (P4) tetap terbaca PAID karena uangnya memang sudah diterima; bedanya hanya di catatan internal
 * dan anomali. Status tagihan atau pesanan tetap sumber kebenaran lunas tidaknya.
 */
export function effectiveStatus(payment: Pick<Payment, 'status' | 'expiresAt'>, now: Date): PaymentDtoStatus {
  switch (payment.status) {
    case 'DUPLICATE_PAID':
    case 'UNFULFILLED':
    case 'PAID_AFTER_CLOSE':
      return 'PAID';
    case 'PENDING':
      return payment.expiresAt <= now ? 'EXPIRED' : 'PENDING';
    default:
      return payment.status;
  }
}

export function toPaymentDto(payment: Payment, now: Date): PaymentDto {
  const status = effectiveStatus(payment, now);
  return {
    id: payment.id,
    orderId: payment.orderId,
    amountIdr: Number(payment.amountIdr),
    status,
    method: payment.method,
    expiresAt: payment.expiresAt,
    paidAt: payment.paidAt,
    snapToken: status === 'PENDING' ? payment.snapToken : null,
  };
}
