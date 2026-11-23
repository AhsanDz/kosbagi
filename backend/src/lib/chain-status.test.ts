import { describe, expect, it } from 'vitest';
import { toChainJobAdminDto, toChainJobDto } from './chain-status.js';

describe('toChainJobDto', () => {
  it('tanpa job atau tanpa transaksi: PENDING', () => {
    expect(toChainJobDto(null)).toEqual({ status: 'PENDING', txHash: null, blockNumber: null });
    expect(toChainJobDto({ chainTransactions: [] })).toEqual({ status: 'PENDING', txHash: null, blockNumber: null });
  });

  it('membaca transaksi terbaru dan mengubah nomor blok menjadi number', () => {
    const job = { chainTransactions: [{ status: 'RECORDED' as const, txHash: '0xabc', blockNumber: 7_148_220n, lastError: null }] };
    expect(toChainJobDto(job)).toEqual({ status: 'RECORDED', txHash: '0xabc', blockNumber: 7_148_220 });
  });

  it('versi admin menambah pesan galat terakhir', () => {
    const job = { chainTransactions: [{ status: 'FAILED' as const, txHash: null, blockNumber: null, lastError: 'RPC tidak menjawab.' }] };
    expect(toChainJobAdminDto(job)).toEqual({ status: 'FAILED', txHash: null, blockNumber: null, lastError: 'RPC tidak menjawab.' });
    expect(toChainJobAdminDto(null).lastError).toBeNull();
  });
});
