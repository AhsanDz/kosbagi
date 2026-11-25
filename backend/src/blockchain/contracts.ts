// Klien KosToken dan KosLedger dari ABI hasil `npm run export-abi` di folder contracts/.
// File ABI di src/blockchain/abi/ tidak diedit manual; test "Ekspor ABI" di contracts/ gagal bila
// isinya tertinggal dari kontrak.
//
// Kelas di sini hanya membaca (view). Transaksi tulis tidak dikirim lewat Contract ethers, tetapi
// lewat chain-executor.ts yang menandatangani transaksi sendiri supaya tx hash tersimpan sebelum
// transaksi disiarkan.
//
// P4 menambah fungsi baca untuk biaya dan tutup periode (KosLedgerPeriodReader). Antarmuka
// KosContractsReader dari P3 sengaja tidak diubah.
import { type AbstractProvider, Contract, type EventLog, Interface, getAddress, type Log } from 'ethers';
import kosLedgerAbi from './abi/KosLedger.json' with { type: 'json' };
import kosTokenAbi from './abi/KosToken.json' with { type: 'json' };

export const kosTokenInterface = new Interface(kosTokenAbi);
export const kosLedgerInterface = new Interface(kosLedgerAbi);

/**
 * Seberapa jauh ke belakang log dicari saat mencari transaksi asal catatan yang sudah ada (±33 jam di
 * Sepolia, blok ±12 detik). Sama dengan batas rentang eth_getLogs Infura (10.000 blok per permintaan,
 * diuji 24 Nov 2026); rentang yang lebih panjang ditolak RPC sehingga pencarian selalu gagal.
 */
export const LOG_LOOKBACK_BLOCKS = 10_000;

export interface RecordedEvent {
  txHash: string;
  blockNumber: number;
}

/** Fungsi baca yang dipakai processor. Antarmuka terpisah supaya mudah ditiru di unit test. */
export interface KosContractsReader {
  readonly tokenAddress: string;
  readonly ledgerAddress: string;
  isPaymentRefRecorded(paymentRef: string): Promise<boolean>;
  isRentRecorded(room: number, period: number): Promise<boolean>;
  isKycApproved(account: string): Promise<boolean>;
  isPurchaseRefUsed(purchaseRef: string): Promise<boolean>;
  balanceOf(account: string): Promise<bigint>;
  /** Mencari transaksi yang mencatat sewa dengan referensi ini. Null bila tidak ditemukan atau RPC menolak. */
  findRentRecorded(paymentRef: string): Promise<RecordedEvent | null>;
  findTreasuryTransfer(purchaseRef: string): Promise<RecordedEvent | null>;
  findKycStatusUpdated(account: string, approved: boolean): Promise<RecordedEvent | null>;
}

/**
 * Isi `KosLedger.periods(period)`. Nominal dalam Rupiah, `valuePerTokenSen` dalam sen. Selama periode
 * terbuka hanya `grossRent` dan `totalExpenses` yang terisi; sisanya diisi `closePeriod`.
 */
export interface LedgerPeriod {
  grossRent: bigint;
  totalExpenses: bigint;
  platformFee: bigint;
  tax: bigint;
  netRent: bigint;
  totalSupply: bigint;
  valuePerTokenSen: bigint;
  snapshotBlock: bigint;
  closed: boolean;
}

/** Biaya yang tercatat, dibaca dari event `ExpenseRecorded`. */
export interface RecordedExpense extends RecordedEvent {
  /** Periode YYYYMM, mis. 202611. */
  period: number;
  category: number;
  amount: bigint;
}

/**
 * Fungsi baca KosLedger untuk job biaya dan tutup periode (progress 4). Dipisah dari
 * KosContractsReader supaya tiruan yang ditulis untuk antarmuka P3 tetap berlaku.
 */
export interface KosLedgerPeriodReader {
  isReceiptRecorded(receiptHash: string): Promise<boolean>;
  readPeriod(period: number): Promise<LedgerPeriod>;
  /** Event `ExpenseRecorded` terakhir untuk hash nota ini. Null bila tidak ditemukan atau RPC menolak. */
  findExpenseRecorded(receiptHash: string): Promise<RecordedExpense | null>;
  /** Event `PeriodClosed` untuk periode ini. Null bila tidak ditemukan atau RPC menolak. */
  findPeriodClosed(period: number): Promise<RecordedEvent | null>;
}

export interface DeploymentInfo {
  propertyCode: string;
  treasury: string;
  originalOwner: string;
  maxBalance: bigint;
}

export class KosContracts implements KosContractsReader, KosLedgerPeriodReader {
  readonly token: Contract;
  readonly ledger: Contract;
  readonly tokenAddress: string;
  readonly ledgerAddress: string;

  constructor(
    tokenAddress: string,
    ledgerAddress: string,
    private readonly provider: AbstractProvider,
  ) {
    this.tokenAddress = getAddress(tokenAddress);
    this.ledgerAddress = getAddress(ledgerAddress);
    this.token = new Contract(this.tokenAddress, kosTokenInterface, provider);
    this.ledger = new Contract(this.ledgerAddress, kosLedgerInterface, provider);
  }

  private read<T>(contract: Contract, name: string, ...args: unknown[]): Promise<T> {
    return contract.getFunction(name).staticCall(...args) as Promise<T>;
  }

  isPaymentRefRecorded(paymentRef: string): Promise<boolean> {
    return this.read(this.ledger, 'isPaymentRefRecorded', paymentRef);
  }

  isRentRecorded(room: number, period: number): Promise<boolean> {
    return this.read(this.ledger, 'isRentRecorded', room, period);
  }

  isKycApproved(account: string): Promise<boolean> {
    return this.read(this.token, 'isKycApproved', account);
  }

  isPurchaseRefUsed(purchaseRef: string): Promise<boolean> {
    return this.read(this.token, 'isPurchaseRefUsed', purchaseRef);
  }

  balanceOf(account: string): Promise<bigint> {
    return this.read(this.token, 'balanceOf', account);
  }

  isReceiptRecorded(receiptHash: string): Promise<boolean> {
    return this.read(this.ledger, 'isReceiptRecorded', receiptHash);
  }

  async readPeriod(period: number): Promise<LedgerPeriod> {
    const record = await this.read<Record<string, unknown>>(this.ledger, 'periods', period);
    return {
      grossRent: record['grossRent'] as bigint,
      totalExpenses: record['totalExpenses'] as bigint,
      platformFee: record['platformFee'] as bigint,
      tax: record['tax'] as bigint,
      netRent: record['netRent'] as bigint,
      totalSupply: record['totalSupply'] as bigint,
      valuePerTokenSen: record['valuePerTokenSen'] as bigint,
      snapshotBlock: record['snapshotBlock'] as bigint,
      closed: record['closed'] as boolean,
    };
  }

  hasRole(contract: 'token' | 'ledger', role: string, account: string): Promise<boolean> {
    return this.read(contract === 'token' ? this.token : this.ledger, 'hasRole', role, account);
  }

  /** Data penerbitan yang dibaca sekali saat worker mulai. */
  async readDeployment(): Promise<DeploymentInfo> {
    const [propertyCode, treasury, originalOwner, maxBalance] = await Promise.all([
      this.read<string>(this.token, 'propertyCode'),
      this.read<string>(this.token, 'treasury'),
      this.read<string>(this.token, 'originalOwner'),
      this.read<bigint>(this.token, 'maxBalance'),
    ]);
    return { propertyCode, treasury: getAddress(treasury), originalOwner: getAddress(originalOwner), maxBalance };
  }

  /** Alamat KosToken yang terikat ke KosLedger ini. */
  async ledgerTokenAddress(): Promise<string> {
    return getAddress(await this.read<string>(this.ledger, 'token'));
  }

  findRentRecorded(paymentRef: string): Promise<RecordedEvent | null> {
    return this.findLatest(this.ledger, this.ledger.filters.RentRecorded!(null, null, paymentRef));
  }

  findTreasuryTransfer(purchaseRef: string): Promise<RecordedEvent | null> {
    return this.findLatest(this.token, this.token.filters.TreasuryTransfer!(purchaseRef));
  }

  findKycStatusUpdated(account: string, approved: boolean): Promise<RecordedEvent | null> {
    return this.findLatest(this.token, this.token.filters.KycStatusUpdated!(account), (log) => {
      const parsed = kosTokenInterface.parseLog(log);
      return parsed?.args[1] === approved;
    });
  }

  async findExpenseRecorded(receiptHash: string): Promise<RecordedExpense | null> {
    const log = await this.findLatestLog(this.ledger, this.ledger.filters.ExpenseRecorded!(null, null, receiptHash));
    const parsed = log ? kosLedgerInterface.parseLog(log) : null;
    if (!log || !parsed) return null;
    return {
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      period: Number(parsed.args[0]),
      category: Number(parsed.args[1]),
      amount: parsed.args[3] as bigint,
    };
  }

  findPeriodClosed(period: number): Promise<RecordedEvent | null> {
    return this.findLatest(this.ledger, this.ledger.filters.PeriodClosed!(period));
  }

  private async findLatest(
    contract: Contract,
    filter: Parameters<Contract['queryFilter']>[0],
    accept: (log: Log) => boolean = () => true,
  ): Promise<RecordedEvent | null> {
    const match = await this.findLatestLog(contract, filter, accept);
    return match ? { txHash: match.transactionHash, blockNumber: match.blockNumber } : null;
  }

  /**
   * Log terakhir yang cocok dalam LOG_LOOKBACK_BLOCKS blok terakhir. Pencarian log hanya pelengkap
   * (untuk mengisi tx hash di layar dan mencocokkan isi nota), jadi kegagalannya, mis. RPC gratis
   * yang membatasi rentang eth_getLogs, tidak menggagalkan job.
   */
  private async findLatestLog(
    contract: Contract,
    filter: Parameters<Contract['queryFilter']>[0],
    accept: (log: Log) => boolean = () => true,
  ): Promise<Log | null> {
    try {
      const latest = await this.provider.getBlockNumber();
      const logs = (await contract.queryFilter(filter, Math.max(0, latest - LOG_LOOKBACK_BLOCKS), latest)) as Array<
        EventLog | Log
      >;
      return logs.filter(accept).at(-1) ?? null;
    } catch {
      return null;
    }
  }
}
