import type { Job } from 'bullmq';
import { id, type Transaction, Wallet } from 'ethers';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OutboxJobType } from '../generated/prisma/enums.js';
import type { BlockchainJobData } from '../queue/jobs.js';
import type { ExecutorProvider } from './chain-executor.js';
import {
  type DeploymentInfo,
  type KosContractsReader,
  type KosLedgerPeriodReader,
  type LedgerPeriod,
  kosLedgerInterface,
  kosTokenInterface,
  type RecordedExpense,
} from './contracts.js';
import { createCustodialDeriver } from './custodial-wallet.js';
import { PermanentJobError, RetryableJobError } from './errors.js';
import { createBlockchainProcessor, type ProcessorDeps, referenceOf, SUPPORTED_JOB_TYPES } from './processors.js';
import { FakeChain, HARDHAT_MNEMONIC, HARDHAT_OPERATOR_KEY, MemoryChainStore, revertError } from './testing/fakes.js';

const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const LEDGER = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const RENT_REF = id('RENT-SMR01-K03-2026-11');
const BUY_REF = id('BUY-SMR01-0001');
// Hash nota = SHA-256 isi file (dihitung jalur 2); di test cukup 32 byte sembarang.
const RECEIPT_HASH = id('nota perbaikan K07');
const deriver = createCustodialDeriver(HARDHAT_MNEMONIC);
// Indeks 0 sampai 3 adalah akun admin, operator, pemilik lama, dan perbendaharaan deploy lokal.
const INVESTOR_INDEX = 20;
const INVESTOR = deriver.addressAt(INVESTOR_INDEX);
const deployment: DeploymentInfo = {
  propertyCode: 'SMR01',
  originalOwner: deriver.addressAt(2),
  treasury: deriver.addressAt(3),
  maxBalance: 1_800n,
};

const rentPayload = { propertyCode: 'SMR01', roomNumber: 'K03', period: '2026-11', amountIdr: 1_500_000, paymentRef: RENT_REF };
const whitelistPayload = { walletAddress: INVESTOR, approved: true };
const transferPayload = { propertyCode: 'SMR01', walletAddress: INVESTOR, tokenAmount: 100, paymentRef: BUY_REF };
const expensePayload = { propertyCode: 'SMR01', period: '2026-11', category: 4, amountIdr: 300_000, receiptHash: RECEIPT_HASH };
const closePayload = { propertyCode: 'SMR01', period: '2026-11' };
const EARLIER_TX = `0x${'cd'.repeat(32)}`;

const OPEN_PERIOD: LedgerPeriod = {
  grossRent: 13_500_000n,
  totalExpenses: 2_700_000n,
  platformFee: 0n,
  tax: 0n,
  netRent: 0n,
  totalSupply: 0n,
  valuePerTokenSen: 0n,
  snapshotBlock: 0n,
  closed: false,
};

let chain: FakeChain;
let store: MemoryChainStore;
let state: {
  rentRecorded: boolean;
  kyc: Map<string, boolean>;
  purchaseUsed: boolean;
  /** Hasil isReceiptRecorded berturut-turut; nilai terakhir dipakai seterusnya. */
  receiptRecorded: boolean[];
  /** Event ExpenseRecorded yang ditemukan untuk hash nota, null bila tidak ditemukan. */
  expenseEvent: RecordedExpense | null;
  /** Hasil periods(period).closed berturut-turut; nilai terakhir dipakai seterusnya. */
  periodClosed: boolean[];
  periodClosedEvent: { txHash: string; blockNumber: number } | null;
};
let logs: Array<{ level: string; message: string; object: object }>;

/** Nilai berikutnya dari daftar; nilai terakhir diulang. */
function next(values: boolean[]): boolean {
  return values.length > 1 ? (values.shift() as boolean) : (values[0] ?? false);
}

const contracts: KosContractsReader & KosLedgerPeriodReader = {
  tokenAddress: TOKEN,
  ledgerAddress: LEDGER,
  isPaymentRefRecorded: async () => state.rentRecorded,
  isRentRecorded: async () => state.rentRecorded,
  isKycApproved: async (account) => state.kyc.get(account) ?? false,
  isPurchaseRefUsed: async () => state.purchaseUsed,
  balanceOf: async () => 0n,
  findRentRecorded: async () => null,
  findTreasuryTransfer: async () => null,
  findKycStatusUpdated: async () => null,
  isReceiptRecorded: async () => next(state.receiptRecorded),
  readPeriod: async () => ({ ...OPEN_PERIOD, closed: next(state.periodClosed) }),
  findExpenseRecorded: async () => state.expenseEvent,
  findPeriodClosed: async () => state.periodClosedEvent,
};

function deps(overrides: Partial<ProcessorDeps> = {}): ProcessorDeps {
  const log = (level: string) => (object: object, message: string) => logs.push({ level, message, object });
  return {
    store,
    contracts,
    deployment,
    custodial: deriver,
    provider: chain.provider as unknown as ExecutorProvider,
    signer: new Wallet(HARDHAT_OPERATOR_KEY),
    chainId: 31_337,
    timing: { pollIntervalMs: 1, receiptTimeoutMs: 10, rpcRetryDelaysMs: [] },
    secrets: [],
    logger: { info: log('info'), warn: log('warn'), error: log('error') },
    sleep: async () => {},
    ...overrides,
  };
}

function job(outboxJobId: string, type: OutboxJobType, payload: object, attemptsMade = 0): Job<BlockchainJobData> {
  return {
    id: outboxJobId,
    attemptsMade,
    opts: { attempts: 5 },
    data: { outboxJobId, type, payload },
  } as unknown as Job<BlockchainJobData>;
}

function addJob(outboxId: string, type: OutboxJobType, payload: object) {
  store.addOutboxJob({ id: outboxId, type, payload });
  return job(outboxId, type, payload);
}

function sent(): Transaction {
  expect(chain.broadcasts).toHaveLength(1);
  return chain.broadcasts[0] as Transaction;
}

beforeEach(() => {
  chain = new FakeChain();
  store = new MemoryChainStore();
  store.wallets.push({ address: INVESTOR, derivationIndex: INVESTOR_INDEX });
  state = {
    rentRecorded: false,
    kyc: new Map(),
    purchaseUsed: false,
    receiptRecorded: [false],
    expenseEvent: null,
    periodClosed: [false],
    periodClosedEvent: null,
  };
  logs = [];
});

describe('RECORD_RENT', () => {
  it('memanggil recordRent(3, 202611, 1500000, keccak256(order_id)) di KosLedger', async () => {
    const result = await createBlockchainProcessor(deps())(addJob('o-rent', 'RECORD_RENT', rentPayload));

    const tx = sent();
    expect(tx.to).toBe(LEDGER);
    expect([...kosLedgerInterface.decodeFunctionData('recordRent', tx.data)]).toEqual([3n, 202611n, 1_500_000n, RENT_REF]);
    expect(result).toMatchObject({ type: 'RECORD_RENT', status: 'RECORDED', outcome: 'SENT', txHash: tx.hash, explorerUrl: null });
    expect(store.transactions).toEqual([expect.objectContaining({ outboxJobId: 'o-rent', reference: RENT_REF, status: 'RECORDED' })]);
  });

  it('di Sepolia hasil job membawa tautan Etherscan', async () => {
    const result = await createBlockchainProcessor(deps({ chainId: 11_155_111 }))(addJob('o-rent', 'RECORD_RENT', rentPayload));
    expect(result.explorerUrl).toBe(`https://sepolia.etherscan.io/tx/${result.txHash}`);
  });

  it('referensi yang sudah tercatat tidak dikirim lagi', async () => {
    state.rentRecorded = true;

    const result = await createBlockchainProcessor(deps())(addJob('o-rent', 'RECORD_RENT', rentPayload));
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('job untuk properti lain ditolak permanen dan tampil gagal', async () => {
    const run = createBlockchainProcessor(deps())(addJob('o-rent', 'RECORD_RENT', { ...rentPayload, propertyCode: 'DNY02' }));

    await expect(run).rejects.toThrow(/properti DNY02/);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED', reference: RENT_REF })]);
  });
});

describe('WHITELIST_KYC', () => {
  it('memanggil setKycStatus(dompet kustodian, true) di KosToken', async () => {
    await createBlockchainProcessor(deps())(addJob('o-kyc', 'WHITELIST_KYC', whitelistPayload));

    const tx = sent();
    expect(tx.to).toBe(TOKEN);
    expect([...kosTokenInterface.decodeFunctionData('setKycStatus', tx.data)]).toEqual([INVESTOR, true]);
    expect(store.transactions[0]).toMatchObject({ reference: INVESTOR, status: 'RECORDED' });
  });

  it('alamat yang sudah lolos KYC tidak dikirim lagi', async () => {
    state.kyc.set(INVESTOR, true);
    const result = await createBlockchainProcessor(deps())(addJob('o-kyc', 'WHITELIST_KYC', whitelistPayload));
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('alamat huruf kecil dari basis data tetap dikenali', async () => {
    await createBlockchainProcessor(deps())(addJob('o-kyc', 'WHITELIST_KYC', { ...whitelistPayload, walletAddress: INVESTOR.toLowerCase() }));
    expect([...kosTokenInterface.decodeFunctionData('setKycStatus', sent().data)]).toEqual([INVESTOR, true]);
  });

  it('alamat yang bukan dompet kustodian terdaftar ditolak sebelum mengirim apa pun', async () => {
    const stranger = Wallet.createRandom().address;
    const run = createBlockchainProcessor(deps())(addJob('o-kyc', 'WHITELIST_KYC', { walletAddress: stranger, approved: true }));

    await expect(run).rejects.toThrow('Alamat tujuan tidak terdaftar sebagai dompet kustodian investor.');
    expect(chain.calls).toEqual([]);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED', reference: stranger })]);
  });

  it('dompet perbendaharaan dan pemilik lama tidak pernah diubah worker', async () => {
    for (const address of [deployment.treasury, deployment.originalOwner]) {
      store.wallets.push({ address, derivationIndex: address === deployment.treasury ? 3 : 2 });
      const run = createBlockchainProcessor(deps())(addJob(`o-${address}`, 'WHITELIST_KYC', { walletAddress: address, approved: false }));
      await expect(run).rejects.toThrow(/perbendaharaan atau pemilik lama/);
    }
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('alamat yang tidak sama dengan turunan mnemonic pada indeksnya ditolak', async () => {
    store.wallets[0] = { address: INVESTOR, derivationIndex: INVESTOR_INDEX + 1 };
    const run = createBlockchainProcessor(deps())(addJob('o-kyc', 'WHITELIST_KYC', whitelistPayload));
    await expect(run).rejects.toThrow(/turunan CUSTODIAL_WALLET_MNEMONIC/);
  });

  it('tanpa mnemonic, cukup terdaftar di tabel dompet kustodian', async () => {
    store.wallets[0] = { address: INVESTOR, derivationIndex: 999 };
    await createBlockchainProcessor(deps({ custodial: null }))(addJob('o-kyc', 'WHITELIST_KYC', whitelistPayload));
    expect(sent().to).toBe(TOKEN);
  });
});

describe('TRANSFER_TOKENS', () => {
  it('memanggil transferFromTreasury(dompet kustodian, 100, keccak256(order_id))', async () => {
    await createBlockchainProcessor(deps())(addJob('o-buy', 'TRANSFER_TOKENS', transferPayload));

    const tx = sent();
    expect(tx.to).toBe(TOKEN);
    expect([...kosTokenInterface.decodeFunctionData('transferFromTreasury', tx.data)]).toEqual([INVESTOR, 100n, BUY_REF]);
  });

  it('referensi pembelian yang sudah dipakai tidak mengirim token lagi', async () => {
    state.purchaseUsed = true;
    const result = await createBlockchainProcessor(deps())(addJob('o-buy', 'TRANSFER_TOKENS', transferPayload));
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('saldo melewati batas 10% (skenario 10) gagal permanen tanpa transaksi', async () => {
    chain.simulationError = revertError(kosTokenInterface, 'BalanceCapExceeded', [INVESTOR, 1_900n, 1_800n]);
    const run = createBlockchainProcessor(deps())(addJob('o-buy', 'TRANSFER_TOKENS', transferPayload));

    await expect(run).rejects.toBeInstanceOf(PermanentJobError);
    expect(store.transactions[0]).toMatchObject({ status: 'FAILED', lastError: expect.stringContaining('batas kepemilikan 10%') });
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('isi job di Redis tidak dipercaya: alamat tujuan diambil dari baris outbox', async () => {
    store.addOutboxJob({ id: 'o-buy', type: 'TRANSFER_TOKENS', payload: transferPayload });
    const attacker = Wallet.createRandom().address;
    const forged = job('o-buy', 'TRANSFER_TOKENS', { ...transferPayload, walletAddress: attacker, tokenAmount: 1_800 });

    await createBlockchainProcessor(deps())(forged);

    expect([...kosTokenInterface.decodeFunctionData('transferFromTreasury', sent().data)]).toEqual([INVESTOR, 100n, BUY_REF]);
    expect(logs).toContainEqual(expect.objectContaining({ level: 'warn', message: expect.stringContaining('berbeda dari baris outbox') }));
  });
});

describe('job yang tidak bisa dikerjakan', () => {
  it('job antrean tanpa baris outbox gagal permanen', async () => {
    const run = createBlockchainProcessor(deps())(job('tidak-ada', 'RECORD_RENT', rentPayload));
    await expect(run).rejects.toThrow('Baris outbox untuk job ini tidak ditemukan di basis data.');
    expect(chain.calls).toEqual([]);
  });

  it('jenis job di antrean berbeda dari outbox gagal permanen', async () => {
    store.addOutboxJob({ id: 'o-rent', type: 'RECORD_RENT', payload: rentPayload });
    await expect(createBlockchainProcessor(deps())(job('o-rent', 'TRANSFER_TOKENS', transferPayload))).rejects.toThrow(/berbeda/);
  });

  it('isi outbox yang tidak sesuai skema gagal permanen', async () => {
    const run = createBlockchainProcessor(deps())(addJob('o-rent', 'RECORD_RENT', { ...rentPayload, tenantName: 'Sari' }));
    await expect(run).rejects.toThrow('Isi baris outbox tidak sesuai skema job RECORD_RENT.');
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED' })]);
  });

  it('kelima jenis job outbox sudah dikerjakan worker', () => {
    expect(SUPPORTED_JOB_TYPES).toEqual(['RECORD_RENT', 'WHITELIST_KYC', 'TRANSFER_TOKENS', 'RECORD_EXPENSE', 'CLOSE_PERIOD']);
  });
});

describe('RECORD_EXPENSE', () => {
  it('memanggil recordExpense(202611, 4, 300000, hash nota) di KosLedger', async () => {
    const result = await createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));

    const tx = sent();
    expect(tx.to).toBe(LEDGER);
    expect([...kosLedgerInterface.decodeFunctionData('recordExpense', tx.data)]).toEqual([202611n, 4n, 300_000n, RECEIPT_HASH]);
    expect(result).toMatchObject({ type: 'RECORD_EXPENSE', outcome: 'SENT', txHash: tx.hash });
    expect(store.transactions).toEqual([expect.objectContaining({ reference: RECEIPT_HASH, status: 'RECORDED' })]);
  });

  it('nota yang sudah tercatat dengan isi sama: selesai tanpa transaksi, memakai tx asal', async () => {
    state.receiptRecorded = [true];
    state.expenseEvent = { txHash: EARLIER_TX, blockNumber: 77, period: 202611, category: 4, amount: 300_000n };

    const result = await createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));
    expect(result).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: EARLIER_TX, blockNumber: 77 });
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('nota yang sudah tercatat untuk biaya lain: gagal permanen, tidak dianggap tercatat', async () => {
    state.receiptRecorded = [true];
    state.expenseEvent = { txHash: EARLIER_TX, blockNumber: 77, period: 202610, category: 4, amount: 450_000n };

    const run = createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));
    await expect(run).rejects.toBeInstanceOf(PermanentJobError);
    expect(chain.calls).toEqual([]);
    const [row] = store.transactions;
    expect(row).toMatchObject({ status: 'FAILED', txHash: null, reference: RECEIPT_HASH });
    expect(row?.lastError).toContain('periode 2026-10, kategori 4, sebesar Rp450.000');
    expect(row?.lastError).toContain('Satu nota hanya bisa dicatat sekali');
  });

  it('nota sudah tercatat tetapi event-nya tidak bisa dicari (RPC membatasi log): tetap tercatat tanpa tx hash', async () => {
    state.receiptRecorded = [true];

    const result = await createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));
    expect(result).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: null });
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('ReceiptAlreadyRecorded saat simulasi dan status on-chain cocok: selesai', async () => {
    state.receiptRecorded = [false, true];
    chain.simulationError = revertError(kosLedgerInterface, 'ReceiptAlreadyRecorded', [RECEIPT_HASH]);

    const result = await createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('ReceiptAlreadyRecorded padahal isReceiptRecorded masih false: diulang, bukan selesai', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'ReceiptAlreadyRecorded', [RECEIPT_HASH]);

    const run = createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));
    await expect(run).rejects.toBeInstanceOf(RetryableJobError);
    expect(store.transactions.filter((row) => row.status === 'RECORDED')).toHaveLength(0);
  });

  it('periode sudah ditutup: gagal permanen tanpa transaksi', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'PeriodAlreadyClosed', [202611]);

    const run = createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expensePayload));
    await expect(run).rejects.toBeInstanceOf(PermanentJobError);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED', lastError: expect.stringContaining('ditutup') })]);
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('nota untuk properti lain ditolak permanen', async () => {
    const run = createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', { ...expensePayload, propertyCode: 'DNY02' }));
    await expect(run).rejects.toThrow(/properti DNY02/);
    expect(chain.calls).toEqual([]);
  });
});

describe('CLOSE_PERIOD', () => {
  it('memanggil closePeriod(202611) di KosLedger', async () => {
    const result = await createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', closePayload));

    const tx = sent();
    expect(tx.to).toBe(LEDGER);
    expect([...kosLedgerInterface.decodeFunctionData('closePeriod', tx.data)]).toEqual([202611n]);
    expect(result).toMatchObject({ type: 'CLOSE_PERIOD', outcome: 'SENT' });
    expect(store.transactions).toEqual([expect.objectContaining({ reference: 'SMR01:2026-11', status: 'RECORDED' })]);
  });

  it('periode yang sudah ditutup: selesai tanpa simulasi dan tanpa transaksi, memakai tx PeriodClosed', async () => {
    state.periodClosed = [true];
    state.periodClosedEvent = { txHash: EARLIER_TX, blockNumber: 90 };

    const result = await createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', closePayload));
    expect(result).toMatchObject({ outcome: 'ALREADY_ON_CHAIN', txHash: EARLIER_TX, blockNumber: 90 });
    expect(chain.calls).toEqual([]);
  });

  it('PeriodAlreadyClosed saat simulasi dan periods(period).closed true: selesai', async () => {
    state.periodClosed = [false, true];
    chain.simulationError = revertError(kosLedgerInterface, 'PeriodAlreadyClosed', [202611]);

    const result = await createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', closePayload));
    expect(result.outcome).toBe('ALREADY_ON_CHAIN');
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('PeriodAlreadyClosed padahal periods(period).closed masih false: diulang, bukan selesai', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'PeriodAlreadyClosed', [202611]);

    const run = createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', closePayload));
    await expect(run).rejects.toBeInstanceOf(RetryableJobError);
  });

  it('periode tanpa sewa dan biaya (EmptyPeriod) gagal permanen tanpa transaksi', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'EmptyPeriod', [202611]);

    const run = createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', closePayload));
    await expect(run).rejects.toBeInstanceOf(PermanentJobError);
    expect(store.transactions).toEqual([
      expect.objectContaining({ status: 'FAILED', lastError: expect.stringContaining('belum punya sewa maupun biaya') }),
    ]);
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('suplai nol di blok snapshot (NoSupplyAtSnapshot) gagal permanen tanpa transaksi', async () => {
    chain.simulationError = revertError(kosLedgerInterface, 'NoSupplyAtSnapshot', [99n]);

    const run = createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', closePayload));
    await expect(run).rejects.toThrow(/suplai token di blok snapshot nol/);
    expect(chain.broadcasts).toHaveLength(0);
  });

  it('periode untuk properti lain ditolak permanen', async () => {
    const run = createBlockchainProcessor(deps())(addJob('o-close', 'CLOSE_PERIOD', { propertyCode: 'DNY02', period: '2026-11' }));
    await expect(run).rejects.toThrow(/properti DNY02/);
  });
});

describe('Coba lagi admin', () => {
  it('job FAILED karena percobaan habis, transaksinya masuk blok belakangan: diakui RECORDED tanpa transaksi baru', async () => {
    store.addOutboxJob({ id: 'o-exp', type: 'RECORD_EXPENSE', payload: expensePayload });
    chain.broadcastMode = 'pending';
    // Percobaan ke-5 dari 5: transaksi terkirim tetapi belum masuk blok dalam batas waktu.
    await expect(createBlockchainProcessor(deps())(job('o-exp', 'RECORD_EXPENSE', expensePayload, 4))).rejects.toBeInstanceOf(
      RetryableJobError,
    );
    const hash = chain.broadcasts[0]?.hash as string;
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED', txHash: hash, blockNumber: null })]);

    chain.mine(hash);
    chain.broadcastMode = 'mine';
    // Admin menekan Coba lagi. Bila BullMQ tidak mengatur ulang attemptsMade, ini percobaan ke-6.
    const result = await createBlockchainProcessor(deps())(job('o-exp', 'RECORD_EXPENSE', expensePayload, 5));

    expect(result).toMatchObject({ status: 'RECORDED', outcome: 'PREVIOUS_TX', txHash: hash });
    expect(chain.broadcasts).toHaveLength(1);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'RECORDED', txHash: hash, lastError: null, attempts: 6 })]);
  });
});

describe('percobaan ulang', () => {
  it('gangguan RPC sebelum percobaan terakhir: RetryableJobError, status masih menunggu', async () => {
    chain.failNextCalls = 1;
    const run = createBlockchainProcessor(deps())(addJob('o-rent', 'RECORD_RENT', rentPayload));

    await expect(run).rejects.toBeInstanceOf(RetryableJobError);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'PENDING', lastError: expect.stringContaining('ECONNREFUSED') })]);
  });

  it('gangguan RPC di percobaan terakhir: status FAILED (Gagal dicatat)', async () => {
    chain.failNextCalls = 1;
    store.addOutboxJob({ id: 'o-rent', type: 'RECORD_RENT', payload: rentPayload });

    await expect(createBlockchainProcessor(deps())(job('o-rent', 'RECORD_RENT', rentPayload, 4))).rejects.toBeInstanceOf(RetryableJobError);
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED', attempts: 5 })]);
  });

  it('RPC mati sebelum ada baris transaksi, di percobaan terakhir: baris FAILED dibuat', async () => {
    const broken: typeof contracts = { ...contracts, isPaymentRefRecorded: async () => Promise.reject(new Error('socket hang up')) };
    store.addOutboxJob({ id: 'o-rent', type: 'RECORD_RENT', payload: rentPayload });

    const run = createBlockchainProcessor(deps({ contracts: broken }))(job('o-rent', 'RECORD_RENT', rentPayload, 4));
    await expect(run).rejects.toThrow('socket hang up');
    expect(store.transactions).toEqual([expect.objectContaining({ status: 'FAILED', reference: RENT_REF, txHash: null })]);
  });
});

describe('referenceOf', () => {
  it('memakai hash referensi pembayaran, alamat dompet, hash nota, atau periode', () => {
    expect(referenceOf('RECORD_RENT', rentPayload)).toBe(RENT_REF);
    expect(referenceOf('TRANSFER_TOKENS', transferPayload)).toBe(BUY_REF);
    expect(referenceOf('WHITELIST_KYC', whitelistPayload)).toBe(INVESTOR);
    expect(referenceOf('RECORD_EXPENSE', expensePayload)).toBe(RECEIPT_HASH);
    expect(referenceOf('CLOSE_PERIOD', { propertyCode: 'SMR01', period: '2026-11' })).toBe('SMR01:2026-11');
  });
});
