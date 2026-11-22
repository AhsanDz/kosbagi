import { describe, expect, it } from 'vitest';
import { formatRupiah, formatSen, periodLabel } from './format-id.js';

describe('format Bahasa Indonesia', () => {
  it('periodLabel', () => {
    expect(periodLabel('2026-11')).toBe('November 2026');
    expect(periodLabel('2027-01')).toBe('Januari 2027');
    expect(() => periodLabel('2026-13')).toThrow();
  });

  it('formatRupiah memakai titik ribuan', () => {
    expect(formatRupiah(13_500_000n)).toBe('Rp13.500.000');
    expect(formatRupiah(0)).toBe('Rp0');
    expect(formatRupiah(-2_700_000)).toBe('-Rp2.700.000');
  });

  it('formatSen: 43875 sen menjadi Rp438,75; nilai bulat tanpa koma', () => {
    expect(formatSen(43_875n)).toBe('Rp438,75');
    expect(formatSen(39_000)).toBe('Rp390');
    expect(formatSen(105)).toBe('Rp1,05');
  });
});
