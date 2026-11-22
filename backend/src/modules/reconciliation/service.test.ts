import { describe, expect, it, vi } from 'vitest';
import type { TransactionStatus } from '../payments/midtrans.js';
import { buildReport, onlyMismatches, ReportCache, summarize } from './service.js';
import type { ChainLogRecord, ReconciliationChainReader } from './sources.js';
import { chainReference } from './sources.js';
import { buyFact, rentFact, TX_HASH } from './testing.js';
import type { ReconciliationReport } from './types.js';

const CHECKED_AT = new Date('2026-11-18T14:00:00.000Z');

function status(transaction_status: string, gross_amount: string): TransactionStatus {
  return { status_code: transaction_status === 'settlement' ? '200' : '201', transaction_status, gross_amount };
}

/** Tiga order seperti frame rekonsiliasi: K03 cocok, K07 kedaluwarsa (cocok), K08 gagal dicatat (selisih). */
function scenario() {
  const facts = [
    rentFact(),
    rentFact({ orderId: 'RENT-SMR01-K07-2026-11', status: 'EXPIRED', job: null }),
    rentFact({
      orderId: 'RENT-SMR01-K08-2026-11',
      job: { status: 'FAILED', txHash: null, blockNumber: null, lastError: 'nonce has already been used' },
    }),
  ];
  const midtransAnswers: Record<string, TransactionStatus> = {
    'RENT-SMR01-K03-2026-11': status('settlement', '1500000.00'),
    'RENT-SMR01-K07-2026-11': status('expire', '1500000.00'),
    'RENT-SMR01-K08-2026-11': status('settlement', '1500000.00'),
  };
  const recordedRefs = new Map<string, ChainLogRecord>([
    [chainReference('RENT-SMR01-K03-2026-11'), { amount: 1_500_000n, to: null, txHash: TX_HASH, blockNumber: 42 }],
  ]);
  const chain: ReconciliationChainReader = {
    rentRecord: async (ref) => recordedRefs.get(ref) ?? null,
    treasuryTransfer: async () => null,
  };
  return {
    facts,
    deps: {
      loadFacts: vi.fn(async () => facts),
      midtrans: { getTransactionStatus: vi.fn(async (orderId: string) => midtransAnswers[orderId] ?? null) },
      chain,
      chainId: 31_337,
      now: () => CHECKED_AT,
    },
  };
}

describe('buildReport', () => {
  it('membandingkan setiap order dan menghitung ringkasan', async () => {
    const { deps } = scenario();
    const report = await buildReport('2026-11', deps);

    expect(deps.loadFacts).toHaveBeenCalledWith('2026-11');
    expect(deps.midtrans.getTransactionStatus).toHaveBeenCalledTimes(3);
    expect(report.period).toBe('2026-11');
    expect(report.summary).toEqual({ total: 3, matched: 2, mismatched: 1, checkedAt: CHECKED_AT });
    expect(report.rows.map((row) => [row.orderId, row.result])).toEqual([
      ['RENT-SMR01-K03-2026-11', 'MATCH'],
      ['RENT-SMR01-K07-2026-11', 'MATCH'],
      ['RENT-SMR01-K08-2026-11', 'MISMATCH'],
    ]);
  });

  it('periode tanpa order menghasilkan laporan kosong tanpa memanggil Midtrans', async () => {
    const { deps } = scenario();
    deps.loadFacts.mockResolvedValueOnce([]);
    const report = await buildReport('2026-12', deps);

    expect(report.summary).toEqual({ total: 0, matched: 0, mismatched: 0, checkedAt: CHECKED_AT });
    expect(deps.midtrans.getTransactionStatus).not.toHaveBeenCalled();
  });

  it('pembelian token ikut dicek ke KosToken', async () => {
    const { deps } = scenario();
    const purchase = buyFact({ status: 'EXPIRED', job: null });
    deps.loadFacts.mockResolvedValueOnce([purchase]);
    const transfer = vi.spyOn(deps.chain, 'treasuryTransfer');
    const report = await buildReport('2026-11', deps);

    expect(transfer).toHaveBeenCalledWith(chainReference(purchase.orderId), null);
    expect(report.rows[0]).toMatchObject({ kind: 'BUY', midtrans: { status: 'not_found' }, result: 'MATCH' });
  });
});

describe('onlyMismatches dan summarize', () => {
  it('menyaring baris tanpa mengubah ringkasan', async () => {
    const { deps } = scenario();
    const report = onlyMismatches(await buildReport('2026-11', deps));

    expect(report.rows.map((row) => row.orderId)).toEqual(['RENT-SMR01-K08-2026-11']);
    expect(report.summary.total).toBe(3);
  });

  it('ringkasan kosong', () => {
    expect(summarize([], CHECKED_AT)).toEqual({ total: 0, matched: 0, mismatched: 0, checkedAt: CHECKED_AT });
  });
});

describe('ReportCache', () => {
  const report = (period: string): ReconciliationReport => ({
    period,
    summary: { total: 0, matched: 0, mismatched: 0, checkedAt: CHECKED_AT },
    rows: [],
  });

  it('memakai laporan yang sama selama umurnya belum habis', async () => {
    let clock = 0;
    const cache = new ReportCache(30_000, () => clock);
    const build = vi.fn(async () => report('2026-11'));

    await cache.get('2026-11', build);
    clock = 29_999;
    await cache.get('2026-11', build);
    expect(build).toHaveBeenCalledTimes(1);

    clock = 30_000;
    await cache.get('2026-11', build);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('Periksa ulang (refresh) selalu menyusun laporan baru', async () => {
    const cache = new ReportCache(30_000, () => 0);
    const build = vi.fn(async () => report('2026-11'));

    await cache.get('2026-11', build);
    await cache.get('2026-11', build, { refresh: true });
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('permintaan bersamaan menunggu laporan yang sama', async () => {
    const cache = new ReportCache(30_000, () => 0);
    let finish: (value: ReconciliationReport) => void = () => {};
    const build = vi.fn(() => new Promise<ReconciliationReport>((resolve) => (finish = resolve)));

    const first = cache.get('2026-11', build);
    const second = cache.get('2026-11', build);
    finish(report('2026-11'));

    expect(await first).toBe(await second);
    expect(build).toHaveBeenCalledTimes(1);
  });

  it('periode berbeda disimpan terpisah', async () => {
    const cache = new ReportCache(30_000, () => 0);
    const build = vi.fn(async () => report('x'));
    await cache.get('2026-11', build);
    await cache.get('2026-12', build);
    expect(build).toHaveBeenCalledTimes(2);
  });

  it('laporan yang gagal tidak disimpan', async () => {
    const cache = new ReportCache(30_000, () => 0);
    const failing = vi.fn(async (): Promise<ReconciliationReport> => {
      throw new Error('basis data mati');
    });
    await expect(cache.get('2026-11', failing)).rejects.toThrow('basis data mati');

    const build = vi.fn(async () => report('2026-11'));
    await cache.get('2026-11', build);
    expect(build).toHaveBeenCalledTimes(1);
  });
});
