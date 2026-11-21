// Konversi data backend ke argumen fungsi kontrak, sesuai docs/kontrak/rancangan-kontrak.md bagian 7:
// kamar K03 menjadi 3 (uint16), periode 2026-11 menjadi 202611 (uint32), nominal Rupiah apa adanya.
// Data yang tidak bisa dikonversi tidak akan pernah diterima kontrak, jadi ditolak permanen.
import { PermanentJobError } from './errors.js';

const MAX_UINT16 = 65_535;

/** `K03` menjadi 3. Kontrak menolak kamar 0, jadi nomor harus 1 sampai 65.535. */
export function roomNumberToUint16(roomNumber: string): number {
  const match = /^K(\d{1,5})$/.exec(roomNumber);
  const room = match ? Number(match[1]) : Number.NaN;
  if (!Number.isInteger(room) || room < 1 || room > MAX_UINT16) {
    throw new PermanentJobError(`Nomor kamar ${JSON.stringify(roomNumber)} tidak bisa dikirim ke kontrak.`);
  }
  return room;
}

/** `2026-11` menjadi 202611 (format YYYYMM di KosLedger). Tahun 2000 sampai 9999, bulan 01 sampai 12. */
export function periodToUint32(period: string): number {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  const year = match ? Number(match[1]) : Number.NaN;
  const month = match ? Number(match[2]) : Number.NaN;
  if (!(year >= 2000 && year <= 9999 && month >= 1 && month <= 12)) {
    throw new PermanentJobError(`Periode ${JSON.stringify(period)} tidak bisa dikirim ke kontrak.`);
  }
  return year * 100 + month;
}

/** Bilangan bulat positif (Rupiah atau jumlah token) menjadi uint256. */
export function positiveIntegerToUint256(value: number, label: string): bigint {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new PermanentJobError(`${label} harus bilangan bulat positif.`);
  }
  return BigInt(value);
}
