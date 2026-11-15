// Midtrans membaca waktu dalam WIB, dan nomor pengajuan memakai tahun WIB, sedangkan server
// bisa berjalan di zona waktu apa pun. Semua perhitungan di sini tidak bergantung zona server.
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function toWibClock(date: Date): Date {
  return new Date(date.getTime() + WIB_OFFSET_MS);
}

/** Format `expiry.start_time` Snap, mis. `2026-11-05 10:00:00 +0700`. */
export function formatMidtransTime(date: Date): string {
  const clock = toWibClock(date).toISOString();
  return `${clock.slice(0, 10)} ${clock.slice(11, 19)} +0700`;
}

/** Tahun menurut WIB. Pukul 18.00 UTC tanggal 31 Desember sudah tahun baru di Indonesia. */
export function wibYear(date: Date): number {
  return toWibClock(date).getUTCFullYear();
}
