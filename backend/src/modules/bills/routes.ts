// Modul bills: tagihan milik penghuni yang sedang masuk. Tagihan penghuni lain dibalas 404,
// bukan 403, supaya keberadaan tagihan orang lain tidak terbaca.
import { Router } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { isUuid } from '../../lib/uuid.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { createUserRateLimiter } from '../../middleware/rate-limit.js';
import { toPaymentDto } from '../payments/dto.js';
import { createRentPayment } from '../payments/service.js';
import { billKey, closedBillKeys } from '../periods/state.js';
import { billDetailInclude, billInclude, toBillDetailDto, toBillDto, toTenantRoomDto } from './dto.js';

// Longgar untuk klik berulang, tetapi membatasi satu akun yang memanggil tanpa henti.
const paymentLimiter = createUserRateLimiter({ limit: 30 });

function billNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Tagihan tidak ditemukan.');
}

const router = Router();

router.use(requireAuth, requireRole('TENANT'));

router.get('/current', async (req, res) => {
  const tenantId = currentUser(req).id;
  const [bill, room, firstBill] = await Promise.all([
    prisma.bill.findFirst({ where: { tenantId }, orderBy: { period: 'desc' }, include: billInclude }),
    prisma.room.findUnique({
      where: { tenantId },
      include: { property: { include: { manager: { select: { name: true } } } } },
    }),
    prisma.bill.findFirst({ where: { tenantId }, orderBy: { period: 'asc' }, select: { period: true } }),
  ]);

  const closed = await closedBillKeys(bill ? [bill] : []);
  res.json({
    data: {
      bill: bill ? toBillDto(bill, new Date(), closed.has(billKey(bill))) : null,
      room: room ? toTenantRoomDto(room, firstBill?.period ?? null, bill?.dueDate ?? null) : null,
    },
  });
});

router.get('/', async (req, res) => {
  const bills = await prisma.bill.findMany({
    where: { tenantId: currentUser(req).id },
    orderBy: { period: 'desc' },
    include: billInclude,
  });

  const now = new Date();
  const closed = await closedBillKeys(bills);
  res.json({ data: { bills: bills.map((bill) => toBillDto(bill, now, closed.has(billKey(bill)))) } });
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!isUuid(id)) throw billNotFound();

  const bill = await prisma.bill.findFirst({ where: { id, tenantId: currentUser(req).id }, include: billDetailInclude });
  if (!bill) throw billNotFound();

  // Kuitansi ikut dikirim: argumen recordRent persis, alamat KosLedger, dan hasil transaksinya.
  const closed = await closedBillKeys([bill]);
  res.json({ data: { bill: toBillDetailDto(bill, new Date(), env.KOS_LEDGER_ADDRESS ?? null, closed.has(billKey(bill))) } });
});

router.post('/:id/payments', paymentLimiter, async (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw billNotFound();

  const { payment, created } = await createRentPayment(id, currentUser(req).id);
  res.status(created ? 201 : 200).json({ data: { payment: toPaymentDto(payment, new Date()) } });
});

export default router;
