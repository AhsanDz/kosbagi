import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { computeSignature, isValidSignature } from './signature.js';

const serverKey = 'SB-Mid-server-kunci-rekaan';
const fields = { order_id: 'RENT-SMR01-K03-2026-11', status_code: '200', gross_amount: '1500000.00' };
const signature = computeSignature(fields, serverKey);

describe('computeSignature', () => {
  it('sesuai rumus SHA-512(order_id + status_code + gross_amount + server key)', () => {
    const manual = createHash('sha512')
      .update('RENT-SMR01-K03-2026-11' + '200' + '1500000.00' + serverKey)
      .digest('hex');

    expect(signature).toBe(manual);
    expect(signature).toHaveLength(128);
  });

  it('memakai gross_amount apa adanya: format lain menghasilkan hash lain', () => {
    expect(computeSignature({ ...fields, gross_amount: '1500000' }, serverKey)).not.toBe(signature);
  });
});

describe('isValidSignature', () => {
  it('menerima signature yang benar', () => {
    expect(isValidSignature(fields, signature, serverKey)).toBe(true);
  });

  it.each([
    ['order_id', { ...fields, order_id: 'RENT-SMR01-K03-2026-10' }],
    ['status_code', { ...fields, status_code: '201' }],
    ['gross_amount', { ...fields, gross_amount: '1.00' }],
  ])('menolak bila %s diubah', (_name, changed) => {
    expect(isValidSignature(changed, signature, serverKey)).toBe(false);
  });

  it('menolak signature dari server key lain', () => {
    expect(isValidSignature(fields, computeSignature(fields, 'SB-Mid-server-lain'), serverKey)).toBe(false);
  });

  it('menolak signature dengan panjang berbeda tanpa melempar error', () => {
    expect(isValidSignature(fields, 'pendek', serverKey)).toBe(false);
    expect(isValidSignature(fields, '', serverKey)).toBe(false);
  });
});
