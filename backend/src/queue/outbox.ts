// Menulis baris outbox. Dipanggil di dalam transaksi DB yang sama dengan perubahan statusnya,
// sehingga keduanya tersimpan bersama atau tidak sama sekali. Isi job divalidasi sebelum ditulis.
import type { Prisma } from '../generated/prisma/client.js';
import { parseJobPayload, paymentReference } from './jobs.js';

interface RecordRentJob {
  billId: string;
  paymentId: string;
  orderId: string;
  propertyCode: string;
  roomNumber: string;
  period: string;
  amountIdr: bigint;
}

/** Job recordRent. dedupeKey memakai id tagihan, jadi satu tagihan hanya punya satu job. */
export async function writeRecordRentJob(tx: Prisma.TransactionClient, job: RecordRentJob): Promise<void> {
  const payload = parseJobPayload('RECORD_RENT', {
    propertyCode: job.propertyCode,
    roomNumber: job.roomNumber,
    period: job.period,
    amountIdr: Number(job.amountIdr),
    paymentRef: paymentReference(job.orderId),
  });

  await tx.outboxJob.create({
    data: { type: 'RECORD_RENT', dedupeKey: `record-rent:${job.billId}`, paymentId: job.paymentId, payload },
  });
}
