// Pembatas untuk panggilan keluar saat rekonsiliasi: berapa banyak yang berjalan bersamaan dan
// berapa lama satu panggilan boleh menunggu. API status Midtrans dan RPC Sepolia dipanggil sekali
// per order, jadi tanpa batas ini satu halaman rekonsiliasi bisa mengirim puluhan permintaan
// sekaligus atau menggantung sampai proxy frontend memutus koneksi.

/** Galat saat satu panggilan melewati batas waktunya. */
export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

/** Menolak `promise` bila belum selesai dalam `timeoutMs`. Promise asli tetap berjalan di belakang. */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  if (timeoutMs <= 0) return Promise.reject(new TimeoutError(message));
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Menjalankan `task` untuk setiap item dengan paling banyak `concurrency` tugas bersamaan.
 * Urutan hasil sama dengan urutan masukan. Tugas yang melempar galat membuat seluruh pemanggilan
 * gagal, jadi tugas yang boleh gagal harus menangkap galatnya sendiri.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new RangeError('Batas konkurensi harus bilangan bulat minimal 1.');
  }
  // Panjang hasil disiapkan sejak awal supaya setiap tugas mengisi posisinya sendiri.
  const results = Array.from<R>({ length: items.length });
  let next = 0;

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await task(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}
