// Modul manager (P4): status kamar dan sewa masuk satu periode untuk pengelola. MANAGER membaca
// properti yang dikelolanya; ADMIN ikut membaca (properti pertama atau ?property=SMR01).
//
// Pengelola melihat status pencatatan apa adanya, termasuk Gagal, tetapi tidak punya tombol
// mengulang; pengulangan ada di antrean admin. Teks pendek seperti "Lewat 8 hari" dibentuk frontend
// dari `daysOverdue`.
import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { loadExpenseRecords, loadRentRecords } from '../periods/records.js';
import { currentPeriodOf, periodSchema, resolveManagedProperty, resolveProperty } from '../periods/state.js';
import { buildRoomBoard } from './board.js';

const querySchema = z.object({
  period: periodSchema.optional(),
  property: z.string().trim().min(1).max(20).optional(),
});

const router = Router();

router.use(requireAuth, requireRole('MANAGER', 'ADMIN'));

router.get('/rooms', async (req, res) => {
  const query = querySchema.parse(req.query);
  const user = currentUser(req);
  const property = user.role === 'MANAGER' ? await resolveManagedProperty(user.id) : await resolveProperty(query.property);
  const period = query.period ?? (await currentPeriodOf(property.id));
  if (!period) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', [
      { path: 'period', message: 'Belum ada tagihan; sebutkan periode berformat YYYY-MM.' },
    ]);
  }

  const { rooms, rents } = await loadRentRecords(prisma, property.id, period);
  const expenses = await loadExpenseRecords(prisma, property.id, period);
  const tenantIds = rooms.map((room) => room.tenantId).filter((id): id is string => id !== null);
  const tenants = await prisma.user.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } });

  res.json({
    data: buildRoomBoard({
      period,
      rooms,
      rents,
      expenses,
      tenantNames: new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
      now: new Date(),
    }),
  });
});

export default router;
