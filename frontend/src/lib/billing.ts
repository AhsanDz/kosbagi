import type { BillDto, TenantRoomDto } from "@/lib/api/types";
import { formatDate, formatDateTime } from "@/lib/format";
import type { BillStatus, ChainTxStatus } from "@/lib/types";

/**
 * Keadaan tagihan bulan berjalan di layar penghuni. Delapan keadaan ini sama
 * dengan varian "Status" komponen Slip tagihan di Figma.
 */
export type BillViewState =
  | "UNPAID"
  | "PENDING"
  | "CHECKING"
  | "PAID_QUEUED"
  | "PAID_RECORDED"
  | "PAID_CHAIN_FAILED"
  | "EXPIRED"
  | "FAILED";

export const PAID_VIEW_STATES: readonly BillViewState[] = [
  "PAID_QUEUED",
  "PAID_RECORDED",
  "PAID_CHAIN_FAILED",
];

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
    if (bill.chain?.status === "FAILED") return "PAID_CHAIN_FAILED";
    return "PAID_QUEUED";
  }

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
  PAID_CHAIN_FAILED: "PAID",
  EXPIRED: "EXPIRED",
  FAILED: "FAILED",
};

/** Status on-chain API ke enum yang dipakai komponen ChainStatus. */
export const chainTxStatus: Record<NonNullable<BillDto["chain"]>["status"], ChainTxStatus> = {
  PENDING: "QUEUED",
  RECORDED: "CONFIRMED",
  FAILED: "FAILED",
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

/** Teks di bawah nominal slip, sesuai keadaan tagihan. */
export function billCaption(bill: BillDto, state: BillViewState): string {
  if (state === "PENDING") return "Selesaikan di halaman Midtrans sebelum waktu habis";

  if (bill.status === "PAID" && bill.paidAt) {
    const method = bill.payment?.method ? paymentMethodLabels[bill.payment.method] : undefined;
    const paidAt = `Dibayar ${formatDateTime(bill.paidAt)}`;
    return method ? `${paidAt} lewat ${method}` : paidAt;
  }

  return `Jatuh tempo ${formatDate(bill.dueDate)}`;
}

/** Nomor tagihan: order_id percobaan terakhir, atau nomor dasarnya bila belum ada. */
export function billNumber(bill: BillDto, room: TenantRoomDto | null): string | null {
  if (bill.payment) return bill.payment.orderId;
  return room ? `RENT-${room.propertyCode}-${room.number}-${bill.period}` : null;
}
