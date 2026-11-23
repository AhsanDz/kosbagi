import { describe, expect, it } from 'vitest';
import { isOrderIdTakenAttempt, MAX_ORDER_ID_SKIPS, ORDER_ID_TAKEN, SNAP_IN_FLIGHT_MS } from './service.js';
import { MIDTRANS_TIMEOUT_MS } from './midtrans.js';

describe('isOrderIdTakenAttempt', () => {
  it('hanya percobaan FAILED dengan penanda ORDER_ID_TAKEN', () => {
    expect(isOrderIdTakenAttempt({ status: 'FAILED', providerStatus: ORDER_ID_TAKEN })).toBe(true);
    expect(isOrderIdTakenAttempt({ status: 'FAILED', providerStatus: 'cancel' })).toBe(false);
    expect(isOrderIdTakenAttempt({ status: 'FAILED', providerStatus: null })).toBe(false);
    expect(isOrderIdTakenAttempt({ status: 'PENDING', providerStatus: ORDER_ID_TAKEN })).toBe(false);
  });
});

describe('batas percobaan', () => {
  it('percobaan tanpa token dianggap masih diproses selama dua panggilan Midtrans', () => {
    expect(SNAP_IN_FLIGHT_MS).toBeGreaterThan(MIDTRANS_TIMEOUT_MS * 2);
  });

  it('paling banyak lima order_id terpakai dilewati dalam satu permintaan', () => {
    expect(MAX_ORDER_ID_SKIPS).toBe(5);
  });
});
