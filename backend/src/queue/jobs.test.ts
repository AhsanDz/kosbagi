import { keccak256, toUtf8Bytes } from 'ethers';
import { describe, expect, it } from 'vitest';
import { parseJobPayload, paymentReference } from './jobs.js';

const paymentRef = paymentReference('RENT-SMR01-K03-2026-11');
const recordRent = { propertyCode: 'SMR01', roomNumber: 'K03', period: '2026-11', amountIdr: 1_500_000, paymentRef };

describe('paymentReference', () => {
  it('sama dengan keccak256 dari order_id', () => {
    expect(paymentRef).toBe(keccak256(toUtf8Bytes('RENT-SMR01-K03-2026-11')));
    expect(paymentRef).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('berbeda untuk percobaan ulang', () => {
    expect(paymentReference('RENT-SMR01-K03-2026-11-2')).not.toBe(paymentRef);
  });
});

describe('parseJobPayload', () => {
  it('menerima isi job yang sah', () => {
    expect(parseJobPayload('RECORD_RENT', recordRent)).toEqual(recordRent);
    expect(parseJobPayload('CLOSE_PERIOD', { propertyCode: 'SMR01', period: '2026-11' })).toBeTruthy();
    expect(
      parseJobPayload('WHITELIST_KYC', { walletAddress: `0x${'a'.repeat(40)}`, approved: true }),
    ).toBeTruthy();
  });

  it('menolak field di luar kontrak, sehingga data pribadi tidak bisa ikut', () => {
    expect(() => parseJobPayload('RECORD_RENT', { ...recordRent, tenantName: 'Sari Wulandari' })).toThrow();
  });

  it('menolak isi yang formatnya salah', () => {
    expect(() => parseJobPayload('RECORD_RENT', { ...recordRent, period: '2026-13' })).toThrow();
    expect(() => parseJobPayload('RECORD_RENT', { ...recordRent, amountIdr: 0 })).toThrow();
    expect(() => parseJobPayload('RECORD_RENT', { ...recordRent, paymentRef: '0x123' })).toThrow();
    expect(() => parseJobPayload('TRANSFER_TOKENS', { propertyCode: 'SMR01' })).toThrow();
  });
});
