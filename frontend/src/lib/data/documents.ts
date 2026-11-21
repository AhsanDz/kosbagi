import type { PropertyDocument } from "@/lib/types";

/**
 * Tiga dokumen penerbitan KB-SMR01 (dummy) di docs/bisnis/dokumen-penerbitan.
 * File-nya tidak diunggah ke blockchain; KosToken hanya menyimpan hash SHA-256
 * tiap file: sertifikat dan laporan penilaian lewat konstruktor saat deploy,
 * perjanjian pengelolaan lewat anchorDocument sesudahnya. contentHash sama
 * persis dengan tabel di README folder itu (isi file dibekukan 3 Nov 2026),
 * ditulis dengan awalan 0x seperti bytes32 di kontrak dan Etherscan.
 *
 * Dipakai tab Dokumen di /kos/sumbersari-01 dan kartu "Dokumen tercatat di
 * KosToken" di /investor/penawaran. fileInfo mengikuti file .md sebenarnya
 * (ukuran dalam KB = 1.024 byte, tanggal dokumen). txHash masih contoh sampai
 * deploy Sepolia; koordinator menggantinya bersama alamat kontrak.
 */
export const propertyDocuments: PropertyDocument[] = [
  {
    title: "Sertifikat hak milik (dummy)",
    fileName: "sertifikat-hak-milik.md",
    fileInfo: "Markdown, 3,2 KB, 20 Okt 2026",
    contentHash: "0xec8c1044639cfdf4a8d6fba8c477df0dbe2f09b757f58c918d0676ddda581ef3",
    chainStatus: "CONFIRMED",
    txHash: "0x3a9e8b7ded794ff75aa526c0e4fac230d11ba03b8b02cbc103c6a99c42281f04",
  },
  {
    title: "Laporan penilaian properti (dummy)",
    fileName: "laporan-penilaian.md",
    fileInfo: "Markdown, 4,5 KB, 21 Okt 2026",
    contentHash: "0x49ce16e79ed47d0c21793650545a406c32108d8ba5a5a58a0ec1041d40eed732",
    chainStatus: "CONFIRMED",
    txHash: "0x7c219a6b3c7fc679e6f4981d56abf58a32621f731938ae85836f220e9140a9d3",
  },
  {
    title: "Perjanjian pengelolaan (dummy)",
    fileName: "perjanjian-pengelolaan.md",
    fileInfo: "Markdown, 5,8 KB, 22 Okt 2026",
    contentHash: "0x1839d3cf229ad401b50299dd9fdca617691bef295d720a88ec3ed7f806946741",
    chainStatus: "CONFIRMED",
    txHash: "0xb48fb1654b5d2dbdb8d9c36e00c105a058e67d2c8a4618ccc56bbe548ad420ce",
  },
];
