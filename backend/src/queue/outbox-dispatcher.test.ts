// Dispatcher diuji dengan basis data dan antrean tiruan. Versi dengan PostgreSQL dan Redis
// sungguhan ada di tests/integration/outbox-redis.test.ts.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OutboxJob } from '../generated/prisma/client.js';
import { paymentReference } from './jobs.js';
import { dispatchOutboxBatch, type JobSink, startOutboxDispatcher } from './outbox-dispatcher.js';

const payload = {
  propertyCode: 'SMR01',
  roomNumber: 'K03',
  period: '2026-11',
  amountIdr: 1_500_000,
  paymentRef: paymentReference('RENT-SMR01-K03-2026-11'),
};

function outboxRow(id: string, overrides: Partial<OutboxJob> = {}): OutboxJob {
  return {
    id,
    type: 'RECORD_RENT',
    dedupeKey: `record-rent:${id}`,
    payload,
    paymentId: null,
    status: 'PENDING',
    attempts: 0,
    lastError: null,
    dispatchedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/** Tabel outbox di memori dengan dua operasi yang dipakai dispatcher. */
function fakeDb(rows: OutboxJob[]) {
  const outboxJob = {
    findMany: vi.fn(async ({ take }: { take: number }) => rows.filter((row) => row.status === 'PENDING').slice(0, take)),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
      const row = rows.find((item) => item.id === where.id);
      if (!row) throw new Error('baris tidak ada');
      const { attempts, ...rest } = data;
      Object.assign(row, rest);
      if (attempts) row.attempts += 1;
      return row;
    }),
  };
  return { outboxJob } as never;
}

function fakeQueue(): JobSink & { add: ReturnType<typeof vi.fn> } {
  return { add: vi.fn(async () => undefined) };
}

describe('dispatchOutboxBatch', () => {
  it('memasukkan baris PENDING ke antrean lalu menandainya DISPATCHED', async () => {
    const rows = [outboxRow('job-1'), outboxRow('job-2')];
    const queue = fakeQueue();

    await expect(dispatchOutboxBatch(queue, fakeDb(rows))).resolves.toEqual({ dispatched: 2, failed: 0 });

    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledWith(
      'RECORD_RENT',
      { outboxJobId: 'job-1', type: 'RECORD_RENT', payload },
      { jobId: 'job-1' },
    );
    expect(rows.map((row) => row.status)).toEqual(['DISPATCHED', 'DISPATCHED']);
    expect(rows[0]?.dispatchedAt).toBeInstanceOf(Date);
  });

  it('tidak mengirim ulang baris yang sudah DISPATCHED', async () => {
    const rows = [outboxRow('job-1', { status: 'DISPATCHED' })];
    const queue = fakeQueue();

    await expect(dispatchOutboxBatch(queue, fakeDb(rows))).resolves.toEqual({ dispatched: 0, failed: 0 });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('job tetap PENDING saat Redis mati, lalu terkirim di putaran berikutnya', async () => {
    const rows = [outboxRow('job-1'), outboxRow('job-2')];
    const db = fakeDb(rows);
    const queue = fakeQueue();
    queue.add.mockRejectedValueOnce(new Error('Connection is closed.'));

    await expect(dispatchOutboxBatch(queue, db)).resolves.toEqual({ dispatched: 0, failed: 1 });
    // Berhenti di kegagalan pertama: job kedua belum dicoba.
    expect(queue.add).toHaveBeenCalledOnce();
    expect(rows[0]).toMatchObject({ status: 'PENDING', attempts: 1, lastError: 'Connection is closed.' });

    await expect(dispatchOutboxBatch(queue, db)).resolves.toEqual({ dispatched: 2, failed: 0 });
    expect(rows[0]).toMatchObject({ status: 'DISPATCHED', lastError: null });
  });

  it('menghormati ukuran angkatan', async () => {
    const rows = [outboxRow('job-1'), outboxRow('job-2'), outboxRow('job-3')];

    await expect(dispatchOutboxBatch(fakeQueue(), fakeDb(rows), 2)).resolves.toEqual({ dispatched: 2, failed: 0 });
    expect(rows[2]?.status).toBe('PENDING');
  });

  it('isi job yang melanggar kontrak tidak masuk antrean dan tidak menahan job di belakangnya', async () => {
    const rows = [outboxRow('job-1', { payload: { ...payload, tenantName: 'Sari Wulandari' } }), outboxRow('job-2')];
    const queue = fakeQueue();

    await expect(dispatchOutboxBatch(queue, fakeDb(rows))).resolves.toEqual({ dispatched: 1, failed: 1 });

    expect(queue.add).toHaveBeenCalledOnce();
    expect(queue.add.mock.calls[0]?.[1]).toMatchObject({ outboxJobId: 'job-2' });
    expect(rows.map((row) => row.status)).toEqual(['PENDING', 'DISPATCHED']);
    expect(rows[0]?.lastError).toBeTruthy();
  });
});

describe('startOutboxDispatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('tidak macet saat antrean tidak pernah menjawab, seperti Redis yang belum pernah tersambung', async () => {
    const rows = [outboxRow('job-1')];
    const queue = fakeQueue();
    queue.add.mockReturnValueOnce(new Promise(() => undefined));
    const dispatcher = startOutboxDispatcher(queue, { db: fakeDb(rows), intervalMs: 1_000 });

    await vi.advanceTimersByTimeAsync(1_000 + 3_000);
    expect(rows[0]).toMatchObject({ status: 'PENDING', attempts: 1 });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(rows[0]?.status).toBe('DISPATCHED');

    await dispatcher.stop();
  });

  it('mengirim job berkala dan berhenti setelah stop()', async () => {
    const rows = [outboxRow('job-1')];
    const db = fakeDb(rows);
    const queue = fakeQueue();
    const dispatcher = startOutboxDispatcher(queue, { db, intervalMs: 1_000 });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(queue.add).toHaveBeenCalledOnce();

    rows.push(outboxRow('job-2'));
    await dispatcher.stop();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(queue.add).toHaveBeenCalledOnce();
  });

  it('tetap berjalan setelah satu putaran gagal', async () => {
    const rows = [outboxRow('job-1')];
    const db = fakeDb(rows) as { outboxJob: { findMany: ReturnType<typeof vi.fn> } };
    db.outboxJob.findMany.mockRejectedValueOnce(new Error('basis data mati'));
    const queue = fakeQueue();
    const dispatcher = startOutboxDispatcher(queue, { db: db as never, intervalMs: 1_000 });

    await vi.advanceTimersByTimeAsync(2_000);
    expect(queue.add).toHaveBeenCalledOnce();

    await dispatcher.stop();
  });
});
