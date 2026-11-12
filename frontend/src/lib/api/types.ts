import type { HexString } from "@/lib/types";

/**
 * Bentuk data API backend, sesuai docs/api/. Didefinisikan sendiri di frontend
 * (tidak mengimpor kode backend). Tanggal berupa teks ISO, uang berupa bilangan
 * bulat rupiah dengan akhiran Idr.
 */

/** Peran di backend. Peran rute frontend ada di lib/auth/roles.ts. */
export type ApiRole = "INVESTOR" | "TENANT" | "MANAGER" | "ADMIN";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: ApiRole;
}

/** Balasan POST /api/session. Token tidak pernah ikut: hanya ada di cookie httpOnly. */
export interface SessionPayload {
  user: SessionUser;
}

export type BillApiStatus = "UNPAID" | "PAID";

/** Ringkasan percobaan pembayaran terakhir pada sebuah tagihan. */
export type BillPaymentState = "NONE" | "PENDING" | "EXPIRED" | "FAILED" | "PAID";

export type PaymentStatus = "PENDING" | "PAID" | "EXPIRED" | "FAILED";

/** Status pencatatan on-chain. Di progress 2 selalu PENDING karena worker baru ada di progress 3. */
export type ChainRecordStatus = "PENDING" | "RECORDED" | "FAILED";

export interface ChainRecordDto {
  status: ChainRecordStatus;
  txHash: HexString | null;
  blockNumber: number | null;
}

export interface PaymentDto {
  id: string;
  orderId: string;
  amountIdr: number;
  status: PaymentStatus;
  /** payment_type dari Midtrans, null selama belum dibayar. */
  method: string | null;
  expiresAt: string;
  paidAt: string | null;
  /** Hanya terisi selama status PENDING dan belum kedaluwarsa. */
  snapToken: string | null;
}

export interface BillDto {
  id: string;
  /** Periode tagihan, mis. "2026-11". */
  period: string;
  amountIdr: number;
  status: BillApiStatus;
  dueDate: string;
  paidAt: string | null;
  paymentState: BillPaymentState;
  /** Percobaan pembayaran terakhir. */
  payment: PaymentDto | null;
  /** null selama tagihan belum lunas. */
  chain: ChainRecordDto | null;
}

export interface TenantRoomDto {
  number: string;
  propertyName: string;
  propertyCode: string;
  monthlyRentIdr: number;
  /** Masa sewa diturunkan dari tagihan, jadi null selama kamar belum punya tagihan. */
  leaseStart: string | null;
  leaseEnd: string | null;
  dueDay: number | null;
}

export interface CurrentBillPayload {
  bill: BillDto | null;
  room: TenantRoomDto | null;
}

export interface BillsPayload {
  bills: BillDto[];
}

export interface BillPaymentPayload {
  payment: PaymentDto;
}
