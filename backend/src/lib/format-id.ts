// Format teks Bahasa Indonesia untuk keterangan yang dibentuk backend (P4), mis. riwayat transaksi
// investor "Distribusi November 2026, 100 token × Rp438,75". Tidak bergantung zona waktu server.

const MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

/** 2026-11 menjadi "November 2026". */
export function periodLabel(period: string): string {
  const [year, month] = period.split('-').map(Number);
  const name = month ? MONTHS[month - 1] : undefined;
  if (!year || !name) throw new Error(`Periode tidak dikenal: ${period}`);
  return `${name} ${year}`;
}

function groupThousands(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** 1500000 menjadi "Rp1.500.000". */
export function formatRupiah(amount: bigint | number): string {
  const value = BigInt(amount);
  return value < 0n ? `-Rp${groupThousands(-value)}` : `Rp${groupThousands(value)}`;
}

/** Nilai dalam sen: 43875 menjadi "Rp438,75", 39000 menjadi "Rp390". */
export function formatSen(sen: bigint | number): string {
  const value = BigInt(sen);
  const rupiah = formatRupiah(value / 100n);
  const cents = value % 100n;
  return cents === 0n ? rupiah : `${rupiah},${cents.toString().padStart(2, '0')}`;
}
