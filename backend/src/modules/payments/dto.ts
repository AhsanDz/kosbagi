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
 * notifikasi expire dari Midtrans belum tiba. DUPLICATE_PAID hanya beda di catatan internal.
 */
export function effectiveStatus(payment: Pick<Payment, 'status' | 'expiresAt'>, now: Date): PaymentDtoStatus {
  if (payment.status === 'DUPLICATE_PAID') return 'PAID';
  if (payment.status === 'PENDING' && payment.expiresAt <= now) return 'EXPIRED';
  return payment.status;
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
