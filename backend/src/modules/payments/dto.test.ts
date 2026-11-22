import { describe, expect, it } from 'vitest';
import { effectiveStatus } from './dto.js';

const now = new Date('2026-11-18T03:00:00.000Z');
const later = new Date('2026-11-18T03:05:00.000Z');
const earlier = new Date('2026-11-18T02:55:00.000Z');

describe('effectiveStatus', () => {
  it('percobaan yang menerima uang tanpa melunasi apa pun tetap terbaca PAID', () => {
    for (const status of ['PAID', 'DUPLICATE_PAID', 'UNFULFILLED', 'PAID_AFTER_CLOSE'] as const) {
      expect(effectiveStatus({ status, expiresAt: earlier }, now)).toBe('PAID');
    }
  });

  it('PENDING yang lewat batas bayar dibaca EXPIRED', () => {
    expect(effectiveStatus({ status: 'PENDING', expiresAt: later }, now)).toBe('PENDING');
    expect(effectiveStatus({ status: 'PENDING', expiresAt: earlier }, now)).toBe('EXPIRED');
    expect(effectiveStatus({ status: 'FAILED', expiresAt: later }, now)).toBe('FAILED');
    expect(effectiveStatus({ status: 'EXPIRED', expiresAt: later }, now)).toBe('EXPIRED');
  });
});
