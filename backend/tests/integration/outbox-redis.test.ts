// Alur lengkap sampai antrean dengan Redis sungguhan: webhook menulis outbox, dispatcher
// memindahkannya ke BullMQ, dan worker tiruan menerima job.
import { randomUUID } from 'node:crypto';
import { type Job, Worker } from 'bullmq';
import type { Express } from 'express';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/lib/prisma.js';
import {
  BLOCKCHAIN_JOB_OPTIONS,
  type BlockchainQueue,
  createBlockchainQueue,
  workerConnection,
} from '../../src/queue/blockchain-queue.js';
import { type BlockchainJobData, paymentReference } from '../../src/queue/jobs.js';
import { dispatchOutboxBatch, startOutboxDispatcher } from '../../src/queue/outbox-dispatcher.js';
import { bearer, FakeMidtrans, notifyStatus, RENT_IDR, resetDatabase, seedFixture, startPayment } from './helpers.js';

const ORDER_ID = 'RENT-SMR01-K03-2026-11';

let app: Express;
let queue: BlockchainQueue;

beforeAll(async () => {
  app = await createApp();
});

beforeEach(async () => {
  await resetDatabase();
  const fixture = await seedFixture();
  const fake = new FakeMidtrans();
  await startPayment(app, fixture.bill.id, await bearer(fixture.tenant));
  await notifyStatus(app, fake, ORDER_ID);

  // Nama antrean acak: tidak bercampur dengan antrean pengembangan di Redis yang sama.
  queue = createBlockchainQueue(`test-${randomUUID()}`);
  await queue.waitUntilReady();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await queue.obliterate({ force: true });
  await queue.close();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('dispatcher dengan Redis sungguhan', () => {
  it('memindahkan baris outbox ke BullMQ dengan id job yang sama', async () => {
    const row = await prisma.outboxJob.findFirstOrThrow();

    await expect(dispatchOutboxBatch(queue)).resolves.toEqual({ dispatched: 1, failed: 0 });

    const job = await queue.getJob(row.id);
    expect(job?.name).toBe('RECORD_RENT');
    expect(job?.data).toEqual({
      outboxJobId: row.id,
      type: 'RECORD_RENT',
      payload: {
        propertyCode: 'SMR01',
        roomNumber: 'K03',
        period: '2026-11',
        amountIdr: RENT_IDR,
        paymentRef: paymentReference(ORDER_ID),
      },
    });
    expect(job?.opts).toMatchObject({ attempts: BLOCKCHAIN_JOB_OPTIONS.attempts, backoff: BLOCKCHAIN_JOB_OPTIONS.backoff });
    await expect(prisma.outboxJob.findFirstOrThrow()).resolves.toMatchObject({ status: 'DISPATCHED' });
  });

  it('putaran kedua tidak mengirim ulang', async () => {
    await dispatchOutboxBatch(queue);

    await expect(dispatchOutboxBatch(queue)).resolves.toEqual({ dispatched: 0, failed: 0 });
    await expect(queue.getWaitingCount()).resolves.toBe(1);
  });

  it('id job yang sama diabaikan BullMQ, jadi proses yang mati sebelum menandai baris tidak menggandakan job', async () => {
    await dispatchOutboxBatch(queue);
    await prisma.outboxJob.updateMany({ data: { status: 'PENDING', dispatchedAt: null } });

    await dispatchOutboxBatch(queue);

    await expect(queue.getWaitingCount()).resolves.toBe(1);
  });

  it('worker menerima job dari antrean', async () => {
    const received = new Promise<Job<BlockchainJobData>>((resolve) => {
      const worker = new Worker<BlockchainJobData>(
        queue.name,
        async (job) => {
          resolve(job);
        },
        { connection: workerConnection },
      );
      worker.on('completed', () => void worker.close());
    });

    const dispatcher = startOutboxDispatcher(queue, { intervalMs: 50 });
    const job = await received;
    await dispatcher.stop();

    expect(job.data.type).toBe('RECORD_RENT');
    expect(job.data.payload).toMatchObject({ roomNumber: 'K03', period: '2026-11' });
  });

  it('Redis tidak bisa dihubungi: gagal cepat, baris tetap PENDING, dan terkirim setelah Redis kembali', async () => {
    const offline = createBlockchainQueue(`test-${randomUUID()}`, {
      url: 'redis://127.0.0.1:1',
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });

    const start = Date.now();
    await expect(dispatchOutboxBatch(offline)).resolves.toEqual({ dispatched: 0, failed: 1 });
    expect(Date.now() - start).toBeLessThan(5_000);
    await offline.close();

    const row = await prisma.outboxJob.findFirstOrThrow();
    expect(row).toMatchObject({ status: 'PENDING', attempts: 1 });
    expect(row.lastError).not.toBeNull();

    await expect(dispatchOutboxBatch(queue)).resolves.toEqual({ dispatched: 1, failed: 0 });
  });
});
