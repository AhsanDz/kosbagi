// Modul offerings: penawaran token yang sedang dibuka dan pembuatan pesanan oleh investor.
import { Router } from 'express';
import type { KycStatus } from '../../generated/prisma/enums.js';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../lib/errors.js';
import { isUuid } from '../../lib/uuid.js';
import { z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { createUserRateLimiter } from '../../middleware/rate-limit.js';
import { loadWallet } from '../kyc/wallet.js';
import { purchaseInclude, toPurchaseDto } from '../purchases/dto.js';
import { createPurchase } from '../purchases/service.js';
import { summarizeQuota } from './quota.js';
import { activeReservation, loadQuotaInput } from './state.js';

const purchaseLimiter = createUserRateLimiter({ limit: 30 });

const purchaseSchema = z.object({
  tokenAmount: z.number().int().min(1).max(1_000_000),
});

function offeringNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Penawaran tidak ditemukan.');
}

const router = Router();

router.use(requireAuth, requireRole('INVESTOR'));

router.get('/current', async (req, res) => {
  const investorId = currentUser(req).id;
  const now = new Date();

  // Penawaran yang sedang dibuka; bila tidak ada, penawaran terakhir supaya layar bisa menampilkan
  // "Penawaran penuh".
  const offering =
    (await prisma.offering.findFirst({ where: { status: 'OPEN' }, orderBy: { createdAt: 'desc' }, include: { property: true } })) ??
    (await prisma.offering.findFirst({ orderBy: { createdAt: 'desc' }, include: { property: true } }));
  if (!offering) throw new AppError(404, 'NOT_FOUND', 'Belum ada penawaran token.');

  const maxPerInvestor = offering.property.maxTokensPerInvestor;
  const [quota, kyc, wallet, activePurchase] = await Promise.all([
    loadQuotaInput(prisma, { offering, maxPerInvestor, investorId, now }),
    prisma.kycSubmission.findFirst({ where: { userId: investorId }, orderBy: { createdAt: 'desc' }, select: { status: true } }),
    loadWallet(prisma, investorId),
    prisma.tokenPurchase.findFirst({
      where: { investorId, offeringId: offering.id, ...activeReservation(now) },
      orderBy: { createdAt: 'desc' },
      include: purchaseInclude,
    }),
  ]);
  const { tokensRemaining, remainingQuota } = summarizeQuota(quota);
  const kycStatus: KycStatus | 'NONE' = kyc?.status ?? 'NONE';

  res.json({
    data: {
      offering: {
        id: offering.id,
        propertyCode: offering.property.code,
        tokenSymbol: offering.property.tokenSymbol,
        pricePerTokenIdr: Number(offering.property.tokenPriceIdr),
        tokensOffered: offering.tokensOffered,
        tokensSold: offering.tokensSold,
        tokensReserved: quota.tokensReserved,
        tokensRemaining,
        closesAt: offering.closesAt,
        status: offering.status,
      },
      investor: {
        kycStatus,
        walletReady: wallet?.whitelist.status === 'RECORDED',
        walletAddress: wallet?.address ?? null,
        holdingTokens: quota.holdingTokens,
        reservedTokens: quota.reservedByInvestor,
        remainingQuota,
        maxPerInvestor,
      },
      activePurchase: activePurchase ? toPurchaseDto(activePurchase, now) : null,
    },
  });
});

router.post('/:id/purchases', purchaseLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw offeringNotFound();
  const { tokenAmount } = purchaseSchema.parse(req.body);

  const { purchase } = await createPurchase(id, currentUser(req).id, tokenAmount);
  const saved = await prisma.tokenPurchase.findUniqueOrThrow({ where: { id: purchase.id }, include: purchaseInclude });
  res.status(201).json({ data: { purchase: toPurchaseDto(saved, new Date()) } });
});

export default router;
