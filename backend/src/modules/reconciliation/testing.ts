// Pembuat data uji untuk test modul rekonsiliasi. Tidak dipakai kode aplikasi.
import type { ChainFact, DatabaseFact, MidtransFact } from './types.js';

export const RENT_IDR = 1_500_000n;
export const TOKEN_PRICE_IDR = 100_000n;
export const WALLET = '0x1111111111111111111111111111111111111111';
export const TX_HASH = `0x${'ab'.repeat(32)}`;

export function rentFact(overrides: Partial<DatabaseFact> = {}): DatabaseFact {
  return {
    orderId: 'RENT-SMR01-K03-2026-11',
    kind: 'RENT',
    status: 'PAID',
    amountIdr: RENT_IDR,
    createdAt: new Date('2026-11-05T03:00:00.000Z'),
    subject: {
      propertyCode: 'SMR01',
      roomNumber: 'K03',
      period: '2026-11',
      tokenAmount: null,
      tokenPriceIdr: null,
      walletAddress: null,
    },
    job: { status: 'RECORDED', txHash: TX_HASH, blockNumber: 42, lastError: null },
    anomalies: [],
    ...overrides,
  };
}

export function buyFact(overrides: Partial<DatabaseFact> = {}): DatabaseFact {
  return {
    orderId: 'BUY-SMR01-0003',
    kind: 'BUY',
    status: 'PAID',
    amountIdr: 100n * TOKEN_PRICE_IDR,
    createdAt: new Date('2026-11-06T03:00:00.000Z'),
    subject: {
      propertyCode: 'SMR01',
      roomNumber: null,
      period: null,
      tokenAmount: 100,
      tokenPriceIdr: TOKEN_PRICE_IDR,
      walletAddress: WALLET,
    },
    job: { status: 'RECORDED', txHash: TX_HASH, blockNumber: 43, lastError: null },
    anomalies: [],
    ...overrides,
  };
}

export function settlement(amountIdr: bigint = RENT_IDR, overrides: Partial<MidtransFact> = {}): MidtransFact {
  return { status: 'settlement', grossAmountIdr: amountIdr, paid: true, error: null, ...overrides };
}

export function unpaid(status: string, amountIdr: bigint | null = RENT_IDR): MidtransFact {
  return { status, grossAmountIdr: amountIdr, paid: false, error: null };
}

export function recorded(amountIdr: bigint = RENT_IDR, overrides: Partial<ChainFact> = {}): ChainFact {
  return {
    status: 'RECORDED',
    amountIdr,
    tokenAmount: null,
    recipient: null,
    txHash: TX_HASH,
    blockNumber: 42,
    error: null,
    ...overrides,
  };
}

export const notRecorded: ChainFact = {
  status: 'NONE',
  amountIdr: null,
  tokenAmount: null,
  recipient: null,
  txHash: null,
  blockNumber: null,
  error: null,
};
