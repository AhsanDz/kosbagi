import { offerings } from "@/lib/data/offering";
import { formatDate } from "@/lib/format";
import type { Risk } from "@/lib/types";

/** Batas penawaran KB-SMR01, diambil dari data penawaran supaya selalu sama. */
const offeringDeadline = formatDate(offerings[0]?.closesAt ?? "2026-12-31");

/** Ringkasan risiko: summary untuk beranda, detail untuk tab Risiko. */
export const risks: Risk[] = [
  {
    title: "Bagi hasil bisa turun",
    summary:
      "Besarnya bergantung pada okupansi dan biaya. Estimasi ±5,3% per tahun bukan jaminan.",
    detail:
      "Besarnya bergantung pada okupansi dan biaya. Estimasi ±5,3% per tahun memakai okupansi 90% dan bukan jaminan.",
  },
  {
    title: "Belum bisa dijual kembali",
    summary: "Pasar sekunder belum tersedia, jadi token belum bisa dijual ke investor lain.",
    detail:
      "Pasar sekunder belum tersedia, jadi token belum bisa dijual ke investor lain selama prototipe.",
  },
  {
    title: "Hak manfaat, bukan kepemilikan",
    summary: "Sertifikat tetap dipegang PT KosBagi Properti sebagai kustodian.",
    detail:
      "Sertifikat tetap dipegang PT KosBagi Properti sebagai kustodian atas nama pemegang token.",
  },
  {
    title: "Risiko teknologi",
    summary:
      "Smart contract atau jaringan bisa terganggu. Pembayaran tetap tercatat di sistem KosBagi dan dicatat ulang.",
    detail:
      "Smart contract atau jaringan bisa terganggu. Pembayaran tetap tercatat di sistem KosBagi dan dicatat ulang lewat antrean.",
  },
  {
    title: "Penawaran bisa batal",
    summary:
      `Bila target belum tercapai sampai ${offeringDeadline}, penawaran dibatalkan dan dana dikembalikan.`,
    detail:
      `Bila target belum tercapai sampai ${offeringDeadline}, penawaran dibatalkan dan dana dikembalikan ke investor.`,
  },
];
