# frontend

Aplikasi web KosBagi: Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, dan shadcn/ui, dengan tema "Lime kuitansi" dari desain Figma. Dikelola jalur 4 (Frontend & Desain), kecuali halaman `/pemilik` dan `/admin/rekonsiliasi` milik jalur 1.

Cara memasang dan menjalankan frontend ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan keamanan dependensi: `npm ci` melaporkan kerentanan tingkat low dan moderate. Semuanya berasal dari alat pengembangan (`minimatch` lewat ESLint, `deepmerge` lewat CLI shadcn) dan tidak ikut ke aplikasi; `npm audit --omit=dev` menunjukkan 0 kerentanan.

## Variabel lingkungan

Variabel lingkungan ada di `.env.example`. Hanya variabel berawalan `NEXT_PUBLIC_` yang sampai ke peramban, jadi frontend hanya boleh berisi URL API dan (mulai progress 2) client key Midtrans. Server key Midtrans dan private key dompet tidak pernah ada di sini.

## Status progress 1

- Semua data masih statis di `src/lib/data/` (belum memanggil API). Hash transaksi dan alamat kontrak masih dummy, jadi tautan Etherscan belum menunjuk transaksi sungguhan; diganti data Sepolia asli di progress 3.
- Halaman Masuk belum punya login sungguhan. Kartu akun demo langsung membuka app shell peran. Form email menerima email akun demo (`investor.dummy@kosbagi.test`, `penghuni.dummy@kosbagi.test`, `pengelola.dummy@kosbagi.test`, `admin.dummy@kosbagi.test`) dengan kata sandi apa saja, dan menampilkan state error untuk email lain. Login dengan JWT menyusul di progress 2.
- Isi halaman setiap peran masih berupa kerangka memuat (skeleton) sesuai desain app shell.

## Rute

| Rute | Peran | Isi | Progress |
|---|---|---|---|
| `/` | publik | Beranda: hero, kos unggulan, papan kamar dan kuitansi on-chain, cara kerja, sewa ke bagi hasil, ajakan pemilik kos, risiko | P1 |
| `/kos` | publik | Daftar kos: kartu Kos Sumbersari 01 dan empty state | P1 |
| `/kos/[slug]` | publik | Detail kos (`/kos/sumbersari-01`): tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko (bisa ditautkan, mis. `?tab=keuangan`) dan panel penawaran | P1 |
| `/pemilik` | publik | Untuk pemilik kos, simulasi dana, form pengajuan (jalur 1) | P2 |
| `/masuk` | publik | Kartu akun demo dan form email dengan state error | P1 tampilan, P2 berfungsi |
| `/investor` | investor | Ringkasan | P3, P4 |
| `/investor/penawaran` | investor | Penawaran dan beli token (Snap) | P3 |
| `/investor/portofolio` | investor | Portofolio dan riwayat | P3, P4 |
| `/investor/kyc` | investor | Verifikasi KYC dummy | P3 |
| `/penghuni` | penghuni | Ringkasan | P2 |
| `/penghuni/tagihan` | penghuni | Tagihan, bayar via Snap, kuitansi | P2, P3 |
| `/pengelola` | pengelola | Status kamar | P4 |
| `/pengelola/biaya` | pengelola | Biaya dan unggah nota | P4 |
| `/admin` | admin | Ringkasan | P4 |
| `/admin/kyc` | admin | Persetujuan KYC | P3 |
| `/admin/periode` | admin | Tutup periode dan distribusi | P4 |
| `/admin/rekonsiliasi` | admin | Rekonsiliasi Midtrans, basis data, blockchain (jalur 1) | P4 |

Rute peran memakai layout app shell (sidebar per peran, banner "Mode sandbox: data dummy, tanpa uang nyata", header halaman). Pada P1 semuanya sudah ada sebagai kerangka memuat, kecuali `/pemilik` dan `/admin/rekonsiliasi` yang dibangun jalur 1.

## Struktur

```
frontend/
├── public/
│   ├── brand/                logo (tanda) versi terang dan gelap, ekspor Figma
│   └── images/               foto ilustrasi Kos Sumbersari 01, vektor grafik mockup
├── src/
│   ├── app/
│   │   ├── layout.tsx        root layout: font, tema, metadata
│   │   ├── globals.css       token tema Terang/Gelap, skala tipografi, utilitas
│   │   ├── (publik)/         route group halaman publik (navbar + footer)
│   │   ├── masuk/            halaman masuk
│   │   ├── investor/ penghuni/ pengelola/ admin/   app shell per peran
│   │   └── not-found.tsx     halaman 404
│   ├── components/
│   │   ├── ui/               komponen shadcn/ui yang sudah dikustom
│   │   ├── app-shell/        sidebar, header, banner sandbox, skeleton
│   │   ├── auth/             kartu akun demo, form masuk
│   │   ├── brand/            logo
│   │   ├── common/           tautan, status on-chain, badge tagihan, dll.
│   │   ├── home/             bagian-bagian beranda
│   │   ├── property/         kartu kos, papan kamar, tab dan panel detail kos
│   │   ├── public/           navbar, footer, judul bagian, daftar langkah
│   │   └── theme/            penyedia tema dan tombol ganti tema
│   ├── hooks/                use-mobile (dipakai sidebar)
│   └── lib/                  tipe, format rupiah/tanggal/hash, data statis, konfigurasi
├── components.json           konfigurasi shadcn/ui (base radix, ikon Phosphor)
└── next.config.ts, eslint.config.mjs, tsconfig.json, .env.example
```

## Catatan desain

- Desain: Figma "KosBagi Desain UI" (`SiWSQc651BxoJmt67erq2d`), arah "Lime kuitansi". Token warna di `src/app/globals.css` sama persis dengan variabel Figma (mode Terang = `:root`, Gelap = `.dark`).
- Lime (`success`) hanya untuk bukti: lunas, tercatat on-chain, cap TERCATAT, garis grafik. Tombol memakai tinta (`primary`).
- Ikon: `@phosphor-icons/react` (weight regular). Komponen yang dipakai di Server Component mengimpor dari `@phosphor-icons/react/ssr`.
- Menambah komponen shadcn: `npx shadcn@4.23.0 add <nama>`. CLI menulis `import { cn } from "cn"`; ganti menjadi `import { cn } from "@/lib/utils"` supaya token tipografi KosBagi (mis. `text-button`) tidak terhapus saat class digabung.
