import type { Job } from 'bullmq';
import { id, type Transaction, Wallet } from 'ethers';
import { beforeEach, describe, expect, it } from 'vitest';
import type { OutboxJobType } from '../generated/prisma/enums.js';
import type { BlockchainJobData } from '../queue/jobs.js';
import type { ExecutorProvider } from './chain-executor.js';
import { type DeploymentInfo, type KosContractsReader, kosLedgerInterface, kosTokenInterface } from './contracts.js';
import { createCustodialDeriver } from './custodial-wallet.js';
import { PermanentJobError, RetryableJobError } from './errors.js';
import { createBlockchainProcessor, type ProcessorDeps, referenceOf, SUPPORTED_JOB_TYPES } from './processors.js';
import { FakeChain, HARDHAT_MNEMONIC, HARDHAT_OPERATOR_KEY, MemoryChainStore, revertError } from './testing/fakes.js';

const TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const LEDGER = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
const RENT_REF = id('RENT-SMR01-K03-2026-11');
const BUY_REF = id('BUY-SMR01-0001');
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

let chain: FakeChain;
let store: MemoryChainStore;
let state: { rentRecorded: boolean; kyc: Map<string, boolean>; purchaseUsed: boolean };
let logs: Array<{ level: string; message: string; object: object }>;

const contracts: KosContractsReader = {
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
  state = { rentRecorded: false, kyc: new Map(), purchaseUsed: false };
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

  it('RECORD_EXPENSE dan CLOSE_PERIOD belum dikerjakan di P3', async () => {
    const expense = { propertyCode: 'SMR01', period: '2026-11', category: 1, amountIdr: 2_700_000, receiptHash: id('nota') };
    const run = createBlockchainProcessor(deps())(addJob('o-exp', 'RECORD_EXPENSE', expense));
    await expect(run).rejects.toThrow(/progress 4/);
    expect(SUPPORTED_JOB_TYPES).toEqual(['RECORD_RENT', 'WHITELIST_KYC', 'TRANSFER_TOKENS']);
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
    const broken: KosContractsReader = { ...contracts, isPaymentRefRecorded: async () => Promise.reject(new Error('socket hang up')) };
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
    expect(referenceOf('CLOSE_PERIOD', { propertyCode: 'SMR01', period: '2026-11' })).toBe('SMR01:2026-11');
  });
});
