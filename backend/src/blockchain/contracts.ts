// Klien KosToken dan KosLedger dari ABI hasil `npm run export-abi` di folder contracts/.
// File ABI di src/blockchain/abi/ tidak diedit manual; test "Ekspor ABI" di contracts/ gagal bila
// isinya tertinggal dari kontrak.
//
// Kelas di sini hanya membaca (view). Transaksi tulis tidak dikirim lewat Contract ethers, tetapi
// lewat chain-executor.ts yang menandatangani transaksi sendiri supaya tx hash tersimpan sebelum
// transaksi disiarkan.
import { type AbstractProvider, Contract, type EventLog, Interface, getAddress, type Log } from 'ethers';
import kosLedgerAbi from './abi/KosLedger.json' with { type: 'json' };
import kosTokenAbi from './abi/KosToken.json' with { type: 'json' };

export const kosTokenInterface = new Interface(kosTokenAbi);
export const kosLedgerInterface = new Interface(kosLedgerAbi);

/** Seberapa jauh ke belakang log dicari saat mencari transaksi asal catatan yang sudah ada (±7 hari di Sepolia). */
export const LOG_LOOKBACK_BLOCKS = 50_000;

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

export interface DeploymentInfo {
  propertyCode: string;
  treasury: string;
  originalOwner: string;
  maxBalance: bigint;
}

export class KosContracts implements KosContractsReader {
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

  /**
   * Log terakhir yang cocok dalam LOG_LOOKBACK_BLOCKS blok terakhir. Pencarian log hanya pelengkap
   * (untuk mengisi tx hash di layar), jadi kegagalannya, mis. RPC gratis yang membatasi rentang
   * eth_getLogs, tidak menggagalkan job.
   */
  private async findLatest(
    contract: Contract,
    filter: Parameters<Contract['queryFilter']>[0],
    accept: (log: Log) => boolean = () => true,
  ): Promise<RecordedEvent | null> {
    try {
      const latest = await this.provider.getBlockNumber();
      const logs = (await contract.queryFilter(filter, Math.max(0, latest - LOG_LOOKBACK_BLOCKS), latest)) as Array<
        EventLog | Log
      >;
      const match = logs.filter(accept).at(-1);
      return match ? { txHash: match.transactionHash, blockNumber: match.blockNumber } : null;
    } catch {
      return null;
    }
  }
}
