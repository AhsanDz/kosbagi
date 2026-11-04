import type { Offering } from "@/lib/types";

/**
 * Penawaran token KB-SMR01 (data dummy): terjual 4.360 dari 12.600 token,
 * dibuka sampai 31 Des 2026 (keputusan pengguna: frame Figma masih menulis 30 Nov,
 * diundur supaya penawaran tetap terbuka di semua jadwal presentasi). Angka ini konsisten dengan skenario uji kuota
 * (investor yang memegang 1.500 token hanya boleh membeli 300 lagi).
 */
export const offerings: Offering[] = [
  {
    propertySlug: "sumbersari-01",
    soldTokens: 4_360,
    offeredTokens: 12_600,
    closesAt: "2026-12-31",
    estimatedAnnualYield: 0.053,
  },
];

export function getOffering(propertySlug: string): Offering | undefined {
  return offerings.find((offering) => offering.propertySlug === propertySlug);
}

/** Sisa token yang masih bisa dibeli, mis. 12.600 - 4.360 = 8.240. */
export function remainingTokens(offering: Offering): number {
  return offering.offeredTokens - offering.soldTokens;
}

/** Persentase terjual (0 sampai 100) untuk bilah progres. */
export function soldPercent(offering: Offering): number {
  return (offering.soldTokens / offering.offeredTokens) * 100;
}
