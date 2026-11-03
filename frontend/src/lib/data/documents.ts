import type { PropertyDocument } from "@/lib/types";

/**
 * Dokumen properti (dummy). File-nya tidak diunggah ke blockchain; yang dicatat
 * di KosToken saat penerbitan hanya hash SHA-256. txHash = transaksi pencatatan.
 */
export const propertyDocuments: PropertyDocument[] = [
  {
    title: "Sertifikat hak milik (dummy)",
    fileInfo: "PDF, 2,4 MB, 20 Okt 2026",
    chainStatus: "CONFIRMED",
    txHash: "0x3a9e8b7ded794ff75aa526c0e4fac230d11ba03b8b02cbc103c6a99c42281f04",
  },
  {
    title: "Laporan penilaian properti (dummy)",
    fileInfo: "PDF, 5,1 MB, 21 Okt 2026",
    chainStatus: "CONFIRMED",
    txHash: "0x7c219a6b3c7fc679e6f4981d56abf58a32621f731938ae85836f220e9140a9d3",
  },
  {
    title: "Perjanjian pengelolaan (dummy)",
    fileInfo: "PDF, 860 KB, 22 Okt 2026",
    chainStatus: "CONFIRMED",
    txHash: "0xb48fb1654b5d2dbdb8d9c36e00c105a058e67d2c8a4618ccc56bbe548ad420ce",
  },
];
