import { id as keccak256OfText } from 'ethers';
import { describe, expect, it, vi } from 'vitest';
import { MidtransUnavailableError, type TransactionStatus } from '../payments/midtrans.js';
import {
  type ChainLogRecord,
  chainReference,
  checkChain,
  checkMidtrans,
  type CheckBudget,
  type ReconciliationChainReader,
} from './sources.js';
import { buyFact, rentFact, TOKEN_PRICE_IDR, TX_HASH, WALLET } from './testing.js';

const budget = (overrides: Partial<CheckBudget> = {}): CheckBudget => ({
  concurrency: 2,
  perCallTimeoutMs: 1_000,
  deadline: Date.now() + 5_000,
  ...overrides,
});

const settled: TransactionStatus = { status_code: '200', transaction_status: 'settlement', gross_amount: '1500000.00' };

describe('chainReference', () => {
  it('sama dengan referensi yang ditulis backend ke job: keccak256 teks order_id', () => {
    expect(chainReference('RENT-SMR01-K03-2026-11')).toBe(keccak256OfText('RENT-SMR01-K03-2026-11'));
  });
});

describe('checkMidtrans', () => {
  it('mengubah setiap jawaban API status menjadi fakta Midtrans', async () => {
    const answers: Record<string, TransactionStatus | null> = { A: settled, B: null };
    const facts = await checkMidtrans(['A', 'B'], { getTransactionStatus: async (orderId) => answers[orderId] ?? null }, budget());

    expect(facts.get('A')).toEqual({ status: 'settlement', grossAmountIdr: 1_500_000n, paid: true, error: null });
    expect(facts.get('B')).toMatchObject({ status: 'not_found', paid: false });
  });

  it('galat satu order tidak menggagalkan order lain', async () => {
    const reader = {
      getTransactionStatus: vi.fn(async (orderId: string) => {
        if (orderId === 'B') throw new MidtransUnavailableError('Status transaksi gagal dicek.');
        if (orderId === 'C') throw new Error('isi jawaban mentah yang tidak boleh tampil');
        return settled;
      }),
    };
    const facts = await checkMidtrans(['A', 'B', 'C'], reader, budget());

    expect(facts.get('A')?.paid).toBe(true);
    expect(facts.get('B')).toMatchObject({ status: 'error', error: 'Status transaksi gagal dicek.' });
    expect(facts.get('C')).toMatchObject({ status: 'error', error: 'API status Midtrans tidak bisa dihubungi.' });
  });

  it('panggilan yang menggantung dihentikan oleh batas waktu', async () => {
    const facts = await checkMidtrans(['A'], { getTransactionStatus: () => new Promise(() => {}) }, budget({ perCallTimeoutMs: 20 }));
    expect(facts.get('A')).toMatchObject({ status: 'error', error: 'API status Midtrans tidak menjawab dalam batas waktu.' });
  });

  it('setelah batas waktu total lewat, panggilan baru tidak dimulai', async () => {
    const reader = { getTransactionStatus: vi.fn(async () => settled) };
    const facts = await checkMidtrans(['A', 'B'], reader, budget({ deadline: Date.now() - 1 }));

    expect(reader.getTransactionStatus).not.toHaveBeenCalled();
    expect(facts.get('B')?.status).toBe('error');
  });

  it('menghormati batas konkurensi', async () => {
    let running = 0;
    let peak = 0;
    const reader = {
      getTransactionStatus: async () => {
        running += 1;
        peak = Math.max(peak, running);
        await new Promise((resolve) => setTimeout(resolve, 5));
        running -= 1;
        return settled;
      },
    };
    await checkMidtrans(['A', 'B', 'C', 'D', 'E'], reader, budget({ concurrency: 2 }));
    expect(peak).toBe(2);
  });
});

function fakeChain(records: { rent?: ChainLogRecord | null; transfer?: ChainLogRecord | null; fail?: unknown }) {
  return {
    rentRecord: vi.fn(async () => {
      if (records.fail) throw records.fail;
      return records.rent ?? null;
    }),
    treasuryTransfer: vi.fn(async () => {
      if (records.fail) throw records.fail;
      return records.transfer ?? null;
    }),
  } satisfies ReconciliationChainReader;
}

describe('checkChain', () => {
  it('sewa: membaca catatan dengan referensi order dan blok dari job sebagai petunjuk', async () => {
    const reader = fakeChain({ rent: { amount: 1_500_000n, to: null, txHash: TX_HASH, blockNumber: 42 } });
    const fact = rentFact();
    const facts = await checkChain([fact], reader, budget());

    expect(reader.rentRecord).toHaveBeenCalledWith(keccak256OfText(fact.orderId), 42);
    expect(facts.get(fact.orderId)).toEqual({
      status: 'RECORDED',
      amountIdr: 1_500_000n,
      tokenAmount: null,
      recipient: null,
      txHash: TX_HASH,
      blockNumber: 42,
      error: null,
    });
  });

  it('pembelian: jumlah token dikali harga token menjadi nominal rupiah', async () => {
    const reader = fakeChain({ transfer: { amount: 100n, to: WALLET, txHash: TX_HASH, blockNumber: 43 } });
    const facts = await checkChain([buyFact()], reader, budget());

    expect(facts.get('BUY-SMR01-0003')).toMatchObject({
      status: 'RECORDED',
      tokenAmount: 100n,
      amountIdr: 100n * TOKEN_PRICE_IDR,
      recipient: WALLET,
    });
  });

  it('belum tercatat', async () => {
    const facts = await checkChain([rentFact({ job: null })], fakeChain({ rent: null }), budget());
    expect(facts.get('RENT-SMR01-K03-2026-11')?.status).toBe('NONE');
  });

  it('galat RPC hanya menampilkan kode galat, tidak pernah URL RPC', async () => {
    const failure = Object.assign(new Error('could not connect to https://eth-sepolia.example/v2/RAHASIA'), {
      code: 'SERVER_ERROR',
    });
    const facts = await checkChain([rentFact()], fakeChain({ fail: failure }), budget());
    const fact = facts.get('RENT-SMR01-K03-2026-11');

    expect(fact).toMatchObject({ status: 'ERROR', error: 'RPC menolak permintaan baca (SERVER_ERROR)' });
    expect(JSON.stringify(fact)).not.toContain('RAHASIA');
  });

  it('galat tanpa kode', async () => {
    const facts = await checkChain([rentFact()], fakeChain({ fail: new Error('https://rpc/RAHASIA') }), budget());
    expect(facts.get('RENT-SMR01-K03-2026-11')).toMatchObject({ status: 'ERROR', error: 'RPC tidak bisa dihubungi' });
  });
});
