import type { ChainTransaction, HexString } from "@/lib/types";

/**
 * Transaksi terbaru yang dicatat di Sepolia (tab Blockchain). Data dummy:
 * order_id memakai format backend, tx hash belum ada di jaringan sungguhan.
 * Konsisten dengan papan kamar: hanya kamar lunas yang punya baris RENT-;
 * contoh "Menunggu pencatatan" memakai pembelian token yang baru lunas.
 */
export const recentTransactions: ChainTransaction[] = [
  {
    orderId: "RENT-SMR01-K03-2026-11",
    subject: "K03",
    date: "2026-11-02",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0x8f3ad09f1f873de4fbf297d449a54dccd88cc804f0a1c7d9084bee45dc49c21d",
  },
  {
    orderId: "BUY-SMR01-0043",
    subject: "Token",
    date: "2026-11-02",
    amountIdr: 5_000_000,
    chainStatus: "QUEUED",
  },
  {
    orderId: "RENT-SMR01-K05-2026-11",
    subject: "K05",
    date: "2026-11-01",
    amountIdr: 1_500_000,
    chainStatus: "CONFIRMED",
    txHash: "0xa94f2b721681c5ef0bdc18bb964de323186cd6d0fe7e16bf0eb976b8a10b0c18",
  },
  {
    orderId: "BUY-SMR01-0042",
    subject: "Token",
    date: "2026-11-01",
    amountIdr: 10_000_000,
    chainStatus: "CONFIRMED",
    txHash: "0x2d9b85866b3f0d2d2f4cae17f930037af56ea5e536143ce38a8c855348bde410",
  },
];

/** Isi kuitansi on-chain kamar K03 (beranda, bagian "Setiap sewa tercatat"). */
export const featuredReceipt = {
  contractCall: "KosLedger.recordRent",
  propertyCode: "KB-SMR01",
  room: "K03",
  period: "2026-11",
  amountIdr: 1_500_000,
  orderId: "RENT-SMR01-K03-2026-11",
  /** keccak256(order_id) sungguhan: bisa dicek ulang dengan alat keccak apa pun. */
  reference: "0x3e0898da66362f054486c1717235721369b80fe2daf13dee2a22340bcc68830a" as HexString,
  txHash: "0x8f3ad09f1f873de4fbf297d449a54dccd88cc804f0a1c7d9084bee45dc49c21d" as HexString,
  blockNumber: 7_148_220,
};
