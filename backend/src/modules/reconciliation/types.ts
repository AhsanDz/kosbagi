// Bentuk data rekonsiliasi: fakta dari tiap sumber (database, Midtrans, Sepolia) dan baris hasil
// yang dikirim ke halaman /admin/rekonsiliasi.
//
// Bentuk dasar mengikuti kontrak P4 bagian 5:
//   { summary: { total, matched, mismatched, checkedAt },
//     rows: [{ orderId, kind, amountIdr, midtrans, database, chain, result, reasons }] }
// Field tambahan (period, subject, flagged, anomalies, chain.jobStatus, chain.lastError,
// chain.blockNumber, chain.explorerUrl) hanya menambah, tidak mengubah bentuk dasar.

/** RENT untuk order sewa (RENT-...), BUY untuk order pembelian token (BUY-...). */
export type ReconciliationKind = 'RENT' | 'BUY';

/** Hasil satu baris: Cocok bila ketiga sumber sepakat, Selisih bila tidak. */
export type ReconciliationResult = 'MATCH' | 'MISMATCH';

/**
 * Status catatan di Sepolia untuk satu order:
 * - RECORDED: kontrak menyatakan referensi order ini sudah tercatat
 * - PENDING : belum tercatat, tetapi database punya job pencatatan yang belum selesai
 * - NONE    : belum tercatat dan tidak ada job
 * - ERROR   : kontrak tidak bisa dibaca saat pemeriksaan
 */
export type ChainRecordStatus = 'RECORDED' | 'PENDING' | 'NONE' | 'ERROR';

/** Status job pencatatan menurut database (tabel outbox + transaksi chain terbaru). */
export type ChainJobStatus = 'PENDING' | 'RECORDED' | 'FAILED';

/** Sumber yang nilainya menyimpang, untuk menandai kartu di rincian baris. */
export type ReconciliationSource = 'MIDTRANS' | 'DATABASE' | 'CHAIN';

/** Status database untuk order_id yang hanya dikenal lewat anomali UNKNOWN_ORDER. */
export const DATABASE_NOT_FOUND = 'NOT_FOUND';

/** Status Midtrans bila API status menjawab 404 (transaksi tidak ada). Ditulis seperti status Midtrans lain. */
export const MIDTRANS_NOT_FOUND = 'not_found';

/** Status Midtrans bila API status gagal dihubungi atau melewati batas waktu. */
export const MIDTRANS_ERROR = 'error';

export interface AnomalyFact {
  /** Jenis anomali apa adanya dari database, mis. AMOUNT_MISMATCH. Bisa berupa jenis baru dari skema berikutnya. */
  type: string;
  note: string | null;
  expectedAmountIdr: bigint | null;
  receivedAmountIdr: bigint | null;
  occurrences: number;
  createdAt: Date;
}

export interface JobFact {
  status: ChainJobStatus;
  txHash: string | null;
  blockNumber: number | null;
  lastError: string | null;
}

/** Keterangan barang yang dibayar, untuk teks rincian. Tanpa nama atau data pribadi. */
export interface SubjectFact {
  propertyCode: string | null;
  /** Nomor kamar untuk RENT, mis. K03. */
  roomNumber: string | null;
  /** Periode sewa untuk RENT, mis. 2026-11. */
  period: string | null;
  /** Jumlah token untuk BUY. */
  tokenAmount: number | null;
  /** Harga satu token untuk BUY, dipakai mengubah jumlah token on-chain menjadi rupiah. */
  tokenPriceIdr: bigint | null;
  /** Dompet kustodian investor untuk BUY: token harus sampai ke alamat ini. */
  walletAddress: string | null;
}

/** Satu order menurut database. */
export interface DatabaseFact {
  orderId: string;
  kind: ReconciliationKind;
  /**
   * Status percobaan pembayaran apa adanya (PENDING, PAID, DUPLICATE_PAID, EXPIRED, FAILED,
   * UNFULFILLED, atau status baru dari skema berikutnya), atau NOT_FOUND bila order_id hanya
   * dikenal lewat anomali UNKNOWN_ORDER.
   */
  status: string;
  /** Nominal yang ditagihkan ke Midtrans. Null untuk NOT_FOUND. */
  amountIdr: bigint | null;
  createdAt: Date;
  subject: SubjectFact;
  /** Null bila belum pernah ada job pencatatan untuk order ini. */
  job: JobFact | null;
  anomalies: AnomalyFact[];
}

/** Jawaban API status Midtrans untuk satu order. */
export interface MidtransFact {
  /** transaction_status apa adanya, atau not_found, atau error. */
  status: string;
  grossAmountIdr: bigint | null;
  /** Lunas menurut aturan yang sama dengan webhook: settlement/capture, status_code 200, fraud accept. */
  paid: boolean;
  /** Pesan untuk admin bila status gagal dicek. */
  error: string | null;
}

/** Catatan di Sepolia untuk satu order. */
export interface ChainFact {
  status: 'RECORDED' | 'NONE' | 'ERROR';
  /** Nominal on-chain dalam rupiah. Untuk BUY: jumlah token × harga token. Null bila tidak ada atau tidak terbaca. */
  amountIdr: bigint | null;
  /** Jumlah token yang dipindahkan (BUY). */
  tokenAmount: bigint | null;
  /** Penerima token (BUY). */
  recipient: string | null;
  txHash: string | null;
  blockNumber: number | null;
  error: string | null;
}

export interface ReconciliationAnomalyDto {
  type: string;
  note: string | null;
  expectedAmountIdr: bigint | null;
  receivedAmountIdr: bigint | null;
  occurrences: number;
  createdAt: Date;
}

export interface ReconciliationRowDto {
  orderId: string;
  kind: ReconciliationKind;
  /** Nominal menurut database; untuk order tak dikenal, nominal dari Midtrans. */
  amountIdr: bigint | null;
  midtrans: { status: string; grossAmountIdr: bigint | null };
  database: { status: string; amountIdr: bigint | null };
  chain: {
    status: ChainRecordStatus;
    amountIdr: bigint | null;
    txHash: string | null;
    blockNumber: number | null;
    /** Tautan Etherscan; null di jaringan tanpa penjelajah (Hardhat lokal). */
    explorerUrl: string | null;
    /** Status job pencatatan menurut database, null bila tidak ada job. */
    jobStatus: ChainJobStatus | null;
    /** Galat terakhir worker atau galat saat membaca kontrak. Hanya untuk admin. */
    lastError: string | null;
  };
  result: ReconciliationResult;
  /** Penjelasan selisih dalam Bahasa Indonesia, urut dari yang paling penting. Kosong bila Cocok. */
  reasons: string[];
  /**
   * Sumber yang menyimpang. Kosong bila Cocok, dan juga kosong bila Selisih hanya karena anomali
   * sedangkan ketiga sumber sepakat (keputusan 20 November 2026).
   */
  flagged: ReconciliationSource[];
  subject: { roomNumber: string | null; period: string | null; tokenAmount: number | null };
  anomalies: ReconciliationAnomalyDto[];
}

export interface ReconciliationSummaryDto {
  total: number;
  matched: number;
  mismatched: number;
  checkedAt: Date;
}

export interface ReconciliationReport {
  period: string;
  summary: ReconciliationSummaryDto;
  rows: ReconciliationRowDto[];
}
