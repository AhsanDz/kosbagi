import type { Step } from "@/components/public/step-list";

/** Teks tetap halaman /pemilik, mengikuti frame Figma persis. */

export const ownerSteps: Step[] = [
  {
    title: "Ajukan kos",
    description: "Isi data kos dan kontakmu. Tim KosBagi menghubungimu paling lambat 2 hari kerja.",
  },
  {
    title: "Penilaian dan dokumen",
    description:
      "Sertifikat, PBG/IMB, foto kamar, dan laporan sewa 12 bulan diperiksa. Penilai menaksir nilai properti.",
  },
  {
    title: "Penerbitan token",
    description:
      "Sertifikat dialihkan ke PT KosBagi Properti sebagai kustodian. Hash sertifikat dan laporan penilaian dicatat di kontrak KosToken.",
  },
  {
    title: "Penawaran ke investor",
    description:
      "70% token ditawarkan. Dana diteruskan setelah target tercapai; bila tidak, penawaran batal dan dana investor dikembalikan.",
  },
  {
    title: "Pengelolaan bulanan",
    description:
      "Sewa ditagih lewat Midtrans dan tercatat on-chain. Kamu menerima bagi hasil 30% token setiap bulan.",
  },
];

export const requirements = [
  "Berada di sekitar kampus di Malang (cakupan prototipe)",
  "Sertifikat hak milik atas nama pemilik, bebas sengketa",
  "Sudah beroperasi minimal 12 bulan dengan catatan sewa",
  "Bersedia mengalihkan sertifikat ke PT KosBagi Properti sebagai kustodian",
  "Bersedia memakai pengelola yang ditunjuk KosBagi",
];

export const documents = [
  "Sertifikat hak milik",
  "PBG atau IMB bangunan",
  "Foto fasad dan setiap kamar",
  "Laporan sewa 12 bulan terakhir",
  "Identitas pemilik (dummy)",
];

export const faqs = [
  {
    question: "Apakah saya kehilangan kepemilikan kos?",
    answer:
      "Sertifikatnya beralih, tetapi hak ekonomimu tidak hilang. Sertifikat dialihkan ke PT KosBagi Properti sebagai kustodian, dan SHM diturunkan menjadi HGB karena perseroan tidak bisa memegang hak milik. Investor membeli hak atas bagi hasil sewa, bukan tanah atau bangunan, dan kamu tetap memegang 30% token.",
  },
  {
    question: "Berapa biayanya?",
    answer:
      "Fee penawaran 3% dipotong sekali dari dana yang terkumpul. Fee pengelolaan 5% dari sewa kotor dipotong setiap bulan sebelum bagi hasil.",
  },
  {
    question: "Bagaimana kalau penawaran tidak penuh?",
    answer:
      "Penawaran dibatalkan pada batas waktu dan dana investor dikembalikan. Kos tetap seperti semula.",
  },
  {
    question: "Apakah penghuni dikenai biaya tambahan?",
    answer: "Tidak. Penghuni membayar sewa seperti biasa lewat VA, QRIS, atau e-wallet.",
  },
  {
    question: "Siapa yang mengurus kos sehari-hari?",
    answer:
      "Pengelola yang ditunjuk KosBagi menagih sewa dan mencatat biaya beserta nota. Kamu menerima laporan bulanan, dan catatan on-chain bisa kamu periksa sendiri di Etherscan.",
  },
];

export const nextStages = [
  "Tim KosBagi menghubungimu paling lambat 2 hari kerja",
  "Survei kos dan pemeriksaan dokumen dummy",
  "Hasil penilaian dan simulasi dana resmi untuk kamu putuskan",
];
