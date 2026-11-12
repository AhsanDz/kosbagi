// Memindahkan baris outbox ke antrean BullMQ. Server belum menjalankannya di P2 karena worker
// baru ada di P3; startOutboxDispatcher() dipanggil dari proses yang menjalankan worker.
//
// Pengiriman bersifat "minimal sekali": bila proses mati setelah job masuk antrean tetapi
// sebelum baris ditandai, job dikirim lagi. Id job BullMQ memakai id baris outbox sehingga
// kiriman kedua diabaikan selama job masih ada, dan kontrak menolak referensi yang sudah tercatat.
import type { OutboxJob, PrismaClient } from '../generated/prisma/client.js';
import { logger } from '../lib/logger.js';
import { prisma } from '../lib/prisma.js';
import { z } from '../lib/zod.js';
import type { BlockchainJobData } from './jobs.js';
import { parseJobPayload } from './jobs.js';

const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_INTERVAL_MS = 2_000;
const ENQUEUE_TIMEOUT_MS = 3_000;

/** Bagian antrean yang dipakai dispatcher. Queue BullMQ memenuhinya. */
export interface JobSink {
  add(name: string, data: BlockchainJobData, options: { jobId: string }): Promise<unknown>;
}

type OutboxDb = Pick<PrismaClient, 'outboxJob'>;

export interface DispatchResult {
  dispatched: number;
  failed: number;
}

function toJobData(job: OutboxJob): BlockchainJobData {
  return { outboxJobId: job.id, type: job.type, payload: parseJobPayload(job.type, job.payload) };
}

/**
 * Memasukkan satu job dengan batas waktu. Bila add() baru selesai setelah batas waktu, baris
 * tetap PENDING dan dikirim lagi; BullMQ mengabaikan kiriman kedua karena id job-nya sama.
 */
async function enqueue(queue: JobSink, job: OutboxJob): Promise<void> {
  const data = toJobData(job);
  let timer: NodeJS.Timeout | undefined;
  const timedOut = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Antrean tidak menjawab dalam batas waktu.')), ENQUEUE_TIMEOUT_MS);
  });
  try {
    await Promise.race([queue.add(job.type, data, { jobId: job.id }), timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mengirim satu angkatan baris PENDING, urut waktu dibuat. Baris yang gagal tetap PENDING dan
 * dicoba lagi di putaran berikutnya.
 *
 * Kegagalan antrean menghentikan angkatan, karena baris berikutnya pasti gagal juga. Isi job yang
 * rusak hanya melewati baris itu, supaya satu baris rusak tidak menahan semua job di belakangnya.
 */
export async function dispatchOutboxBatch(
  queue: JobSink,
  db: OutboxDb = prisma,
  batchSize: number = DEFAULT_BATCH_SIZE,
): Promise<DispatchResult> {
  const pending = await db.outboxJob.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  const result: DispatchResult = { dispatched: 0, failed: 0 };
  for (const job of pending) {
    try {
      await enqueue(queue, job);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn({ outboxJobId: job.id, err: message }, 'Job outbox gagal masuk antrean');
      await db.outboxJob.update({
        where: { id: job.id },
        data: { attempts: { increment: 1 }, lastError: message },
      });
      result.failed += 1;
      if (error instanceof z.ZodError) continue;
      return result;
    }

    await db.outboxJob.update({
      where: { id: job.id },
      data: { status: 'DISPATCHED', dispatchedAt: new Date(), lastError: null },
    });
    result.dispatched += 1;
  }
  return result;
}

export interface OutboxDispatcher {
  /** Menghentikan putaran dan menunggu putaran yang sedang berjalan selesai. */
  stop(): Promise<void>;
}

/** Menjalankan dispatchOutboxBatch berulang. Putaran berikutnya baru dijadwalkan setelah yang ini selesai. */
export function startOutboxDispatcher(
  queue: JobSink,
  { db = prisma, intervalMs = DEFAULT_INTERVAL_MS }: { db?: OutboxDb; intervalMs?: number } = {},
): OutboxDispatcher {
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<void> = Promise.resolve();

  const tick = async (): Promise<void> => {
    try {
      await dispatchOutboxBatch(queue, db);
    } catch (error) {
      // Basis data sedang bermasalah: dicoba lagi di putaran berikutnya.
      logger.error({ err: error }, 'Putaran dispatcher outbox gagal');
    }
    if (!stopped) schedule();
  };

  function schedule(): void {
    timer = setTimeout(() => {
      running = tick();
    }, intervalMs);
  }

  schedule();

  return {
    async stop() {
      stopped = true;
      clearTimeout(timer);
      await running;
    },
  };
}
