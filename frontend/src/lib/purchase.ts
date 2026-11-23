import type {
  CurrentOfferingPayload,
  OfferingDto,
  OfferingInvestorDto,
  PurchaseDto,
} from "@/lib/api/types";

/**
 * Keadaan Tiket beli (Figma: "Tiket beli", 13 varian). Empat varian form
 * (Siap bayar, Belum setuju, Melebihi sisa, Melebihi batas) digabung menjadi
 * FORM karena bedanya dihitung dari isian di peramban (lihat checkAmount).
 */
export type TicketState =
  | "NEED_KYC"
  | "REGISTERING_WALLET"
  | "FORM"
  | "PENDING"
  | "CHECKING"
  | "PAID_SENDING"
  | "PAID_RECORDED"
  | "EXPIRED"
  | "FAILED"
  | "SOLD_OUT";

export interface TicketClientFlags {
  /** Snap selesai (onSuccess) dan klien menunggu webhook. */
  checking: boolean;
  /** Pesanan yang hitung mundurnya sudah habis di peramban. */
  expiredPurchaseId: string | null;
}

interface PurchaseSelection {
  /** Pesanan yang dibuat atau dilanjutkan di halaman ini. */
  trackedPurchaseId: string | null;
  /** Pesanan yang sudah ditutup investor lewat Beli lagi atau Buat pesanan baru. */
  dismissedPurchaseId: string | null;
}

/**
 * Pesanan yang ditampilkan tiket, atau null bila tiket menampilkan form.
 * /offerings/current hanya mengirim pesanan yang masih menunggu bayar, jadi
 * hasilnya (lunas, token dikirim, kedaluwarsa, gagal) dibaca dari GET /purchases.
 * Setelah halaman dimuat ulang, pesanan lunas yang tokennya belum tercatat tetap
 * ditampilkan supaya investor bisa memantau pengirimannya.
 */
export function pickPurchase(
  payload: CurrentOfferingPayload,
  purchases: PurchaseDto[] | undefined,
  { trackedPurchaseId, dismissedPurchaseId }: PurchaseSelection
): PurchaseDto | null {
  const list = purchases ?? [];
  const find = (id: string) =>
    list.find((item) => item.id === id) ??
    (payload.activePurchase?.id === id ? payload.activePurchase : null);

  if (trackedPurchaseId && trackedPurchaseId !== dismissedPurchaseId) {
    const tracked = find(trackedPurchaseId);
    if (tracked) return tracked;
  }

  const active = payload.activePurchase;
  if (active && active.id !== dismissedPurchaseId) return find(active.id) ?? active;

  const latest = list[0];
  if (
    latest &&
    latest.id !== dismissedPurchaseId &&
    latest.status === "PAID" &&
    latest.transfer?.status !== "RECORDED"
  ) {
    return latest;
  }
  return null;
}

/**
 * Menurunkan keadaan tiket dari data backend dan keadaan klien. Pesanan yang
 * ditampilkan selalu menang, supaya investor melihat hasil pembeliannya walau
 * penawaran sudah penuh karena pembelian itu.
 */
export function resolveTicketState(
  payload: CurrentOfferingPayload,
  purchase: PurchaseDto | null,
  flags: TicketClientFlags
): TicketState {
  if (purchase) {
    if (purchase.status === "PAID") {
      return purchase.transfer?.status === "RECORDED" ? "PAID_RECORDED" : "PAID_SENDING";
    }
    if (purchase.status === "PENDING_PAYMENT") {
      if (flags.checking) return "CHECKING";
      return purchase.id === flags.expiredPurchaseId ? "EXPIRED" : "PENDING";
    }
    return purchase.status === "EXPIRED" ? "EXPIRED" : "FAILED";
  }

  const { offering, investor } = payload;
  if (offering.status !== "OPEN" || offering.tokensSold >= offering.tokensOffered) {
    return "SOLD_OUT";
  }
  if (investor.kycStatus !== "APPROVED") return "NEED_KYC";
  if (!investor.walletReady) return "REGISTERING_WALLET";
  return "FORM";
}

export type AmountProblem = "INVALID" | "EXCEEDS_REMAINING" | "EXCEEDS_QUOTA";

/**
 * Pemeriksaan jumlah token sebelum pembayaran dibuat, dengan urutan yang sama
 * dengan backend: sisa penawaran dulu (skenario 8), lalu batas kepemilikan 10%
 * atau sisa kuota (skenario 9).
 */
export function checkAmount(
  amount: number | null,
  offering: Pick<OfferingDto, "tokensRemaining">,
  investor: Pick<OfferingInvestorDto, "remainingQuota">
): AmountProblem | null {
  if (amount === null || !Number.isInteger(amount) || amount < 1) return "INVALID";
  if (amount > offering.tokensRemaining) return "EXCEEDS_REMAINING";
  if (amount > investor.remainingQuota) return "EXCEEDS_QUOTA";
  return null;
}

/** Isian jumlah token ke angka; kosong atau bukan bilangan bulat menjadi null. */
export function parseTokenAmount(raw: string): number | null {
  if (!/^\d{1,7}$/.test(raw.trim())) return null;
  return Number(raw.trim());
}

/**
 * Bagi hasil per token per bulan dalam sen, sama dengan nilai closePeriod untuk
 * periode contoh November 2026 (43875 = Rp438,75). Hanya untuk estimasi.
 */
export const PAYOUT_PER_TOKEN_CENTS = 43_875;

/** Estimasi bagi hasil per bulan, dibulatkan ke bawah seperti pembagian pro-rata. */
export function estimateMonthlyPayout(tokens: number): number {
  return Math.floor((tokens * PAYOUT_PER_TOKEN_CENTS) / 100);
}
