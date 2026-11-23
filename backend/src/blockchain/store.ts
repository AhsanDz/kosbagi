// Akses basis data worker: baris outbox (sumber kebenaran isi job), riwayat transaksi chain, dan
// dompet kustodian. Dibungkus antarmuka kecil supaya processor bisa diuji dengan tiruan di memori.
//
// Model riwayat transaksi (tabel chain_transactions, skema v2):
// - Satu baris per transaksi yang ditandatangani. Job yang transaksinya dibuang jaringan lalu
//   dikirim ulang punya dua baris: yang lama FAILED, yang baru PENDING lalu RECORDED.
// - Baris terbaru yang ditampilkan ke pengguna (src/modules/bills/dto.ts membaca createdAt terbaru).
// - txHash ditulis SEBELUM transaksi disiarkan, jadi proses yang mati di tengah tidak kehilangan hash.
// - Baris tanpa txHash berarti gagal sebelum ada transaksi (mis. kontrak menolak saat simulasi),
//   atau sudah tercatat sebelumnya tanpa transaksi dari job ini.
import type { ChainTransactionStatus } from '../generated/prisma/enums.js';
import type { OutboxJob, PrismaClient } from '../generated/prisma/client.js';
import { prisma } from '../lib/prisma.js';

export interface ChainTxRecord {
  id: string;
  outboxJobId: string;
  reference: string;
  txHash: string | null;
  blockNumber: bigint | null;
  status: ChainTransactionStatus;
  attempts: number;
  lastError: string | null;
  createdAt: Date;
}

export interface NewChainTx {
  outboxJobId: string;
  reference: string;
  status: ChainTransactionStatus;
  attempts: number;
  txHash?: string | null;
  blockNumber?: bigint | null;
  lastError?: string | null;
}

export type ChainTxChanges = Partial<Pick<ChainTxRecord, 'txHash' | 'blockNumber' | 'status' | 'attempts' | 'lastError'>>;

export interface CustodialWalletRecord {
  address: string;
  derivationIndex: number;
}

export interface ChainStore {
  findOutboxJob(id: string): Promise<OutboxJob | null>;
  /** Semua transaksi satu job, terlama lebih dulu. */
  listTransactions(outboxJobId: string): Promise<ChainTxRecord[]>;
  createTransaction(data: NewChainTx): Promise<ChainTxRecord>;
  updateTransaction(id: string, changes: ChainTxChanges): Promise<ChainTxRecord>;
  /** Dompet kustodian dengan alamat ini, tanpa membedakan huruf besar kecil. */
  findCustodialWallet(address: string): Promise<CustodialWalletRecord | null>;
}

type ChainDb = Pick<PrismaClient, 'outboxJob' | 'chainTransaction' | 'custodialWallet'>;

export function createPrismaChainStore(db: ChainDb = prisma): ChainStore {
  return {
    findOutboxJob(id) {
      return db.outboxJob.findUnique({ where: { id } });
    },
    listTransactions(outboxJobId) {
      // id UUID v7 juga terurut waktu, jadi dipakai sebagai penentu urutan bila createdAt kembar.
      return db.chainTransaction.findMany({ where: { outboxJobId }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] });
    },
    createTransaction(data) {
      return db.chainTransaction.create({ data });
    },
    updateTransaction(id, changes) {
      return db.chainTransaction.update({ where: { id }, data: changes });
    },
    findCustodialWallet(address) {
      return db.custodialWallet.findFirst({
        where: { address: { equals: address, mode: 'insensitive' } },
        select: { address: true, derivationIndex: true },
      });
    },
  };
}
