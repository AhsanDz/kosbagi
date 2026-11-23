// Fungsi bantu periode dan urutan di database.ts. Kueri Prisma-nya diuji di
// reconciliation.integration.test.ts terhadap PostgreSQL sungguhan.
import { describe, expect, it } from 'vitest';
import { compareFacts, currentWibPeriod, isPeriod, wibMonthRange } from './database.js';

describe('periode', () => {
  it('menerima YYYY-MM dengan bulan 01 sampai 12 saja', () => {
    expect(isPeriod('2026-11')).toBe(true);
    expect(isPeriod('2026-13')).toBe(false);
    expect(isPeriod('2026-1')).toBe(false);
    expect(isPeriod('202611')).toBe(false);
  });

  it('periode berjalan mengikuti WIB, bukan zona server', () => {
    expect(currentWibPeriod(new Date('2026-11-30T16:59:59.000Z'))).toBe('2026-11');
    expect(currentWibPeriod(new Date('2026-11-30T17:00:00.000Z'))).toBe('2026-12');
  });

  it('rentang bulan dari pukul 00.00 WIB tanggal 1 sampai awal bulan berikutnya', () => {
    expect(wibMonthRange('2026-11')).toEqual({
      start: new Date('2026-10-31T17:00:00.000Z'),
      end: new Date('2026-11-30T17:00:00.000Z'),
    });
    expect(wibMonthRange('2026-12').end).toEqual(new Date('2026-12-31T17:00:00.000Z'));
    expect(() => wibMonthRange('2026-13')).toThrow(RangeError);
  });
});

describe('urutan baris', () => {
  it('sewa lebih dulu, lalu pembelian, masing-masing urut order_id', () => {
    const rows = [
      { kind: 'BUY' as const, orderId: 'BUY-SMR01-0004' },
      { kind: 'RENT' as const, orderId: 'RENT-SMR01-K10-2026-11' },
      { kind: 'RENT' as const, orderId: 'RENT-SMR01-K07-2026-11-2' },
      { kind: 'BUY' as const, orderId: 'BUY-SMR01-0003' },
      { kind: 'RENT' as const, orderId: 'RENT-SMR01-K07-2026-11' },
    ];
    expect(rows.sort(compareFacts).map((row) => row.orderId)).toEqual([
      'RENT-SMR01-K07-2026-11',
      'RENT-SMR01-K07-2026-11-2',
      'RENT-SMR01-K10-2026-11',
      'BUY-SMR01-0003',
      'BUY-SMR01-0004',
    ]);
  });
});
