// Mengirim satu panggilan kontrak dengan aman diulang. Dipakai semua processor job.
//
// Urutan setiap percobaan:
// 0. Job sudah punya transaksi RECORDED: selesai tanpa membaca chain.
// 1. Transaksi dari percobaan sebelumnya diperiksa dulu: sudah masuk blok, masih menunggu di
//    mempool, atau hilang. Yang masih menunggu ditunggu, bukan dikirim ulang. Ini berlaku juga
//    untuk baris yang sudah FAILED tanpa nomor blok (mis. percobaan habis saat transaksinya masih
//    di mempool): saat admin menekan Coba lagi, transaksi itu diakui bila ternyata masuk blok.
// 2. Status di kontrak dibaca (mis. isPaymentRefRecorded). Bila efeknya sudah ada, job selesai
//    tanpa transaksi baru.
// 3. Baru setelah itu transaksi baru dibuat: simulasi (eth_call) untuk menangkap revert tanpa
//    membayar gas, estimasi gas, nonce, tanda tangan, SIMPAN tx hash, siarkan, tunggu receipt.
//
// Revert yang berarti "sudah tercatat" (mis. ReceiptAlreadyRecorded) baru dianggap selesai bila
// status on-chain job ini (isDone) memang cocok. Bila tidak cocok, job diulang nanti.
//
// Tx hash dihitung dari transaksi bertanda tangan dan disimpan sebelum disiarkan. Bila proses mati
// sesaat setelah menyiarkan, percobaan berikutnya tetap tahu transaksi mana yang harus ditunggu.
//
// Nonce: worker hanya satu proses dengan konkurensi 1 (dijaga kunci di worker-lock.ts), dan nonce
// dibaca dari jaringan ('pending') tepat sebelum menandatangani. Tidak memakai NonceManager karena
// nonce di memori menjadi basi bila dompet operator juga dipakai skrip lain (mis. skrip deploy).
import { type AbstractProvider, type Interface, Transaction, type TransactionReceipt, type Wallet, isError } from 'ethers';
import type { RecordedEvent } from './contracts.js';
import {
  decodeRevert,
  type DecodedRevert,
  isDeterministicError,
  isRevert,
  PermanentJobError,
  RetryableJobError,
  safeErrorMessage,
} from './errors.js';
import type { ChainStore, ChainTxChanges, ChainTxRecord } from './store.js';

/** Tindakan worker saat kontrak menolak panggilan dengan custom error tertentu. */
export type RevertAction = 'DONE' | 'PERMANENT' | 'RETRY';

export interface ChainCall {
  /** Disimpan di kolom reference: keccak256(order_id) atau alamat dompet. */
  reference: string;
  to: string;
  contractInterface: Interface;
  method: string;
  args: readonly unknown[];
  /**
   * true bila efek job ini sudah ada di kontrak. Boleh melempar PermanentJobError bila kontrak sudah
   * mencatat hal yang bertentangan dengan job ini (mis. nota yang sama dengan nominal lain).
   */
  isDone(): Promise<boolean>;
  /** Transaksi yang membuat efek itu, bila bukan dari job ini. Pelengkap untuk tautan Etherscan. */
  findExistingRecord(): Promise<RecordedEvent | null>;
  /**
   * Revert yang tidak tercantum dianggap permanen, kecuali EnforcedPause (selalu diulang). DONE baru
   * dianggap selesai setelah isDone() memastikannya.
   */
  revertActions: Readonly<Record<string, RevertAction>>;
}

export type ExecutorProvider = Pick<
  AbstractProvider,
  | 'call'
  | 'estimateGas'
  | 'getTransactionCount'
  | 'getFeeData'
  | 'broadcastTransaction'
  | 'getTransactionReceipt'
  | 'getTransaction'
>;

export type ExecutorSigner = Pick<Wallet, 'address' | 'signTransaction'>;

export interface ExecutorTiming {
  /** Jeda antar-pemeriksaan receipt. */
  pollIntervalMs: number;
  /** Batas menunggu satu transaksi masuk blok dalam satu percobaan job. */
  receiptTimeoutMs: number;
  /** Jeda percobaan ulang cepat untuk satu panggilan RPC yang gagal, sebelum job dianggap gagal. */
  rpcRetryDelaysMs: readonly number[];
}

export const TIMING_BY_CHAIN: Readonly<Record<number, ExecutorTiming>> = {
  // Hardhat lokal menambang setiap transaksi seketika.
  31_337: { pollIntervalMs: 200, receiptTimeoutMs: 30_000, rpcRetryDelaysMs: [250, 1_000] },
  // Sepolia: blok tiap ±12 detik; di atas 3 menit job diulang dan menunggu transaksi yang sama.
  11_155_111: { pollIntervalMs: 3_000, receiptTimeoutMs: 180_000, rpcRetryDelaysMs: [1_000, 3_000] },
};

export interface ExecutorLogger {
  info(object: object, message: string): void;
  warn(object: object, message: string): void;
}

export interface ExecutionContext {
  store: ChainStore;
  provider: ExecutorProvider;
  signer: ExecutorSigner;
  chainId: number;
  outboxJobId: string;
  /** Nomor percobaan job saat ini, mulai dari 1. */
  attempt: number;
  timing: ExecutorTiming;
  secrets: readonly string[];
  logger: ExecutorLogger;
  sleep?: (ms: number) => Promise<void>;
}

/**
 * Asal catatan yang membuat job selesai:
 * - SENT: transaksi baru yang dikirim percobaan ini.
 * - PREVIOUS_TX: transaksi dari percobaan sebelumnya yang akhirnya masuk blok.
 * - ALREADY_ON_CHAIN: efeknya sudah ada di kontrak tanpa transaksi dari job ini.
 * - ALREADY_RECORDED: basis data sudah mencatat job ini RECORDED.
 */
export type ExecutionOutcome = 'SENT' | 'PREVIOUS_TX' | 'ALREADY_ON_CHAIN' | 'ALREADY_RECORDED';

export interface ExecutionResult {
  status: 'RECORDED';
  outcome: ExecutionOutcome;
  txHash: string | null;
  blockNumber: number | null;
}

/** Penjelasan revert untuk admin dan log. */
export const REVERT_MESSAGES: Readonly<Record<string, string>> = {
  PaymentRefAlreadyRecorded: 'Referensi pembayaran sudah tercatat di KosLedger.',
  RentAlreadyRecorded:
    'Kamar ini sudah tercatat membayar untuk periode tersebut lewat referensi lain. Tinjau sebagai anomali pembayaran ganda.',
  PeriodAlreadyClosed: 'Periode sudah ditutup di KosLedger sehingga catatan baru tidak bisa masuk. Perlu ditangani admin.',
  EnforcedPause: 'Kontrak sedang dijeda. Job dicoba lagi nanti.',
  AccessControlUnauthorizedAccount: 'Dompet operator tidak memegang peran yang dibutuhkan di kontrak.',
  RecipientNotKycApproved: 'Dompet kustodian belum lolos KYC di KosToken.',
  BalanceCapExceeded: 'Saldo dompet kustodian akan melebihi batas kepemilikan 10% (skenario 10).',
  ERC20InsufficientBalance: 'Stok token di dompet perbendaharaan tidak cukup.',
  PurchaseRefAlreadyUsed: 'Referensi pembelian sudah dipakai di KosToken.',
  ReceiptAlreadyRecorded: 'Nota dengan hash ini sudah tercatat di KosLedger.',
  EmptyPeriod: 'Periode ini belum punya sewa maupun biaya yang tercatat di KosLedger, jadi tidak bisa ditutup.',
  NoSupplyAtSnapshot: 'Total suplai token di blok snapshot nol, jadi periode tidak bisa ditutup. Periksa alamat KosToken.',
  InvalidPeriod: 'Periode tidak berformat YYYYMM yang diterima KosLedger.',
  ZeroAmount: 'Nominal nol ditolak kontrak.',
  EmptyReceiptHash: 'Hash nota kosong ditolak KosLedger.',
};

/** Pesan saat kontrak menolak dengan revert "sudah tercatat", tetapi status on-chain job ini belum cocok. */
export const DONE_NOT_CONFIRMED_MESSAGE =
  'Kontrak menyatakan catatan ini sudah ada, tetapi status on-chain-nya belum cocok dengan job ini; dicoba lagi.';

export function describeRevert(revert: DecodedRevert): string {
  return REVERT_MESSAGES[revert.name] ?? `Kontrak menolak panggilan dengan error ${revert.name}.`;
}

/** Tindakan untuk satu revert. EnforcedPause selalu diulang; yang tidak tercantum dianggap permanen. */
export function revertAction(call: Pick<ChainCall, 'revertActions'>, revert: DecodedRevert): RevertAction {
  if (revert.name === 'EnforcedPause') return 'RETRY';
  return call.revertActions[revert.name] ?? 'PERMANENT';
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Kenaikan estimasi gas 20%: saldo dan checkpoint bisa sedikit berubah antara estimasi dan eksekusi. */
const GAS_LIMIT_PERCENT = 120n;

class Execution {
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(
    private readonly call: ChainCall,
    private readonly ctx: ExecutionContext,
  ) {
    this.sleep = ctx.sleep ?? defaultSleep;
  }

  async run(): Promise<ExecutionResult> {
    const rows = await this.ctx.store.listTransactions(this.ctx.outboxJobId);

    // 0. Job ini sudah pernah selesai: tidak ada yang perlu dikirim.
    const recorded = rows.findLast((row) => row.status === 'RECORDED');
    if (recorded) return this.result('ALREADY_RECORDED', recorded.txHash, recorded.blockNumber);

    // 1. Transaksi dari percobaan sebelumnya, terbaru lebih dulu. Baris FAILED yang sudah punya
    //    nomor blok berarti transaksinya revert di blok itu, jadi tidak perlu diperiksa lagi.
    for (const row of [...rows].reverse()) {
      if (!row.txHash) continue;
      const settled =
        row.status === 'PENDING'
          ? await this.settlePending(row)
          : row.status === 'FAILED' && row.blockNumber === null
            ? await this.settleFailed(row)
            : null;
      if (settled) return settled;
    }

    // Langkah 1 bisa mengubah status baris, jadi daftar dibaca ulang.
    const current = await this.ctx.store.listTransactions(this.ctx.outboxJobId);

    // 2. Efek job sudah ada di kontrak (mis. dicatat sebelum basis data di-reset). Tidak mengirim apa pun.
    if (await this.rpc(() => this.call.isDone())) return this.recordWithoutNewTransaction(current);

    // 3. Kirim transaksi baru.
    return this.sendNew(current);
  }

  // --- Langkah 1 ---

  /** Transaksi berstatus PENDING: sudah masuk blok, masih di mempool (ditunggu), atau hilang. */
  private async settlePending(row: ChainTxRecord): Promise<ExecutionResult | null> {
    const hash = row.txHash as string;
    let receipt = await this.rpc(() => this.ctx.provider.getTransactionReceipt(hash));
    if (!receipt) {
      const known = await this.rpc(() => this.ctx.provider.getTransaction(hash));
      if (!known) {
        await this.update(row, {
          status: 'FAILED',
          lastError: 'Transaksi tidak ditemukan di jaringan (tidak sampai atau dibuang dari mempool), jadi dikirim ulang.',
        });
        return null;
      }
      this.ctx.logger.info({ txHash: hash }, 'Menunggu transaksi dari percobaan sebelumnya');
      receipt = await this.waitForReceipt(hash);
      if (!receipt) return this.notMinedYet(row);
    }
    return this.applyReceipt(row, receipt, 'PREVIOUS_TX');
  }

  /**
   * Transaksi yang pernah ditandai FAILED tanpa nomor blok: dikira hilang, siarannya gagal, atau
   * percobaan job habis saat transaksinya masih menunggu. Transaksi seperti itu bisa saja masuk blok
   * belakangan atau masih di mempool. Yang sudah masuk blok diakui sebagai RECORDED; yang masih di
   * mempool dihidupkan lagi sebagai PENDING dan ditunggu. Keduanya tanpa transaksi baru, supaya
   * tombol Coba lagi admin tidak menghasilkan transaksi ganda.
   */
  private async settleFailed(row: ChainTxRecord): Promise<ExecutionResult | null> {
    const hash = row.txHash as string;
    const receipt = await this.rpc(() => this.ctx.provider.getTransactionReceipt(hash));
    if (receipt) {
      if (receipt.status === 1) {
        this.ctx.logger.info({ txHash: hash }, 'Transaksi yang ditandai gagal ternyata masuk blok; diakui sebagai tercatat');
        return this.applyReceipt(row, receipt, 'PREVIOUS_TX');
      }
      // Revert di blok: cukup dicatat nomor bloknya supaya tidak diperiksa lagi.
      await this.update(row, { blockNumber: BigInt(receipt.blockNumber), lastError: `Transaksi revert di blok ${receipt.blockNumber}.` });
      return null;
    }

    const known = await this.rpc(() => this.ctx.provider.getTransaction(hash));
    if (!known) return null;

    this.ctx.logger.info({ txHash: hash }, 'Transaksi yang ditandai gagal masih menunggu di jaringan; ditunggu, tidak dikirim ulang');
    const revived = await this.update(row, { status: 'PENDING', lastError: null });
    const mined = await this.waitForReceipt(hash);
    if (!mined) return this.notMinedYet(revived);
    return this.applyReceipt(revived, mined, 'PREVIOUS_TX');
  }

  // --- Langkah 2 ---

  private async recordWithoutNewTransaction(rows: readonly ChainTxRecord[]): Promise<ExecutionResult> {
    const existing = await this.call.findExistingRecord();
    const blockNumber = existing ? BigInt(existing.blockNumber) : null;
    const ownRow = existing ? rows.find((row) => row.txHash === existing.txHash) : undefined;
    // tx_hash unik di tabel. Bila transaksi asal itu sudah tercatat di baris job lain (mis. dua baris
    // outbox untuk efek yang sama, seperti tutup periode yang diminta dua kali), baris job ini
    // disimpan tanpa tx hash: "sudah tercatat tanpa transaksi dari job ini".
    const usedByOtherJob = existing && !ownRow ? await this.ctx.store.findTransactionByHash(existing.txHash) : null;
    const changes: ChainTxChanges = {
      status: 'RECORDED',
      txHash: existing && !usedByOtherJob ? existing.txHash : null,
      blockNumber,
      attempts: this.ctx.attempt,
      lastError: null,
    };

    // Pakai ulang baris yang hash-nya sama atau baris yang belum punya transaksi, supaya tidak ada
    // baris PENDING yang tertinggal dan tx hash tetap unik.
    const target = ownRow ?? rows.findLast((row) => row.status === 'PENDING' && !row.txHash);
    if (target) await this.updateAsLatest(target, changes);
    else {
      await this.ctx.store.createTransaction({
        outboxJobId: this.ctx.outboxJobId,
        reference: this.call.reference,
        status: 'RECORDED',
        attempts: this.ctx.attempt,
        txHash: changes.txHash ?? null,
        blockNumber,
      });
    }

    this.ctx.logger.info(
      { reference: this.call.reference, txHash: existing?.txHash ?? null },
      'Sudah tercatat di kontrak sebelumnya, tidak mengirim transaksi baru',
    );
    return this.result('ALREADY_ON_CHAIN', existing?.txHash ?? null, blockNumber);
  }

  // --- Langkah 3 ---

  /**
   * Baris kerja percobaan ini: baris PENDING tanpa transaksi dari percobaan sebelumnya (mis. yang
   * gagal karena kontrak dijeda), atau baris baru.
   */
  private async workingRow(rows: readonly ChainTxRecord[]): Promise<ChainTxRecord> {
    const reusable = rows.findLast((row) => row.status === 'PENDING' && !row.txHash);
    if (reusable) return reusable;
    return this.ctx.store.createTransaction({
      outboxJobId: this.ctx.outboxJobId,
      reference: this.call.reference,
      status: 'PENDING',
      attempts: this.ctx.attempt,
    });
  }

  private async sendNew(rows: readonly ChainTxRecord[]): Promise<ExecutionResult> {
    const { provider, signer } = this.ctx;
    const data = this.call.contractInterface.encodeFunctionData(this.call.method, this.call.args);
    const request = { from: signer.address, to: this.call.to, data };

    let gasEstimate: bigint;
    try {
      // Simulasi: revert ketahuan di sini tanpa membayar gas.
      await this.rpc(() => provider.call(request));
      gasEstimate = await this.rpc(() => provider.estimateGas(request));
    } catch (error) {
      return this.handleCallFailure(error, rows);
    }

    const [nonce, fee] = await Promise.all([
      this.rpc(() => provider.getTransactionCount(signer.address, 'pending')),
      this.rpc(() => provider.getFeeData()),
    ]);
    const fees =
      fee.maxFeePerGas != null && fee.maxPriorityFeePerGas != null
        ? { type: 2, maxFeePerGas: fee.maxFeePerGas, maxPriorityFeePerGas: fee.maxPriorityFeePerGas }
        : { type: 0, gasPrice: fee.gasPrice ?? undefined };

    const signed = await signer.signTransaction({
      ...fees,
      chainId: this.ctx.chainId,
      nonce,
      to: this.call.to,
      data,
      value: 0n,
      gasLimit: (gasEstimate * GAS_LIMIT_PERCENT) / 100n,
    });
    const txHash = Transaction.from(signed).hash as string;

    // Hash disimpan dulu, baru transaksi disiarkan. Transaksi yang dulu gagal disiarkan bisa
    // menghasilkan hash yang persis sama (nonce, biaya, dan isi sama); barisnya dipakai lagi.
    const sameTransaction = rows.find((row) => row.txHash === txHash);
    let row = await this.update(sameTransaction ?? (await this.workingRow(rows)), {
      status: 'PENDING',
      txHash,
      blockNumber: null,
      lastError: null,
    });

    try {
      await this.rpc(() => provider.broadcastTransaction(signed));
    } catch (error) {
      // Siaran bisa saja sampai walau balasannya gagal (mis. RPC menjawab "already known").
      const known = await provider.getTransaction(txHash).catch(() => null);
      if (!known) {
        const reason = isError(error, 'INSUFFICIENT_FUNDS')
          ? 'Saldo ETH dompet operator tidak cukup untuk gas.'
          : `Transaksi tidak terkirim: ${safeErrorMessage(error, this.ctx.secrets)}`;
        row = await this.update(row, { status: 'FAILED', lastError: reason });
        throw new RetryableJobError(reason);
      }
    }
    this.ctx.logger.info({ txHash, method: this.call.method, nonce }, 'Transaksi dikirim');

    const receipt = await this.waitForReceipt(txHash);
    if (!receipt) return this.notMinedYet(row);
    const result = await this.applyReceipt(row, receipt, 'SENT');
    if (result) return result;
    // Revert di blok, padahal simulasi sekarang lolos: diulang dengan jeda, bukan langsung, supaya
    // tidak berputar mengirim transaksi yang terus gagal.
    throw new RetryableJobError(`Transaksi revert di blok ${receipt.blockNumber}; dicoba lagi.`);
  }

  /** Simulasi atau estimasi gas gagal, sebelum ada transaksi yang ditandatangani. */
  private async handleCallFailure(error: unknown, rows: readonly ChainTxRecord[]): Promise<ExecutionResult> {
    const revert = decodeRevert(error, this.call.contractInterface);
    if (revert && revertAction(this.call, revert) === 'DONE') return this.acceptDoneRevert(rows);

    const row = await this.workingRow(rows);
    if (revert) {
      const message = describeRevert(revert);
      if (revertAction(this.call, revert) === 'RETRY') {
        await this.update(row, { lastError: message });
        throw new RetryableJobError(message);
      }
      await this.update(row, { status: 'FAILED', lastError: message });
      throw new PermanentJobError(message);
    }

    const message = isRevert(error)
      ? `Kontrak menolak panggilan tanpa alasan yang bisa dibaca (${safeErrorMessage(error, this.ctx.secrets)}).`
      : `RPC gagal: ${safeErrorMessage(error, this.ctx.secrets)}`;
    await this.update(row, { lastError: message });
    throw new RetryableJobError(message);
  }

  // --- Receipt ---

  /**
   * Menerapkan receipt ke baris transaksi. Null berarti transaksi revert tetapi simulasi sekarang
   * lolos (mis. kontrak sudah tidak dijeda), jadi transaksi baru boleh dikirim.
   */
  private async applyReceipt(
    row: ChainTxRecord,
    receipt: TransactionReceipt,
    outcome: 'SENT' | 'PREVIOUS_TX',
  ): Promise<ExecutionResult | null> {
    const blockNumber = BigInt(receipt.blockNumber);
    if (receipt.status === 1) {
      await this.updateAsLatest(row, { status: 'RECORDED', blockNumber, attempts: this.ctx.attempt, lastError: null });
      return this.result(outcome, row.txHash, blockNumber);
    }

    // Masuk blok tetapi revert: keadaan kontrak berubah antara simulasi dan eksekusi.
    await this.update(row, { status: 'FAILED', blockNumber, lastError: `Transaksi revert di blok ${receipt.blockNumber}.` });
    if (await this.rpc(() => this.call.isDone())) {
      return this.recordWithoutNewTransaction(await this.ctx.store.listTransactions(this.ctx.outboxJobId));
    }

    const data = this.call.contractInterface.encodeFunctionData(this.call.method, this.call.args);
    try {
      await this.rpc(() => this.ctx.provider.call({ from: this.ctx.signer.address, to: this.call.to, data }));
      return null;
    } catch (error) {
      const revert = decodeRevert(error, this.call.contractInterface);
      if (!revert) throw new RetryableJobError(`Transaksi revert di blok ${receipt.blockNumber}; dicoba lagi.`);
      const action = revertAction(this.call, revert);
      if (action === 'DONE') return this.acceptDoneRevert(await this.ctx.store.listTransactions(this.ctx.outboxJobId));
      const message = describeRevert(revert);
      await this.update(row, { lastError: message });
      throw action === 'RETRY' ? new RetryableJobError(message) : new PermanentJobError(message);
    }
  }

  private async notMinedYet(row: ChainTxRecord): Promise<never> {
    const message = `Transaksi belum masuk blok setelah ${Math.round(this.ctx.timing.receiptTimeoutMs / 1000)} detik; ditunggu lagi di percobaan berikutnya.`;
    await this.update(row, { lastError: message });
    throw new RetryableJobError(message);
  }

  private async waitForReceipt(hash: string): Promise<TransactionReceipt | null> {
    const deadline = Date.now() + this.ctx.timing.receiptTimeoutMs;
    for (;;) {
      try {
        const receipt = await this.ctx.provider.getTransactionReceipt(hash);
        if (receipt) return receipt;
      } catch (error) {
        // Gangguan RPC sesaat saat menunggu tidak menggagalkan penantian.
        this.ctx.logger.warn({ txHash: hash, err: safeErrorMessage(error, this.ctx.secrets) }, 'Gagal membaca receipt');
      }
      if (Date.now() >= deadline) return null;
      await this.sleep(this.ctx.timing.pollIntervalMs);
    }
  }

  // --- Bantuan ---

  /** Panggilan RPC dengan percobaan ulang cepat. Revert dan error pasti lain tidak diulang. */
  private async rpc<T>(operation: () => Promise<T>): Promise<T> {
    const delays = this.ctx.timing.rpcRetryDelaysMs;
    for (let index = 0; ; index += 1) {
      try {
        return await operation();
      } catch (error) {
        const delay = delays[index];
        if (isDeterministicError(error) || delay === undefined) throw error;
        await this.sleep(delay);
      }
    }
  }

  private update(row: ChainTxRecord, changes: ChainTxChanges): Promise<ChainTxRecord> {
    return this.ctx.store.updateTransaction(row.id, { attempts: this.ctx.attempt, ...changes });
  }

  /**
   * Menulis hasil akhir job ke satu baris dan memastikan baris itu menjadi baris terbaru job ini.
   * Layar membaca baris dengan createdAt terbaru, jadi bila hasilnya jatuh ke baris lama (transaksi
   * yang dikira hilang ternyata masuk blok, sementara percobaan sesudahnya sudah membuat baris lain),
   * createdAt baris itu dipindah ke sesudah baris terbaru. Baris lain tetap ada sebagai riwayat.
   */
  private async updateAsLatest(row: ChainTxRecord, changes: ChainTxChanges): Promise<ChainTxRecord> {
    const rows = await this.ctx.store.listTransactions(this.ctx.outboxJobId);
    const newest = rows.at(-1);
    if (!newest || newest.id === row.id) return this.ctx.store.updateTransaction(row.id, changes);
    const createdAt = new Date(Math.max(Date.now(), newest.createdAt.getTime() + 1));
    return this.ctx.store.updateTransaction(row.id, { ...changes, createdAt });
  }

  /**
   * Kontrak menolak dengan revert "sudah tercatat" (aksi DONE). Job baru dianggap selesai bila status
   * on-chain-nya cocok (isDone). Bila tidak cocok, mis. RPC cadangan tertinggal beberapa blok, job
   * diulang nanti; bila isDone menemukan catatan yang bertentangan, ia melempar PermanentJobError.
   */
  private async acceptDoneRevert(rows: readonly ChainTxRecord[]): Promise<ExecutionResult> {
    if (await this.rpc(() => this.call.isDone())) return this.recordWithoutNewTransaction(rows);
    throw new RetryableJobError(DONE_NOT_CONFIRMED_MESSAGE);
  }

  private result(outcome: ExecutionOutcome, txHash: string | null, blockNumber: bigint | null): ExecutionResult {
    return { status: 'RECORDED', outcome, txHash, blockNumber: blockNumber === null ? null : Number(blockNumber) };
  }
}

/** Menjalankan satu panggilan kontrak dengan aturan di atas. */
export function executeChainCall(call: ChainCall, ctx: ExecutionContext): Promise<ExecutionResult> {
  return new Execution(call, ctx).run();
}
