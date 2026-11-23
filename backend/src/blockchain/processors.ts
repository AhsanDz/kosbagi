// Processor BullMQ untuk antrean blockchain: satu fungsi yang menerima job, memilih panggilan
// kontrak sesuai jenisnya, lalu menjalankannya lewat chain-executor.ts.
//
// Isi job di Redis tidak dipercaya begitu saja. Processor membaca ulang baris outbox di PostgreSQL
// memakai outboxJobId, dan isi baris itulah yang dikirim ke kontrak. Siapa pun yang bisa menulis ke
// Redis tidak bisa membuat worker mengirim token ke alamat lain.
//
// Jenis job P3: RECORD_RENT (KosLedger.recordRent), WHITELIST_KYC (KosToken.setKycStatus),
// TRANSFER_TOKENS (KosToken.transferFromTreasury). RECORD_EXPENSE dan CLOSE_PERIOD menyusul di P4.
import { isDeepStrictEqual } from 'node:util';
import type { Job } from 'bullmq';
import { getAddress } from 'ethers';
import type { OutboxJobType } from '../generated/prisma/enums.js';
import { type BlockchainJobData, type JobPayload, parseJobPayload } from '../queue/jobs.js';
import { type ChainCall, executeChainCall, type ExecutionResult, type ExecutorProvider, type ExecutorSigner, type ExecutorTiming } from './chain-executor.js';
import { periodToUint32, positiveIntegerToUint256, roomNumberToUint16 } from './chain-params.js';
import { type DeploymentInfo, type KosContractsReader, kosLedgerInterface, kosTokenInterface } from './contracts.js';
import type { CustodialDeriver } from './custodial-wallet.js';
import { PermanentJobError, RetryableJobError, safeErrorMessage } from './errors.js';
import { etherscanTxUrl } from './etherscan.js';
import type { ChainStore } from './store.js';

export interface WorkerLogger {
  info(object: object, message: string): void;
  warn(object: object, message: string): void;
  error(object: object, message: string): void;
}

export interface ProcessorDeps {
  store: ChainStore;
  contracts: KosContractsReader;
  /** Data penerbitan yang dibaca saat worker mulai. */
  deployment: DeploymentInfo;
  /** Null bila CUSTODIAL_WALLET_MNEMONIC tidak diisi di environment worker. */
  custodial: CustodialDeriver | null;
  provider: ExecutorProvider;
  signer: ExecutorSigner;
  chainId: number;
  timing: ExecutorTiming;
  secrets: readonly string[];
  logger: WorkerLogger;
  sleep?: (ms: number) => Promise<void>;
}

export interface BlockchainJobResult extends ExecutionResult {
  type: OutboxJobType;
  /** Tautan Etherscan; null untuk jaringan lokal atau bila tx hash tidak diketahui. */
  explorerUrl: string | null;
}

type Planner<T extends OutboxJobType> = (payload: JobPayload<T>, deps: ProcessorDeps) => Promise<ChainCall>;

function assertProperty(propertyCode: string, deployment: DeploymentInfo): void {
  if (propertyCode !== deployment.propertyCode) {
    throw new PermanentJobError(
      `Job untuk properti ${propertyCode}, padahal kontrak yang dipakai worker milik properti ${deployment.propertyCode}.`,
    );
  }
}

/**
 * Alamat tujuan WHITELIST_KYC dan TRANSFER_TOKENS harus dompet kustodian investor yang terdaftar,
 * bukan dompet perbendaharaan atau pemilik lama. Bila mnemonic tersedia, alamatnya juga harus sama
 * dengan turunan mnemonic pada indeks yang tercatat.
 */
async function resolveCustodialAddress(walletAddress: string, deps: ProcessorDeps): Promise<string> {
  const address = getAddress(walletAddress.toLowerCase());
  if (address === deps.deployment.treasury || address === deps.deployment.originalOwner) {
    throw new PermanentJobError('Alamat tujuan adalah dompet perbendaharaan atau pemilik lama, bukan dompet kustodian investor.');
  }
  const wallet = await deps.store.findCustodialWallet(address);
  if (!wallet) throw new PermanentJobError('Alamat tujuan tidak terdaftar sebagai dompet kustodian investor.');
  if (deps.custodial && deps.custodial.addressAt(wallet.derivationIndex) !== address) {
    throw new PermanentJobError(
      'Alamat dompet kustodian tidak sama dengan turunan CUSTODIAL_WALLET_MNEMONIC pada indeksnya. ' +
        'Pastikan worker dan server API memakai mnemonic yang sama.',
    );
  }
  return address;
}

const planRecordRent: Planner<'RECORD_RENT'> = async (payload, deps) => {
  assertProperty(payload.propertyCode, deps.deployment);
  const room = roomNumberToUint16(payload.roomNumber);
  const period = periodToUint32(payload.period);
  const amount = positiveIntegerToUint256(payload.amountIdr, 'Nominal sewa');
  return {
    reference: payload.paymentRef,
    to: deps.contracts.ledgerAddress,
    contractInterface: kosLedgerInterface,
    method: 'recordRent',
    args: [room, period, amount, payload.paymentRef],
    isDone: () => deps.contracts.isPaymentRefRecorded(payload.paymentRef),
    findExistingRecord: () => deps.contracts.findRentRecorded(payload.paymentRef),
    // PeriodAlreadyClosed dan RentAlreadyRecorded permanen (bawaan): perlu ditangani admin.
    revertActions: { PaymentRefAlreadyRecorded: 'DONE' },
  };
};

const planWhitelistKyc: Planner<'WHITELIST_KYC'> = async (payload, deps) => {
  const address = await resolveCustodialAddress(payload.walletAddress, deps);
  return {
    reference: address,
    to: deps.contracts.tokenAddress,
    contractInterface: kosTokenInterface,
    method: 'setKycStatus',
    args: [address, payload.approved],
    isDone: async () => (await deps.contracts.isKycApproved(address)) === payload.approved,
    findExistingRecord: () => deps.contracts.findKycStatusUpdated(address, payload.approved),
    revertActions: {},
  };
};

const planTransferTokens: Planner<'TRANSFER_TOKENS'> = async (payload, deps) => {
  assertProperty(payload.propertyCode, deps.deployment);
  const address = await resolveCustodialAddress(payload.walletAddress, deps);
  const amount = positiveIntegerToUint256(payload.tokenAmount, 'Jumlah token');
  return {
    reference: payload.paymentRef,
    to: deps.contracts.tokenAddress,
    contractInterface: kosTokenInterface,
    method: 'transferFromTreasury',
    args: [address, amount, payload.paymentRef],
    isDone: () => deps.contracts.isPurchaseRefUsed(payload.paymentRef),
    findExistingRecord: () => deps.contracts.findTreasuryTransfer(payload.paymentRef),
    // RecipientNotKycApproved, BalanceCapExceeded, ERC20InsufficientBalance permanen (bawaan).
    revertActions: { PurchaseRefAlreadyUsed: 'DONE' },
  };
};

const PLANNERS: { [T in OutboxJobType]?: Planner<T> } = {
  RECORD_RENT: planRecordRent,
  WHITELIST_KYC: planWhitelistKyc,
  TRANSFER_TOKENS: planTransferTokens,
};

/** Jenis job yang sudah bisa dikerjakan worker. */
export const SUPPORTED_JOB_TYPES = Object.keys(PLANNERS) as OutboxJobType[];

/** Nilai kolom chain_transactions.reference untuk setiap jenis job. */
export function referenceOf(type: OutboxJobType, payload: JobPayload): string {
  const record = payload as Record<string, unknown>;
  switch (type) {
    case 'RECORD_RENT':
    case 'TRANSFER_TOKENS':
      return String(record['paymentRef']);
    case 'WHITELIST_KYC':
      return String(record['walletAddress']);
    case 'RECORD_EXPENSE':
      return String(record['receiptHash']);
    case 'CLOSE_PERIOD':
      return `${String(record['propertyCode'])}:${String(record['period'])}`;
  }
}

/**
 * Menulis status gagal. Percobaan yang masih akan diulang hanya menyimpan pesan terakhir; percobaan
 * terakhir dan kegagalan permanen membuat status FAILED supaya tampil "Gagal dicatat".
 */
async function recordFailure(
  deps: ProcessorDeps,
  outboxJobId: string,
  reference: string,
  attempt: number,
  message: string,
  final: boolean,
): Promise<void> {
  const latest = (await deps.store.listTransactions(outboxJobId)).at(-1);
  if (!latest) {
    if (final) {
      await deps.store.createTransaction({ outboxJobId, reference, status: 'FAILED', attempts: attempt, lastError: message });
    }
    return;
  }
  if (latest.status === 'RECORDED') return;
  if (final) await deps.store.updateTransaction(latest.id, { status: 'FAILED', attempts: attempt, lastError: message });
  else if (latest.status === 'PENDING') await deps.store.updateTransaction(latest.id, { attempts: attempt, lastError: message });
}

/** Membuat fungsi processor untuk Worker BullMQ. */
export function createBlockchainProcessor(deps: ProcessorDeps): (job: Job<BlockchainJobData>) => Promise<BlockchainJobResult> {
  return async (job) => {
    const attempt = job.attemptsMade + 1;
    const maxAttempts = job.opts.attempts ?? 1;
    const { outboxJobId } = job.data;
    const logContext = { jobId: job.id, outboxJobId, type: job.data.type, attempt, maxAttempts };

    const outbox = await deps.store.findOutboxJob(outboxJobId);
    if (!outbox) {
      deps.logger.error(logContext, 'Job antrean tanpa baris outbox, diabaikan');
      throw new PermanentJobError('Baris outbox untuk job ini tidak ditemukan di basis data.');
    }
    if (outbox.type !== job.data.type) {
      deps.logger.error(logContext, 'Jenis job di antrean berbeda dari baris outbox');
      throw new PermanentJobError(`Jenis job di antrean (${job.data.type}) berbeda dari baris outbox (${outbox.type}).`);
    }

    let reference = outbox.dedupeKey;
    try {
      const payload = parseOutboxPayload(outbox.type, outbox.payload);
      reference = referenceOf(outbox.type, payload);
      if (!isDeepStrictEqual(job.data.payload, outbox.payload)) {
        deps.logger.warn(logContext, 'Isi job di antrean berbeda dari baris outbox; yang dipakai isi outbox');
      }

      const planner = PLANNERS[outbox.type] as Planner<OutboxJobType> | undefined;
      if (!planner) throw new PermanentJobError(`Jenis job ${outbox.type} belum dikerjakan worker (direncanakan di progress 4).`);
      const call = await planner(payload, deps);

      const result = await executeChainCall(call, {
        store: deps.store,
        provider: deps.provider,
        signer: deps.signer,
        chainId: deps.chainId,
        outboxJobId,
        attempt,
        timing: deps.timing,
        secrets: deps.secrets,
        logger: deps.logger,
        ...(deps.sleep ? { sleep: deps.sleep } : {}),
      });

      const explorerUrl = result.txHash ? etherscanTxUrl(result.txHash, deps.chainId) : null;
      deps.logger.info({ ...logContext, outcome: result.outcome, txHash: result.txHash, blockNumber: result.blockNumber, explorerUrl }, 'Job blockchain tercatat');
      return { type: outbox.type, ...result, explorerUrl };
    } catch (error) {
      const permanent = error instanceof PermanentJobError;
      const message =
        permanent || error instanceof RetryableJobError ? error.message : safeErrorMessage(error, deps.secrets);
      const final = permanent || attempt >= maxAttempts;

      try {
        await recordFailure(deps, outboxJobId, reference, attempt, message, final);
      } catch (storeError) {
        deps.logger.error({ ...logContext, err: safeErrorMessage(storeError, deps.secrets) }, 'Status gagal tidak bisa disimpan');
      }

      if (final) deps.logger.error({ ...logContext, err: message }, permanent ? 'Job gagal permanen' : 'Percobaan job habis');
      else deps.logger.warn({ ...logContext, err: message }, 'Job gagal, akan dicoba lagi');

      // Hanya pesan yang sudah disaring yang ikut tersimpan di Redis (failedReason).
      throw permanent ? error : new RetryableJobError(message);
    }
  };
}

/** Isi outbox yang tidak lolos skema tidak akan pernah bisa dikirim, jadi gagal permanen. */
function parseOutboxPayload(type: OutboxJobType, payload: unknown): JobPayload {
  try {
    return parseJobPayload(type, payload);
  } catch {
    throw new PermanentJobError(`Isi baris outbox tidak sesuai skema job ${type}.`);
  }
}
