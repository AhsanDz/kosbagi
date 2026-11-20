import { describe, expect, it } from 'vitest';
import { buildPurchaseOrderId, buildPurchaseOrderNumber, buildRentOrderId } from './order-id.js';

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

describe('order_id pembelian token', () => {
  it('nomor pesanan berawalan BUY- dengan empat digit urut', () => {
    expect(buildPurchaseOrderNumber('SMR01', 3)).toBe('BUY-SMR01-0003');
    expect(buildPurchaseOrderNumber('SMR01', 1234)).toBe('BUY-SMR01-1234');
  });

  it('percobaan ulang bersufiks seperti tagihan', () => {
    expect(buildPurchaseOrderId('BUY-SMR01-0003', 1)).toBe('BUY-SMR01-0003');
    expect(buildPurchaseOrderId('BUY-SMR01-0003', 2)).toBe('BUY-SMR01-0003-2');
  });
});
