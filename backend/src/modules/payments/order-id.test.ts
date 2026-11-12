import { describe, expect, it } from 'vitest';
import { buildRentOrderId } from './order-id.js';

const parts = { propertyCode: 'SMR01', roomNumber: 'K03', period: '2026-11' };

describe('buildRentOrderId', () => {
  it('percobaan pertama tanpa sufiks', () => {
    expect(buildRentOrderId({ ...parts, attempt: 1 })).toBe('RENT-SMR01-K03-2026-11');
  });

  it('percobaan ulang bersufiks nomor percobaan', () => {
    expect(buildRentOrderId({ ...parts, attempt: 2 })).toBe('RENT-SMR01-K03-2026-11-2');
    expect(buildRentOrderId({ ...parts, attempt: 3 })).toBe('RENT-SMR01-K03-2026-11-3');
  });
});
