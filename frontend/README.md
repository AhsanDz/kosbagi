# frontend

Aplikasi web KosBagi: Next.js 16 (App Router) + TypeScript, Tailwind CSS 4, dan shadcn/ui, dengan tema "Lime kuitansi" dari desain Figma. Dikelola jalur 4 (Frontend & Desain), kecuali halaman `/pemilik` dan `/admin/rekonsiliasi` milik jalur 1.

Cara memasang dan menjalankan frontend ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan keamanan dependensi: `npm ci` melaporkan kerentanan tingkat low dan moderate. Semuanya berasal dari alat pengembangan (`minimatch` lewat ESLint, `deepmerge` lewat CLI shadcn) dan tidak ikut ke aplikasi; `npm audit --omit=dev` menunjukkan 0 kerentanan.

## Variabel lingkungan

Variabel lingkungan ada di `.env.example`. Hanya variabel berawalan `NEXT_PUBLIC_` yang sampai ke peramban, jadi variabel itu hanya boleh berisi URL API dan client key Midtrans. Server key Midtrans dan private key dompet tidak pernah ada di sini.

| Variabel | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ya | Alamat backend tanpa `/api`. Dipakai route handler di server; karena berawalan `NEXT_PUBLIC_`, nilainya tertanam saat build, jadi ubah lalu build ulang |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | tidak | Client key sandbox untuk `snap.js`. Kalau kosong, tombol bayar menampilkan pesan yang jelas |
| `TRUST_PROXY_HEADERS` | tidak | Hanya server, tidak sampai ke peramban. Isi `true` bila frontend berjalan di balik proxy yang menimpa `X-Forwarded-Host` dan `X-Forwarded-For` (mis. Vercel). Kosong saat lokal |

Di Vercel, Next.js terdeteksi otomatis dari folder `frontend`, jadi tidak ada `vercel.json`. Ketiga variabel di atas diisi di pengaturan proyek Vercel; langkah deploy lengkapnya ada di [`docs/deploy/online.md`](../docs/deploy/online.md).

## Status progress 5

Finalisasi P5 (tanpa fitur besar baru):

- Pengerasan untuk berjalan di balik proxy: pemeriksaan `Origin` hanya memakai `X-Forwarded-Host`, dan `X-Forwarded-For` hanya diteruskan ke backend, bila `TRUST_PROXY_HEADERS=true`. `/masuk?sesi=` tidak lagi menghapus cookie lewat GET.
- Header keamanan di semua respons lewat `next.config.ts`: `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`, tanpa `X-Powered-By`.
- `error.tsx` untuk halaman publik, setiap peran, dan akar aplikasi: galat tak terduga menampilkan pesan berbahasa Indonesia dengan Muat ulang. Muat ulang mengosongkan cache SWR dulu supaya data rusak tidak langsung memicu galat lagi, dan di halaman peran sidebar, header, serta tombol menu tetap tampil.
- Kartu Perlu ditindaklanjuti di `/pengelola` membaca status ditutup dari `GET /expenses` periode yang sama, jadi tidak lagi menulis "siap ditutup" setelah periode ditutup.
- Ponsel 390 px: tabel portofolio, biaya, antrean job, dan KYC admin berganti menjadi daftar bertumpuk bila kartunya lebih sempit dari tabel, jadi status dan tombol tidak tersembunyi di luar layar.
- Mode gelap diperiksa di semua halaman peran dengan skrip kontras; hash di ubin kamar lime pengelola kini terbaca di mode gelap.
- Footer publik menautkan Pernyataan penggunaan AI (`docs/pernyataan-ai.md` di repo GitHub).

### Status progress 4

- Masuk berfungsi sungguhan lewat backend. Kartu akun demo memakai kata sandi `demo-kosbagi`, dan form email menerima akun yang sama.
- Penghuni: `/penghuni`, `/penghuni/tagihan`, dan kuitansi `/penghuni/tagihan/[id]` memakai API sungguhan. Slip lunas punya tombol Lihat kuitansi, riwayat punya kolom Aksi (desktop) dan baris yang bisa diketuk (ponsel). Kuitansi bisa dicetak; stylesheet cetak hanya menampilkan kartu kuitansi.
- Investor: `/investor/kyc` (form, Kartu status KYC, Jejak KYC) dan `/investor/penawaran` (Ringkasan penawaran, dokumen, risiko, dan Tiket beli dengan 13 keadaan, termasuk skenario 8 dan 9 yang ditolak sebelum pembayaran dibuat).
- Admin: `/admin/kyc` dengan tab Menunggu, Disetujui, dan Ditolak, Sheet tinjau berisi pemeriksaan otomatis, dan Dialog tolak dengan alasan wajib.
- Status on-chain: Menunggu pencatatan, Tercatat (tautan Etherscan Sepolia bila tx hash ada), dan Data lampau untuk tagihan seed yang lunas tanpa pembayaran Midtrans. "Gagal dicatat" hanya tampil untuk admin dan pengelola; penghuni dan investor melihat Menunggu pencatatan (P4).
- Sidebar menandai menu aktif, termasuk subhalaman seperti kuitansi.
- Dokumen penerbitan di tab Dokumen `/kos/sumbersari-01` dan kartu dokumen `/investor/penawaran` memakai tiga file di `docs/bisnis/dokumen-penerbitan` dengan hash SHA-256 final. Alamat kontrak dan tx hash di halaman publik masih contoh; koordinator menggantinya setelah deploy Sepolia.
- Investor (P4): `/investor` berisi Kartu saldo bagi hasil yang selalu gelap dengan grafik sewa tercatat per tanggal bayar, Daftar sewa masuk per kamar, dan jalur kepemilikan; `/investor/portofolio` berisi kepemilikan, dompet kustodian, Bagi hasil per periode, dan Riwayat transaksi. Investor tidak pernah melihat kata gagal untuk pencatatan.
- Pengelola (P4): `/pengelola` berisi ringkasan sewa masuk dengan bilah dua segmen, papan 10 Ubin kamar, dan kartu Perlu ditindaklanjuti; `/pengelola/biaya` berisi total biaya, tabel Baris biaya, dan Sheet catat biaya dengan hash SHA-256 nota yang dihitung di peramban serta Alert untuk nota ganda (409).
- Admin (P4): `/admin` berisi kartu Periode berjalan, kartu Perlu perhatian (KYC, rekonsiliasi, antrean), dan Antrean job on-chain dengan tab dan Coba lagi; `/admin/periode` berisi Struk penutupan, kartu syarat, Dialog konfirmasi, status menutup atau gagal, blok snapshot, Jalankan distribusi (sekali), dan Bagian pemegang termasuk bagian perbendaharaan untuk pemilik lama.
- Revisi P4: tombol di kolom Aksi tabel memakai varian Outline dan rata kiri, termasuk Tinjau dan Detail di `/admin/kyc`.
- `/pengelola`, `/pengelola/biaya`, dan `/admin/periode` menerima `?periode=YYYY-MM`. Tanpa parameter, halaman memanggil API tanpa periode dan memakai periode berjalan yang dikembalikan backend.
- Penghuni (P4): tagihan periode yang sudah ditutup tidak bisa dibayar (tombol nonaktif dengan keterangan), dan pembayaran yang masuk setelah periode ditutup tampil sebagai "Dana dikembalikan". Admin melihat butir "Dana perlu dikembalikan" di kartu Perlu perhatian.
- Antrean job admin: job yang gagal permanen bisa ditandai ditangani lewat Dialog dengan catatan wajib; job itu tampil di tab Semua dengan nama admin dan catatannya.
- Penerus `/api/backend` ikut meneruskan `X-Content-Type-Options`, `Content-Disposition`, dan `Content-Security-Policy` dari backend (penting untuk file nota).

## Sesi dan pemanggilan API

JWT tidak pernah sampai ke JavaScript peramban.

| Bagian | File | Tugas |
|---|---|---|
| Masuk dan keluar | `src/app/api/session/route.ts` | `POST` meneruskan login ke backend dan menyimpan token di cookie httpOnly `kosbagi_session`. `DELETE` menghapusnya |
| Penerus API | `src/app/api/backend/[...path]/route.ts` | Meneruskan `/api/backend/...` ke backend dengan header `Authorization` dari cookie |
| Penjaga halaman | `src/proxy.ts` | Sebelum render: tanpa sesi ke `/masuk`, peran salah ke halaman perannya |
| Verifikasi sesi | `src/components/app-shell/session-account.tsx` | Menanyakan token ke backend lewat `GET /auth/me` dan menampilkan pengguna di sidebar |
| Klien API | `src/lib/api/` | Tipe respons, panggilan dari peramban, dan penanganan galat |

Halaman penghuni mengambil data di klien dengan SWR lewat `TenantBillingProvider` di `src/components/tenant/`, yang juga mengatur Snap, polling Memeriksa pembayaran, dan keadaan tagihan. Halaman investor, pengelola, dan admin memakai SWR langsung di komponen halamannya (`src/components/investor/`, `src/components/manager/`, `src/components/admin/`).

Halaman yang menunggu proses di luar peramban (konfirmasi Midtrans, pencatatan on-chain, whitelist dompet, transfer token, nota biaya, penutupan periode, job yang diulang) meminta data ulang berkala. Intervalnya berupa angka yang ditentukan dari hasil terakhir, karena SWR tidak memulai polling bila intervalnya 0 saat pertama dipasang.

## Rute

| Rute | Peran | Isi | Progress |
|---|---|---|---|
| `/` | publik | Beranda: hero, kos unggulan, papan kamar dan kuitansi on-chain, cara kerja, sewa ke bagi hasil, ajakan pemilik kos, risiko | P1 |
| `/kos` | publik | Daftar kos: kartu Kos Sumbersari 01 dan empty state | P1 |
| `/kos/[slug]` | publik | Detail kos (`/kos/sumbersari-01`): tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko (bisa ditautkan, mis. `?tab=keuangan`) dan panel penawaran | P1 |
| `/pemilik` | publik | Untuk pemilik kos, simulasi dana, form pengajuan (jalur 1) | P2 |
| `/masuk` | publik | Kartu akun demo dan form email dengan state error dari server | P1 tampilan, P2 berfungsi |
| `/investor` | investor | Kartu saldo bagi hasil, grafik sewa tercatat, Daftar sewa masuk, kepemilikan | P4 |
| `/investor/penawaran` | investor | Ringkasan penawaran, dokumen, risiko, Tiket beli dengan pemeriksaan skenario 8 dan 9, bayar lewat Snap | P3 |
| `/investor/portofolio` | investor | Kepemilikan, dompet kustodian, Bagi hasil per periode, Riwayat transaksi | P4 |
| `/investor/kyc` | investor | Form KYC dummy, Kartu status KYC, Jejak KYC sampai dompet tercatat di KosToken | P3 |
| `/penghuni` | penghuni | Ringkasan: Slip ringkas, riwayat, kamar, bukti | P2 |
| `/penghuni/tagihan` | penghuni | Slip tagihan, bayar via Snap, jejak pembayaran, riwayat dengan kolom Aksi | P2, P3 |
| `/penghuni/tagihan/[id]` | penghuni | Kuitansi sewa, panel argumen recordRent di Sepolia, cetak kuitansi | P3 |
| `/pengelola` | pengelola | Ringkasan sewa masuk, papan kamar, Perlu ditindaklanjuti | P4 |
| `/pengelola/biaya` | pengelola | Total biaya, Baris biaya, Sheet catat biaya dengan hash nota | P4 |
| `/admin` | admin | Periode berjalan, Perlu perhatian, Antrean job on-chain dengan Coba lagi | P4 |
| `/admin/kyc` | admin | Tab pengajuan, Sheet tinjau dengan pemeriksaan otomatis, Dialog tolak | P3 |
| `/admin/periode` | admin | Struk penutupan, syarat, Dialog konfirmasi, distribusi, Bagian pemegang | P4 |
| `/admin/rekonsiliasi` | admin | Rekonsiliasi Midtrans, basis data, blockchain (jalur 1) | P4 |

Rute peran memakai layout app shell (sidebar per peran, banner "Mode sandbox: data dummy, tanpa uang nyata", header halaman) dan dilindungi `src/proxy.ts`. Semua rute di atas sudah berisi sejak P4. `/pemilik` dan `/admin/rekonsiliasi` dibangun jalur 1; menu Rekonsiliasi di sidebar admin menaut ke sana.

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
│   │   ├── investor/ penghuni/ pengelola/ admin/   app shell per peran, masing-masing dengan error.tsx
│   │   ├── error.tsx         halaman galat akar (P5)
│   │   └── not-found.tsx     halaman 404
│   ├── components/
│   │   ├── ui/               komponen shadcn/ui yang sudah dikustom (termasuk dialog sejak P3)
│   │   ├── admin/            KYC admin, ringkasan admin, antrean job, struk dan kartu tutup periode, Bagian pemegang
│   │   ├── app-shell/        sidebar, blok akun dari sesi, header, banner sandbox, skeleton
│   │   ├── auth/             kartu akun demo, form masuk
│   │   ├── brand/            logo
│   │   ├── common/           tautan, status on-chain, badge tagihan, daftar bertumpuk, halaman galat, dll.
│   │   ├── home/             bagian-bagian beranda
│   │   ├── investor/         KYC, penawaran, Kartu saldo bagi hasil, Daftar sewa masuk, portofolio
│   │   ├── manager/          pengelola: ringkasan sewa, papan kamar, tindak lanjut, biaya, Sheet catat biaya
│   │   ├── property/         kartu kos, papan kamar, tab dan panel detail kos
│   │   ├── public/           navbar, footer, judul bagian, daftar langkah
│   │   ├── tenant/           halaman penghuni: slip, kuitansi, panel on-chain, jejak, riwayat, kartu
│   │   └── theme/            penyedia tema dan tombol ganti tema
│   ├── hooks/                use-mobile (dipakai sidebar)
│   ├── lib/                  tipe, format, periode, data statis, konfigurasi, keadaan tagihan, KYC, pesanan token, grafik investor, biaya, syarat penutupan
│   │   ├── api/              klien API, tipe respons, helper route handler
│   │   ├── auth/             peran, cookie sesi, verifikasi sesi di server
│   │   └── midtrans/         pemuat snap.js
│   └── proxy.ts              penjaga halaman peran
├── components.json           konfigurasi shadcn/ui (base radix, ikon Phosphor)
└── next.config.ts (termasuk header keamanan), eslint.config.mjs, tsconfig.json, .env.example
```

## Catatan desain

- Desain: Figma "KosBagi Desain UI" (`SiWSQc651BxoJmt67erq2d`), arah "Lime kuitansi". Token warna di `src/app/globals.css` sama persis dengan variabel Figma (mode Terang = `:root`, Gelap = `.dark`).
- Lime (`success`) hanya untuk bukti: lunas, tercatat on-chain, cap TERCATAT, garis grafik. Tombol memakai tinta (`primary`).
- Ikon: `@phosphor-icons/react` (weight regular). Komponen yang dipakai di Server Component mengimpor dari `@phosphor-icons/react/ssr`.
- Frame penghuni, investor, pengelola, dan admin belum punya versi gelap di Figma. Warnanya memakai token tema, dan hasil gelapnya diperiksa langsung di aplikasi. Panel catatan on-chain, Kartu bukti, dan Kartu saldo bagi hasil selalu gelap lewat class `dark`.
- Frame P4 hanya desktop. Di bawah 1280 px kolom kanan turun ke bawah. Tabel lebar memakai container query: bila kartunya lebih sempit dari tabel, isinya ditampilkan sebagai daftar bertumpuk (`components/common/stacked-list.tsx`), pola yang sama dengan Baris riwayat penghuni versi Ponsel (P5).
- Menambah komponen shadcn: `npx shadcn@4.23.0 add <nama>`. CLI menulis `import { cn } from "cn"`; ganti menjadi `import { cn } from "@/lib/utils"` supaya token tipografi KosBagi (mis. `text-button`) tidak terhapus saat class digabung.
