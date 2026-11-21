import { describe, expect, it } from 'vitest';
import { effectivePurchaseStatus, type PurchaseWithPayments, toPurchaseDto } from './dto.js';

const now = new Date('2026-11-09T07:22:00.000Z');
const later = new Date('2026-11-09T07:25:00.000Z');
const earlier = new Date('2026-11-09T07:20:00.000Z');

type PaymentRow = PurchaseWithPayments['payments'][number];

function payment(overrides: Partial<PaymentRow> = {}): PaymentRow {
  return {
    id: 'pay-1',
    orderId: 'BUY-SMR01-0003',
    billId: null,
    tokenPurchaseId: 'purchase-1',
    attempt: 1,
    amountIdr: 10_000_000n,
    status: 'PENDING',
    method: null,
    bank: null,
    snapToken: 'snap-token',
    snapRedirectUrl: 'https://snap.test',
    providerStatus: null,
    providerTransactionId: null,
    expiresAt: later,
    paidAt: null,
    createdAt: earlier,
    updatedAt: earlier,
    outboxJob: null,
    ...overrides,
  };
}

function purchase(overrides: Partial<PurchaseWithPayments> = {}): PurchaseWithPayments {
  return {
    id: 'purchase-1',
    offeringId: 'offering-1',
    investorId: 'investor-1',
    orderNumber: 'BUY-SMR01-0003',
    tokenAmount: 100,
    amountIdr: 10_000_000n,
    status: 'PENDING_PAYMENT',
    reservedUntil: later,
    createdAt: earlier,
    updatedAt: earlier,
    payments: [payment()],
    ...overrides,
  };
}

describe('effectivePurchaseStatus', () => {
  it('menunggu bayar selama sisihan berlaku, lalu terbaca kedaluwarsa', () => {
    expect(effectivePurchaseStatus({ status: 'PENDING_PAYMENT', reservedUntil: later }, now)).toBe('PENDING_PAYMENT');
    expect(effectivePurchaseStatus({ status: 'PENDING_PAYMENT', reservedUntil: now }, now)).toBe('EXPIRED');
  });

  it('status lain apa adanya', () => {
    expect(effectivePurchaseStatus({ status: 'PAID', reservedUntil: earlier }, now)).toBe('PAID');
    expect(effectivePurchaseStatus({ status: 'FAILED', reservedUntil: later }, now)).toBe('FAILED');
  });
});

describe('toPurchaseDto', () => {
  it('pesanan menunggu bayar membawa token Snap, tanpa transfer', () => {
    expect(toPurchaseDto(purchase(), now)).toMatchObject({
      id: 'purchase-1',
      orderNumber: 'BUY-SMR01-0003',
      tokenAmount: 100,
      amountIdr: 10_000_000,
      status: 'PENDING_PAYMENT',
      reservedUntil: later,
      payment: { orderId: 'BUY-SMR01-0003', status: 'PENDING', snapToken: 'snap-token' },
      transfer: null,
    });
  });

  it('lunas: transfer PENDING sampai worker mencatat, lalu RECORDED dengan hash', () => {
    const paid = payment({ status: 'PAID', paidAt: earlier, snapToken: null });
    expect(toPurchaseDto(purchase({ status: 'PAID', payments: [paid] }), now).transfer).toEqual({
      status: 'PENDING',
      txHash: null,
      blockNumber: null,
    });

    const outboxJob = {
      chainTransactions: [{ status: 'RECORDED', txHash: '0x6a20', blockNumber: 7_149_031n }],
    } as unknown as PaymentRow['outboxJob'];
    const recorded = toPurchaseDto(purchase({ status: 'PAID', payments: [{ ...paid, outboxJob }] }), now);
    expect(recorded.transfer).toEqual({ status: 'RECORDED', txHash: '0x6a20', blockNumber: 7_149_031 });
  });

  it('menampilkan percobaan yang melunasi walau ada percobaan lebih baru', () => {
    const settling = payment({ id: 'pay-1', status: 'PAID', paidAt: earlier });
    const newer = payment({ id: 'pay-2', attempt: 2, orderId: 'BUY-SMR01-0003-2', status: 'DUPLICATE_PAID' });

    expect(toPurchaseDto(purchase({ status: 'PAID', payments: [newer, settling] }), now).payment?.id).toBe('pay-1');
  });

  it('sisihan lewat tanpa notifikasi: pesanan dan percobaan terbaca kedaluwarsa', () => {
    const dto = toPurchaseDto(purchase({ reservedUntil: earlier, payments: [payment({ expiresAt: earlier })] }), now);

    expect(dto).toMatchObject({ status: 'EXPIRED', payment: { status: 'EXPIRED', snapToken: null } });
  });
});
