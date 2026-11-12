import { requestBackend } from "@/lib/api/client";
import type {
  BillPaymentPayload,
  BillsPayload,
  CurrentBillPayload,
  PaymentDto,
} from "@/lib/api/types";

/** Kunci SWR sekaligus alamat GET-nya. */
export const CURRENT_BILL_KEY = "/bills/current";
export const BILLS_KEY = "/bills";

export function fetchCurrentBill(): Promise<CurrentBillPayload> {
  return requestBackend<CurrentBillPayload>(CURRENT_BILL_KEY);
}

export function fetchBills(): Promise<BillsPayload> {
  return requestBackend<BillsPayload>(BILLS_KEY);
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
