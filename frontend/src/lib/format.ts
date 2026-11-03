import type { HexString } from "@/lib/types";

/**
 * Utilitas format tampilan. Semua memakai locale id-ID dan zona Asia/Jakarta
 * secara eksplisit supaya hasil di server dan di peramban selalu sama.
 */

const TIME_ZONE = "Asia/Jakarta";

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const periodFormatter = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** 1500000 -> "Rp1.500.000" ("Rp" menempel tanpa spasi, tanpa desimal). */
export function formatRupiah(value: number): string {
  return rupiahFormatter.format(value).replace(/Rp\s+/u, "Rp");
}

/**
 * Rupiah ringkas untuk angka besar.
 * "long": 162000000 -> "Rp162 juta", 1800000000 -> "Rp1,8 miliar".
 * "short": 1222200000 -> "Rp1,22 M".
 */
export function formatRupiahCompact(
  value: number,
  display: "long" | "short" = "long"
): string {
  const formatted = new Intl.NumberFormat("id-ID", {
    notation: "compact",
    compactDisplay: display,
    maximumFractionDigits: display === "long" ? 1 : 2,
  }).format(value);
  return `Rp${formatted}`;
}

/** 12600 -> "12.600" (pemisah ribuan titik). */
export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Angka bertanda untuk kolom mono, mis. -2700000 -> "−2.700.000".
 * Memakai tanda minus matematika (U+2212), bukan tanda hubung.
 */
export function formatSignedNumber(value: number): string {
  const formatted = formatNumber(Math.abs(value));
  return value < 0 ? `−${formatted}` : formatted;
}

/** 0.053 -> "5,3%". */
export function formatPercent(value: number, fractionDigits = 1): string {
  return `${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: fractionDigits,
  }).format(value * 100)}%`;
}

/** "2026-10-29" atau Date -> "29 Okt 2026". */
export function formatDate(value: string | Date): string {
  return dateFormatter.format(typeof value === "string" ? new Date(value) : value);
}

/** "2026-11" -> "November 2026". */
export function formatPeriod(period: string): string {
  return periodFormatter.format(new Date(`${period}-01T00:00:00+07:00`));
}

/** Hash atau alamat disingkat 6+4: "0x8f3a…c21d". */
export function shortenHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}…${hash.slice(-4)}`;
}

export const ETHERSCAN_BASE_URL = "https://sepolia.etherscan.io";

/** Tautan transaksi di Etherscan Sepolia. */
export function etherscanTxUrl(txHash: HexString): string {
  return `${ETHERSCAN_BASE_URL}/tx/${txHash}`;
}

/** Tautan alamat kontrak atau dompet di Etherscan Sepolia. */
export function etherscanAddressUrl(address: HexString): string {
  return `${ETHERSCAN_BASE_URL}/address/${address}`;
}
