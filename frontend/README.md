# frontend

Aplikasi web KosBagi: Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, dan shadcn/ui, dengan tema "Lime kuitansi" dari desain Figma. Dikelola jalur 4 (Frontend & Desain), kecuali halaman `/pemilik` dan `/admin/rekonsiliasi` milik jalur 1.

Cara memasang dan menjalankan frontend ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan keamanan dependensi: `npm ci` melaporkan kerentanan tingkat low dan moderate. Semuanya berasal dari alat pengembangan (`minimatch` lewat ESLint, `deepmerge` lewat CLI shadcn) dan tidak ikut ke aplikasi; `npm audit --omit=dev` menunjukkan 0 kerentanan.

## Variabel lingkungan

Variabel lingkungan ada di `.env.example`. Hanya variabel berawalan `NEXT_PUBLIC_` yang sampai ke peramban, jadi frontend hanya boleh berisi URL API dan client key Midtrans. Server key Midtrans dan private key dompet tidak pernah ada di sini.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ya | Alamat backend tanpa `/api` |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | tidak | Client key sandbox untuk `snap.js`. Kalau kosong, tombol bayar menampilkan pesan yang jelas |

## Status progress 2

- Masuk berfungsi sungguhan lewat backend. Kartu akun demo memakai kata sandi `demo-kosbagi`, dan form email menerima akun yang sama.
- Halaman `/penghuni` dan `/penghuni/tagihan` memakai API sungguhan dengan semua state tagihan. Halaman peran lain masih kerangka memuat.
- Data halaman publik masih statis di `src/lib/data/`. Hash transaksi dan alamat kontrak di sana masih dummy; diganti data Sepolia asli di progress 3.
- Di progress 2 worker blockchain belum ada, jadi tagihan lunas berhenti di Menunggu pencatatan. State Tercatat dan Gagal dicatat sudah tampil benar dari data `chain`.
- Kolom Aksi, tombol Lihat kuitansi, dan panah baris riwayat ponsel menyusul di progress 3 bersama halaman `/penghuni/tagihan/[id]`.
- Alamat dan pengelola di Kartu kamar sementara memakai data statis karena belum ada di API.

## Sesi dan pemanggilan API

JWT tidak pernah sampai ke JavaScript peramban.

| Bagian | File | Tugas |
|---|---|---|
| Masuk dan keluar | `src/app/api/session/route.ts` | `POST` meneruskan login ke backend dan menyimpan token di cookie httpOnly `kosbagi_session`. `DELETE` menghapusnya |
| Penerus API | `src/app/api/backend/[...path]/route.ts` | Meneruskan `/api/backend/...` ke backend dengan header `Authorization` dari cookie |
| Penjaga halaman | `src/proxy.ts` | Sebelum render: tanpa sesi ke `/masuk`, peran salah ke halaman perannya |
| Verifikasi sesi | `src/components/app-shell/session-account.tsx` | Menanyakan token ke backend lewat `GET /auth/me` dan menampilkan pengguna di sidebar |
| Klien API | `src/lib/api/` | Tipe respons, panggilan dari peramban, dan penanganan galat |

Halaman penghuni mengambil data di klien dengan SWR lewat `TenantBillingProvider` di `src/components/tenant/`, yang juga mengatur Snap, polling Memeriksa pembayaran, dan keadaan tagihan.

## Rute

| Rute | Peran | Isi | Progress |
|---|---|---|---|
| `/` | publik | Beranda: hero, kos unggulan, papan kamar dan kuitansi on-chain, cara kerja, sewa ke bagi hasil, ajakan pemilik kos, risiko | P1 |
| `/kos` | publik | Daftar kos: kartu Kos Sumbersari 01 dan empty state | P1 |
| `/kos/[slug]` | publik | Detail kos (`/kos/sumbersari-01`): tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko (bisa ditautkan, mis. `?tab=keuangan`) dan panel penawaran | P1 |
| `/pemilik` | publik | Untuk pemilik kos, simulasi dana, form pengajuan (jalur 1) | P2 |
| `/masuk` | publik | Kartu akun demo dan form email dengan state error dari server | P1 tampilan, P2 berfungsi |
| `/investor` | investor | Ringkasan | P3, P4 |
| `/investor/penawaran` | investor | Penawaran dan beli token (Snap) | P3 |
| `/investor/portofolio` | investor | Portofolio dan riwayat | P3, P4 |
| `/investor/kyc` | investor | Verifikasi KYC dummy | P3 |
| `/penghuni` | penghuni | Ringkasan: Slip ringkas, riwayat, kamar, bukti | P2 |
| `/penghuni/tagihan` | penghuni | Slip tagihan, bayar via Snap, jejak pembayaran, riwayat. Kuitansi menyusul | P2, P3 |
| `/pengelola` | pengelola | Status kamar | P4 |
| `/pengelola/biaya` | pengelola | Biaya dan unggah nota | P4 |
| `/admin` | admin | Ringkasan | P4 |
| `/admin/kyc` | admin | Persetujuan KYC | P3 |
| `/admin/periode` | admin | Tutup periode dan distribusi | P4 |
| `/admin/rekonsiliasi` | admin | Rekonsiliasi Midtrans, basis data, blockchain (jalur 1) | P4 |

Rute peran memakai layout app shell (sidebar per peran, banner "Mode sandbox: data dummy, tanpa uang nyata", header halaman) dan dilindungi `src/proxy.ts`. Selain `/penghuni`, isinya masih kerangka memuat sampai progressnya, kecuali `/pemilik` dan `/admin/rekonsiliasi` yang dibangun jalur 1.

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
│   │   ├── api/              route handler sesi dan penerus API backend
│   │   ├── masuk/            halaman masuk
│   │   ├── investor/ penghuni/ pengelola/ admin/   app shell per peran
│   │   └── not-found.tsx     halaman 404
│   ├── components/
│   │   ├── ui/               komponen shadcn/ui yang sudah dikustom
│   │   ├── app-shell/        sidebar, blok akun dari sesi, header, banner sandbox, skeleton
│   │   ├── auth/             kartu akun demo, form masuk
│   │   ├── brand/            logo
│   │   ├── common/           tautan, status on-chain, badge tagihan, dll.
│   │   ├── home/             bagian-bagian beranda
│   │   ├── property/         kartu kos, papan kamar, tab dan panel detail kos
│   │   ├── public/           navbar, footer, judul bagian, daftar langkah
│   │   ├── tenant/           halaman penghuni: slip, jejak, riwayat, kartu, data tagihan
│   │   └── theme/            penyedia tema dan tombol ganti tema
│   ├── hooks/                use-mobile (dipakai sidebar)
│   ├── lib/                  tipe, format, data statis, konfigurasi, keadaan tagihan
│   │   ├── api/              klien API, tipe respons, helper route handler
│   │   ├── auth/             peran, cookie sesi, verifikasi sesi di server
│   │   └── midtrans/         pemuat snap.js
│   └── proxy.ts              penjaga halaman peran
├── components.json           konfigurasi shadcn/ui (base radix, ikon Phosphor)
└── next.config.ts, eslint.config.mjs, tsconfig.json, .env.example
```

## Catatan desain

- Desain: Figma "KosBagi Desain UI" (`SiWSQc651BxoJmt67erq2d`), arah "Lime kuitansi". Token warna di `src/app/globals.css` sama persis dengan variabel Figma (mode Terang = `:root`, Gelap = `.dark`).
- Lime (`success`) hanya untuk bukti: lunas, tercatat on-chain, cap TERCATAT, garis grafik. Tombol memakai tinta (`primary`).
- Ikon: `@phosphor-icons/react` (weight regular). Komponen yang dipakai di Server Component mengimpor dari `@phosphor-icons/react/ssr`.
- Frame penghuni belum punya versi gelap di Figma. Warnanya memakai token tema, dan hasil gelapnya diperiksa langsung di aplikasi.
- Menambah komponen shadcn: `npx shadcn@4.23.0 add <nama>`. CLI menulis `import { cn } from "cn"`; ganti menjadi `import { cn } from "@/lib/utils"` supaya token tipografi KosBagi (mis. `text-button`) tidak terhapus saat class digabung.
