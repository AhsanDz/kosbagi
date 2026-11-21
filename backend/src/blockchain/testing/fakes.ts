// Tiruan untuk unit test layanan blockchain: basis data di memori dan jaringan Ethereum sederhana.
// Hanya dipakai file *.test.ts. File ini tidak mengimpor vitest, jadi aman ikut terkompilasi.
//
// FakeChain meniru perilaku RPC yang dipakai chain-executor.ts: simulasi (eth_call) yang bisa
// revert dengan custom error sungguhan dari ABI, nonce, siaran transaksi bertanda tangan, receipt,
// dan transaksi yang tertahan di mempool atau hilang.
import { type Interface, makeError, Transaction } from 'ethers';
import type { OutboxJob } from '../../generated/prisma/client.js';
import type { ChainStore, ChainTxChanges, ChainTxRecord, CustodialWalletRecord, NewChainTx } from '../store.js';

/** Private key akun #1 bawaan Hardhat (publik, khusus jaringan lokal). */
export const HARDHAT_OPERATOR_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
/** Mnemonic bawaan Hardhat (publik). */
export const HARDHAT_MNEMONIC = 'test test test test test test test test test test test junk';

export class MemoryChainStore implements ChainStore {
  readonly outboxJobs = new Map<string, OutboxJob>();
  readonly wallets: CustodialWalletRecord[] = [];
  private readonly rows: ChainTxRecord[] = [];
  private sequence = 0;

  /** Salinan semua baris, urut dibuat. */
  get transactions(): ChainTxRecord[] {
    return this.rows.map((row) => ({ ...row }));
  }

  addOutboxJob(job: Pick<OutboxJob, 'id' | 'type' | 'payload'> & Partial<OutboxJob>): OutboxJob {
    const row: OutboxJob = {
      dedupeKey: `uji:${job.id}`,
      paymentId: null,
      status: 'DISPATCHED',
      attempts: 0,
      lastError: null,
      dispatchedAt: new Date(0),
      createdAt: new Date(0),
      updatedAt: new Date(0),
      ...job,
    };
    this.outboxJobs.set(row.id, row);
    return row;
  }

  async findOutboxJob(id: string): Promise<OutboxJob | null> {
    return this.outboxJobs.get(id) ?? null;
  }

  async listTransactions(outboxJobId: string): Promise<ChainTxRecord[]> {
    return this.rows.filter((row) => row.outboxJobId === outboxJobId).map((row) => ({ ...row }));
  }

  async createTransaction(data: NewChainTx): Promise<ChainTxRecord> {
    this.assertUniqueHash(data.txHash ?? null, null);
    this.sequence += 1;
    const row: ChainTxRecord = {
      id: `ctx-${this.sequence}`,
      txHash: null,
      blockNumber: null,
      lastError: null,
      ...data,
      createdAt: new Date(this.sequence),
    };
    this.rows.push(row);
    return { ...row };
  }

  async updateTransaction(id: string, changes: ChainTxChanges): Promise<ChainTxRecord> {
    const row = this.rows.find((item) => item.id === id);
    if (!row) throw new Error(`Baris ${id} tidak ada`);
    if (changes.txHash !== undefined) this.assertUniqueHash(changes.txHash, id);
    Object.assign(row, changes);
    return { ...row };
  }

  async findCustodialWallet(address: string): Promise<CustodialWalletRecord | null> {
    return this.wallets.find((wallet) => wallet.address.toLowerCase() === address.toLowerCase()) ?? null;
  }

  /** Meniru constraint unik chain_transactions.tx_hash. */
  private assertUniqueHash(txHash: string | null, ownId: string | null): void {
    if (txHash && this.rows.some((row) => row.txHash === txHash && row.id !== ownId)) {
      throw new Error('Unique constraint failed on the fields: (`tx_hash`)');
    }
  }
}

export type BroadcastMode = 'mine' | 'pending' | 'drop' | 'fail' | 'fail-but-known';

interface MinedTx {
  status: 0 | 1;
  blockNumber: number;
}

/** Error CALL_EXCEPTION seperti yang dilempar ethers saat eth_call atau estimateGas revert. */
export function revertError(contractInterface: Interface, name: string, args: readonly unknown[] = []) {
  const data = contractInterface.encodeErrorResult(name, args);
  return makeError('execution reverted (unknown custom error)', 'CALL_EXCEPTION', {
    action: 'call',
    data,
    reason: null,
    transaction: { to: null, from: undefined, data: '0x' },
    invocation: null,
    revert: null,
  });
}

/** Error koneksi seperti dari fetch Node saat RPC mati. */
export function connectionRefused(url = 'http://127.0.0.1:8545/v2/kunci-rahasia-uji'): Error {
  return Object.assign(new Error(`connect ECONNREFUSED ${url}`), { code: 'ECONNREFUSED' });
}

export class FakeChain {
  blockNumber = 100;
  nonce = 7;
  gasEstimate = 100_000n;
  maxFeePerGas = 3_000_000_000n;
  /** Status receipt untuk transaksi berikutnya yang ditambang: 1 sukses, 0 revert. */
  nextReceiptStatus: 0 | 1 = 1;
  broadcastMode: BroadcastMode = 'mine';
  /** Error yang dilempar eth_call dan estimateGas; null berarti simulasi lolos. */
  simulationError: unknown = null;
  /** Error untuk N panggilan RPC berikutnya (semua metode), mis. RPC mati sesaat. */
  failNextCalls = 0;
  failWith: () => unknown = () => connectionRefused();
  /** Transaksi pending yang ditambang setelah sekian kali receipt-nya ditanya. */
  mineAfterPolls = new Map<string, number>();

  readonly mined = new Map<string, MinedTx>();
  readonly pending = new Set<string>();
  readonly broadcasts: Transaction[] = [];
  readonly calls: string[] = [];
  /** Dipanggil tepat sebelum transaksi disiarkan; dipakai test untuk memeriksa urutan tulis. */
  onBroadcast: (tx: Transaction) => void = () => {};

  private guard(method: string): void {
    this.calls.push(method);
    if (this.failNextCalls > 0) {
      this.failNextCalls -= 1;
      throw this.failWith();
    }
  }

  /** Menambang transaksi yang sedang pending. */
  mine(hash: string, status: 0 | 1 = 1): void {
    this.pending.delete(hash);
    this.blockNumber += 1;
    this.mined.set(hash, { status, blockNumber: this.blockNumber });
  }

  readonly provider = {
    call: async () => {
      this.guard('call');
      if (this.simulationError) throw this.simulationError;
      return '0x';
    },
    estimateGas: async () => {
      this.guard('estimateGas');
      if (this.simulationError) throw this.simulationError;
      return this.gasEstimate;
    },
    getTransactionCount: async () => {
      this.guard('getTransactionCount');
      return this.nonce;
    },
    getFeeData: async () => {
      this.guard('getFeeData');
      return { gasPrice: null, maxFeePerGas: this.maxFeePerGas, maxPriorityFeePerGas: 1_000_000_000n };
    },
    broadcastTransaction: async (signed: string) => {
      this.guard('broadcastTransaction');
      const tx = Transaction.from(signed);
      this.onBroadcast(tx);
      this.broadcasts.push(tx);
      const hash = tx.hash as string;
      switch (this.broadcastMode) {
        case 'mine':
          this.nonce += 1;
          this.mine(hash, this.nextReceiptStatus);
          break;
        case 'pending':
          this.nonce += 1;
          this.pending.add(hash);
          break;
        case 'drop':
          break;
        case 'fail':
          throw makeError('failed to broadcast', 'SERVER_ERROR', { request: undefined as never });
        case 'fail-but-known':
          this.nonce += 1;
          this.mine(hash, this.nextReceiptStatus);
          throw makeError('already known', 'UNKNOWN_ERROR', {});
      }
      return { hash };
    },
    getTransactionReceipt: async (hash: string) => {
      this.guard('getTransactionReceipt');
      const remaining = this.mineAfterPolls.get(hash);
      if (remaining !== undefined) {
        if (remaining <= 0) {
          this.mineAfterPolls.delete(hash);
          this.mine(hash, this.nextReceiptStatus);
        } else this.mineAfterPolls.set(hash, remaining - 1);
      }
      const mined = this.mined.get(hash);
      return mined ? { hash, status: mined.status, blockNumber: mined.blockNumber } : null;
    },
    getTransaction: async (hash: string) => {
      this.guard('getTransaction');
      return this.pending.has(hash) || this.mined.has(hash) ? { hash } : null;
    },
  };
}
