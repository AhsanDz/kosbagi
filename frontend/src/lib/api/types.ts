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

/**
 * Ringkasan percobaan pembayaran terakhir pada sebuah tagihan. PAID_AFTER_CLOSE
 * (P4): terbayar setelah periode tagihannya ditutup; tagihan tetap belum dibayar
 * dan dananya dikembalikan.
 */
export type BillPaymentState = "NONE" | "PENDING" | "EXPIRED" | "FAILED" | "PAID" | "PAID_AFTER_CLOSE";

/** Pengembalian dana untuk pembayaran yang masuk setelah periode ditutup (P4). */
export interface BillRefundDto {
  status: "PENDING";
  amountIdr: number;
  paidAt: string;
  orderId: string;
}

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
  /**
   * null selama tagihan belum lunas. Sejak P4 backend tidak pernah mengirim
   * FAILED ke penghuni; frontend tetap memetakannya ke PENDING (lib/billing.ts).
   */
  chain: ChainRecordDto | null;
  /** P4: periode tagihan sudah ditutup, jadi tagihan ini tidak bisa dibayar lagi. */
  periodClosed?: boolean;
  /** P4: pembayaran masuk setelah periode ditutup dan dananya akan dikembalikan. */
  refund?: BillRefundDto | null;
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

/* ---------- Portofolio investor (P4) ---------- */

/**
 * Status pencatatan yang dilihat investor. Backend sudah memetakan FAILED menjadi
 * PENDING, jadi investor tidak pernah melihat kata gagal untuk pencatatan.
 */
export type InvestorChainStatus = "PENDING" | "RECORDED";

/** Kepemilikan token investor di satu properti. */
export interface HoldingDto {
  tokenSymbol: string;
  tokenBalance: number;
  /** Porsi dari total suplai. Tampilan menghitung ulang dari tokenBalance supaya satuannya pasti. */
  percentOfSupply: number;
  walletAddress: HexString;
}

export interface LastDistributionDto {
  /** Periode yang dibagikan, mis. "2026-11". */
  period: string;
  amountIdr: number;
  distributedAt: string;
}

/**
 * Status satu kamar di Daftar sewa masuk. RECORDED dan PENDING untuk tagihan
 * lunas; UNPAID dan VACANT bila backend ikut mengirim kamar yang belum bayar
 * atau kosong. FAILED tidak pernah dikirim ke investor; bila tetap datang,
 * frontend membacanya sebagai PENDING.
 */
export type RentFeedStatus = "RECORDED" | "PENDING" | "UNPAID" | "VACANT";

export interface RentFeedItemDto {
  /** Nomor kamar, mis. "K03". Tanpa nama penghuni. */
  roomNumber: string;
  /** null untuk kamar kosong yang tidak ditagih. */
  amountIdr: number | null;
  recordedAt: string | null;
  /** keccak256(order_id). */
  paymentRef: HexString | null;
  txHash: HexString | null;
  status: RentFeedStatus | "FAILED";
  /** Tidak ada di kontrak P4; dipakai bila backend mengirimnya. */
  paidAt?: string | null;
  dueDate?: string | null;
}

/** Sewa tercatat per tanggal bayar (jumlah harian, bukan kumulatif). */
export interface RentChartPointDto {
  /** Tanggal pembayaran tercatat, "YYYY-MM-DD" atau ISO. */
  date: string;
  amountIdr: number;
}

/** Status periode di backend (sama dengan GET /periods/:period). */
export type PeriodStatus = "OPEN" | "CLOSING" | "CLOSE_FAILED" | "CLOSED" | "DISTRIBUTED";

export interface InvestorCurrentPeriodDto {
  period: string;
  status: PeriodStatus;
  recordedRentIdr: number;
  roomsRecorded: number;
  roomsTotal: number;
  chart: RentChartPointDto[];
  rentFeed: RentFeedItemDto[];
}

/** GET /portfolio/summary. */
export interface PortfolioSummaryPayload {
  balanceIdr: number;
  lastDistribution: LastDistributionDto | null;
  holding: HoldingDto | null;
  currentPeriod: InvestorCurrentPeriodDto;
  /** Prototipe belum punya disbursement: enabled selalu false beserta alasannya. */
  withdraw: { enabled: boolean; reason: string | null };
}

export interface PortfolioDistributionDto {
  period: string;
  /** Saldo token investor di blok snapshot. */
  tokenBalance: number;
  /** Nilai per token dalam sen (43875 = Rp438,75). */
  valuePerTokenSen: number;
  amountIdr: number;
  distributedAt: string;
  closeTxHash: HexString | null;
  /** Tidak ada di kontrak P4; tampil bila backend mengirimnya. */
  snapshotBlock?: number | null;
}

export type PortfolioTransactionType = "PURCHASE" | "DISTRIBUTION" | "KYC_APPROVED";

export interface PortfolioTransactionDto {
  /** PURCHASE atau DISTRIBUTION; jenis lain ditampilkan dengan rinciannya saja. */
  type: PortfolioTransactionType | (string & {});
  occurredAt: string;
  description: string;
  tokenAmount: number | null;
  amountIdr: number | null;
  chain: { status: InvestorChainStatus | "FAILED"; txHash: HexString | null } | null;
}

/** GET /portfolio. */
export interface PortfolioPayload {
  holding: HoldingDto | null;
  wallet: { address: HexString } | null;
  /** Terbaru lebih dulu. */
  distributions: PortfolioDistributionDto[];
  /** Terbaru lebih dulu. */
  transactions: PortfolioTransactionDto[];
}

/* ---------- Pengelola: status kamar (P4) ---------- */

/** Status pencatatan apa adanya: pengelola dan admin boleh melihat FAILED. */
export type StaffChainStatus = "PENDING" | "RECORDED" | "FAILED";

export interface ManagerRoomsSummaryDto {
  expectedIdr: number;
  paidIdr: number;
  recordedIdr: number;
  pendingIdr: number;
  roomsPaid: number;
  roomsRecorded: number;
  roomsOccupied: number;
}

export interface ManagerRoomBillDto {
  id: string;
  status: BillApiStatus;
  dueDate: string;
  paidAt: string | null;
  amountIdr: number;
}

export interface ManagerRoomDto {
  roomNumber: string;
  /** Status kamar di backend: OCCUPIED, VACANT, atau MAINTENANCE. */
  status: "OCCUPIED" | "VACANT" | "MAINTENANCE";
  tenantName: string | null;
  bill: ManagerRoomBillDto | null;
  chain: { status: StaffChainStatus; txHash: HexString | null } | null;
  /** Hari lewat jatuh tempo; 0 bila belum lewat atau sudah lunas. */
  daysOverdue: number;
}

export interface ManagerFollowUpDto {
  kind: "OVERDUE" | "CHAIN_FAILED" | "EXPENSE_PENDING";
  roomNumber: string | null;
  expenseId: string | null;
}

/** GET /manager/rooms?period=YYYY-MM. */
export interface ManagerRoomsPayload {
  period: string;
  summary: ManagerRoomsSummaryDto;
  rooms: ManagerRoomDto[];
  followUps: ManagerFollowUpDto[];
}

/* ---------- Biaya dan nota (P4) ---------- */

export interface ExpenseCategoryDto {
  /** Kode uint8 di KosLedger: 1 Listrik dan air, 2 Kebersihan, 3 Internet, 4 Perbaikan, 5 Keamanan. */
  code: number;
  label: string;
}

export interface ExpenseChainDto {
  status: StaffChainStatus;
  txHash: HexString | null;
  blockNumber: number | null;
  lastError: string | null;
}

export interface ExpenseDto {
  id: string;
  period: string;
  category: ExpenseCategoryDto;
  description: string;
  amountIdr: number;
  /** Tanggal nota, "YYYY-MM-DD". */
  receiptDate: string;
  /** SHA-256 isi file nota, 0x + 64 hex. */
  receiptHash: HexString;
  fileName: string;
  createdAt: string;
  createdBy: { name: string };
  chain: ExpenseChainDto;
}

/** GET /expenses?period=YYYY-MM. */
export interface ExpensesPayload {
  period: string;
  /** true setelah periode ditutup: biaya periode ini hanya bisa dibaca. */
  closed: boolean;
  totals: { recordedIdr: number; pendingIdr: number; totalIdr: number; count: number };
  categories: ExpenseCategoryDto[];
  /** Terbaru lebih dulu. */
  expenses: ExpenseDto[];
}

export interface ExpensePayload {
  expense: ExpenseDto;
}

/** Rincian galat 409 RECEIPT_ALREADY_RECORDED. */
export interface DuplicateReceiptDetails {
  expenseId: string;
  categoryLabel: string;
  description: string;
  receiptDate: string;
  amountIdr: number;
  createdAt: string;
}

/* ---------- Periode, penutupan, distribusi (P4) ---------- */

export interface PeriodReceiptDto {
  /** true sebelum periode ditutup: angka dari data yang sudah tercatat on-chain saja. */
  provisional: boolean;
  grossRentIdr: number;
  roomsRecorded: number;
  roomsTotal: number;
  expensesIdr: number;
  /** Jumlah nota yang sudah tercatat. */
  expensesRecorded: number;
  platformFeeIdr: number;
  taxableProfitIdr: number;
  taxIdr: number;
  netRentIdr: number;
  totalSupply: number;
  valuePerTokenSen: number;
}

export type PeriodRequirementKey =
  | "RENT_UNRECORDED"
  | "EXPENSE_UNRECORDED"
  | "TRANSFER_UNRECORDED"
  | "JOB_FAILED";

export interface PeriodRequirementDto {
  key: PeriodRequirementKey;
  ok: boolean;
  count: number;
}

export interface PeriodCloseDto {
  job: {
    id: string;
    status: AdminJobStatus;
    attempts: number;
    lastError: string | null;
  };
  txHash: HexString | null;
  blockNumber: number | null;
  snapshotBlock: number | null;
  /** Tidak ada di kontrak P4; baris Ditutup tampil bila backend mengirimnya. */
  closedAt?: string | null;
}

export interface DistributionHolderDto {
  holderType: "INVESTOR" | "ORIGINAL_OWNER";
  label: string;
  walletAddress: HexString;
  tokenBalance: number;
  shareIdr: number;
}

export interface DistributionTreasuryDto {
  walletAddress: HexString;
  tokenBalance: number;
  shareIdr: number;
  /** Keputusan 16 Nov 2026: bagian token belum terjual masuk ke saldo pemilik lama. */
  creditedTo: "ORIGINAL_OWNER";
}

export interface PeriodDistributionDto {
  distributedAt: string;
  distributedBy: { name: string };
  holders: DistributionHolderDto[];
  treasury: DistributionTreasuryDto;
  roundingRemainderIdr: number;
}

/**
 * Pratinjau bagian pemegang setelah periode ditutup tetapi sebelum distribusi
 * (Figma: Tutup periode, ditutup). Tidak ada di kontrak P4; tampil bila ada.
 */
export type PeriodDistributionPreviewDto = Omit<
  PeriodDistributionDto,
  "distributedAt" | "distributedBy"
>;

/** GET /periods/:period. */
export interface PeriodPayload {
  period: string;
  status: PeriodStatus;
  receipt: PeriodReceiptDto;
  requirements: PeriodRequirementDto[];
  /** Tagihan periode ini yang belum dibayar (informasi, tidak memblokir). */
  unpaidBills: number;
  close: PeriodCloseDto | null;
  distribution: PeriodDistributionDto | null;
  preview?: PeriodDistributionPreviewDto | null;
}

/** POST /periods/:period/distribute. */
export interface DistributePayload {
  distribution: PeriodDistributionDto;
}

/* ---------- Admin: ringkasan dan antrean job (P4) ---------- */

/** GET /admin/summary. */
export interface AdminSummaryPayload {
  currentPeriod: {
    period: string;
    status: PeriodStatus;
    roomsRecorded: number;
    roomsTotal: number;
    expensesIdr: number;
  };
  attention: {
    kycSubmitted: number;
    jobsFailed: number;
    jobsPending: number;
    anomaliesOpen: number;
    /** Pembayaran yang masuk setelah periode ditutup dan dananya perlu dikembalikan. */
    refundsPending?: number;
  };
}

/** GET /reconciliation/summary (modul rekonsiliasi jalur 1). */
export interface ReconciliationSummaryPayload {
  total: number;
  matched: number;
  mismatched: number;
  checkedAt: string;
}

export type ChainJobType =
  | "RECORD_RENT"
  | "WHITELIST_KYC"
  | "TRANSFER_TOKENS"
  | "RECORD_EXPENSE"
  | "CLOSE_PERIOD";

export type AdminJobStatus = "QUEUED" | "PENDING" | "RECORDED" | "FAILED";

export interface AdminJobDto {
  id: string;
  type: ChainJobType;
  /** order_id (sewa, pembelian), hash nota (biaya), periode (tutup periode), alamat dompet (whitelist). */
  reference: string;
  createdAt: string;
  attempts: number;
  status: AdminJobStatus;
  txHash: HexString | null;
  lastError: string | null;
  /** Job gagal yang ditandai ditangani admin: tidak lagi menghalangi penutupan periode. */
  resolution?: AdminJobResolutionDto | null;
}

export interface AdminJobResolutionDto {
  resolvedAt: string;
  resolvedBy: { name: string };
  note: string;
}

export type AdminJobsView = "open" | "all";

/** GET /admin/jobs?view=open|all. */
export interface AdminJobsPayload {
  jobs: AdminJobDto[];
}
