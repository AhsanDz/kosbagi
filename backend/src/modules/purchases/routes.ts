// Modul purchases: pesanan token milik investor yang sedang masuk. Pesanan investor lain dibalas
// 404, sama seperti tagihan penghuni.
import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { isUuid } from '../../lib/uuid.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { createUserRateLimiter } from '../../middleware/rate-limit.js';
import { toPaymentDto } from '../payments/dto.js';
import { purchaseInclude, toPurchaseDto } from './dto.js';
import { continuePurchasePayment } from './service.js';

const paymentLimiter = createUserRateLimiter({ limit: 30 });

function purchaseNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Pesanan tidak ditemukan.');
}

const router = Router();

router.use(requireAuth, requireRole('INVESTOR'));

router.get('/', async (req, res) => {
  const purchases = await prisma.tokenPurchase.findMany({
    where: { investorId: currentUser(req).id },
    orderBy: { createdAt: 'desc' },
    include: purchaseInclude,
  });
  const now = new Date();
  res.json({ data: { purchases: purchases.map((purchase) => toPurchaseDto(purchase, now)) } });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw purchaseNotFound();

  const purchase = await prisma.tokenPurchase.findFirst({
    where: { id, investorId: currentUser(req).id },
    include: purchaseInclude,
  });
  if (!purchase) throw purchaseNotFound();

  res.json({ data: { purchase: toPurchaseDto(purchase, new Date()) } });
});

router.post('/:id/payments', paymentLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw purchaseNotFound();

  const investorId = currentUser(req).id;
  const { payment, created } = await continuePurchasePayment(id, investorId);
  const purchase = await prisma.tokenPurchase.findUniqueOrThrow({ where: { id }, include: purchaseInclude });
  const now = new Date();
  res
    .status(created ? 201 : 200)
    .json({ data: { payment: toPaymentDto(payment, now), purchase: toPurchaseDto(purchase, now) } });
});

export default router;
