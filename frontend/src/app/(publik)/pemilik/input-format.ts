import { formatNumber } from "@/lib/format";

/**
 * Isian angka di /pemilik disimpan sebagai deretan digit dan ditampilkan dengan
 * format ("Rp1.300.000", "85%"), jadi nilai yang dikirim selalu bilangan bulat.
 */

/**
 * Batas digit menjaga hasil simulasi di bawah Number.MAX_SAFE_INTEGER, supaya
 * konversi bigint ke number untuk ditampilkan tetap eksak.
 */
export const COUNT_MAX_DIGITS = 4;
export const RENT_MAX_DIGITS = 10;
export const PROPERTY_VALUE_MAX_DIGITS = 13;
export const PERCENT_MAX_DIGITS = 3;

/** Mengambil digit saja, tanpa nol di depan. */
export function keepDigits(value: string, maxDigits: number): string {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, maxDigits);
}

export function displayRupiah(digits: string): string {
  return digits ? `Rp${formatNumber(Number(digits))}` : "";
}

export function displayPercent(digits: string): string {
  return digits ? `${digits}%` : "";
}

/**
 * Tanda % ada di ujung nilai, jadi Backspace pertama hanya menghapus tandanya dan
 * digit tidak berubah. Saat itu terjadi, digit terakhir ikut dihapus.
 */
export function nextPercentDigits(rawValue: string, currentDigits: string): string {
  const digits = keepDigits(rawValue, PERCENT_MAX_DIGITS);
  const onlyRemovedSign = digits === currentDigits && !rawValue.includes("%");
  return onlyRemovedSign ? digits.slice(0, -1) : digits;
}
