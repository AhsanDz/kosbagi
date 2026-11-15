// Advisory lock PostgreSQL: kunci bernama yang tidak menempel ke baris tabel mana pun.
// Permintaan lain dengan nama yang sama menunggu sampai kunci dilepas. Kunci otomatis lepas
// saat transaksinya selesai, termasuk bila proses mati, jadi tidak ada kunci yang tersangkut.
import type { Prisma } from '../generated/prisma/client.js';
import { prisma } from './prisma.js';

/**
 * Menjalankan `work` sambil memegang kunci bernama `key`, di dalam satu transaksi pendek.
 *
 * Di dalam `work`, semua query WAJIB lewat `tx`, dan jangan memanggil layanan luar. Transaksi
 * sudah memegang satu koneksi selama menunggu kunci. Query lewat `prisma` biasa butuh koneksi
 * kedua: saat semua koneksi pool dipegang transaksi yang saling menunggu, tidak ada yang bisa
 * lanjut dan seluruh API ikut macet sampai transaksi kedaluwarsa.
 */
export function withAdvisoryLock<T>(key: string, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
    return work(tx);
  });
}
