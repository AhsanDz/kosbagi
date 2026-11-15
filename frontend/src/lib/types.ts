/**
 * Tipe data frontend KosBagi. Didefinisikan sendiri di sini (tidak mengimpor
 * kode backend). Nama enum mengikuti deskripsi komponen Figma. Bentuk respons
 * API backend ada di src/lib/api/types.ts.
 */

/** Alamat atau hash heksadesimal Ethereum, mis. tx hash 0x + 64 karakter. */
export type HexString = `0x${string}`;

/** Peran aplikasi, sekaligus segmen rute: /investor, /penghuni, /pengelola, /admin. */
export type AppRole = "investor" | "penghuni" | "pengelola" | "admin";

/**
 * Status tagihan sewa atau pembelian token (Figma: komponen "Status tagihan").
 * CHECKING hanya ada di klien: jeda setelah Snap selesai sampai webhook masuk.
 */
export type BillStatus =
  | "UNPAID"
  | "PENDING"
  | "CHECKING"
  | "PAID"
  | "EXPIRED"
  | "FAILED"
  | "CANCELLED";

/** Status transaksi blockchain (Figma: komponen "Status on-chain"). */
export type ChainTxStatus = "QUEUED" | "SENT" | "CONFIRMED" | "FAILED";

/** Sewa satu kamar pada periode berjalan, dasar "Papan kamar". */
export interface RoomRent {
  /** Nomor kamar, mis. "K03". */
  code: string;
  /** false = kamar kosong (tidak ada penghuni, tidak ada tagihan). */
  occupied: boolean;
  billStatus: BillStatus | null;
  /** Nominal sewa bulanan dalam rupiah. */
  amountIdr: number;
  /** Status pencatatan recordRent di KosLedger (hanya untuk tagihan lunas). */
  chainStatus?: ChainTxStatus;
  txHash?: HexString;
}

/** Properti yang ditokenisasi. */
export interface Property {
  slug: string;
  name: string;
  /** Kode properti di kontrak dan simbol token, mis. KB-SMR01. */
  tokenSymbol: string;
  address: string;
  /** Alamat tanpa kota, dipakai di Kartu kamar. */
  shortAddress: string;
  city: string;
  campusDistance: string;
  roomCount: number;
  roomLabel: string;
  description: string;
  photo: { src: string; alt: string; width: number; height: number };
  monthlyRentIdr: number;
  occupiedRooms: number;
  annualGrossRentIdr: number;
  propertyValueIdr: number;
  totalTokens: number;
  tokenPriceIdr: number;
  ownerTokens: number;
  investorTokens: number;
  maxTokensPerInvestor: number;
  contracts: { kosToken: HexString; kosLedger: HexString };
}

/** Penawaran token yang sedang dibuka. */
export interface Offering {
  propertySlug: string;
  soldTokens: number;
  offeredTokens: number;
  /** Tanggal penawaran ditutup (ISO, zona Asia/Jakarta). */
  closesAt: string;
  /** Estimasi imbal per tahun, mis. 0.053 = 5,3%. */
  estimatedAnnualYield: number;
}

/** Transaksi yang sudah atau sedang dicatat on-chain. */
export interface ChainTransaction {
  orderId: string;
  /** Nomor kamar, atau "Token" untuk pembelian token. */
  subject: string;
  date: string;
  amountIdr: number;
  chainStatus: ChainTxStatus;
  txHash?: HexString;
}

/** Dokumen properti yang hash-nya dicatat di KosToken saat penerbitan. */
export interface PropertyDocument {
  title: string;
  fileInfo: string;
  chainStatus: ChainTxStatus;
  txHash: HexString;
}

/** Satu butir risiko: ringkas untuk beranda, lengkap untuk tab Risiko. */
export interface Risk {
  title: string;
  summary: string;
  detail: string;
}

/**
 * Bentuk respons API backend. Sukses: { data }. Galat: { error: { code, message,
 * details?, requestId } }. Nominal uang berupa bilangan bulat rupiah dengan nama
 * field berakhiran "Idr" (mis. amountIdr), sama dengan tipe di berkas ini.
 */
export interface ApiSuccess<T> {
  data: T;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    requestId: string;
  };
}
