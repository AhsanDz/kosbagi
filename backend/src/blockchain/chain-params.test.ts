import { describe, expect, it } from 'vitest';
import {
  expenseCategoryToUint8,
  formatChainPeriod,
  periodToUint32,
  positiveIntegerToUint256,
  roomNumberToUint16,
} from './chain-params.js';
import { PermanentJobError } from './errors.js';

describe('roomNumberToUint16', () => {
  it('K03 menjadi 3, K10 menjadi 10', () => {
    expect(roomNumberToUint16('K03')).toBe(3);
    expect(roomNumberToUint16('K10')).toBe(10);
    expect(roomNumberToUint16('K65535')).toBe(65_535);
  });

  it('menolak kamar 0, di luar uint16, dan format lain secara permanen', () => {
    for (const value of ['K0', 'K00', 'K65536', 'k03', 'A03', 'K', '3', 'K-1']) {
      expect(() => roomNumberToUint16(value)).toThrow(PermanentJobError);
    }
  });
});

describe('periodToUint32', () => {
  it('2026-11 menjadi 202611', () => {
    expect(periodToUint32('2026-11')).toBe(202_611);
    expect(periodToUint32('2027-01')).toBe(202_701);
  });

  it('menolak bulan dan tahun di luar aturan KosLedger', () => {
    for (const value of ['2026-00', '2026-13', '1999-12', '11-2026', '2026-1', '202611']) {
      expect(() => periodToUint32(value)).toThrow(PermanentJobError);
    }
  });
});

describe('positiveIntegerToUint256', () => {
  it('bilangan bulat positif menjadi bigint', () => {
    expect(positiveIntegerToUint256(1_500_000, 'Nominal')).toBe(1_500_000n);
  });

  it('menolak nol, negatif, pecahan, dan angka di atas batas aman JavaScript', () => {
    for (const value of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN]) {
      expect(() => positiveIntegerToUint256(value, 'Nominal')).toThrow('Nominal harus bilangan bulat positif.');
    }
  });
});

describe('expenseCategoryToUint8', () => {
  it('kode kategori 1 sampai 5 dikirim apa adanya', () => {
    for (const code of [1, 2, 3, 4, 5]) expect(expenseCategoryToUint8(code)).toBe(code);
  });

  it('menolak di luar uint8 dan pecahan secara permanen', () => {
    for (const value of [-1, 256, 1.5, Number.NaN]) {
      expect(() => expenseCategoryToUint8(value)).toThrow(PermanentJobError);
    }
  });
});

describe('formatChainPeriod', () => {
  it('202611 menjadi 2026-11', () => {
    expect(formatChainPeriod(202_611)).toBe('2026-11');
    expect(formatChainPeriod(202_701n)).toBe('2027-01');
  });
});
