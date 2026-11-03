/**
 * Identitas situs dan tautan publik yang dipakai di navbar, footer, dan metadata.
 */
export const siteConfig = {
  name: "KosBagi",
  tagline: "bagi hasil sewa kos mahasiswa",
  description:
    "Prototipe tokenisasi hak manfaat ekonomi kos mahasiswa di sekitar UB. Setiap pembayaran sewa tercatat di Ethereum Sepolia. Semua data dummy.",
  complaintEmail: "pengaduan@kosbagi.test",
  /** Alamat repositori GitHub tim. Bila kosong, footer menampilkan teksnya tanpa tautan. */
  repositoryUrl: "https://github.com/AhsanDz/kosbagi" as string | undefined,
} as const;

/** Navigasi publik (navbar dan menu ponsel). */
export const publicNavLinks = [
  { href: "/", label: "Beranda" },
  { href: "/kos", label: "Daftar kos" },
  { href: "/pemilik", label: "Untuk pemilik" },
  { href: "/#cara-kerja", label: "Cara kerja" },
] as const;
