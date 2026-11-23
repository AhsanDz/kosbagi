// Pencatatan biaya beserta nota (P4). Dalam satu transaksi DB berkunci periode: periode diperiksa
// belum ditutup, nota diperiksa belum pernah dicatat, file disimpan, lalu baris biaya dan job
// RECORD_EXPENSE ditulis bersama. Worker jalur 3 memanggil KosLedger.recordExpense dengan hash nota.
import { env } from '../../config/env.js';
import type { Expense, Property } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { isUniqueViolation } from '../../lib/prisma-errors.js';
import { writeRecordExpenseJob } from '../../queue/outbox.js';
import { isPeriodClosed, lockPeriod, periodClosedError } from '../periods/state.js';
import { categoryLabel } from './categories.js';
import { detectReceiptType, receiptHash, sanitizeFileName, storedFileNameOf, storeReceiptFile } from './files.js';

export interface NewExpense {
  period: string;
  categoryCode: number;
  description: string;
  amountIdr: bigint;
  /** YYYY-MM-DD. */
  receiptDate: string;
  file: { originalName: string; content: Uint8Array };
}

function periodWithoutBills(period: string): AppError {
  return new AppError(400, 'VALIDATION_ERROR', 'Data yang dikirim tidak valid.', [
    { path: 'period', message: `Periode ${period} belum punya tagihan. Biaya hanya dicatat untuk periode tagihan yang sudah ada.` },
  ]);
}

function unsupportedFileType(): AppError {
  return new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'File nota harus PDF, JPG, atau PNG.');
}

const DATE_FORMAT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** 409 nota ganda, dengan data biaya pertama yang memakai nota itu. */
function receiptAlreadyRecorded(existing: Expense): AppError {
  const label = categoryLabel(existing.categoryCode);
  return new AppError(
    409,
    'RECEIPT_ALREADY_RECORDED',
    `Nota ini sudah tercatat untuk biaya ${label} tanggal ${DATE_FORMAT.format(existing.receiptDate)}. Pilih file nota lain.`,
    {
      expenseId: existing.id,
      categoryLabel: label,
      description: existing.description,
      receiptDate: existing.receiptDate.toISOString().slice(0, 10),
      amountIdr: Number(existing.amountIdr),
      createdAt: existing.createdAt,
    },
  );
}

/** POST /expenses. Mengembalikan biaya yang baru dicatat. */
export async function recordExpense(property: Property, managerId: string, input: NewExpense): Promise<Expense> {
  const type = detectReceiptType(input.file.content);
  if (!type) throw unsupportedFileType();
  const hash = receiptHash(input.file.content);
  const storedFileName = storedFileNameOf(hash, type);

  try {
    return await prisma.$transaction(async (tx) => {
      await lockPeriod(tx, property.id, input.period);
      if (await isPeriodClosed(tx, property.id, input.period)) throw periodClosedError(input.period);
      // Biaya hanya untuk periode tagihan yang sudah ada, supaya tidak tercatat on-chain untuk
      // periode yang tidak pernah punya sewa (mis. salah ketik tahun).
      const billInPeriod = await tx.bill.findFirst({
        where: { room: { propertyId: property.id }, period: input.period },
        select: { id: true },
      });
      if (!billInPeriod) throw periodWithoutBills(input.period);

      // Constraint unik receipt_hash tetap jadi pengaman terakhir bila dua unggahan bersamaan.
      const existing = await tx.expense.findUnique({ where: { receiptHash: hash } });
      if (existing) throw receiptAlreadyRecorded(existing);

      // File ditulis sebelum baris biaya, jadi tidak pernah ada biaya tanpa file. Bila transaksi batal,
      // file yatim tidak berbahaya: namanya hash isinya sendiri.
      await storeReceiptFile(env.UPLOAD_DIR, storedFileName, input.file.content);

      const job = await writeRecordExpenseJob(tx, {
        propertyCode: property.code,
        period: input.period,
        categoryCode: input.categoryCode,
        amountIdr: input.amountIdr,
        receiptHash: hash,
      });
      return tx.expense.create({
        data: {
          propertyId: property.id,
          period: input.period,
          categoryCode: input.categoryCode,
          description: input.description,
          amountIdr: input.amountIdr,
          receiptDate: new Date(`${input.receiptDate}T00:00:00.000Z`),
          receiptHash: hash,
          fileName: sanitizeFileName(input.file.originalName, type),
          storedFileName,
          contentType: type.contentType,
          fileSizeBytes: input.file.content.byteLength,
          outboxJobId: job.id,
          createdById: managerId,
        },
      });
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await prisma.expense.findUnique({ where: { receiptHash: hash } });
    if (existing) throw receiptAlreadyRecorded(existing);
    throw error;
  }
}
