// Penutupan periode dan distribusi bagi hasil (P4).
//
//   Tutup periode  : satu transaksi berkunci periode: syarat diperiksa, lalu baris period_closings
//                    dan job CLOSE_PERIOD ditulis bersama. Worker jalur 3 memanggil closePeriod.
//   Distribusi     : setelah closePeriod tercatat. Angka dibaca dari KosLedger.periods(period) dan
//                    saldo dari KosToken.getPastVotes(alamat, snapshotBlock), lalu dibagi dengan
//                    distribute() jalur 1. Hasilnya satu transaksi DB; constraint unik per properti
//                    dan periode mencegah distribusi kedua.
import type { Distribution, DistributionShare, PeriodClosing, Prisma, Property } from '../../generated/prisma/client.js';
import { distribute } from '../../finance/index.js';
import { AppError } from '../../lib/errors.js';
import { type AdminJobStatus, type JobState, loadJobStates } from '../../lib/job-status.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';
import { writeClosePeriodJob } from '../../queue/outbox.js';
import { ChainUnavailableError, type LedgerPeriod, type LedgerReader } from './chain.js';
import {
  type ClosedPeriodFigures,
  closedReceipt,
  computeRequirements,
  periodStatus,
  type PeriodStatus,
  provisionalReceipt,
  type ReceiptDto,
  recordedTotals,
  type RequirementDto,
} from './receipt.js';
import {
  loadCloseJob,
  type ExpenseRecord,
  loadExpenseRecords,
  loadRentRecords,
  loadTransferRecords,
  type RecordsDb,
  type RentRecord,
} from './records.js';
import { isPeriodClosed, lockPeriod } from './state.js';

export const ORIGINAL_OWNER_LABEL = 'Pemilik lama';

export interface CloseDto {
  job: { id: string; status: AdminJobStatus; attempts: number; lastError: string | null };
  txHash: string | null;
  blockNumber: number | null;
  /** Diisi setelah angka periode dibaca dari kontrak. */
  snapshotBlock: number | null;
  /** Waktu transaksi closePeriod tercatat (ditulis worker). Null selama belum tercatat. */
  closedAt: Date | null;
}

export interface DistributionHolderDto {
  holderType: 'INVESTOR' | 'ORIGINAL_OWNER';
  /** Nama investor, atau "Pemilik lama". Hanya untuk admin; tidak pernah dicatat on-chain. */
  label: string;
  walletAddress: string;
  tokenBalance: number;
  shareIdr: number;
}

export interface DistributionDto {
  distributedAt: Date;
  distributedBy: { name: string };
  /** Sewa bersih, nilai per token, dan blok snapshot yang dipakai. */
  netRentIdr: number;
  valuePerTokenSen: number;
  snapshotBlock: number;
  holders: DistributionHolderDto[];
  treasury: { walletAddress: string; tokenBalance: number; shareIdr: number; creditedTo: 'ORIGINAL_OWNER' };
  roundingRemainderIdr: number;
}

/** Pratinjau bagian pemegang sebelum distribusi dijalankan: dihitung sama, tidak disimpan. */
export type DistributionPreviewDto = Omit<DistributionDto, 'distributedAt' | 'distributedBy'>;

export interface PeriodDto {
  period: string;
  status: PeriodStatus;
  receipt: ReceiptDto;
  requirements: RequirementDto[];
  /** Tagihan periode ini yang belum dibayar. Informasi saja, tidak menghalangi penutupan. */
  unpaidBills: number;
  close: CloseDto | null;
  /** Hanya saat status CLOSED: bagian tiap pemegang bila distribusi dijalankan sekarang. */
  preview: DistributionPreviewDto | null;
  distribution: DistributionDto | null;
}

function figuresOf(closing: PeriodClosing): ClosedPeriodFigures | null {
  if (
    closing.chainReadAt === null ||
    closing.grossRentIdr === null ||
    closing.totalExpensesIdr === null ||
    closing.platformFeeIdr === null ||
    closing.taxIdr === null ||
    closing.netRentIdr === null ||
    closing.totalSupply === null ||
    closing.valuePerTokenSen === null ||
    closing.snapshotBlock === null
  ) {
    return null;
  }
  return {
    grossRentIdr: closing.grossRentIdr,
    totalExpensesIdr: closing.totalExpensesIdr,
    platformFeeIdr: closing.platformFeeIdr,
    taxIdr: closing.taxIdr,
    netRentIdr: closing.netRentIdr,
    totalSupply: closing.totalSupply,
    valuePerTokenSen: closing.valuePerTokenSen,
    snapshotBlock: closing.snapshotBlock,
  };
}

function figuresData(record: LedgerPeriod) {
  return {
    grossRentIdr: record.grossRentIdr,
    totalExpensesIdr: record.totalExpensesIdr,
    platformFeeIdr: record.platformFeeIdr,
    taxIdr: record.taxIdr,
    netRentIdr: record.netRentIdr,
    totalSupply: record.totalSupply,
    valuePerTokenSen: record.valuePerTokenSen,
    snapshotBlock: record.snapshotBlock,
    chainReadAt: new Date(),
  };
}

/**
 * Menyalin angka periode dari kontrak ke period_closings, sekali saja. Periode yang sudah ditutup
 * tidak bisa berubah di kontrak, jadi salinannya selalu benar. Null bila kontrak belum bisa dibaca
 * atau ternyata belum menutup periode; struk lalu memakai angka sementara.
 */
async function readClosedFigures(
  closing: PeriodClosing,
  period: string,
  reader: () => LedgerReader,
): Promise<ClosedPeriodFigures | null> {
  try {
    const record = await reader().readPeriod(period);
    if (!record.closed) {
      logger.warn({ period }, 'Job CLOSE_PERIOD tercatat, tetapi KosLedger belum menutup periode');
      return null;
    }
    await prisma.periodClosing.update({ where: { id: closing.id }, data: figuresData(record) });
    return record;
  } catch (error) {
    if (!(error instanceof ChainUnavailableError)) throw error;
    logger.warn({ period, err: error.message }, 'Angka periode belum bisa dibaca dari kontrak; struk memakai angka sementara');
    return null;
  }
}

type DistributionWithShares = Distribution & {
  shares: Array<DistributionShare & { user: { name: string } | null }>;
  distributedBy: { name: string };
};

const HOLDER_ORDER: Record<DistributionHolderDto['holderType'], number> = { ORIGINAL_OWNER: 0, INVESTOR: 1 };

interface HolderRow {
  holderType: 'ORIGINAL_OWNER' | 'TREASURY' | 'INVESTOR';
  /** Nama investor; diabaikan untuk pemilik lama dan perbendaharaan. */
  name: string | null;
  walletAddress: string;
  tokenBalance: number;
  shareIdr: bigint;
}

/** Bagian pemegang untuk layar: pemilik lama lebih dulu, lalu investor urut saldo; perbendaharaan terpisah. */
function holdersView(rows: readonly HolderRow[]): Pick<DistributionDto, 'holders' | 'treasury'> {
  const holders = rows
    .filter((row) => row.holderType !== 'TREASURY')
    .map(
      (row): DistributionHolderDto => ({
        holderType: row.holderType as DistributionHolderDto['holderType'],
        label: row.holderType === 'ORIGINAL_OWNER' ? ORIGINAL_OWNER_LABEL : (row.name ?? 'Investor'),
        walletAddress: row.walletAddress,
        tokenBalance: row.tokenBalance,
        shareIdr: Number(row.shareIdr),
      }),
    )
    .sort(
      (a, b) =>
        HOLDER_ORDER[a.holderType] - HOLDER_ORDER[b.holderType] ||
        b.tokenBalance - a.tokenBalance ||
        a.label.localeCompare(b.label, 'id'),
    );
  const treasury = rows.find((row) => row.holderType === 'TREASURY');
  return {
    holders,
    treasury: {
      walletAddress: treasury?.walletAddress ?? '',
      tokenBalance: treasury?.tokenBalance ?? 0,
      shareIdr: Number(treasury?.shareIdr ?? 0n),
      creditedTo: 'ORIGINAL_OWNER',
    },
  };
}

export function toDistributionDto(distribution: DistributionWithShares): DistributionDto {
  return {
    distributedAt: distribution.distributedAt,
    distributedBy: { name: distribution.distributedBy.name },
    netRentIdr: Number(distribution.netRentIdr),
    valuePerTokenSen: Number(distribution.valuePerTokenSen),
    snapshotBlock: Number(distribution.snapshotBlock),
    ...holdersView(
      distribution.shares.map((share) => ({
        holderType: share.holderType,
        name: share.user?.name ?? null,
        walletAddress: share.walletAddress,
        tokenBalance: share.tokenBalance,
        shareIdr: share.shareIdr,
      })),
    ),
    roundingRemainderIdr: Number(distribution.roundingRemainderIdr),
  };
}

const distributionInclude = {
  shares: { include: { user: { select: { name: true } } } },
  distributedBy: { select: { name: true } },
} satisfies Prisma.DistributionInclude;

interface PeriodData {
  rents: RentRecord[];
  expenses: ExpenseRecord[];
  requirements: RequirementDto[];
}

async function loadPeriodData(db: RecordsDb, propertyId: string, period: string): Promise<PeriodData> {
  const { rents } = await loadRentRecords(db, propertyId, period);
  const expenses = await loadExpenseRecords(db, propertyId, period);
  const transfers = await loadTransferRecords(db, propertyId);
  const closeJob = await loadCloseJob(db, propertyId, period);
  return { rents, expenses, requirements: computeRequirements({ rents, expenses, transfers, closeJob }) };
}

function toCloseDto(closing: PeriodClosing, state: JobState, figures: ClosedPeriodFigures | null): CloseDto {
  return {
    job: { id: closing.outboxJobId, status: state.status, attempts: state.attempts, lastError: state.lastError },
    txHash: state.txHash,
    blockNumber: state.blockNumber,
    snapshotBlock: figures ? Number(figures.snapshotBlock) : null,
    closedAt: state.status === 'RECORDED' ? state.updatedAt : null,
  };
}

/** Status satu periode tanpa membaca kontrak: dari period_closings, job CLOSE_PERIOD, dan distribusi. */
export async function loadPeriodStatus(propertyId: string, period: string): Promise<PeriodStatus> {
  const closing = await prisma.periodClosing.findUnique({
    where: { propertyId_period: { propertyId, period } },
    select: { outboxJobId: true, distribution: { select: { id: true } } },
  });
  if (!closing) return 'OPEN';
  const state = (await loadJobStates(prisma, [closing.outboxJobId])).get(closing.outboxJobId);
  return periodStatus(state?.status ?? 'QUEUED', closing.distribution !== null);
}

/** GET /periods/:period. `reader` hanya dipanggil bila angka periode tertutup belum tersalin. */
export async function loadPeriodView(
  property: Property,
  period: string,
  reader: () => LedgerReader,
): Promise<PeriodDto> {
  const closing = await prisma.periodClosing.findUnique({
    where: { propertyId_period: { propertyId: property.id, period } },
    include: { distribution: { include: distributionInclude } },
  });
  const data = await loadPeriodData(prisma, property.id, period);
  const closeState = closing ? (await loadJobStates(prisma, [closing.outboxJobId])).get(closing.outboxJobId) : undefined;
  const status = periodStatus(closeState?.status ?? null, Boolean(closing?.distribution));

  let figures = closing ? figuresOf(closing) : null;
  if (closing && !figures && (status === 'CLOSED' || status === 'DISTRIBUTED')) {
    figures = await readClosedFigures(closing, period, reader);
  }

  return {
    period,
    status,
    receipt: figures
      ? closedReceipt(figures, data.rents, data.expenses)
      : provisionalReceipt(data.rents, data.expenses, property.totalTokens),
    requirements: data.requirements,
    unpaidBills: data.rents.filter((rent) => rent.status === 'UNPAID').length,
    close: closing && closeState ? toCloseDto(closing, closeState, figures) : null,
    preview: status === 'CLOSED' && figures ? await previewDistribution(property, period, reader, figures) : null,
    distribution: closing?.distribution ? toDistributionDto(closing.distribution) : null,
  };
}

/**
 * POST /periods/:period/close. Syarat diperiksa ulang di dalam kunci periode yang sama dengan
 * pelunasan sewa dan pencatatan biaya, jadi tidak ada data baru yang menyelip setelah pemeriksaan.
 */
export async function requestClose(property: Property, period: string, adminId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockPeriod(tx, property.id, period);
    if (await isPeriodClosed(tx, property.id, period)) {
      throw new AppError(409, 'PERIOD_ALREADY_CLOSED', `Periode ${period} sudah ditutup atau sedang ditutup.`);
    }

    const data = await loadPeriodData(tx, property.id, period);
    if (!data.requirements.every((requirement) => requirement.ok)) {
      throw new AppError(409, 'PERIOD_NOT_READY', 'Periode belum bisa ditutup. Masih ada data yang belum tercatat.', {
        requirements: data.requirements,
      });
    }
    // KosLedger menolak periode tanpa sewa dan biaya (EmptyPeriod), dan penolakan itu permanen.
    const totals = recordedTotals(data.rents, data.expenses);
    if (totals.grossRentIdr === 0n && totals.expensesIdr === 0n) {
      throw new AppError(409, 'PERIOD_EMPTY', `Belum ada sewa atau biaya periode ${period} yang tercatat on-chain.`);
    }

    const job = await writeClosePeriodJob(tx, { propertyCode: property.code, period });
    await tx.periodClosing.create({
      data: { propertyId: property.id, period, outboxJobId: job.id, requestedById: adminId },
    });
  });
}

function periodNotClosed(period: string): AppError {
  return new AppError(409, 'PERIOD_NOT_CLOSED', `Penutupan periode ${period} belum tercatat di blockchain.`);
}

function alreadyDistributed(period: string): AppError {
  return new AppError(409, 'ALREADY_DISTRIBUTED', `Distribusi periode ${period} sudah dijalankan.`);
}

function chainUnavailable(error: ChainUnavailableError): AppError {
  return new AppError(502, 'CHAIN_UNAVAILABLE', `${error.message} Coba lagi beberapa saat lagi.`);
}

interface HolderInput {
  holderType: 'ORIGINAL_OWNER' | 'TREASURY' | 'INVESTOR';
  userId: string | null;
  walletAddress: string;
  balance: bigint;
}

/** Membaca saldo semua pemegang di blok snapshot: pemilik lama, perbendaharaan, dompet kustodian. */
async function readHolderBalances(reader: LedgerReader, propertyCode: string, snapshotBlock: bigint): Promise<HolderInput[]> {
  const holders = await reader.readHolders();
  if (holders.propertyCode !== propertyCode) {
    throw new ChainUnavailableError(
      `KosToken di KOS_TOKEN_ADDRESS milik properti ${holders.propertyCode}, bukan ${propertyCode}.`,
    );
  }

  const wallets = await prisma.custodialWallet.findMany({
    orderBy: { derivationIndex: 'asc' },
    select: { userId: true, address: true },
  });
  const seen = new Set([holders.originalOwner.toLowerCase(), holders.treasury.toLowerCase()]);
  const investors = wallets.filter((wallet) => {
    const key = wallet.address.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const addresses = [holders.originalOwner, holders.treasury, ...investors.map((wallet) => wallet.address)];
  const balances = await reader.pastBalances(addresses, snapshotBlock);
  const balanceAt = (index: number): bigint => balances[index] ?? 0n;

  return [
    { holderType: 'ORIGINAL_OWNER', userId: null, walletAddress: holders.originalOwner, balance: balanceAt(0) },
    { holderType: 'TREASURY', userId: null, walletAddress: holders.treasury, balance: balanceAt(1) },
    ...investors
      .map((wallet, index): HolderInput => ({
        holderType: 'INVESTOR',
        userId: wallet.userId,
        walletAddress: wallet.address,
        balance: balanceAt(index + 2),
      }))
      // Investor yang tidak memegang token di blok snapshot tidak mendapat bagian.
      .filter((holder) => holder.balance > 0n),
  ];
}

interface ComputedDistribution {
  record: LedgerPeriod;
  result: ReturnType<typeof distribute<HolderInput>>;
}

/**
 * Angka periode dan bagian tiap pemegang dari kontrak, tanpa menulis apa pun. Dipakai pratinjau dan
 * distribusi. Melempar ChainUnavailableError bila kontrak tidak terbaca, PERIOD_NOT_CLOSED bila
 * kontrak belum menutup periode, dan HOLDERS_MISMATCH bila jumlah saldo tidak sama dengan suplai.
 */
async function computeDistribution(
  property: Property,
  period: string,
  reader: () => LedgerReader,
  known?: ClosedPeriodFigures,
): Promise<ComputedDistribution> {
  const ledger = reader();
  // Angka periode yang sudah tersalin tidak perlu dibaca lagi: periode tertutup tidak bisa berubah.
  const record: LedgerPeriod = known ? { ...known, closed: true } : await ledger.readPeriod(period);
  if (!record.closed) throw periodNotClosed(period);
  const holders = await readHolderBalances(ledger, property.code, record.snapshotBlock);

  try {
    // Jumlah saldo harus sama dengan total suplai, jadi tidak ada pemegang yang terlewat.
    return { record, result: distribute(record.netRentIdr, BigInt(record.totalSupply), holders) };
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    const totalBalance = holders.reduce((sum, holder) => sum + holder.balance, 0n);
    throw new AppError(
      409,
      'HOLDERS_MISMATCH',
      'Jumlah saldo pemegang yang dikenal backend tidak sama dengan total suplai di blok snapshot.',
      { totalBalance: Number(totalBalance), totalSupply: record.totalSupply },
    );
  }
}

/** Pratinjau untuk GET /periods/:period saat CLOSED. Null bila saldo pemegang belum bisa dibaca. */
async function previewDistribution(
  property: Property,
  period: string,
  reader: () => LedgerReader,
  figures: ClosedPeriodFigures,
): Promise<DistributionPreviewDto | null> {
  let computed: ComputedDistribution;
  try {
    computed = await computeDistribution(property, period, reader, figures);
  } catch (error) {
    if (!(error instanceof ChainUnavailableError) && !(error instanceof AppError)) throw error;
    logger.warn({ period, err: error.message }, 'Pratinjau distribusi belum bisa dihitung');
    return null;
  }

  const userIds = computed.result.holders.flatMap((holder) => (holder.userId ? [holder.userId] : []));
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const names = new Map(users.map((user) => [user.id, user.name]));
  return {
    netRentIdr: Number(computed.record.netRentIdr),
    valuePerTokenSen: Number(computed.record.valuePerTokenSen),
    snapshotBlock: Number(computed.record.snapshotBlock),
    ...holdersView(
      computed.result.holders.map((holder) => ({
        holderType: holder.holderType,
        name: holder.userId ? (names.get(holder.userId) ?? null) : null,
        walletAddress: holder.walletAddress,
        tokenBalance: Number(holder.balance),
        shareIdr: holder.share,
      })),
    ),
    roundingRemainderIdr: Number(computed.result.reserve),
  };
}

/** POST /periods/:period/distribute. */
export async function runDistribution(
  property: Property,
  period: string,
  adminId: string,
  reader: () => LedgerReader,
): Promise<DistributionDto> {
  const closing = await prisma.periodClosing.findUnique({ where: { propertyId_period: { propertyId: property.id, period } } });
  if (!closing) throw periodNotClosed(period);
  const state = (await loadJobStates(prisma, [closing.outboxJobId])).get(closing.outboxJobId);
  if (state?.status !== 'RECORDED') throw periodNotClosed(period);
  if (await prisma.distribution.findUnique({ where: { propertyId_period: { propertyId: property.id, period } } })) {
    throw alreadyDistributed(period);
  }

  let computed: ComputedDistribution;
  try {
    computed = await computeDistribution(property, period, reader);
  } catch (error) {
    if (error instanceof ChainUnavailableError) throw chainUnavailable(error);
    throw error;
  }
  const { record, result } = computed;

  try {
    await prisma.$transaction(async (tx) => {
      await lockPeriod(tx, property.id, period);
      if (await tx.distribution.findUnique({ where: { propertyId_period: { propertyId: property.id, period } } })) {
        throw alreadyDistributed(period);
      }
      await tx.periodClosing.update({ where: { id: closing.id }, data: figuresData(record) });
      const distribution = await tx.distribution.create({
        data: {
          propertyId: property.id,
          period,
          periodClosingId: closing.id,
          distributedById: adminId,
          netRentIdr: record.netRentIdr,
          totalSupply: record.totalSupply,
          valuePerTokenSen: record.valuePerTokenSen,
          snapshotBlock: record.snapshotBlock,
          totalSharesIdr: result.totalShares,
          roundingRemainderIdr: result.reserve,
        },
      });
      await tx.distributionShare.createMany({
        data: result.holders.map((holder) => ({
          distributionId: distribution.id,
          holderType: holder.holderType,
          userId: holder.userId,
          walletAddress: holder.walletAddress,
          tokenBalance: Number(holder.balance),
          shareIdr: holder.share,
          // Keputusan 16 Nov 2026: bagian token yang belum terjual masuk ke pemilik lama.
          creditedTo: holder.holderType === 'TREASURY' ? 'ORIGINAL_OWNER' : holder.holderType,
        })),
      });
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw alreadyDistributed(period);
    throw error;
  }

  const saved = await prisma.distribution.findUniqueOrThrow({
    where: { propertyId_period: { propertyId: property.id, period } },
    include: distributionInclude,
  });
  return toDistributionDto(saved);
}
