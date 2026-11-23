import { id, Transaction, Wallet } from 'ethers';
import { beforeEach, describe, expect, it } from 'vitest';
import { type ChainCall, executeChainCall, type ExecutionContext, type ExecutorProvider } from './chain-executor.js';
import type { RecordedEvent } from './contracts.js';
import { kosLedgerInterface } from './contracts.js';
import { PermanentJobError, RetryableJobError } from './errors.js';
import { connectionRefused, FakeChain, HARDHAT_OPERATOR_KEY, MemoryChainStore, revertError } from './testing/fakes.js';

const LEDGER = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const PAYMENT_REF = id('RENT-SMR01-K03-2026-11');
const JOB_ID = 'outbox-1';

let chain: FakeChain;
let store: MemoryChainStore;
let done: boolean;
let existing: RecordedEvent | null;
const signer = new Wallet(HARDHAT_OPERATOR_KEY);

function rentCall(overrides: Partial<ChainCall> = {}): ChainCall {
  return {
    reference: PAYMENT_REF,
    to: LEDGER,
    contractInterface: kosLedgerInterface,
    method: 'recordRent',
    args: [3, 202611, 1_500_000n, PAYMENT_REF],
    isDone: async () => done,
    findExistingRecord: async () => existing,
    revertActions: { PaymentRefAlreadyRecorded: 'DONE' },
    ...overrides,
  };
}

function context(attempt = 1): ExecutionContext {
  return {
    store,
    provider: chain.provider as unknown as ExecutorProvider,
    signer,
    chainId: 31_337,
    outboxJobId: JOB_ID,
    attempt,
    timing: { pollIntervalMs: 1, receiptTimeoutMs: 20, rpcRetryDelaysMs: [0, 0] },
    secrets: ['http://127.0.0.1:8545/v2/kunci-rahasia-uji'],
    logger: { info: () => {}, warn: () => {} },
    sleep: async () => {},
  };
}

beforeEach(() => {
  chain = new FakeChain();
  store = new MemoryChainStore();
  done = false;
  existing = null;
});

describe('executeChainCall: transaksi baru', () => {
  it('mengirim recordRent, lalu mencatat tx hash dan nomor blok', async () => {
    const result = await executeChainCall(rentCall(), context());

    expect(chain.broadcasts).toHaveLength(1);
    const tx = chain.broadcasts[0] as Transaction;
    expect(result).toEqual({ status: 'RECORDED', outcome: 'SENT', txHash: tx.hash, blockNumber: 101 });
    expect(store.transactions).toEqual([
      expect.objectContaining({ reference: PAYMENT_REF, txHash: tx.hash, blockNumber: 101n, status: 'RECORDED', attempts: 1, lastError: null }),
    ]);
  });

  it('isi transaksi: fungsi dan argumen, chain id, nonce pending, gas estimasi + 20%, EIP-1559', async () => {
    await executeChainCall(rentCall(), context());

    const tx = chain.broadcasts[0] as Transaction;
    expect(tx.to).toBe(LEDGER);
    expect(tx.from).toBe(signer.address);
    expect(tx.chainId).toBe(31_337n);
    expect(tx.nonce).toBe(7);
    expect(tx.gasLimit).toBe(120_000n);
    expect(tx.type).toBe(2);
    const decoded = kosLedgerInterface.decodeFunctionData('recordRent', tx.data);
    expect([...decoded]).toEqual([3n, 202611n, 1_500_000n, PAYMENT_REF]);
  });

  it('menyimpan tx hash sebelum transaksi disiarkan', async () => {
    let savedBeforeBroadcast: string | null = null;
    chain.onBroadcast = (tx) => {
      savedBeforeBroadcast = store.transactions[0]?.txHash ?? null;
      expect(tx.hash).toBe(savedBeforeBroadcast);
    };

    await executeChainCall(rentCall(), context());
    expect(savedBeforeBroadcast).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('menunggu receipt sampai transaksi masuk blok', async () => {
    chain.broadcastMode = 'pending';
    chain.onBroadcast = (tx) => chain.mineAfterPolls.set(tx.hash as string, 3);

    const result = await executeChainCall(rentCall(), context());
    expect(result.outcome).toBe('SENT');
    expect(store.transactions[0]?.status).toBe('RECORDED');
  });

  it('transaksi yang belum masuk blok dalam batas waktu: diulang nanti, baris tetap PENDING dengan hash-nya', async () => {
    chain.broadcastMode = 'pending';

    await expect(executeChainCall(rentCall(), context())).rejects.toBeInstanceOf(RetryableJobError);
    const [row] = store.transactions;
    expect(row).toMatchObject({ status: 'PENDING', lastError: expect.stringContaining('belum masuk blok') });
    expect(row?.txHash).toBe(chain.broadcasts[0]?.hash);
  });
});

describe('executeChainCall: idempotensi', () => {
  it('efek sudah ada di kontrak: tidak mengirim transaksi, memakai tx asal dari log', async () => {
    done = true;
    existing = { txHash: `0x${'ab'.repeat(32)}`, blockNumber: 42 };

    const result = await executeChainCall(rentCall(), context());

    expect(chain.broadcasts).toHaveLength(0);
    expect(chain.calls).not.toContain('call');
    expect(result).toEqual({ status: 'RECORDED', outcome: 'ALREADY_ON_CHAIN', txHash: existing.txHash, blockNumber: 42 });
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED', txHash: existing.txHash, blockNumber: 42n })]);
  });

  it('efek sudah ada tetapi tx asalnya tidak ditemukan: tetap tercatat, tanpa tx hash', async () => {
    done = true;

    const result = await executeChainCall(rentCall(), context());
    expect(result).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: null, blockNumber: null });
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED', txHash: null })]);
  });

  it('job yang sudah RECORDED di basis data selesai tanpa satu pun panggilan RPC', async () => {
    await executeChainCall(rentCall(), context());
    chain.calls.length = 0;

    const again = await executeChainCall(rentCall(), context(2));
    expect(again.outcome).toBe('ALREADY_RECORDED');
    expect(chain.calls).toEqual([]);
    expect(store.transactions).toHaveLength(1);
  });

  it('transaksi percobaan sebelumnya yang akhirnya masuk blok dipakai, tidak dikirim ulang', async () => {
    chain.broadcastMode = 'pending';
    await expect(executeChainCall(rentCall(), context(1))).rejects.toBeInstanceOf(RetryableJobError);
    const firstHash = chain.broadcasts[0]?.hash as string;
    chain.mine(firstHash);

    const result = await executeChainCall(rentCall(), context(2));
    expect(result).toMatchObject({ outcome: 'PREVIOUS_TX', txHash: firstHash });
    expect(chain.broadcasts).toHaveLength(1);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED', attempts: 2 })]);
  });

  it('transaksi percobaan sebelumnya yang masih di mempool ditunggu, bukan dikirim ulang', async () => {
    chain.broadcastMode = 'pending';
    await expect(executeChainCall(rentCall(), context(1))).rejects.toBeInstanceOf(RetryableJobError);
    const firstHash = chain.broadcasts[0]?.hash as string;
    chain.mineAfterPolls.set(firstHash, 2);

    const result = await executeChainCall(rentCall(), context(2));
    expect(result.outcome).toBe('PREVIOUS_TX');
    expect(chain.broadcasts).toHaveLength(1);
  });

  it('transaksi yang hilang dari jaringan ditandai FAILED, lalu dikirim transaksi baru', async () => {
    chain.broadcastMode = 'drop';
    await expect(executeChainCall(rentCall(), context(1))).rejects.toBeInstanceOf(RetryableJobError);
    chain.broadcastMode = 'mine';
    // Biaya gas jaringan berubah, jadi transaksi pengganti punya hash lain.
    chain.maxFeePerGas += 1_000_000_000n;

    const result = await executeChainCall(rentCall(), context(2));
    expect(result.outcome).toBe('SENT');
    expect(chain.broadcasts).toHaveLength(2);
    const rows = store.transactions;
    expect(rows.map((row) => row.status)).toEqual(['FAILED', 'RECORDED']);
    expect(rows[0]?.lastError).toContain('tidak ditemukan di jaringan');
    expect(rows[1]?.txHash).toBe(chain.broadcasts[1]?.hash);
  });

  it('transaksi yang pernah ditandai gagal tetapi belakangan masuk blok tetap diakui', async () => {
    chain.broadcastMode = 'drop';
    await expect(executeChainCall(rentCall(), context(1))).rejects.toBeInstanceOf(RetryableJobError);
    // Percobaan kedua menandainya hilang, lalu kontrak sedang dijeda sehingga belum ada transaksi baru.
    chain.simulationError = revertError(kosLedgerInterface, 'EnforcedPause');
    await expect(executeChainCall(rentCall(), context(2))).rejects.toBeInstanceOf(RetryableJobError);
    const firstHash = chain.broadcasts[0]?.hash as string;
    expect(store.transactions[0]).toMatchObject({ status: 'FAILED', txHash: firstHash });

    chain.mine(firstHash);
    const result = await executeChainCall(rentCall(), context(3));
    expect(result).toMatchObject({ outcome: 'PREVIOUS_TX', txHash: firstHash });
    expect(chain.broadcasts).toHaveLength(1);
  });
});

describe('executeChainCall: revert dari kontrak', () => {
  it('PaymentRefAlreadyRecorded saat simulasi berarti selesai, tanpa transaksi', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'PaymentRefAlreadyRecorded', [PAYMENT_REF]);

    const result = await executeChainCall(rentCall(), context());
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    expect(chain.broadcasts).toHaveLength(0);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED' })]);
  });

  it('RentAlreadyRecorded gagal permanen tanpa membayar gas', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'RentAlreadyRecorded', [3, 202611]);

    const error = await executeChainCall(rentCall(), context()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PermanentJobError);
    expect((error as Error).message).toContain('anomali pembayaran ganda');
    expect(chain.broadcasts).toHaveLength(0);
    expect(store.transactions).toEqual([
      expect.objectContaining({ status: 'FAILED', txHash: null, lastError: expect.stringContaining('referensi lain') }),
    ]);
  });

  it('PeriodAlreadyClosed gagal permanen dan meminta admin menangani', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'PeriodAlreadyClosed', [202611]);
    await expect(executeChainCall(rentCall(), context())).rejects.toThrow(/ditangani admin/);
  });

  it('EnforcedPause diulang nanti; percobaan berikutnya memakai baris yang sama', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'EnforcedPause');
    await expect(executeChainCall(rentCall(), context(1))).rejects.toThrow(RetryableJobError);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'PENDING', lastError: expect.stringContaining('dijeda') })]);

    chain.simulationError = null;
    await executeChainCall(rentCall(), context(2));
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED', attempts: 2 })]);
  });

  it('revert tanpa data yang bisa dibaca diulang, bukan dianggap permanen', async () => {
    chain.simulationError = Object.assign(revertError(kosLedgerInterface, 'EnforcedPause'), { data: '0x' });
    await expect(executeChainCall(rentCall(), context())).rejects.toThrow(/tanpa alasan yang bisa dibaca/);
  });

  it('transaksi revert di blok lalu ternyata sudah tercatat oleh transaksi lain: selesai', async () => {
    chain.nextReceiptStatus = 0;
    chain.onBroadcast = () => {
      done = true;
    };

    const result = await executeChainCall(rentCall(), context());
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    // Transaksi yang revert tetap tercatat sebagai riwayat, statusnya diwakili baris terbaru.
    expect(store.transactions.map((row) => row.status)).toEqual(['FAILED', 'RECORDED']);
    expect(store.transactions[0]).toMatchObject({ blockNumber: 101n, lastError: expect.stringContaining('revert di blok') });
  });

  it('transaksi revert di blok karena alasan permanen: FAILED dengan nomor blok dan alasannya', async () => {
    chain.nextReceiptStatus = 0;
    chain.onBroadcast = () => {
      chain.simulationError = revertError(kosLedgerInterface, 'PeriodAlreadyClosed', [202611]);
    };

    await expect(executeChainCall(rentCall(), context())).rejects.toBeInstanceOf(PermanentJobError);
    expect(store.transactions[0]).toMatchObject({ status: 'FAILED', blockNumber: 101n, lastError: expect.stringContaining('ditutup') });
  });
});

describe('executeChainCall: gangguan RPC', () => {
  it('kegagalan RPC sesaat diulang cepat di dalam percobaan yang sama', async () => {
    chain.failNextCalls = 2;

    const result = await executeChainCall(rentCall(), context());
    expect(result.outcome).toBe('SENT');
  });

  it('RPC mati terus: RetryableJobError dengan pesan tanpa URL RPC', async () => {
    chain.failNextCalls = 100;

    const error = await executeChainCall(rentCall(), context()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RetryableJobError);
    expect((error as Error).message).not.toContain('kunci-rahasia-uji');
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('siaran gagal dan transaksi tidak dikenal jaringan: baris FAILED, percobaan berikutnya mengirim baru', async () => {
    chain.broadcastMode = 'fail';
    await expect(executeChainCall(rentCall(), context(1))).rejects.toThrow(/tidak terkirim/);
    expect(store.transactions[0]).toMatchObject({ status: 'FAILED' });

    chain.broadcastMode = 'mine';
    await executeChainCall(rentCall(), context(2));
    // Nonce, biaya, dan isi sama sehingga hash-nya sama: baris lama dipakai lagi, bukan diduplikasi.
    // Siaran yang gagal juga diulang cepat di dalam percobaan pertama, dengan transaksi yang sama.
    expect(new Set(chain.broadcasts.map((tx) => tx.hash)).size).toBe(1);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED', attempts: 2 })]);
  });

  it('siaran membalas error padahal transaksi sudah sampai: tetap ditunggu sampai tercatat', async () => {
    chain.broadcastMode = 'fail-but-known';

    const result = await executeChainCall(rentCall(), context());
    expect(result.outcome).toBe('SENT');
    expect(store.transactions).toHaveLength(1);
  });

  it('saldo ETH operator tidak cukup: pesan jelas dan diulang nanti', async () => {
    chain.provider.broadcastTransaction = async () => {
      const { makeError } = await import('ethers');
      throw makeError('insufficient funds', 'INSUFFICIENT_FUNDS', { transaction: {} });
    };

    await expect(executeChainCall(rentCall(), context())).rejects.toThrow('Saldo ETH dompet operator tidak cukup untuk gas.');
  });

  it('gangguan saat menunggu receipt tidak menggagalkan penantian', async () => {
    chain.broadcastMode = 'pending';
    chain.onBroadcast = (tx) => {
      chain.mineAfterPolls.set(tx.hash as string, 1);
      chain.failNextCalls = 1;
      chain.failWith = () => connectionRefused();
    };

    await expect(executeChainCall(rentCall(), context())).resolves.toMatchObject({ outcome: 'SENT' });
  });
});
