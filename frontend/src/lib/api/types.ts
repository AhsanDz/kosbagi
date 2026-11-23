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

/**
 * Status pencatatan on-chain sebuah tagihan lunas. NOT_RECORDED dipakai untuk
 * data lampau seed yang lunas tanpa pembayaran Midtrans: tidak pernah dicatat
 * dan tidak punya tautan Etherscan.
 */
export type ChainRecordStatus = "PENDING" | "RECORDED" | "FAILED" | "NOT_RECORDED";

export interface ChainRecordDto {
  status: ChainRecordStatus;
  txHash: HexString | null;
  blockNumber: number | null;
}

/** Status job blockchain lain (whitelist KYC, transfer token). */
export type ChainJobStatus = "PENDING" | "RECORDED" | "FAILED";

export interface ChainJobDto {
  status: ChainJobStatus;
  /**
   * Bisa null walau RECORDED: catatan sudah ada on-chain tetapi transaksi asalnya
   * tidak ditemukan. Layar tetap menulis Tercatat, hanya tanpa tautan Etherscan.
   */
  txHash: HexString | null;
  /** Tidak selalu dikirim backend; tampil bila ada. */
  blockNumber?: number | null;
  /** Pesan galat terakhir dari worker (bahasa Indonesia), hanya ditampilkan ke admin. */
  lastError?: string | null;
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

/**
 * Argumen recordRent persis seperti yang dikirim worker ke KosLedger: kamar K03 = 3,
 * periode 2026-11 = 202611, paymentRef = keccak256(order_id).
 */
export interface RentReceiptOnChainDto {
  room: number;
  period: number;
  amountIdr: number;
  paymentRef: HexString;
  /** Alamat KosLedger, null bila backend belum diisi alamat kontrak. */
  contractAddress: HexString | null;
  txHash: HexString | null;
  blockNumber: number | null;
  /** Waktu blok (ISO). Backend belum mengirimnya; baris Waktu blok tampil bila ada. */
  blockTimestamp?: string | null;
}

/** Data kuitansi tagihan lunas (GET /bills/:id). */
export interface RentReceiptDto {
  /** order_id yang melunasi tagihan. null untuk data lampau tanpa pembayaran Midtrans. */
  orderId: string | null;
  /** transaction_id Midtrans. */
  transactionId: string | null;
  /** payment_type Midtrans apa adanya, mis. bank_transfer atau qris. */
  method: string | null;
  /** Bank virtual account, mis. bca. null untuk metode lain. */
  bank: string | null;
  paidAt: string | null;
  tenantName: string;
  propertyCode: string;
  propertyName: string;
  roomNumber: string;
  /** null bila tagihan tidak punya catatan on-chain (data lampau). */
  onChain: RentReceiptOnChainDto | null;
}

export interface BillDetailDto extends BillDto {
  /** null selama tagihan belum lunas. */
  receipt: RentReceiptDto | null;
}

export interface BillDetailPayload {
  bill: BillDetailDto;
}

export interface TenantRoomDto {
  number: string;
  propertyName: string;
  propertyCode: string;
  /** Alamat properti untuk Kartu kamar. */
  propertyAddress: string;
  /** Nama pengelola kos, null bila belum ada. */
  managerName: string | null;
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

/* ---------- KYC ---------- */

/** Status pengajuan KYC di backend. Investor tanpa pengajuan tidak punya status. */
export type KycStatus = "SUBMITTED" | "APPROVED" | "REJECTED";

export interface KycDto {
  id: string;
  fullName: string;
  dummyIdNumber: string;
  status: KycStatus;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
}

/** Dompet kustodian investor dan status pencatatan lolos KYC di KosToken. */
export interface CustodialWalletDto {
  address: HexString;
  whitelist: ChainJobDto;
}

/** GET /kyc/me. */
export interface MyKycPayload {
  kyc: KycDto | null;
  wallet: CustodialWalletDto | null;
}

export interface KycPayload {
  kyc: KycDto;
}

/** Hasil pemeriksaan otomatis backend untuk satu pengajuan. */
export interface KycChecksDto {
  dummyPrefix: boolean;
  nameMatchesAccount: boolean;
  noOtherActive: boolean;
}

export interface KycAdminItemDto extends KycDto {
  user: { id: string; name: string; email: string };
  checks: KycChecksDto;
  /** Terisi setelah pengajuan disetujui. */
  wallet: CustodialWalletDto | null;
  /** Urutan pengajuan investor ini: 1 untuk pengajuan pertama, 2 setelah ditolak sekali. */
  attempt: number;
}

/** GET /kyc?status=... */
export interface KycListPayload {
  submissions: KycAdminItemDto[];
  counts: Record<KycStatus, number>;
}

/** POST /kyc/:id/approve dan /reject. Wallet hanya terisi saat disetujui. */
export interface KycReviewPayload {
  kyc: KycDto;
  wallet?: CustodialWalletDto | null;
}

/* ---------- Penawaran dan pembelian token ---------- */

export interface OfferingDto {
  id: string;
  propertyCode: string;
  tokenSymbol: string;
  pricePerTokenIdr: number;
  tokensOffered: number;
  tokensSold: number;
  /** Token yang sedang disisihkan pesanan PENDING_PAYMENT yang belum kedaluwarsa. */
  tokensReserved: number;
  /** Sudah dikurangi tokensReserved. */
  tokensRemaining: number;
  closesAt: string;
  /** OPEN, CLOSED (terjual habis), atau CANCELLED (target tidak tercapai). */
  status: "OPEN" | "CLOSED" | "CANCELLED";
}

export interface OfferingInvestorDto {
  /** null bila investor belum pernah mengajukan KYC. */
  kycStatus: KycStatus | "NONE" | null;
  /** true bila dompet kustodian sudah tercatat lolos KYC di KosToken. */
  walletReady: boolean;
  /** Alamat dompet kustodian, null sebelum KYC disetujui. */
  walletAddress: HexString | null;
  holdingTokens: number;
  reservedTokens: number;
  /** Sudah dikurangi pesanan sendiri yang masih menunggu bayar. */
  remainingQuota: number;
  maxPerInvestor: number;
}

export type PurchaseStatus = "PENDING_PAYMENT" | "PAID" | "EXPIRED" | "FAILED";

export interface PurchaseDto {
  id: string;
  /** Nomor pesanan, sama dengan order_id percobaan pertama, mis. BUY-SMR01-0003. */
  orderNumber: string | null;
  tokenAmount: number;
  amountIdr: number;
  /** Pesanan yang melewati reservedUntil sudah dibaca EXPIRED oleh backend. */
  status: PurchaseStatus;
  /** Batas bayar sekaligus batas sisihan token. */
  reservedUntil: string | null;
  createdAt: string;
  payment: PaymentDto | null;
  /** Pemindahan token dari perbendaharaan, terisi setelah lunas. */
  transfer: ChainJobDto | null;
}

/** GET /offerings/current. */
export interface CurrentOfferingPayload {
  offering: OfferingDto;
  investor: OfferingInvestorDto;
  activePurchase: PurchaseDto | null;
}

export interface PurchasePayload {
  purchase: PurchaseDto;
}

export interface PurchasesPayload {
  /** Terbaru lebih dulu. */
  purchases: PurchaseDto[];
}

/** POST /purchases/:id/payments. */
export interface PurchasePaymentPayload {
  payment: PaymentDto;
  purchase: PurchaseDto;
}
