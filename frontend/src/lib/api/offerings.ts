import { requestBackend } from "@/lib/api/client";
import type {
  CurrentOfferingPayload,
  PurchasePayload,
  PurchasePaymentPayload,
  PurchasesPayload,
} from "@/lib/api/types";

/** Kunci SWR sekaligus alamat GET penawaran yang sedang dibuka. */
export const CURRENT_OFFERING_KEY = "/offerings/current";

export function fetchCurrentOffering(): Promise<CurrentOfferingPayload> {
  return requestBackend<CurrentOfferingPayload>(CURRENT_OFFERING_KEY);
}

/**
 * POST /offerings/:id/purchases. Backend memeriksa KYC, dompet, sisa penawaran
 * (skenario 8), dan batas kepemilikan (skenario 9) sebelum membuat pembayaran.
 */
export function createPurchase(offeringId: string, tokenAmount: number): Promise<PurchasePayload> {
  return requestBackend<PurchasePayload>(
    `/offerings/${encodeURIComponent(offeringId)}/purchases`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenAmount }),
    }
  );
}

/** POST /purchases/:id/payments: lanjutkan percobaan aktif, atau buat percobaan baru. */
export function createPurchasePayment(purchaseId: string): Promise<PurchasePaymentPayload> {
  return requestBackend<PurchasePaymentPayload>(
    `/purchases/${encodeURIComponent(purchaseId)}/payments`,
    { method: "POST" }
  );
}

/**
 * Kunci SWR sekaligus alamat GET pesanan milik investor, terbaru lebih dulu.
 * /offerings/current hanya mengirim pesanan yang masih menunggu bayar, jadi hasil
 * pesanan (lunas, token dikirim, kedaluwarsa) dibaca dari daftar ini.
 */
export const PURCHASES_KEY = "/purchases";

export function fetchPurchases(): Promise<PurchasesPayload> {
  return requestBackend<PurchasesPayload>(PURCHASES_KEY);
}
