// Aritmetika bilangan bulat untuk uang. Semua nominal di folder finance adalah rupiah
// bilangan bulat bertipe bigint, padanan uint256 di Solidity, jadi tidak ada pecahan biner
// seperti pada number biasa (0,1 + 0,2 bukan 0,3).
//
// Pembagian bigint di JavaScript memotong ke arah nol. Untuk bilangan tidak negatif hasilnya
// sama dengan pembulatan ke bawah (floor), persis seperti Math.mulDiv OpenZeppelin yang
// dipakai KosLedger. Karena itu setiap fungsi di sini menolak nilai negatif.

/** Penyebut basis poin: 10.000 bp = 100%. Sama dengan KosLedger.BPS_DENOMINATOR(). */
export const BPS_DENOMINATOR = 10_000n;

/** Sen per rupiah untuk nilai per token. Sama dengan KosLedger.SEN_PER_RUPIAH(). */
export const SEN_PER_RUPIAH = 100n;

/** Gagal bila nilai negatif. `name` dipakai di pesan galat. */
export function requireNonNegative(value: bigint, name: string): void {
  if (value < 0n) {
    throw new RangeError(`${name} tidak boleh negatif (diterima ${value}).`);
  }
}

/** Gagal bila tarif di luar 0 sampai 10.000 basis poin. */
export function requireBps(bps: bigint, name: string): void {
  if (bps < 0n || bps > BPS_DENOMINATOR) {
    throw new RangeError(`${name} harus 0 sampai ${BPS_DENOMINATOR} basis poin (diterima ${bps}).`);
  }
}

/**
 * floor(a × b ÷ penyebut), padanan Math.mulDiv(a, b, penyebut) di Solidity.
 * Perkalian dikerjakan dulu supaya pembulatan hanya terjadi sekali, di akhir.
 */
export function mulDivFloor(a: bigint, b: bigint, denominator: bigint): bigint {
  requireNonNegative(a, 'Pengali pertama');
  requireNonNegative(b, 'Pengali kedua');
  if (denominator <= 0n) {
    throw new RangeError(`Penyebut harus lebih besar dari 0 (diterima ${denominator}).`);
  }
  return (a * b) / denominator;
}

/** a − b, berhenti di 0 bila hasilnya negatif. Padanan Math.saturatingSub di Solidity. */
export function saturatingSub(a: bigint, b: bigint): bigint {
  return a > b ? a - b : 0n;
}
