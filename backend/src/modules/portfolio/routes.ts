// Modul portfolio (P4, INVESTOR): saldo bagi hasil, kepemilikan token, sewa masuk periode berjalan,
// riwayat bagi hasil per periode, dan riwayat transaksi. Semua angka milik investor yang sedang
// masuk; data penghuni tidak pernah dikirim.
import { Router } from 'express';
import type { Property } from '../../generated/prisma/client.js';
import { loadJobStates } from '../../lib/job-status.js';
import { prisma } from '../../lib/prisma.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { loadRentRecords, loadTransferRecords } from '../periods/records.js';
import { loadPeriodStatus } from '../periods/service.js';
import { loadWallet } from '../kyc/wallet.js';
import { currentPeriodOf, resolveProperty } from '../periods/state.js';
import {
  type InvestorShare,
  type KycApproval,
  toCurrentPeriodDto,
  toHoldingDto,
  toTransactions,
  WITHDRAW_DISABLED_REASON,
} from './dto.js';

/** Properti investor: properti pesanan lunas terakhirnya, atau properti pertama. */
async function investorProperty(investorId: string): Promise<Property> {
  const latest = await prisma.tokenPurchase.findFirst({
    where: { investorId, status: 'PAID' },
    orderBy: { createdAt: 'desc' },
    select: { offering: { select: { property: true } } },
  });
  return latest?.offering.property ?? resolveProperty();
}

async function loadHolding(property: Property, investorId: string) {
  const [paid, wallet] = await Promise.all([
    prisma.tokenPurchase.aggregate({
      _sum: { tokenAmount: true },
      where: { investorId, status: 'PAID', offering: { propertyId: property.id } },
    }),
    prisma.custodialWallet.findUnique({ where: { userId: investorId }, select: { address: true } }),
  ]);
  const tokenBalance = paid._sum.tokenAmount ?? 0;
  return {
    holding: toHoldingDto(property.tokenSymbol, tokenBalance, property.totalTokens, wallet?.address ?? null),
    wallet: wallet ? { address: wallet.address } : null,
  };
}

/** Bagian bagi hasil investor per periode, terbaru lebih dulu. */
async function loadShares(investorId: string): Promise<InvestorShare[]> {
  const shares = await prisma.distributionShare.findMany({
    where: { userId: investorId, holderType: 'INVESTOR' },
    include: { distribution: { include: { periodClosing: { select: { outboxJobId: true } } } } },
    orderBy: { distribution: { period: 'desc' } },
  });
  const states = await loadJobStates(
    prisma,
    shares.map((share) => share.distribution.periodClosing.outboxJobId),
  );
  return shares.map((share) => ({
    period: share.distribution.period,
    tokenBalance: share.tokenBalance,
    shareIdr: share.shareIdr,
    valuePerTokenSen: share.distribution.valuePerTokenSen,
    distributedAt: share.distribution.distributedAt,
    snapshotBlock: share.distribution.snapshotBlock,
    closeTxHash: states.get(share.distribution.periodClosing.outboxJobId)?.txHash ?? null,
  }));
}

/** Persetujuan KYC terakhir beserta status whitelist dompetnya, untuk baris "Lolos KYC". */
async function loadKycApproval(investorId: string): Promise<KycApproval | null> {
  const [approved, wallet] = await Promise.all([
    prisma.kycSubmission.findFirst({
      where: { userId: investorId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
      select: { reviewedAt: true, createdAt: true },
    }),
    loadWallet(prisma, investorId),
  ]);
  if (!approved || !wallet) return null;
  return {
    approvedAt: approved.reviewedAt ?? approved.createdAt,
    walletAddress: wallet.address,
    whitelist: { status: wallet.whitelist.status, txHash: wallet.whitelist.txHash },
  };
}

const router = Router();

router.use(requireAuth, requireRole('INVESTOR'));

router.get('/summary', async (req, res) => {
  const investorId = currentUser(req).id;
  const property = await investorProperty(investorId);
  const [{ holding }, shares, period] = await Promise.all([
    loadHolding(property, investorId),
    loadShares(investorId),
    currentPeriodOf(property.id),
  ]);

  let currentPeriod = null;
  if (period) {
    const { rooms, rents } = await loadRentRecords(prisma, property.id, period);
    currentPeriod = toCurrentPeriodDto(period, await loadPeriodStatus(property.id, period), rooms, rents);
  }

  const last = shares[0];
  res.json({
    data: {
      // Saldo = jumlah semua bagian bagi hasil. Penarikan belum tersedia, jadi belum ada pengurang.
      balanceIdr: Number(shares.reduce((sum, share) => sum + share.shareIdr, 0n)),
      lastDistribution: last
        ? { period: last.period, amountIdr: Number(last.shareIdr), distributedAt: last.distributedAt }
        : null,
      holding,
      currentPeriod,
      withdraw: { enabled: false, reason: WITHDRAW_DISABLED_REASON },
    },
  });
});

router.get('/', async (req, res) => {
  const investorId = currentUser(req).id;
  const property = await investorProperty(investorId);
  const [{ holding, wallet }, shares, transfers, kyc] = await Promise.all([
    loadHolding(property, investorId),
    loadShares(investorId),
    loadTransferRecords(prisma, property.id, investorId),
    loadKycApproval(investorId),
  ]);

  res.json({
    data: {
      holding,
      wallet,
      distributions: shares.map((share) => ({
        period: share.period,
        tokenBalance: share.tokenBalance,
        valuePerTokenSen: Number(share.valuePerTokenSen),
        amountIdr: Number(share.shareIdr),
        distributedAt: share.distributedAt,
        // Tambahan di luar kontrak P4: blok snapshot untuk kolom "Saldo di blok snapshot".
        snapshotBlock: Number(share.snapshotBlock),
        closeTxHash: share.closeTxHash,
      })),
      transactions: toTransactions(transfers, shares, kyc),
    },
  });
});

export default router;
