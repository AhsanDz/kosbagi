// Kunci tunggal di Redis: hanya satu proses worker yang boleh berjalan untuk satu dompet operator.
// Dua worker yang mengirim transaksi bersamaan akan membaca nonce yang sama, dan salah satu
// transaksinya ditolak jaringan. Konkurensi 1 di BullMQ hanya berlaku di dalam satu proses, jadi
// kunci ini menjaga antarproses.
//
// Kunci punya masa berlaku (TTL) dan diperpanjang berkala selama worker hidup. Bila proses mati
// tanpa sempat melepas kunci (mis. dihentikan paksa), kunci hilang sendiri setelah TTL habis, dan
// worker baru yang sedang menunggu bisa mengambilnya.
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { safeErrorMessage } from './errors.js';

export const WORKER_LOCK_TTL_MS = 15_000;
const RENEW_INTERVAL_MS = 5_000;

// Perpanjang atau hapus hanya bila kunci masih milik token ini.
const RENEW_SCRIPT = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end`;
const RELEASE_SCRIPT = `if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end`;

export interface WorkerLock {
  /** Melepas kunci dan menutup koneksi Redis-nya. */
  release(): Promise<void>;
}

export interface WorkerLockOptions {
  redisUrl: string;
  /** Nama kunci; satu nama per dompet operator. */
  key: string;
  /** Berapa lama menunggu worker lain melepas kunci sebelum menyerah. */
  waitMs?: number;
  ttlMs?: number;
  /** Dipanggil bila kunci hilang saat worker berjalan (Redis di-reset atau proses tertahan lama). */
  onLost: () => void;
}

export function workerLockKey(chainId: number, operatorAddress: string): string {
  return `kosbagi:blockchain-worker:${chainId}:${operatorAddress.toLowerCase()}`;
}

/** Mengambil kunci. Melempar Error bila worker lain masih memegangnya setelah waitMs. */
export async function acquireWorkerLock({
  redisUrl,
  key,
  waitMs = WORKER_LOCK_TTL_MS + 5_000,
  ttlMs = WORKER_LOCK_TTL_MS,
  onLost,
}: WorkerLockOptions): Promise<WorkerLock> {
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
  redis.on('error', () => {
    // Error koneksi dilaporkan lewat kegagalan perintah di bawah; pendengar ini mencegah crash.
  });

  const token = randomUUID();
  const deadline = Date.now() + waitMs;
  try {
    try {
      await redis.connect();
    } catch (error) {
      throw new Error(
        `Redis tidak bisa dihubungi untuk kunci worker (${safeErrorMessage(error, [redisUrl])}). ` +
          'Periksa REDIS_URL dan jalankan npm run db:up.',
      );
    }
    for (;;) {
      const acquired = await redis.set(key, token, 'PX', ttlMs, 'NX');
      if (acquired === 'OK') break;
      if (Date.now() >= deadline) {
        throw new Error(
          'Worker blockchain lain sedang berjalan untuk dompet operator ini. Hentikan worker itu dulu; ' +
            'dua worker bersamaan akan berebut nonce.',
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  } catch (error) {
    redis.disconnect();
    throw error;
  }

  let released = false;
  const timer = setInterval(() => {
    redis
      .eval(RENEW_SCRIPT, 1, key, token, String(ttlMs))
      .then((renewed) => {
        if (renewed !== 1 && !released) {
          released = true;
          clearInterval(timer);
          onLost();
        }
      })
      .catch(() => {
        // Redis sesaat tidak terjangkau: dicoba lagi di putaran berikutnya. Bila terlalu lama,
        // kunci kedaluwarsa dan perpanjangan berikutnya menjawab 0 sehingga onLost dipanggil.
      });
  }, RENEW_INTERVAL_MS);
  timer.unref();

  return {
    async release() {
      if (released) {
        redis.disconnect();
        return;
      }
      released = true;
      clearInterval(timer);
      try {
        await redis.eval(RELEASE_SCRIPT, 1, key, token);
      } finally {
        redis.disconnect();
      }
    },
  };
}
