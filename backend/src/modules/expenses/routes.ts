// Modul expenses (P4): biaya operasional dan nota. Pengelola (MANAGER) mencatat dan membaca biaya
// properti yang dikelolanya; admin (ADMIN) hanya membaca, bawaannya properti pertama atau
// ?property=SMR01.
//
// Unggahan nota memakai multipart/form-data dengan field `file`. File ditahan di memori (maks.
// 5 MB), dicek isinya, di-hash, lalu disimpan di UPLOAD_DIR. Nota tidak pernah dikirim ke
// blockchain; yang dicatat hanya hash SHA-256-nya.
import type { Request, RequestHandler } from 'express';
import { Router } from 'express';
import multer from 'multer';
import { env } from '../../config/env.js';
import type { Property } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { jobState, loadJobStates } from '../../lib/job-status.js';
import { isUuid } from '../../lib/uuid.js';
import { noNulCharacter, z } from '../../lib/zod.js';
import { currentUser, requireAuth, requireRole } from '../../middleware/auth.js';
import { createUserRateLimiter } from '../../middleware/rate-limit.js';
import { loadExpenseRecords } from '../periods/records.js';
import { currentPeriodOf, isPeriodClosed, PERIOD_PATTERN, periodSchema, resolveManagedProperty, resolveProperty } from '../periods/state.js';
import { isExpenseCategory } from './categories.js';
import { toExpenseDto, toExpenseListDto } from './dto.js';
import { MAX_RECEIPT_BYTES, receiptFilePath } from './files.js';
import { recordExpense } from './service.js';

const expenseLimiter = createUserRateLimiter({ limit: 20 });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RECEIPT_BYTES, files: 1, fields: 10, fieldSize: 2_048, parts: 12 },
});

/** Unggahan satu file di field `file`. Error multer diubah menjadi format error API. */
const receiptUpload: RequestHandler = (req, res, next) => {
  upload.single('file')(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      next(new AppError(413, 'FILE_TOO_LARGE', 'Ukuran file nota maksimal 5 MB.'));
      return;
    }
    const field = error instanceof multer.MulterError ? (error.field ?? 'file') : 'file';
    next(
      new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', [
        { path: field, message: 'Kirim satu file nota di field file dengan format multipart/form-data.' },
      ]),
    );
  });
};

/** Nomor bulan sejak tahun 0, untuk membandingkan periode YYYY-MM dan tanggal YYYY-MM-DD. */
function monthIndex(value: string): number {
  return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1;
}

/** Tanggal nota boleh di bulan periode, atau satu bulan sebelum atau sesudahnya. */
export const MAX_RECEIPT_MONTH_DISTANCE = 1;

const expenseSchema = z
  .object({
    period: periodSchema,
    categoryCode: z.coerce
      .number()
      .int()
      .refine((code) => isExpenseCategory(code), 'Kategori biaya tidak dikenal.'),
    description: z.string().trim().min(3).max(120).refine(noNulCharacter.check, noNulCharacter.message),
    // Pesan bawaan schema hanya untuk isian yang bukan angka; batas bawah dan atas punya pesannya sendiri.
    amountIdr: z.coerce
      .number({ error: (issue) => (issue.code === 'invalid_type' ? 'Nominal harus angka.' : undefined) })
      .int('Nominal harus rupiah bulat, tanpa koma.')
      .min(1, 'Nominal minimal Rp1.')
      .max(100_000_000, 'Nominal maksimal Rp100.000.000 per nota.'),
    receiptDate: z.iso.date('Tanggal nota harus berformat YYYY-MM-DD.'),
  })
  .superRefine((value, context) => {
    // Dibandingkan hanya bila keduanya sudah berformat benar; galat formatnya dilaporkan field masing-masing.
    if (!PERIOD_PATTERN.test(value.period) || !/^\d{4}-\d{2}-\d{2}$/.test(value.receiptDate)) return;
    if (Math.abs(monthIndex(value.receiptDate) - monthIndex(value.period)) > MAX_RECEIPT_MONTH_DISTANCE) {
      context.addIssue({
        code: 'custom',
        path: ['receiptDate'],
        message: 'Tanggal nota harus di bulan periode, atau satu bulan sebelum atau sesudahnya.',
      });
    }
  });

const listQuerySchema = z.object({
  period: periodSchema.optional(),
  property: z.string().trim().min(1).max(20).optional(),
});

/** Pengelola membaca properti yang dikelolanya; admin properti pertama atau ?property=. */
async function propertyFor(req: Request, propertyCode?: string): Promise<Property> {
  const user = currentUser(req);
  return user.role === 'MANAGER' ? resolveManagedProperty(user.id) : resolveProperty(propertyCode);
}

function expenseNotFound(): AppError {
  return new AppError(404, 'NOT_FOUND', 'Biaya tidak ditemukan.');
}

const router = Router();

router.use(requireAuth);

router.get('/', requireRole('MANAGER', 'ADMIN'), async (req, res) => {
  const query = listQuerySchema.parse(req.query);
  const property = await propertyFor(req, query.property);
  const period = query.period ?? (await currentPeriodOf(property.id));
  if (!period) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', [
      { path: 'period', message: 'Belum ada tagihan; sebutkan periode berformat YYYY-MM.' },
    ]);
  }

  const expenses = await loadExpenseRecords(prisma, property.id, period);
  const closed = await isPeriodClosed(prisma, property.id, period);
  const creators = await prisma.user.findMany({
    where: { id: { in: [...new Set(expenses.map((expense) => expense.createdById))] } },
    select: { id: true, name: true },
  });
  const names = new Map(creators.map((user) => [user.id, user.name]));
  res.json({ data: toExpenseListDto(period, closed, expenses, names) });
});

router.post('/', requireRole('MANAGER'), expenseLimiter, receiptUpload, async (req, res) => {
  const body = expenseSchema.parse(req.body ?? {});
  if (!req.file) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', [
      { path: 'file', message: 'File nota wajib dilampirkan.' },
    ]);
  }

  const manager = currentUser(req);
  const property = await resolveManagedProperty(manager.id);
  const expense = await recordExpense(property, manager.id, {
    ...body,
    amountIdr: BigInt(body.amountIdr),
    file: { originalName: req.file.originalname, content: req.file.buffer },
  });

  const states = await loadJobStates(prisma, [expense.outboxJobId]);
  const creator = await prisma.user.findUniqueOrThrow({ where: { id: manager.id }, select: { name: true } });
  const record = { ...expense, job: { id: expense.outboxJobId, state: states.get(expense.outboxJobId) ?? jobState(null) } };
  res.status(201).json({ data: { expense: toExpenseDto(record, creator.name) } });
});

router.get('/:id/receipt', requireRole('MANAGER', 'ADMIN'), async (req, res, next) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw expenseNotFound();

  const user = currentUser(req);
  const expense = await prisma.expense.findFirst({
    where: { id, ...(user.role === 'MANAGER' ? { property: { managerId: user.id } } : {}) },
  });
  if (!expense) throw expenseNotFound();

  res.setHeader('Content-Type', expense.contentType);
  res.setHeader('Content-Disposition', `inline; filename="${expense.fileName}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(receiptFilePath(env.UPLOAD_DIR, expense.storedFileName), { dotfiles: 'deny' }, (error) => {
    if (error && !res.headersSent) next(new AppError(404, 'NOT_FOUND', 'File nota tidak ditemukan di server.'));
  });
});

export default router;
