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

## Status progress 3

- Masuk berfungsi sungguhan lewat backend. Kartu akun demo memakai kata sandi `demo-kosbagi`, dan form email menerima akun yang sama.
- Penghuni: `/penghuni`, `/penghuni/tagihan`, dan kuitansi `/penghuni/tagihan/[id]` memakai API sungguhan. Slip lunas punya tombol Lihat kuitansi, riwayat punya kolom Aksi (desktop) dan baris yang bisa diketuk (ponsel). Kuitansi bisa dicetak; stylesheet cetak hanya menampilkan kartu kuitansi.
- Investor: `/investor/kyc` (form, Kartu status KYC, Jejak KYC) dan `/investor/penawaran` (Ringkasan penawaran, dokumen, risiko, dan Tiket beli dengan 13 keadaan, termasuk skenario 8 dan 9 yang ditolak sebelum pembayaran dibuat).
- Admin: `/admin/kyc` dengan tab Menunggu, Disetujui, dan Ditolak, Sheet tinjau berisi pemeriksaan otomatis, dan Dialog tolak dengan alasan wajib.
- Status on-chain di semua layar: Menunggu pencatatan, Tercatat (tautan Etherscan Sepolia bila tx hash ada), Gagal dicatat, dan Data lampau untuk tagihan seed yang lunas tanpa pembayaran Midtrans.
- Sidebar menandai menu aktif, termasuk subhalaman seperti kuitansi.
- Dokumen penerbitan di tab Dokumen `/kos/sumbersari-01` dan kartu dokumen `/investor/penawaran` memakai tiga file di `docs/bisnis/dokumen-penerbitan` dengan hash SHA-256 final. Alamat kontrak dan tx hash di halaman publik masih contoh; koordinator menggantinya setelah deploy Sepolia.
- Halaman `/investor` (ringkasan), `/investor/portofolio`, pengelola, `/admin`, dan `/admin/periode` masih kerangka memuat sampai progress 4.

## Sesi dan pemanggilan API

JWT tidak pernah sampai ke JavaScript peramban.

| Bagian | File | Tugas |
|---|---|---|
| Masuk dan keluar | `src/app/api/session/route.ts` | `POST` meneruskan login ke backend dan menyimpan token di cookie httpOnly `kosbagi_session`. `DELETE` menghapusnya |
| Penerus API | `src/app/api/backend/[...path]/route.ts` | Meneruskan `/api/backend/...` ke backend dengan header `Authorization` dari cookie |
| Penjaga halaman | `src/proxy.ts` | Sebelum render: tanpa sesi ke `/masuk`, peran salah ke halaman perannya |
| Verifikasi sesi | `src/components/app-shell/session-account.tsx` | Menanyakan token ke backend lewat `GET /auth/me` dan menampilkan pengguna di sidebar |
| Klien API | `src/lib/api/` | Tipe respons, panggilan dari peramban, dan penanganan galat |

Halaman penghuni mengambil data di klien dengan SWR lewat `TenantBillingProvider` di `src/components/tenant/`, yang juga mengatur Snap, polling Memeriksa pembayaran, dan keadaan tagihan. Halaman investor dan admin memakai SWR langsung di komponen halamannya (`src/components/investor/`, `src/components/admin/`).

Halaman yang menunggu proses di luar peramban (konfirmasi Midtrans, pencatatan on-chain, whitelist dompet, transfer token) meminta data ulang berkala. Intervalnya berupa angka yang ditentukan dari hasil terakhir, karena SWR tidak memulai polling bila intervalnya 0 saat pertama dipasang.

## Rute

| Rute | Peran | Isi | Progress |
|---|---|---|---|
| `/` | publik | Beranda: hero, kos unggulan, papan kamar dan kuitansi on-chain, cara kerja, sewa ke bagi hasil, ajakan pemilik kos, risiko | P1 |
| `/kos` | publik | Daftar kos: kartu Kos Sumbersari 01 dan empty state | P1 |
| `/kos/[slug]` | publik | Detail kos (`/kos/sumbersari-01`): tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko (bisa ditautkan, mis. `?tab=keuangan`) dan panel penawaran | P1 |
| `/pemilik` | publik | Untuk pemilik kos, simulasi dana, form pengajuan (jalur 1) | P2 |
| `/masuk` | publik | Kartu akun demo dan form email dengan state error dari server | P1 tampilan, P2 berfungsi |
| `/investor` | investor | Ringkasan | P3, P4 |
| `/investor/penawaran` | investor | Ringkasan penawaran, dokumen, risiko, Tiket beli dengan pemeriksaan skenario 8 dan 9, bayar lewat Snap | P3 |
| `/investor/portofolio` | investor | Portofolio dan riwayat | P4 |
| `/investor/kyc` | investor | Form KYC dummy, Kartu status KYC, Jejak KYC sampai dompet tercatat di KosToken | P3 |
| `/penghuni` | penghuni | Ringkasan: Slip ringkas, riwayat, kamar, bukti | P2 |
| `/penghuni/tagihan` | penghuni | Slip tagihan, bayar via Snap, jejak pembayaran, riwayat dengan kolom Aksi | P2, P3 |
| `/penghuni/tagihan/[id]` | penghuni | Kuitansi sewa, panel argumen recordRent di Sepolia, cetak kuitansi | P3 |
| `/pengelola` | pengelola | Status kamar | P4 |
| `/pengelola/biaya` | pengelola | Biaya dan unggah nota | P4 |
| `/admin` | admin | Ringkasan | P4 |
| `/admin/kyc` | admin | Tab pengajuan, Sheet tinjau dengan pemeriksaan otomatis, Dialog tolak | P3 |
| `/admin/periode` | admin | Tutup periode dan distribusi | P4 |
| `/admin/rekonsiliasi` | admin | Rekonsiliasi Midtrans, basis data, blockchain (jalur 1) | P4 |

Rute peran memakai layout app shell (sidebar per peran, banner "Mode sandbox: data dummy, tanpa uang nyata", header halaman) dan dilindungi `src/proxy.ts`. Halaman yang belum dibangun masih kerangka memuat sampai progressnya, kecuali `/pemilik` dan `/admin/rekonsiliasi` yang dibangun jalur 1.

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
│   │   ├── ui/               komponen shadcn/ui yang sudah dikustom (termasuk dialog sejak P3)
│   │   ├── admin/            KYC admin: tabel, Sheet tinjau, Dialog tolak
│   │   ├── app-shell/        sidebar, blok akun dari sesi, header, banner sandbox, skeleton
│   │   ├── auth/             kartu akun demo, form masuk
│   │   ├── brand/            logo
│   │   ├── common/           tautan, status on-chain, badge tagihan, dll.
│   │   ├── home/             bagian-bagian beranda
│   │   ├── investor/         KYC investor dan penawaran: form, Kartu status KYC, Jejak KYC, Tiket beli
│   │   ├── property/         kartu kos, papan kamar, tab dan panel detail kos
│   │   ├── public/           navbar, footer, judul bagian, daftar langkah
│   │   ├── tenant/           halaman penghuni: slip, kuitansi, panel on-chain, jejak, riwayat, kartu
│   │   └── theme/            penyedia tema dan tombol ganti tema
│   ├── hooks/                use-mobile (dipakai sidebar)
│   ├── lib/                  tipe, format, data statis, konfigurasi, keadaan tagihan, KYC, dan pesanan token
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
- Frame penghuni, investor, dan admin belum punya versi gelap di Figma. Warnanya memakai token tema, dan hasil gelapnya diperiksa langsung di aplikasi. Panel catatan on-chain dan Kartu bukti selalu gelap lewat class `dark`.
- Menambah komponen shadcn: `npx shadcn@4.23.0 add <nama>`. CLI menulis `import { cn } from "cn"`; ganti menjadi `import { cn } from "@/lib/utils"` supaya token tipografi KosBagi (mis. `text-button`) tidak terhapus saat class digabung.
