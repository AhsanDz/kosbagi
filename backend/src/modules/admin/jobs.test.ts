import { describe, expect, it } from 'vitest';
import { filterJobs, jobReference, type AdminJobDto } from './jobs.js';

const HASH = `0x${'4d1e'.padEnd(64, '0')}`;

describe('jobReference', () => {
  it('order_id untuk sewa dan pembelian, hash nota, periode, dan alamat dompet', () => {
    expect(jobReference({ type: 'RECORD_RENT', payload: {}, dedupeKey: 'record-rent:x' }, 'RENT-SMR01-K08-2026-11')).toBe('RENT-SMR01-K08-2026-11');
    expect(jobReference({ type: 'TRANSFER_TOKENS', payload: {}, dedupeKey: 'transfer-tokens:x' }, 'BUY-SMR01-0003')).toBe('BUY-SMR01-0003');
    expect(
      jobReference(
        { type: 'RECORD_EXPENSE', payload: { propertyCode: 'SMR01', period: '2026-11', category: 4, amountIdr: 300_000, receiptHash: HASH }, dedupeKey: 'x' },
        null,
      ),
    ).toBe(HASH);
    expect(jobReference({ type: 'CLOSE_PERIOD', payload: { propertyCode: 'SMR01', period: '2026-11' }, dedupeKey: 'x' }, null)).toBe('2026-11');
    expect(
      jobReference({ type: 'WHITELIST_KYC', payload: { walletAddress: '0x7c4E2a9b6F03d1e8A55c90B4f2D6e1a8C3b719B2', approved: true }, dedupeKey: 'x' }, null),
    ).toBe('0x7c4E2a9b6F03d1e8A55c90B4f2D6e1a8C3b719B2');
  });

  it('isi rusak atau tanpa pembayaran: dedupeKey', () => {
    expect(jobReference({ type: 'CLOSE_PERIOD', payload: { rusak: true }, dedupeKey: 'close-period:SMR01:2026-11' }, null)).toBe('close-period:SMR01:2026-11');
    expect(jobReference({ type: 'RECORD_RENT', payload: {}, dedupeKey: 'record-rent:b' }, null)).toBe('record-rent:b');
  });
});

describe('filterJobs', () => {
  it('tab Menunggu atau gagal hanya QUEUED, PENDING, dan FAILED', () => {
    const jobs = (['QUEUED', 'PENDING', 'RECORDED', 'FAILED'] as const).map((status) => ({ id: status, status }) as AdminJobDto);
    expect(filterJobs(jobs, 'open').map((job) => job.status)).toEqual(['QUEUED', 'PENDING', 'FAILED']);
    expect(filterJobs(jobs, 'all')).toHaveLength(4);
  });
});
