import type { BillDto, ChainRecordDto, TenantRoomDto } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";
import type { BillStatus, ChainTxStatus } from "@/lib/types";

/**
 * Keadaan tagihan bulan berjalan di layar penghuni, sesuai varian "Status"
 * komponen Slip tagihan di Figma. PAID_NOT_RECORDED untuk data lampau yang lunas
 * tanpa pembayaran Midtrans, jadi tidak pernah dicatat.
 *
 * Sejak P4 tidak ada keadaan "lunas, gagal dicatat": penghuni tidak pernah
 * melihat kata gagal untuk pencatatan on-chain, jadi pencatatan yang gagal tetap
 * PAID_QUEUED (Menunggu pencatatan) sampai admin mengulangnya.
 *
 * Dua keadaan P4 untuk periode yang sudah ditutup:
 * - PERIOD_CLOSED: tagihan belum dibayar dan tidak bisa dibayar lagi.
 * - REFUND_PENDING: pembayaran masuk setelah periode ditutup; tagihan tetap
 *   belum dibayar dan dananya dikembalikan.
 */
export type BillViewState =
  | "UNPAID"
  | "PENDING"
  | "CHECKING"
  | "PAID_QUEUED"
  | "PAID_RECORDED"
  | "PAID_NOT_RECORDED"
  | "EXPIRED"
  | "FAILED"
  | "PERIOD_CLOSED"
  | "REFUND_PENDING";

export const PAID_VIEW_STATES: readonly BillViewState[] = [
  "PAID_QUEUED",
  "PAID_RECORDED",
  "PAID_NOT_RECORDED",
];

/**
 * Status pencatatan untuk penghuni. Backend P4 sudah memetakan FAILED menjadi
 * PENDING; pemetaan ini lapis kedua supaya komponen penghuni tidak pernah
 * menulis kata gagal walau menerima FAILED. Komponen bersama (ChainStatus,
 * ChainStatusStack) tetap menampilkan gagal untuk admin dan pengelola.
 */
export function tenantChain(chain: ChainRecordDto | null): ChainRecordDto | null {
  return chain?.status === "FAILED" ? { ...chain, status: "PENDING" } : chain;
}

/** Tagihan dengan status pencatatan versi penghuni. */
export function tenantBill<T extends BillDto>(bill: T): T {
  return bill.chain?.status === "FAILED" ? { ...bill, chain: tenantChain(bill.chain) } : bill;
}

/** Pembayaran yang masuk setelah periode ditutup: dari refund, atau dari percobaan terakhir. */
export function billRefund(bill: BillDto): { amountIdr: number; paidAt: string | null; orderId: string } | null {
  if (bill.refund) return bill.refund;
  if (bill.paymentState === "PAID_AFTER_CLOSE" && bill.payment) {
    return { amountIdr: bill.payment.amountIdr, paidAt: bill.payment.paidAt, orderId: bill.payment.orderId };
  }
  return null;
}

interface ClientBillFlags {
  /** Snap sudah selesai dan klien sedang menunggu webhook masuk. */
  checking: boolean;
  /** Percobaan yang hitung mundurnya sudah habis di peramban. */
  expiredPaymentId: string | null;
}

/**
 * Menurunkan keadaan layar dari data backend dan dua keadaan yang hanya ada di
 * klien. Status lunas selalu menang, sehingga tagihan lunas tidak pernah
 * tertimpa keadaan klien yang terlambat.
 */
export function resolveBillViewState(bill: BillDto, flags: ClientBillFlags): BillViewState {
  if (bill.status === "PAID") {
    if (bill.chain?.status === "RECORDED") return "PAID_RECORDED";
    if (bill.chain?.status === "NOT_RECORDED") return "PAID_NOT_RECORDED";
    // FAILED sengaja dibaca menunggu: pengulangannya tugas admin.
    return "PAID_QUEUED";
  }

  if (billRefund(bill)) return "REFUND_PENDING";
  if (bill.periodClosed) return "PERIOD_CLOSED";
  if (flags.checking) return "CHECKING";

  if (bill.paymentState === "PENDING") {
    return bill.payment?.id === flags.expiredPaymentId ? "EXPIRED" : "PENDING";
  }
  if (bill.paymentState === "EXPIRED") return "EXPIRED";
  if (bill.paymentState === "FAILED") return "FAILED";
  return "UNPAID";
}

/** Keadaan layar ke varian komponen Status tagihan. */
export const billBadgeStatus: Record<BillViewState, BillStatus> = {
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  CHECKING: "CHECKING",
  PAID_QUEUED: "PAID",
  PAID_RECORDED: "PAID",
  PAID_NOT_RECORDED: "PAID",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
  PERIOD_CLOSED: "UNPAID",
  REFUND_PENDING: "REFUND",
};

/**
 * Status on-chain tagihan ke enum komponen ChainStatus, untuk layar penghuni.
 * FAILED ditulis Menunggu pencatatan (lihat tenantChain).
 */
export const chainTxStatus: Record<NonNullable<BillDto["chain"]>["status"], ChainTxStatus> = {
  PENDING: "QUEUED",
  RECORDED: "CONFIRMED",
  FAILED: "QUEUED",
  NOT_RECORDED: "NOT_RECORDED",
};

const paymentMethodLabels: Record<string, string> = {
  bank_transfer: "virtual account",
  echannel: "virtual account",
  permata: "virtual account",
  qris: "QRIS",
  gopay: "GoPay",
  shopeepay: "ShopeePay",
  dana: "DANA",
  credit_card: "kartu kredit",
  cstore: "gerai ritel",
};

/** Metode bayar untuk kalimat, mis. "lewat virtual account". */
export function paymentMethodPhrase(method: string | null | undefined): string | undefined {
  return method ? paymentMethodLabels[method] : undefined;
}

/** Metode yang dibayar lewat virtual account; bank-nya dikirim terpisah oleh backend. */
const VIRTUAL_ACCOUNT_METHODS = new Set(["bank_transfer", "echannel", "permata"]);

/** Metode bayar untuk baris data, mis. "Virtual account BCA" atau "QRIS". */
export function paymentMethodName(
  method: string | null | undefined,
  bank?: string | null
): string | undefined {
  const label = paymentMethodPhrase(method);
  if (!label) return undefined;
  const name = label.charAt(0).toUpperCase() + label.slice(1);
  return bank && method && VIRTUAL_ACCOUNT_METHODS.has(method)
    ? `${name} ${bank.toUpperCase()}`
    : name;
}

/** Teks di bawah nominal slip, sesuai keadaan tagihan. */
export function billCaption(bill: BillDto, state: BillViewState): string {
  if (state === "PENDING") return "Selesaikan di halaman Midtrans sebelum waktu habis";

  if (state === "REFUND_PENDING") {
    const paidAt = billRefund(bill)?.paidAt;
    return paidAt
      ? `Dibayar ${formatDateTime(paidAt)}, setelah periode ditutup`
      : "Dibayar setelah periode ditutup";
  }

  if (bill.status === "PAID" && bill.paidAt) {
    const method = paymentMethodPhrase(bill.payment?.method);
    const paidAt = `Dibayar ${formatDateTime(bill.paidAt)}`;
    return method ? `${paidAt} lewat ${method}` : paidAt;
  }

  return `Jatuh tempo ${formatDate(bill.dueDate)}`;
}

/** Alamat halaman kuitansi satu tagihan. */
export function receiptHref(billId: string): string {
  return `/penghuni/tagihan/${encodeURIComponent(billId)}`;
}

/** "K03" -> 3 dan sebaliknya, sama dengan argumen room di recordRent. */
export function roomLabel(room: number): string {
  return `K${String(room).padStart(2, "0")}`;
}

/** 202611 -> "2026-11", sama dengan argumen period di recordRent. */
export function periodLabel(period: number): string {
  const text = String(period);
  return `${text.slice(0, 4)}-${text.slice(4)}`;
}

/** Nomor tagihan: order_id percobaan terakhir, atau nomor dasarnya bila belum ada. */
export function billNumber(bill: BillDto, room: TenantRoomDto | null): string | null {
  if (bill.payment) return bill.payment.orderId;
  return room ? `RENT-${room.propertyCode}-${room.number}-${bill.period}` : null;
}
