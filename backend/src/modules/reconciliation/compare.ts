// Aturan rekonsiliasi satu order: membandingkan fakta database, Midtrans, dan Sepolia, lalu
// menentukan Cocok atau Selisih beserta alasannya. Fungsi murni tanpa jaringan dan basis data,
// jadi seluruh aturan diuji di compare.test.ts.
//
// Satu baris Cocok bila ketiga sumber sepakat soal dua hal:
// 1. Uang: Midtrans lunas tepat ketika database mencatat order itu lunas, dengan nominal sama.
// 2. Catatan: order yang lunas tercatat di Sepolia dengan nominal sama; order yang tidak lunas
//    tidak tercatat.
// Percobaan yang kedaluwarsa atau dibatalkan dihitung Cocok karena ketiga sumber sepakat tidak ada
// uang dan tidak ada catatan. Status yang belum dikenal modul ini (mis. status baru dari skema
// berikutnya) tidak pernah dianggap lunas, sehingga uang yang masuk untuknya selalu menjadi Selisih.
//
// Keputusan 20 November 2026: order yang punya anomali pembayaran, jenis apa pun, selalu Selisih
// dengan alasan "Ada anomali <jenis>", walau ketiga sumber sepakat. Contohnya notifikasi bernominal
// palsu (skenario uji 7): API status Midtrans benar, tetapi anomalinya harus terlihat admin.
import { etherscanTxUrl } from '../../blockchain/etherscan.js';
import type { TransactionStatus } from '../payments/midtrans.js';
import {
  type AnomalyFact,
  type ChainFact,
  type ChainRecordStatus,
  DATABASE_NOT_FOUND,
  type DatabaseFact,
  MIDTRANS_ERROR,
  MIDTRANS_NOT_FOUND,
  type MidtransFact,
  type ReconciliationRowDto,
  type ReconciliationSource,
} from './types.js';

const TX_HASH = /^0x[0-9a-fA-F]{64}$/;

/** Status percobaan yang berarti uangnya dihitung sebagai pembayaran sah tagihan atau pesanan. */
const PAID_STATUS = 'PAID';

const DATABASE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'belum dibayar',
  EXPIRED: 'kedaluwarsa',
  FAILED: 'gagal atau dibatalkan',
};

const rupiahFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/** 1500000n menjadi "Rp1.500.000". */
export function formatRupiah(value: bigint): string {
  return `Rp${rupiahFormatter.format(value)}`;
}

/** ": pesan" tanpa titik akhir, untuk disisipkan di tengah kalimat. Kosong bila tidak ada pesan. */
function detail(message: string | null): string {
  return message ? `: ${message.replace(/\.+$/, '')}` : '';
}

function shortHash(value: string): string {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

/**
 * Mengubah gross_amount Midtrans (teks seperti "1500000.00") menjadi rupiah bilangan bulat.
 * Pecahan selain nol tidak valid karena semua tagihan rupiah utuh. Aturannya sama dengan
 * pembacaan nominal di webhook.
 */
export function parseGrossAmount(raw: string | undefined): bigint | null {
  if (raw === undefined) return null;
  const match = /^(\d+)(?:\.0+)?$/.exec(raw);
  return match?.[1] ? BigInt(match[1]) : null;
}

/**
 * Lunas menurut aturan yang sama dengan webhook: transaction_status settlement atau capture,
 * status_code 200, dan fraud_status accept bila field itu ada.
 */
export function isMidtransPaid(status: Pick<TransactionStatus, 'transaction_status' | 'status_code' | 'fraud_status'>): boolean {
  const fraudCleared = status.fraud_status === undefined || status.fraud_status === 'accept';
  const settled = status.transaction_status === 'settlement' || status.transaction_status === 'capture';
  return settled && status.status_code === '200' && fraudCleared;
}

/** Fakta Midtrans dari jawaban API status; null berarti transaksi tidak ada (404). */
export function toMidtransFact(status: TransactionStatus | null): MidtransFact {
  if (!status) return { status: MIDTRANS_NOT_FOUND, grossAmountIdr: null, paid: false, error: null };
  return {
    status: status.transaction_status,
    grossAmountIdr: parseGrossAmount(status.gross_amount),
    paid: isMidtransPaid(status),
    error: null,
  };
}

/** Fakta Midtrans saat API status gagal dihubungi atau melewati batas waktu. */
export function midtransErrorFact(message: string): MidtransFact {
  return { status: MIDTRANS_ERROR, grossAmountIdr: null, paid: false, error: message };
}

function thing(kind: DatabaseFact['kind']): string {
  return kind === 'RENT' ? 'tagihan' : 'pesanan';
}

function writeCall(kind: DatabaseFact['kind']): string {
  return kind === 'RENT' ? 'recordRent' : 'transferFromTreasury';
}

/** Alasan saat Midtrans lunas tetapi database tidak menghitungnya sebagai pembayaran sah. */
function unaccountedMoneyReason(db: DatabaseFact): string {
  switch (db.status) {
    case DATABASE_NOT_FOUND:
      return 'Midtrans mencatat pembayaran untuk order_id yang tidak dikenal database. Dananya perlu dikembalikan.';
    case 'DUPLICATE_PAID':
      return `${thing(db.kind) === 'tagihan' ? 'Tagihan' : 'Pesanan'} sudah lunas lewat order lain, jadi pembayaran ini tidak dihitung dan dananya perlu dikembalikan.`;
    case 'UNFULFILLED':
      return 'Pembayaran masuk setelah sisihan token lepas dan tokennya tidak bisa dikirim. Dananya perlu dikembalikan.';
    case 'PAID_AFTER_CLOSE':
      // Status skema v4 jalur 2 (keputusan 16 November 2026 K4), dibaca sebagai teks.
      return 'Pembayaran masuk setelah periode ditutup, jadi tidak ikut dibagikan. Dana perlu dikembalikan.';
    case 'PENDING':
      return `Midtrans mencatat lunas, tetapi database belum. Kirim ulang notifikasi untuk order ini atau periksa log webhook.`;
    default: {
      const label = DATABASE_STATUS_LABEL[db.status];
      return label
        ? `Midtrans mencatat lunas, tetapi database mencatat percobaan ini ${label}.`
        : `Midtrans mencatat lunas, tetapi status database ${db.status}, bukan PAID.`;
    }
  }
}

/** Alasan saat order lunas tetapi belum tercatat di Sepolia. */
function unrecordedReason(db: DatabaseFact): string {
  const job = db.job;
  if (!job) return `Sudah lunas, tetapi job ${writeCall(db.kind)} tidak ada di antrean.`;
  if (job.status === 'FAILED') {
    return `Sudah lunas, tetapi ${writeCall(db.kind)} gagal dicatat${detail(job.lastError)}. Coba lagi dari antrean job di Ringkasan admin.`;
  }
  if (job.status === 'RECORDED') {
    const tx = job.txHash ? ` ${shortHash(job.txHash)}` : '';
    return `Database mencatat transaksi${tx}, tetapi catatannya tidak ada di kontrak yang sedang dipakai.`;
  }
  return `Sudah lunas, ${writeCall(db.kind)} masih menunggu dikirim worker.`;
}

/**
 * Satu alasan per jenis anomali. Jenis yang sudah disebut alasan lain (mis. AMOUNT_MISMATCH di
 * alasan nominal BUY-SMR01-0004) tidak ditulis dua kali. Isi anomalinya ada di `anomalies`.
 */
function anomalyReasons(anomalies: readonly AnomalyFact[], reasons: readonly string[]): string[] {
  const types = [...new Set(anomalies.map((anomaly) => anomaly.type))];
  return types.filter((type) => !reasons.some((reason) => reason.includes(type))).map((type) => `Ada anomali ${type}.`);
}

function chainStatusFor(db: DatabaseFact, chain: ChainFact): ChainRecordStatus {
  if (chain.status !== 'NONE') return chain.status;
  return db.job && db.job.status !== 'RECORDED' ? 'PENDING' : 'NONE';
}

function explorerUrl(txHash: string | null, chainId: number): string | null {
  return txHash && TX_HASH.test(txHash) ? etherscanTxUrl(txHash, chainId) : null;
}

export interface CompareOptions {
  /** Chain ID jaringan yang dibaca, untuk tautan Etherscan. */
  chainId: number;
}

/** Membandingkan tiga sumber untuk satu order. */
export function compareSources(
  db: DatabaseFact,
  midtrans: MidtransFact,
  chain: ChainFact,
  options: CompareOptions,
): ReconciliationRowDto {
  const reasons: string[] = [];
  const flagged = new Set<ReconciliationSource>();
  const flag = (source: ReconciliationSource, reason: string) => {
    flagged.add(source);
    reasons.push(reason);
  };

  const dbPaid = db.status === PAID_STATUS;
  const expected = db.amountIdr;
  const hasAmountAnomaly = db.anomalies.some((anomaly) => anomaly.type === 'AMOUNT_MISMATCH');

  // 1 dan 2. Uang: Midtrans dibandingkan dengan database.
  if (midtrans.status === MIDTRANS_ERROR) {
    flag('MIDTRANS', `Status Midtrans gagal dicek${detail(midtrans.error)}. Tekan Periksa ulang.`);
  } else {
    const amountDiffers =
      expected !== null && midtrans.grossAmountIdr !== null && midtrans.grossAmountIdr !== expected;

    if (amountDiffers) {
      if (hasAmountAnomaly && !dbPaid) {
        flag(
          'MIDTRANS',
          `Nominal dari Midtrans tidak sama dengan ${thing(db.kind)}, jadi ${thing(db.kind)} tidak diproses dan anomali AMOUNT_MISMATCH dicatat. ` +
            (db.kind === 'BUY' ? 'Tidak ada token yang dikirim.' : 'Tidak ada sewa yang dicatat.'),
        );
      } else {
        flag(
          'MIDTRANS',
          `Nominal di Midtrans ${formatRupiah(midtrans.grossAmountIdr as bigint)} berbeda dari nominal di database ${formatRupiah(expected)}.`,
        );
      }
    }

    if (midtrans.paid && !dbPaid && !amountDiffers) flag('DATABASE', unaccountedMoneyReason(db));
    if (!midtrans.paid && dbPaid) {
      flag('MIDTRANS', `Database mencatat lunas, tetapi status Midtrans ${midtrans.status}.`);
    }
  }

  // 3. Catatan: Sepolia dibandingkan dengan database.
  if (chain.status === 'ERROR') {
    flag('CHAIN', `Sepolia tidak bisa dibaca${detail(chain.error)}. Tekan Periksa ulang.`);
  } else if (dbPaid) {
    if (chain.status === 'NONE') {
      flag('CHAIN', unrecordedReason(db));
    } else {
      if (chain.amountIdr === null) {
        flag('CHAIN', 'Tercatat di Sepolia, tetapi nominalnya tidak bisa dibaca dari log transaksi.');
      } else if (expected !== null && chain.amountIdr !== expected) {
        flag(
          'CHAIN',
          `Nominal di Sepolia ${formatRupiah(chain.amountIdr)} berbeda dari nominal di database ${formatRupiah(expected)}.`,
        );
      }
      const wallet = db.subject.walletAddress;
      if (db.kind === 'BUY' && chain.recipient && wallet && chain.recipient.toLowerCase() !== wallet.toLowerCase()) {
        flag(
          'CHAIN',
          `Token dikirim ke ${shortHash(chain.recipient)}, bukan ke dompet kustodian investor ${shortHash(wallet)}.`,
        );
      }
    }
  } else if (chain.status === 'RECORDED') {
    flag('CHAIN', `Tercatat di Sepolia padahal database tidak mencatat order ini lunas.`);
  }

  // 4. Anomali: setiap jenis yang belum disebut menjadi alasan Selisih tersendiri. Tidak menandai
  // sumber mana pun, karena bisa saja ketiga sumber sepakat (skenario uji 7).
  reasons.push(...anomalyReasons(db.anomalies, reasons));

  const chainTxHash = chain.status === 'RECORDED' ? (chain.txHash ?? db.job?.txHash ?? null) : null;
  const chainBlock = chain.status === 'RECORDED' ? (chain.blockNumber ?? db.job?.blockNumber ?? null) : null;

  return {
    orderId: db.orderId,
    kind: db.kind,
    amountIdr: expected ?? midtrans.grossAmountIdr,
    midtrans: { status: midtrans.status, grossAmountIdr: midtrans.grossAmountIdr },
    database: { status: db.status, amountIdr: expected },
    chain: {
      status: chainStatusFor(db, chain),
      amountIdr: chain.status === 'RECORDED' ? chain.amountIdr : null,
      txHash: chainTxHash,
      blockNumber: chainBlock,
      explorerUrl: explorerUrl(chainTxHash, options.chainId),
      jobStatus: db.job?.status ?? null,
      lastError: chain.status === 'ERROR' ? chain.error : (db.job?.lastError ?? null),
    },
    result: reasons.length > 0 ? 'MISMATCH' : 'MATCH',
    reasons,
    flagged: [...flagged],
    subject: {
      roomNumber: db.subject.roomNumber,
      period: db.subject.period,
      tokenAmount: db.subject.tokenAmount,
    },
    anomalies: db.anomalies.map((anomaly) => ({ ...anomaly })),
  };
}
