// Definisi antrean BullMQ untuk job blockchain. Membuat Queue langsung membuka koneksi Redis,
// jadi file ini hanya menyediakan fungsi; tidak ada koneksi yang dibuka saat diimpor.
import { type DefaultJobOptions, Queue, type RedisOptions } from 'bullmq';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { BLOCKCHAIN_QUEUE_NAME, type BlockchainJobData } from './jobs.js';

/** Percobaan ulang saat RPC gagal: 5 kali dengan jeda 10 detik, 20 detik, dan seterusnya. */
export const BLOCKCHAIN_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 10_000 },
  removeOnComplete: { count: 1_000 },
  removeOnFail: { count: 5_000 },
};

/**
 * Koneksi pengirim job: perintah langsung ditolak bila koneksi terputus, supaya dispatcher bisa
 * mencoba lagi nanti. Jangan memakai skipWaitingForReady: antrean yang dibuat saat Redis mati
 * akan gagal selamanya walau Redis sudah kembali. Selama koneksi pertama belum terbentuk add()
 * menunggu, dan dispatcher membatasi lamanya.
 */
export const producerConnection: RedisOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
};

/** Koneksi Worker. BullMQ mewajibkan maxRetriesPerRequest null agar worker terus menunggu Redis. */
export const workerConnection: RedisOptions = {
  url: env.REDIS_URL,
  maxRetriesPerRequest: null,
};

export type BlockchainQueue = Queue<BlockchainJobData>;

/** Membuat antrean. Pemanggil yang menutupnya dengan close() saat proses berhenti. */
export function createBlockchainQueue(
  name: string = BLOCKCHAIN_QUEUE_NAME,
  connection: RedisOptions = producerConnection,
): BlockchainQueue {
  const queue = new Queue<BlockchainJobData>(name, {
    connection,
    defaultJobOptions: BLOCKCHAIN_JOB_OPTIONS,
  });
  // Tanpa pendengar, error koneksi menjadi error yang tidak tertangani.
  queue.on('error', (error) => logger.warn({ err: error.message }, 'Koneksi antrean bermasalah'));
  return queue;
}
