import { describe, expect, it } from 'vitest';
import { formatMidtransTime, wibDate, wibDaysSince, wibYear } from './wib.js';

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

describe('wibDate', () => {
  it('memakai tanggal WIB', () => {
    expect(wibDate(new Date('2026-11-13T16:59:59.000Z'))).toBe('2026-11-13');
    expect(wibDate(new Date('2026-11-13T17:00:00.000Z'))).toBe('2026-11-14');
  });
});

describe('wibDaysSince', () => {
  it('menghitung hari kalender WIB sejak jatuh tempo', () => {
    // 18 Nov 2026 pukul 10.00 WIB, jatuh tempo 10 Nov: lewat 8 hari.
    expect(wibDaysSince('2026-11-10', new Date('2026-11-18T03:00:00.000Z'))).toBe(8);
    expect(wibDaysSince('2026-11-10', new Date('2026-11-10T16:59:00.000Z'))).toBe(0);
    expect(wibDaysSince('2026-11-10', new Date('2026-11-09T10:00:00.000Z'))).toBe(-1);
  });
});
