import type { Property } from "@/lib/types";

/**
 * Data statis properti untuk progress 1 (belum memanggil API).
 * Angka mengikuti asumsi proposal: 10 kamar x Rp1.500.000, okupansi 90%,
 * nilai Rp1,8 miliar = 18.000 token @ Rp100.000 (pemilik 30%, investor 70%).
 * Alamat kontrak masih dummy; diganti alamat hasil deploy Sepolia di progress 3.
 */
export const kosSumbersari01: Property = {
  slug: "sumbersari-01",
  name: "Kos Sumbersari 01",
  tokenSymbol: "KB-SMR01",
  address: "Jl. Sumbersari, Malang (dummy)",
  campusDistance: "±8 menit jalan kaki ke gerbang UB",
  roomCount: 10,
  roomLabel: "10 kamar eksklusif",
  description:
    "Kos eksklusif dua lantai untuk mahasiswa, 10 kamar berkamar mandi dalam dengan sewa Rp1.500.000 per bulan. Pemilik lama tetap memegang 30% token; 70% sisanya ditawarkan ke investor. Pengelolaan harian dijalankan pengelola yang ditunjuk KosBagi.",
  photo: {
    src: "/images/kos-sumbersari-01.jpg",
    alt: "Foto ilustrasi buatan AI: kos dua lantai bercat terang dengan balkon, pohon palem, dan deretan motor di halaman depan.",
    width: 1200,
    height: 896,
  },
  monthlyRentIdr: 1_500_000,
  occupiedRooms: 9,
  annualGrossRentIdr: 162_000_000,
  propertyValueIdr: 1_800_000_000,
  totalTokens: 18_000,
  tokenPriceIdr: 100_000,
  ownerTokens: 5_400,
  investorTokens: 12_600,
  maxTokensPerInvestor: 1_800,
  contracts: {
    kosToken: "0x5f2a1Cf4B2E4F693d305376163DE6ea4c7009c1e",
    kosLedger: "0x91bDC34885FF25334117A702f6B670fFF4A244A7",
  },
};

/** Pihak yang terlibat (tab Ringkasan). */
export const propertyParties = [
  { role: "Platform", name: "PT KosBagi Teknologi" },
  { role: "Kustodian sertifikat", name: "PT KosBagi Properti" },
  { role: "Pengelola harian", name: "Hadi Santoso (dummy)" },
] as const;

/** Semua properti yang tampil di /kos. Prototipe ini baru punya satu. */
export const properties: Property[] = [kosSumbersari01];

export function getPropertyBySlug(slug: string): Property | undefined {
  return properties.find((property) => property.slug === slug);
}
