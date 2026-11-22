import { kosSumbersari01 } from "@/lib/data/properties";
import { formatDate, formatMonthName, formatPeriod } from "@/lib/format";

/** Keterangan header halaman peran: "Kos Sumbersari 01, periode November 2026". */
export function propertyPeriodCaption(period: string): string {
  return `${kosSumbersari01.name}, periode ${formatPeriod(period)}`;
}

/**
 * Utilitas periode sewa "YYYY-MM". Tanggal dihitung di zona Asia/Jakarta,
 * sama dengan backend, supaya pembayaran 1 Des 00.30 WIB tidak terbaca November.
 */

const PERIOD_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** true bila teks berbentuk periode "YYYY-MM" yang sah. */
export function isPeriod(value: string | null | undefined): value is string {
  return typeof value === "string" && PERIOD_PATTERN.test(value);
}

/** Jumlah hari dalam periode: "2026-11" -> 30. */
export function daysInPeriod(period: string): number {
  const [year, month] = period.split("-").map(Number);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Periode berikutnya: "2026-11" -> "2026-12", "2026-12" -> "2027-01". */
export function nextPeriod(period: string): string {
  const [year, month] = period.split("-").map(Number);
  const next = new Date(Date.UTC(year, month, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Tanggal pertama periode, "YYYY-MM-DD". */
export function periodStartDate(period: string): string {
  return `${period}-01`;
}

/** Tanggal terakhir periode, "YYYY-MM-DD". */
export function periodEndDate(period: string): string {
  return `${period}-${String(daysInPeriod(period)).padStart(2, "0")}`;
}

/** "2026-11" -> "November" (nama bulan saja, untuk teks seperti "Sewa masuk November"). */
export function periodMonthName(period: string): string {
  return formatMonthName(new Date(`${period}-15T00:00:00+07:00`));
}

/** "2026-12" -> "31 Des 2026", batas periode ditutup. */
export function periodEndLabel(period: string): string {
  return formatDate(periodEndDate(period));
}

const jakartaDateFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Jakarta",
});

/** Tanggal kalender WIB dari teks ISO atau "YYYY-MM-DD": "2026-11-14". */
export function jakartaDate(value: string | Date): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return jakartaDateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

/** Periode tanggal tertentu di zona WIB: "2026-11-14" -> "2026-11". */
export function periodOf(value: string | Date): string {
  return jakartaDate(value).slice(0, 7);
}

/** Hari ke berapa tanggal itu di periodenya (1 sampai 31). */
export function dayOfPeriod(value: string | Date): number {
  return Number(jakartaDate(value).slice(8, 10));
}

/** "2026-11" -> 202611, bentuk periode yang disimpan KosLedger. */
export function periodNumber(period: string): number {
  return Number(period.replace("-", ""));
}

/** Angka 1 sampai 9 sebagai kata di awal kalimat ("Satu pembayaran ..."); selebihnya angka. */
export function countWord(count: number): string {
  const words = ["Nol", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan"];
  return words[count] ?? String(count);
}
