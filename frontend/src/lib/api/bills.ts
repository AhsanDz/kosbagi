import { requestBackend } from "@/lib/api/client";
import type {
  BillDetailPayload,
  BillPaymentPayload,
  BillsPayload,
  CurrentBillPayload,
  PaymentDto,
} from "@/lib/api/types";
import { tenantBill } from "@/lib/billing";

/** Kunci SWR sekaligus alamat GET-nya. */
export const CURRENT_BILL_KEY = "/bills/current";
export const BILLS_KEY = "/bills";

/*
 * Semua tagihan penghuni melewati tenantBill: status pencatatan FAILED dibaca
 * PENDING, sehingga penghuni tidak pernah melihat kata gagal (pertahanan
 * berlapis setelah pemetaan yang sama di backend P4).
 */

export async function fetchCurrentBill(): Promise<CurrentBillPayload> {
  const payload = await requestBackend<CurrentBillPayload>(CURRENT_BILL_KEY);
  return { ...payload, bill: payload.bill ? tenantBill(payload.bill) : null };
}

export async function fetchBills(): Promise<BillsPayload> {
  const payload = await requestBackend<BillsPayload>(BILLS_KEY);
  return { ...payload, bills: payload.bills.map(tenantBill) };
}

/** Kunci SWR satu tagihan, sekaligus alamat GET-nya. */
export function billKey(billId: string): string {
  return `/bills/${encodeURIComponent(billId)}`;
}

/** GET /bills/:id: tagihan beserta data kuitansi bila sudah lunas. */
export async function fetchBill(key: string): Promise<BillDetailPayload> {
  const payload = await requestBackend<BillDetailPayload>(key);
  return { ...payload, bill: tenantBill(payload.bill) };
}

/**
 * POST /bills/:id/payments. Backend mengembalikan percobaan aktif dengan token
 * yang sama, atau membuat percobaan baru bila percobaan terakhir sudah berakhir.
 */
export async function createBillPayment(billId: string): Promise<PaymentDto> {
  const { payment } = await requestBackend<BillPaymentPayload>(
    `/bills/${encodeURIComponent(billId)}/payments`,
    { method: "POST" }
  );
  return payment;
}
