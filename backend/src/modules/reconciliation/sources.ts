// Membaca dua sumber luar untuk rekonsiliasi: API status Midtrans dan kontrak di Sepolia.
//
// Keduanya hanya dibaca. Setiap panggilan dibatasi konkurensi dan batas waktunya (limit.ts), dan
// galat satu order tidak menggagalkan order lain: order itu ditandai `error` atau `ERROR` dan
// muncul sebagai Selisih dengan alasannya. Pesan galat tidak pernah memuat URL RPC atau server key.
import { type Contract, type EventLog, id as keccak256OfText, type Log } from 'ethers';
import type { KosContracts } from '../../blockchain/contracts.js';
import { MidtransUnavailableError, type TransactionStatus } from '../payments/midtrans.js';
import { midtransErrorFact, toMidtransFact } from './compare.js';
import { mapWithConcurrency, TimeoutError, withTimeout } from './limit.js';
import type { ChainFact, DatabaseFact, MidtransFact } from './types.js';

/** Batas pemeriksaan satu laporan. */
export interface CheckBudget {
  /** Panggilan bersamaan paling banyak per sumber. */
  concurrency: number;
  /** Batas tunggu satu panggilan. */
  perCallTimeoutMs: number;
  /** Waktu (ms epoch) setelah itu panggilan baru tidak dimulai lagi. */
  deadline: number;
}

/** Bagian dari klien Midtrans yang dipakai rekonsiliasi. Klien asli: `midtrans` di payments/midtrans.ts. */
export interface MidtransStatusReader {
  getTransactionStatus(orderId: string): Promise<TransactionStatus | null>;
}

/** Satu log kontrak yang sudah diurai. */
export interface ChainLogRecord {
  /** Nominal rupiah (RentRecorded) atau jumlah token (TreasuryTransfer). Null bila log tidak ditemukan. */
  amount: bigint | null;
  /** Penerima token (TreasuryTransfer). */
  to: string | null;
  txHash: string | null;
  blockNumber: number | null;
}

/** Fungsi baca kontrak yang dipakai rekonsiliasi. Antarmuka terpisah supaya mudah ditiru di test. */
export interface ReconciliationChainReader {
  /** Catatan recordRent untuk referensi ini, atau null bila belum tercatat. */
  rentRecord(paymentRef: string, hintBlock: number | null): Promise<ChainLogRecord | null>;
  /** Catatan transferFromTreasury untuk referensi ini, atau null bila belum terpakai. */
  treasuryTransfer(purchaseRef: string, hintBlock: number | null): Promise<ChainLogRecord | null>;
}

/** Referensi on-chain sama dengan yang ditulis backend ke job: keccak256 dari teks order_id. */
export function chainReference(orderId: string): string {
  return keccak256OfText(orderId);
}

function errorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && /^[A-Z_]{2,40}$/.test(code) ? code : null;
}

/** Pesan galat Midtrans yang aman ditampilkan: tanpa isi jawaban mentah. */
function midtransErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError || error instanceof MidtransUnavailableError) return error.message;
  return 'API status Midtrans tidak bisa dihubungi.';
}

/** Pesan galat RPC yang aman ditampilkan: hanya kode galat ethers, tanpa URL RPC yang memuat API key. */
function chainErrorMessage(error: unknown): string {
  if (error instanceof TimeoutError) return error.message;
  const code = errorCode(error);
  return code ? `RPC menolak permintaan baca (${code})` : 'RPC tidak bisa dihubungi';
}

/** Pesan untuk order yang tidak sempat dicek karena batas waktu seluruh laporan habis. */
const BUDGET_EXHAUSTED = 'batas waktu pemeriksaan habis sebelum order ini dicek';

function remaining(budget: CheckBudget, now: () => number): number {
  return Math.min(budget.perCallTimeoutMs, budget.deadline - now());
}

/** Menanyakan status setiap order ke Midtrans. */
export async function checkMidtrans(
  orderIds: readonly string[],
  reader: MidtransStatusReader,
  budget: CheckBudget,
  now: () => number = Date.now,
): Promise<Map<string, MidtransFact>> {
  const facts = await mapWithConcurrency(orderIds, budget.concurrency, async (orderId) => {
    const timeLeft = remaining(budget, now);
    if (timeLeft <= 0) return midtransErrorFact(BUDGET_EXHAUSTED);
    try {
      const status = await withTimeout(
        reader.getTransactionStatus(orderId),
        timeLeft,
        'API status Midtrans tidak menjawab dalam batas waktu.',
      );
      return toMidtransFact(status);
    } catch (error) {
      return midtransErrorFact(midtransErrorMessage(error));
    }
  });
  return new Map(orderIds.map((orderId, index) => [orderId, facts[index] as MidtransFact]));
}

const NOT_RECORDED: ChainFact = {
  status: 'NONE',
  amountIdr: null,
  tokenAmount: null,
  recipient: null,
  txHash: null,
  blockNumber: null,
  error: null,
};

async function readChainFact(fact: DatabaseFact, reader: ReconciliationChainReader): Promise<ChainFact> {
  const reference = chainReference(fact.orderId);
  const hintBlock = fact.job?.blockNumber ?? null;

  if (fact.kind === 'RENT') {
    const record = await reader.rentRecord(reference, hintBlock);
    if (!record) return NOT_RECORDED;
    return { ...NOT_RECORDED, status: 'RECORDED', amountIdr: record.amount, txHash: record.txHash, blockNumber: record.blockNumber };
  }

  const record = await reader.treasuryTransfer(reference, hintBlock);
  if (!record) return NOT_RECORDED;
  const price = fact.subject.tokenPriceIdr;
  return {
    ...NOT_RECORDED,
    status: 'RECORDED',
    tokenAmount: record.amount,
    amountIdr: record.amount !== null && price !== null ? record.amount * price : null,
    recipient: record.to,
    txHash: record.txHash,
    blockNumber: record.blockNumber,
  };
}

/** Membaca catatan setiap order di kontrak. */
export async function checkChain(
  facts: readonly DatabaseFact[],
  reader: ReconciliationChainReader,
  budget: CheckBudget,
  now: () => number = Date.now,
): Promise<Map<string, ChainFact>> {
  const results = await mapWithConcurrency(facts, budget.concurrency, async (fact): Promise<ChainFact> => {
    const timeLeft = remaining(budget, now);
    if (timeLeft <= 0) return { ...NOT_RECORDED, status: 'ERROR', error: BUDGET_EXHAUSTED };
    try {
      return await withTimeout(readChainFact(fact, reader), timeLeft, 'RPC Sepolia tidak menjawab dalam batas waktu');
    } catch (error) {
      return { ...NOT_RECORDED, status: 'ERROR', error: chainErrorMessage(error) };
    }
  });
  return new Map(facts.map((fact, index) => [fact.orderId, results[index] as ChainFact]));
}

type LocateFn = () => Promise<{ blockNumber: number } | null>;

function isEventLog(log: EventLog | Log): log is EventLog {
  return 'args' in log;
}

/**
 * Pembaca kontrak berbasis KosContracts (src/blockchain, jalur 3). Status tercatat dibaca dari
 * fungsi view kontrak; nominal dan tx hash dibaca dari log event di blok yang dicatat worker,
 * atau dicari mundur lewat KosContracts bila blok itu tidak diketahui.
 */
export class KosContractsChainReader implements ReconciliationChainReader {
  constructor(private readonly contracts: KosContracts) {}

  async rentRecord(paymentRef: string, hintBlock: number | null): Promise<ChainLogRecord | null> {
    if (!(await this.contracts.isPaymentRefRecorded(paymentRef))) return null;
    const ledger = this.contracts.ledger;
    const log = await this.findLog(ledger, ledger.filters.RentRecorded!(null, null, paymentRef), hintBlock, () =>
      this.contracts.findRentRecorded(paymentRef),
    );
    // RentRecorded(period, room, paymentRef, amount)
    return {
      amount: log ? (log.args[3] as bigint) : null,
      to: null,
      txHash: log?.transactionHash ?? null,
      blockNumber: log?.blockNumber ?? null,
    };
  }

  async treasuryTransfer(purchaseRef: string, hintBlock: number | null): Promise<ChainLogRecord | null> {
    if (!(await this.contracts.isPurchaseRefUsed(purchaseRef))) return null;
    const token = this.contracts.token;
    const log = await this.findLog(token, token.filters.TreasuryTransfer!(purchaseRef), hintBlock, () =>
      this.contracts.findTreasuryTransfer(purchaseRef),
    );
    // TreasuryTransfer(purchaseRef, to, amount)
    return {
      amount: log ? (log.args[2] as bigint) : null,
      to: log ? String(log.args[1]) : null,
      txHash: log?.transactionHash ?? null,
      blockNumber: log?.blockNumber ?? null,
    };
  }

  /**
   * Log pertama yang cocok di blok petunjuk. Bila petunjuk tidak ada atau tidak berisi log itu
   * (mis. kontrak sudah di-deploy ulang), lokasi log dicari lewat KosContracts.
   */
  private async findLog(
    contract: Contract,
    filter: Parameters<Contract['queryFilter']>[0],
    hintBlock: number | null,
    locate: LocateFn,
  ): Promise<EventLog | null> {
    const atBlock = async (block: number) =>
      ((await contract.queryFilter(filter, block, block)) as Array<EventLog | Log>).find(isEventLog) ?? null;

    if (hintBlock !== null) {
      const found = await atBlock(hintBlock);
      if (found) return found;
    }
    const located = await locate();
    if (!located || located.blockNumber === hintBlock) return null;
    return atBlock(located.blockNumber);
  }
}
