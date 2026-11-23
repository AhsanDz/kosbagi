// Distribusi November dari kontrak sungguhan di Hardhat node lokal (P4). Membuktikan angka
// KONTRAK_P4 bagian 1 keluar persis dari KosLedger.periods(202611) dan KosToken.getPastVotes.
// Dilewati di `npm run test:integration` biasa. Cara menjalankan:
//
//   1. contracts/:  npx hardhat node                    (port 8545, node baru, biarkan jalan)
//   2. contracts/:  npx hardhat ignition deploy ignition/modules/LocalDeployment.ts --network localhost
//   3. backend/:    DISTRIBUTION_E2E=1 npm run test:integration -- distribution-chain
//
// Node di port lain lewat DISTRIBUTION_E2E_RPC_URL (mis. http://127.0.0.1:8548), alamat kontrak
// lain lewat DISTRIBUTION_E2E_TOKEN_ADDRESS dan DISTRIBUTION_E2E_LEDGER_ADDRESS. Bawaannya alamat
// deploy pertama modul LocalDeployment di node baru (selalu sama).
//
// Peran worker jalur 3 dijalankan test ini sendiri dengan akun operator bawaan Hardhat (akun #1,
// kunci publik khusus lokal): setKycStatus, transferFromTreasury, recordRent, recordExpense, dan
// closePeriod. Test memotret state node dengan evm_snapshot di awal dan mengembalikannya dengan
// evm_revert di akhir, jadi bisa diulang di node yang sama.
import { readFile } from 'node:fs/promises';
import type { Express } from 'express';
import { type Contract, JsonRpcProvider, Network, type TransactionReceipt, Wallet } from 'ethers';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { NOVEMBER_DEMO_EXPENSE, NOVEMBER_PREPARED_EXPENSES, notaPath } from '../../scripts/demo/data.js';
import { KosContracts } from '../../src/blockchain/contracts.js';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import { chainAccess, createLedgerReader } from '../../src/modules/periods/chain.js';
import { paymentReference } from '../../src/queue/jobs.js';
import { bearer, resetDatabase } from './helpers.js';
import { addHolder, type November, payRent, PERIOD, ROOM_NUMBERS, seedNovember, setChain } from './p4-helpers.js';

const enabled = process.env['DISTRIBUTION_E2E'] === '1';
const RPC_URL = process.env['DISTRIBUTION_E2E_RPC_URL'] ?? 'http://127.0.0.1:8545';
const TOKEN_ADDRESS = process.env['DISTRIBUTION_E2E_TOKEN_ADDRESS'] ?? '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const LEDGER_ADDRESS = process.env['DISTRIBUTION_E2E_LEDGER_ADDRESS'] ?? '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
/** Akun #1 bawaan Hardhat: operator di modul LocalDeployment. Kunci publik, khusus jaringan lokal. */
const HARDHAT_OPERATOR_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const PERIOD_NUMBER = 202611;
const TIMEOUT = { timeout: 120_000 };

/** Investor demo dan dompetnya. Indeks 100 ke atas supaya tidak sama dengan akun deploy Hardhat #0 sampai #3. */
const HOLDERS = [
  { name: 'Bagas Wicaksono', email: 'bagas@kosbagi.test', index: 100, tokens: 1_800, share: 789_750 },
  { name: 'Citra Lestari', email: 'citra@kosbagi.test', index: 101, tokens: 1_200, share: 526_500 },
  { name: 'Eko Saputra', email: 'eko@kosbagi.test', index: 102, tokens: 800, share: 351_000 },
  { name: 'Fajar Nugroho', email: 'fajar@kosbagi.test', index: 103, tokens: 560, share: 245_700 },
] as const;

let app: Express;
let provider: JsonRpcProvider;
let contracts: KosContracts;
let token: Contract;
let ledger: Contract;
let snapshot: string | undefined;
let reader: ReturnType<typeof createLedgerReader>;

async function send(contract: Contract, method: string, ...args: unknown[]): Promise<TransactionReceipt> {
  const tx = await contract.getFunction(method).send(...args);
  const receipt = await tx.wait();
  if (!receipt || receipt.status !== 1) throw new Error(`${method} gagal`);
  return receipt;
}

describe.skipIf(!enabled)('distribusi November dari KosLedger dan KosToken di Hardhat lokal', () => {
  beforeAll(async () => {
    const network = Network.from(31_337);
    provider = new JsonRpcProvider(RPC_URL, network, { staticNetwork: network, cacheTimeout: -1 });
    snapshot = (await provider.send('evm_snapshot', [])) as string;
    contracts = new KosContracts(TOKEN_ADDRESS, LEDGER_ADDRESS, provider);
    const operator = new Wallet(HARDHAT_OPERATOR_KEY, provider);
    token = contracts.token.connect(operator) as Contract;
    ledger = contracts.ledger.connect(operator) as Contract;

    // Angka November hanya keluar persis dari deploy baru: perbendaharaan masih 12.600 token dan
    // periode 202611 belum disentuh.
    const deployment = await contracts.readDeployment();
    const [treasury, owner, period] = await Promise.all([
      contracts.balanceOf(deployment.treasury),
      contracts.balanceOf(deployment.originalOwner),
      contracts.ledger.getFunction('periods').staticCall(PERIOD_NUMBER),
    ]);
    if (treasury !== 12_600n || owner !== 5_400n || period.closed || period.grossRent !== 0n) {
      throw new Error(
        'Kontrak di node ini sudah dipakai (perbendaharaan bukan 12.600 token atau periode 202611 sudah terisi). ' +
          'Jalankan ulang Hardhat node, deploy LocalDeployment lagi, lalu ulangi test.',
      );
    }

    reader = createLedgerReader({ rpcUrls: [RPC_URL], chainId: 31_337, tokenAddress: TOKEN_ADDRESS, ledgerAddress: LEDGER_ADDRESS });
    app = await createApp();
    await resetDatabase();
  }, TIMEOUT.timeout);

  afterAll(async () => {
    vi.restoreAllMocks();
    if (snapshot) await provider.send('evm_revert', [snapshot]);
    reader?.destroy();
    provider?.destroy();
    await prisma.$disconnect();
  });

  it('sewa Rp13.500.000, biaya Rp2.700.000, 43875 sen per token, bagian tiap pemegang sama dengan shareOf', TIMEOUT, async () => {
    vi.spyOn(chainAccess, 'reader').mockReturnValue(reader);
    const data: November = await seedNovember();
    const admin = await bearer(data.admin);
    const manager = await bearer(data.manager);

    // 1. Investor lolos KYC dan menerima token dari perbendaharaan (Dimas 100 token saat demo).
    const holders = [
      ...(await Promise.all(HOLDERS.map((holder) => addHolder(data, { name: holder.name, email: holder.email }, holder.index, holder.tokens)))),
      await addHolder(data, data.investor, 104, 100),
    ];
    for (const [index, holder] of holders.entries()) {
      await send(token, 'setKycStatus', holder.address, true);
      const amount = index < HOLDERS.length ? HOLDERS[index]!.tokens : 100;
      await send(token, 'transferFromTreasury', holder.address, amount, paymentReference(holder.orderId!));
    }

    // 2. Sembilan sewa November lunas dan tercatat lewat recordRent.
    for (const room of ROOM_NUMBERS.filter((number) => number !== 'K06')) {
      const { orderId, jobId } = await payRent(data, room, { chain: 'NONE' });
      const receipt = await send(ledger, 'recordRent', Number(room.slice(1)), PERIOD_NUMBER, 1_500_000, paymentReference(orderId));
      await setChain(jobId, 'RECORDED', { txHash: receipt.hash, blockNumber: BigInt(receipt.blockNumber) });
    }

    // 3. Lima nota diunggah lewat API pengelola (hash dihitung server), lalu dicatat lewat recordExpense.
    for (const expense of [...NOVEMBER_PREPARED_EXPENSES, NOVEMBER_DEMO_EXPENSE]) {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', manager)
        .field('period', PERIOD)
        .field('categoryCode', String(expense.categoryCode))
        .field('description', expense.description)
        .field('amountIdr', String(expense.amountIdr))
        .field('receiptDate', expense.receiptDate)
        .attach('file', await readFile(notaPath(expense.file)), expense.file);
      expect(res.status).toBe(201);
      const { receiptHash } = res.body.data.expense as { receiptHash: string };
      const receipt = await send(ledger, 'recordExpense', PERIOD_NUMBER, expense.categoryCode, expense.amountIdr, receiptHash);
      const row = await prisma.expense.findUniqueOrThrow({ where: { receiptHash } });
      await setChain(row.outboxJobId, 'RECORDED', { txHash: receipt.hash, blockNumber: BigInt(receipt.blockNumber) });
    }

    // 4. Admin menutup periode lewat API; "worker" mengirim closePeriod.
    const open = await request(app).get(`/api/periods/${PERIOD}`).set('Authorization', admin);
    expect(open.body.data).toMatchObject({ status: 'OPEN', receipt: { provisional: true, valuePerTokenSen: 43_875 } });
    expect(open.body.data.requirements.every((requirement: { ok: boolean }) => requirement.ok)).toBe(true);
    expect((await request(app).post(`/api/periods/${PERIOD}/close`).set('Authorization', admin)).status).toBe(202);
    const closeJob = await prisma.outboxJob.findFirstOrThrow({ where: { type: 'CLOSE_PERIOD' } });
    expect(closeJob.payload).toEqual({ propertyCode: 'SMR01', period: PERIOD });
    const closed = await send(ledger, 'closePeriod', PERIOD_NUMBER);
    await setChain(closeJob.id, 'RECORDED', { txHash: closed.hash, blockNumber: BigInt(closed.blockNumber) });

    // 5. Struk dari KosLedger.periods(202611).
    const view = await request(app).get(`/api/periods/${PERIOD}`).set('Authorization', admin);
    expect(view.body.data).toMatchObject({
      status: 'CLOSED',
      receipt: {
        provisional: false,
        grossRentIdr: 13_500_000,
        roomsRecorded: 9,
        roomsTotal: 9,
        expensesIdr: 2_700_000,
        expensesRecorded: 5,
        platformFeeIdr: 675_000,
        taxableProfitIdr: 10_125_000,
        taxIdr: 2_227_500,
        netRentIdr: 7_897_500,
        totalSupply: 18_000,
        valuePerTokenSen: 43_875,
      },
      close: { txHash: closed.hash, blockNumber: closed.blockNumber, snapshotBlock: closed.blockNumber - 1 },
    });

    // 6. Distribusi: saldo getPastVotes di blok snapshot, angka persis KONTRAK_P4 bagian 1.
    const res = await request(app).post(`/api/periods/${PERIOD}/distribute`).set('Authorization', admin);
    expect(res.status).toBe(200);
    const { distribution } = res.body.data;
    expect(distribution.holders.map((holder: { label: string; tokenBalance: number; shareIdr: number }) => [holder.label, holder.tokenBalance, holder.shareIdr])).toEqual([
      ['Pemilik lama', 5_400, 2_369_250],
      ['Bagas Wicaksono', 1_800, 789_750],
      ['Citra Lestari', 1_200, 526_500],
      ['Eko Saputra', 800, 351_000],
      ['Fajar Nugroho', 560, 245_700],
      ['Dimas Pratama', 100, 43_875],
    ]);
    expect(distribution).toMatchObject({
      netRentIdr: 7_897_500,
      valuePerTokenSen: 43_875,
      snapshotBlock: closed.blockNumber - 1,
      treasury: { tokenBalance: 8_140, shareIdr: 3_571_425, creditedTo: 'ORIGINAL_OWNER' },
      roundingRemainderIdr: 0,
    });

    // Setiap bagian sama dengan KosLedger.shareOf(202611, saldo) yang dihitung kontrak sendiri.
    const shareOf = contracts.ledger.getFunction('shareOf');
    for (const holder of [...distribution.holders, distribution.treasury] as Array<{ tokenBalance: number; shareIdr: number }>) {
      expect(await shareOf.staticCall(PERIOD_NUMBER, holder.tokenBalance)).toBe(BigInt(holder.shareIdr));
    }
    const deployment = await contracts.readDeployment();
    expect(distribution.holders[0].walletAddress).toBe(deployment.originalOwner);
    expect(distribution.treasury.walletAddress).toBe(deployment.treasury);

    // 7. Portofolio Dimas bertambah Rp43.875.
    const summary = await request(app).get('/api/portfolio/summary').set('Authorization', await bearer(data.investor));
    expect(summary.body.data).toMatchObject({ balanceIdr: 43_875, lastDistribution: { period: PERIOD, amountIdr: 43_875 } });
  });
});
