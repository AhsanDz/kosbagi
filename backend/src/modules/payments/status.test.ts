import { describe, expect, it } from 'vitest';
import type { TransactionStatus } from './midtrans.js';
import { classifyTransaction, parseGrossAmount } from './status.js';

function status(overrides: Partial<TransactionStatus>): TransactionStatus {
  return { status_code: '200', transaction_status: 'settlement', gross_amount: '1500000.00', ...overrides };
}

describe('classifyTransaction', () => {
  it.each([
    ['settlement', 'PAID'],
    ['capture', 'PAID'],
    ['pending', 'WAITING'],
    ['authorize', 'WAITING'],
    ['expire', 'EXPIRED'],
    ['cancel', 'FAILED'],
    ['deny', 'FAILED'],
    ['failure', 'FAILED'],
    ['refund', 'IGNORED'],
    ['partial_refund', 'IGNORED'],
    ['chargeback', 'IGNORED'],
    ['status_baru_dari_midtrans', 'IGNORED'],
  ])('%s menjadi %s', (transactionStatus, verdict) => {
    expect(classifyTransaction(status({ transaction_status: transactionStatus }))).toBe(verdict);
  });

  it('menerima settlement tanpa fraud_status, seperti pada beberapa metode', () => {
    expect(classifyTransaction(status({ fraud_status: undefined }))).toBe('PAID');
  });

  it('tidak menganggap lunas bila fraud_status bukan accept', () => {
    expect(classifyTransaction(status({ transaction_status: 'capture', fraud_status: 'challenge' }))).toBe('WAITING');
    expect(classifyTransaction(status({ fraud_status: 'deny' }))).toBe('WAITING');
  });

  it('tidak menganggap lunas bila status_code bukan 200', () => {
    expect(classifyTransaction(status({ status_code: '201' }))).toBe('WAITING');
  });
});

describe('parseGrossAmount', () => {
  it('membaca nominal dua desimal dan tanpa desimal', () => {
    expect(parseGrossAmount('1500000.00')).toBe(1_500_000n);
    expect(parseGrossAmount('1500000')).toBe(1_500_000n);
  });

  it('menolak pecahan dan teks yang bukan nominal', () => {
    expect(parseGrossAmount('1500000.50')).toBeNull();
    expect(parseGrossAmount('-1500000.00')).toBeNull();
    expect(parseGrossAmount('1,500,000')).toBeNull();
    expect(parseGrossAmount('')).toBeNull();
  });
});
