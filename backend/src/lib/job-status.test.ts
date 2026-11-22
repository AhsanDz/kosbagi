import { describe, expect, it } from 'vitest';
import { toInvestorChainJobDto } from './chain-status.js';
import { investorChainStatus, isOpenFailure, jobState, loadJobStates, managerChainStatus } from './job-status.js';

const at = (iso: string) => new Date(iso);
const tx = (status: 'PENDING' | 'RECORDED' | 'FAILED', updatedAt = at('2026-11-14T03:00:00Z')) => ({
  status,
  txHash: status === 'FAILED' ? null : '0xabc',
  blockNumber: status === 'RECORDED' ? 7_300_000n : null,
  attempts: status === 'FAILED' ? 5 : 1,
  lastError: status === 'RECORDED' ? 'percobaan lama' : 'RPC tidak menjawab.',
  updatedAt,
});

describe('jobState', () => {
  it('tanpa transaksi chain: QUEUED, belum ada percobaan', () => {
    expect(jobState(null)).toEqual({ status: 'QUEUED', txHash: null, blockNumber: null, attempts: 0, lastError: null, updatedAt: null, resolved: false });
    expect(jobState({ chainTransactions: [], retries: [] }).status).toBe('QUEUED');
  });

  it('membaca transaksi terbaru; RECORDED tidak membawa pesan galat lama', () => {
    expect(jobState({ chainTransactions: [tx('RECORDED')], retries: [] })).toEqual({
      status: 'RECORDED',
      txHash: '0xabc',
      blockNumber: 7_300_000,
      attempts: 1,
      lastError: null,
      updatedAt: at('2026-11-14T03:00:00Z'),
      resolved: false,
    });
    expect(jobState({ chainTransactions: [tx('FAILED')], retries: [] })).toMatchObject({ status: 'FAILED', attempts: 5, lastError: 'RPC tidak menjawab.' });
  });

  it('Coba lagi setelah kegagalan terakhir: QUEUED sampai worker menulis hasil baru', () => {
    const failed = tx('FAILED', at('2026-11-14T03:00:00Z'));
    expect(jobState({ chainTransactions: [failed], retries: [{ requestedAt: at('2026-11-14T04:00:00Z') }] })).toMatchObject({
      status: 'QUEUED',
      attempts: 0,
      lastError: null,
    });
    // Worker gagal lagi sesudah Coba lagi: kembali FAILED.
    const again = tx('FAILED', at('2026-11-14T05:00:00Z'));
    expect(jobState({ chainTransactions: [again], retries: [{ requestedAt: at('2026-11-14T04:00:00Z') }] }).status).toBe('FAILED');
  });
});

describe('isOpenFailure', () => {
  it('hanya FAILED yang belum ditandai ditangani', () => {
    expect(isOpenFailure({ status: 'FAILED', resolved: false })).toBe(true);
    expect(isOpenFailure({ status: 'FAILED', resolved: true })).toBe(false);
    expect(isOpenFailure({ status: 'PENDING', resolved: false })).toBe(false);
  });
});

describe('pemetaan status per peran', () => {
  it('pengelola melihat Gagal; QUEUED dibaca Menunggu', () => {
    expect(['QUEUED', 'PENDING', 'RECORDED', 'FAILED'].map((status) => managerChainStatus(status as never))).toEqual([
      'PENDING',
      'PENDING',
      'RECORDED',
      'FAILED',
    ]);
  });

  it('investor tidak pernah melihat FAILED', () => {
    expect(['QUEUED', 'PENDING', 'RECORDED', 'FAILED'].map((status) => investorChainStatus(status as never))).toEqual([
      'PENDING',
      'PENDING',
      'RECORDED',
      'PENDING',
    ]);
    expect(toInvestorChainJobDto({ status: 'FAILED', txHash: null, blockNumber: null })).toEqual({ status: 'PENDING', txHash: null, blockNumber: null });
    expect(toInvestorChainJobDto({ status: 'RECORDED', txHash: '0x1', blockNumber: 9 }).status).toBe('RECORDED');
  });
});

describe('loadJobStates', () => {
  it('dua query berurutan; baris terbaru per job menang, job tanpa baris QUEUED', async () => {
    const calls: string[] = [];
    const db = {
      chainTransaction: {
        findMany: async () => {
          calls.push('chainTransaction');
          // Urut createdAt naik: baris lama FAILED lalu baris baru RECORDED untuk job-1.
          return [
            { outboxJobId: 'job-1', ...tx('FAILED') },
            { outboxJobId: 'job-1', ...tx('RECORDED') },
            { outboxJobId: 'job-2', ...tx('FAILED') },
          ];
        },
      },
      outboxJobRetry: {
        findMany: async () => {
          calls.push('outboxJobRetry');
          return [];
        },
      },
      outboxJobResolution: {
        findMany: async () => {
          calls.push('outboxJobResolution');
          return [{ id: 'r', outboxJobId: 'job-2' }];
        },
      },
    } as never;

    const states = await loadJobStates(db, ['job-1', 'job-2', 'job-3', 'job-1']);

    expect(calls).toEqual(['chainTransaction', 'outboxJobRetry', 'outboxJobResolution']);
    expect([...states.entries()].map(([id, state]) => [id, state.status, state.resolved])).toEqual([
      ['job-1', 'RECORDED', false],
      ['job-2', 'FAILED', true],
      ['job-3', 'QUEUED', false],
    ]);
    expect(await loadJobStates(db, [])).toEqual(new Map());
  });
});
