import { describe, expect, it } from 'vitest';
import { bigIntReplacer } from './json.js';

describe('bigIntReplacer', () => {
  it('mengubah nominal rupiah BigInt menjadi number', () => {
    const body = { amountIdr: 1_500_000n, valuationIdr: 1_800_000_000n, rooms: [{ monthlyRentIdr: 1_500_000n }] };
    expect(JSON.parse(JSON.stringify(body, bigIntReplacer))).toEqual({
      amountIdr: 1_500_000,
      valuationIdr: 1_800_000_000,
      rooms: [{ monthlyRentIdr: 1_500_000 }],
    });
  });

  it('mengirim BigInt di luar batas aman number sebagai string', () => {
    const wei = 2n ** 64n;
    expect(JSON.stringify({ wei }, bigIntReplacer)).toBe('{"wei":"18446744073709551616"}');
  });

  it('tidak mengubah tipe data lain', () => {
    const body = { text: 'Kos Sumbersari 01', count: 10, ok: true, empty: null };
    expect(JSON.stringify(body, bigIntReplacer)).toBe(JSON.stringify(body));
  });
});
