import { describe, expect, it } from 'vitest';
import { formatMidtransTime, wibYear } from './wib.js';

describe('formatMidtransTime', () => {
  it('mengubah UTC ke WIB dengan akhiran +0700', () => {
    expect(formatMidtransTime(new Date('2026-11-05T03:00:09.500Z'))).toBe('2026-11-05 10:00:09 +0700');
  });

  it('ikut berganti hari setelah digeser 7 jam', () => {
    expect(formatMidtransTime(new Date('2026-11-05T20:30:00.000Z'))).toBe('2026-11-06 03:30:00 +0700');
  });
});

describe('wibYear', () => {
  it('memakai tahun WIB, bukan tahun UTC', () => {
    expect(wibYear(new Date('2026-12-31T16:59:59.000Z'))).toBe(2026);
    expect(wibYear(new Date('2026-12-31T17:00:00.000Z'))).toBe(2027);
  });
});
