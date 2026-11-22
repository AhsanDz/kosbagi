// Pembaca data periode yang dipakai bersama modul P4 (periods, expenses, manager, portfolio,
// admin). Semua query berurutan dan tanpa `include`, jadi fungsi di sini aman dipanggil di dalam
// transaksi berkunci (satu koneksi tidak boleh menjalankan dua query sekaligus) maupun di luarnya.
import type { BillStatus, Expense, Prisma, RoomStatus } from '../../generated/prisma/client.js';
import { type JobState, loadJobStates } from '../../lib/job-status.js';
import { jobPayloadSchemas } from '../../queue/jobs.js';

export type RecordsDb = Pick<
  Prisma.TransactionClient,
  | 'room'
  | 'bill'
  | 'payment'
  | 'outboxJob'
  | 'chainTransaction'
  | 'outboxJobRetry'
  | 'outboxJobResolution'
  | 'periodClosing'
  | 'expense'
  | 'tokenPurchase'
>;

export interface RecordedJob {
  /** Id baris outbox. */
  id: string;
  state: JobState;
}

export interface RoomRecord {
  id: string;
  number: string;
  status: RoomStatus;
  tenantId: string | null;
}

export interface RentRecord {
  billId: string;
  room: RoomRecord;
  tenantId: string;
  amountIdr: bigint;
  status: BillStatus;
  dueDate: Date;
  paidAt: Date | null;
  /** Percobaan yang melunasi tagihan. Null untuk tagihan belum lunas dan data lampau seed. */
  payment: { id: string; orderId: string; paidAt: Date | null } | null;
  /** Job RECORD_RENT. Null selama tagihan belum lunas lewat Midtrans. */
  job: (RecordedJob & { paymentRef: string | null }) | null;
}

/** Kamar properti, urut nomor, beserta tagihan periode `period` (bila ada). */
export async function loadRentRecords(
  db: RecordsDb,
  propertyId: string,
  period: string,
): Promise<{ rooms: RoomRecord[]; rents: RentRecord[] }> {
  const rooms = await db.room.findMany({
    where: { propertyId },
    orderBy: { number: 'asc' },
    select: { id: true, number: true, status: true, tenantId: true },
  });
  const roomById = new Map(rooms.map((room) => [room.id, room]));

  const bills = await db.bill.findMany({
    where: { roomId: { in: [...roomById.keys()] }, period },
    select: { id: true, roomId: true, tenantId: true, amountIdr: true, status: true, dueDate: true, paidAt: true },
  });
  const payments = await db.payment.findMany({
    where: { billId: { in: bills.map((bill) => bill.id) }, status: 'PAID' },
    select: { id: true, billId: true, orderId: true, paidAt: true },
  });
  const jobs = await db.outboxJob.findMany({
    where: { paymentId: { in: payments.map((payment) => payment.id) }, type: 'RECORD_RENT' },
    select: { id: true, paymentId: true, payload: true },
  });
  const states = await loadJobStates(db, jobs.map((job) => job.id));

  const paymentByBill = new Map(payments.map((payment) => [payment.billId, payment]));
  const jobByPayment = new Map(jobs.map((job) => [job.paymentId, job]));

  const rents = bills
    .map((bill): RentRecord => {
      const payment = paymentByBill.get(bill.id) ?? null;
      const job = payment ? jobByPayment.get(payment.id) : undefined;
      const parsed = job ? jobPayloadSchemas.RECORD_RENT.safeParse(job.payload) : null;
      const state = job ? states.get(job.id) : undefined;
      return {
        billId: bill.id,
        room: roomById.get(bill.roomId) as RoomRecord,
        tenantId: bill.tenantId,
        amountIdr: bill.amountIdr,
        status: bill.status,
        dueDate: bill.dueDate,
        paidAt: bill.paidAt,
        payment: payment ? { id: payment.id, orderId: payment.orderId, paidAt: payment.paidAt } : null,
        job: job && state ? { id: job.id, state, paymentRef: parsed?.success ? parsed.data.paymentRef : null } : null,
      };
    })
    .sort((a, b) => a.room.number.localeCompare(b.room.number));

  return { rooms, rents };
}

export type ExpenseRecord = Expense & { job: RecordedJob };

/** Biaya properti pada periode `period`, nota terbaru lebih dulu. */
export async function loadExpenseRecords(db: RecordsDb, propertyId: string, period: string): Promise<ExpenseRecord[]> {
  const expenses = await db.expense.findMany({
    where: { propertyId, period },
    orderBy: [{ receiptDate: 'desc' }, { createdAt: 'desc' }],
  });
  const states = await loadJobStates(db, expenses.map((expense) => expense.outboxJobId));
  return expenses.map((expense) => ({
    ...expense,
    job: { id: expense.outboxJobId, state: states.get(expense.outboxJobId) as JobState },
  }));
}

export interface TransferRecord {
  purchaseId: string;
  investorId: string;
  orderNumber: string | null;
  tokenAmount: number;
  amountIdr: bigint;
  createdAt: Date;
  payment: { id: string; orderId: string; paidAt: Date | null } | null;
  /** Job TRANSFER_TOKENS. */
  job: RecordedJob | null;
}

/** Pesanan token lunas untuk properti, beserta status pemindahan tokennya. */
export async function loadTransferRecords(
  db: RecordsDb,
  propertyId: string,
  investorId?: string,
): Promise<TransferRecord[]> {
  const purchases = await db.tokenPurchase.findMany({
    where: { status: 'PAID', offering: { propertyId }, ...(investorId ? { investorId } : {}) },
    orderBy: { createdAt: 'asc' },
    select: { id: true, investorId: true, orderNumber: true, tokenAmount: true, amountIdr: true, createdAt: true },
  });
  const payments = await db.payment.findMany({
    where: { tokenPurchaseId: { in: purchases.map((purchase) => purchase.id) }, status: 'PAID' },
    select: { id: true, tokenPurchaseId: true, orderId: true, paidAt: true },
  });
  const jobs = await db.outboxJob.findMany({
    where: { paymentId: { in: payments.map((payment) => payment.id) }, type: 'TRANSFER_TOKENS' },
    select: { id: true, paymentId: true },
  });
  const states = await loadJobStates(db, jobs.map((job) => job.id));

  const paymentByPurchase = new Map(payments.map((payment) => [payment.tokenPurchaseId, payment]));
  const jobByPayment = new Map(jobs.map((job) => [job.paymentId, job]));

  return purchases.map((purchase) => {
    const payment = paymentByPurchase.get(purchase.id) ?? null;
    const job = payment ? jobByPayment.get(payment.id) : undefined;
    const state = job ? states.get(job.id) : undefined;
    return {
      purchaseId: purchase.id,
      investorId: purchase.investorId,
      orderNumber: purchase.orderNumber,
      tokenAmount: purchase.tokenAmount,
      amountIdr: purchase.amountIdr,
      createdAt: purchase.createdAt,
      payment: payment ? { id: payment.id, orderId: payment.orderId, paidAt: payment.paidAt } : null,
      job: job && state ? { id: job.id, state } : null,
    };
  });
}

/** Status job CLOSE_PERIOD periode itu, atau null bila periode belum diminta ditutup. */
export async function loadCloseJob(db: RecordsDb, propertyId: string, period: string): Promise<RecordedJob | null> {
  const closing = await db.periodClosing.findUnique({
    where: { propertyId_period: { propertyId, period } },
    select: { outboxJobId: true },
  });
  if (!closing) return null;
  const state = (await loadJobStates(db, [closing.outboxJobId])).get(closing.outboxJobId) as JobState;
  return { id: closing.outboxJobId, state };
}
