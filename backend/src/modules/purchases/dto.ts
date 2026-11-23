// Bentuk data pesanan token yang dikirim ke frontend. Tanpa akses basis data, jadi mudah diuji.
import type { Prisma, TokenPurchase } from '../../generated/prisma/client.js';
import { type ChainJobDto, latestChainTransaction, toChainJobDto } from '../../lib/chain-status.js';
import { type PaymentDto, toPaymentDto } from '../payments/dto.js';

export const purchaseInclude = {
  payments: { orderBy: { attempt: 'desc' }, include: { outboxJob: { include: latestChainTransaction } } },
} satisfies Prisma.TokenPurchaseInclude;

export type PurchaseWithPayments = Prisma.TokenPurchaseGetPayload<{ include: typeof purchaseInclude }>;

export type PurchaseDtoStatus = TokenPurchase['status'];

export interface PurchaseDto {
  id: string;
  /** Nomor pesanan, sama dengan order_id percobaan pertama, mis. BUY-SMR01-0003. */
  orderNumber: string | null;
  tokenAmount: number;
  amountIdr: number;
  status: PurchaseDtoStatus;
  /** Batas bayar, sekaligus batas token disisihkan untuk pesanan ini. */
  reservedUntil: Date | null;
  createdAt: Date;
  payment: PaymentDto | null;
  /** Pemindahan token dari perbendaharaan (transferFromTreasury). Null selama belum lunas. */
  transfer: ChainJobDto | null;
}

/**
 * Status yang dilihat investor. Pesanan yang melewati reservedUntil dibaca kedaluwarsa walau
 * notifikasi expire belum tiba, sama seperti percobaan pembayaran.
 */
export function effectivePurchaseStatus(
  purchase: Pick<TokenPurchase, 'status' | 'reservedUntil'>,
  now: Date,
): PurchaseDtoStatus {
  if (purchase.status === 'PENDING_PAYMENT' && purchase.reservedUntil !== null && purchase.reservedUntil <= now) {
    return 'EXPIRED';
  }
  return purchase.status;
}

export function toPurchaseDto(purchase: PurchaseWithPayments, now: Date): PurchaseDto {
  const paid = purchase.payments.find((payment) => payment.status === 'PAID');
  const displayed = paid ?? purchase.payments[0] ?? null;
  return {
    id: purchase.id,
    orderNumber: purchase.orderNumber,
    tokenAmount: purchase.tokenAmount,
    amountIdr: Number(purchase.amountIdr),
    status: effectivePurchaseStatus(purchase, now),
    reservedUntil: purchase.reservedUntil,
    createdAt: purchase.createdAt,
    payment: displayed ? toPaymentDto(displayed, now) : null,
    transfer: purchase.status === 'PAID' ? toChainJobDto(paid?.outboxJob) : null,
  };
}
