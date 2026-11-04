# 29 Oktober 2026: Keputusan pengembangan setelah proposal

| Butir | Isi |
|---|---|
| Tanggal | Kamis, 29 Oktober 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Status proposal tugas akhir
2. Rencana kerja prototipe: tahapan dan pembagian jalur
3. Alur kerja Git dan transparansi penggunaan AI
4. Arah desain antarmuka
5. Persiapan lingkungan pengembangan

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

Alasan yang tercatat bersama setiap keputusan ditulis di bawah keputusan masing-masing.

## Keputusan

### K1. Proposal final dikumpulkan

Proposal lengkap (BAB I sampai V, daftar pustaka, dan Lampiran A pernyataan penggunaan AI) dikumpulkan pada tenggat 29 Oktober 2026. Rancangan di proposal menjadi acuan pembangunan prototipe dan business case.

### K2. Pengerjaan dibagi menjadi 5 progress dan 4 jalur

| Progress | Tanggal | Hasil yang bisa didemokan |
|---|---|---|
| P1 Fondasi | 29 Okt sampai 4 Nov | Backend `/api/health` berjalan dengan PostgreSQL dan Redis lokal, test `KosToken` lulus, beranda tampil |
| P2 Fitur inti dan pembayaran sandbox | 5 sampai 11 Nov | Penghuni membayar sewa di Midtrans sandbox, webhook masuk, tagihan menjadi lunas |
| P3 Integrasi blockchain | 12 sampai 18 Nov | Pembayaran sewa tercatat di Sepolia; investor lolos KYC lalu membeli token |
| P4 Biaya, distribusi, dan rekonsiliasi | 19 sampai 24 Nov | Keenam butir cakupan demo wajib (prototipe lengkap) |
| P5 Finalisasi | 25 Nov sampai 2 Des | Aplikasi ter-deploy, dokumen akhir, bahan presentasi |

Empat jalur mengikuti Tabel 5.2 proposal: Jalur 1 Bisnis & Keuangan, Jalur 2 Backend & Pembayaran, Jalur 3 Kontrak & Blockchain, dan Jalur 4 Frontend & Desain. Selain dokumen bisnis, Jalur 1 juga mengerjakan data dummy (seed), kalkulator bagi hasil, serta modul dan halaman rekonsiliasi.

Target yang terkait: business case dikumpulkan 24 November 2026, prototipe berjalan penuh paling lambat 25 November 2026, serta presentasi dan demo ditargetkan sebelum 3 Desember 2026 karena pengurangan nilai mulai berlaku pada tanggal itu.

Alasan: pembagian jalur mengikuti Tabel 5.2 proposal. Dalam satu progress, satu file hanya disentuh satu jalur supaya tidak terjadi konflik Git, dan progress berikutnya baru dimulai setelah semua pekerjaan progress sebelumnya digabung.

### K3. Alur kerja Git: branch dan Pull Request

- Tim memakai satu repositori GitHub, dan setiap anggota commit atas namanya sendiri sesuai syarat kontribusi tugas akhir.
- Repositori dibuat dalam keadaan kosong oleh koordinator. Commit pertama berisi kerangka repositori (P0) dan di-push langsung ke `main`. Ini satu-satunya commit tanpa Pull Request karena `main` belum ada sebelumnya.
- Setelah itu setiap pekerjaan dikerjakan di branch `p<progress>/j<jalur>-<topik>`, diajukan lewat Pull Request, diperiksa koordinator, lalu di-merge dengan pilihan **Create a merge commit**.

Rincian alurnya ada di [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

Alasan: repositori yang kosong membuat commit kerangka menjadi dasar bersama, sehingga pekerjaan setiap jalur bisa disiapkan di atas dasar yang sama dan digabung tanpa konflik.

### K4. Pesan commit tanpa penanda AI; transparansi lewat pernyataan AI

Pesan commit anggota memakai format Conventional Commits berbahasa Indonesia dan tidak memuat trailer `Co-Authored-By`. Penggunaan alat AI dinyatakan menyeluruh di dokumen pernyataan AI, yang masuk repositori di progress 5.

### K5. Arah desain "Lime kuitansi"

- Palet: latar abu kapur `#ECEDE8`, tinta `#0E0F0C`, panel `#FBFBF8`, dan lime stabilo `#D4F55A`.
- Lime hanya dipakai untuk bukti (lunas, tercatat, cap TERCATAT, garis grafik). Semua tombol berwarna tinta.
- Font: Archivo untuk judul display, Geist untuk antarmuka dan teks, Geist Mono untuk hash, `order_id`, dan kolom angka.
- Ikon memakai Phosphor, bukan Lucide.
- Mode gelap tersedia sebagai toggle terang dan gelap.
- Foto kos adalah foto ilustrasi buatan AI dan selalu diberi label "Foto ilustrasi".

Riwayat: arah pertama, "Biru kuitansi" (biru `#1F3C88` dengan font Plus Jakarta Sans), diganti karena dinilai masih terlihat generik seperti templat buatan AI. Tiga opsi berikutnya (Buku kas, Kos sore, Terminal bank) ditolak. Setelah koordinator memberi referensi visual dari Dribbble (Fintra dan Stellar), dipilih "Lime kuitansi" dengan perombakan menyeluruh. Seluruh layar P1 disetujui koordinator pada hari yang sama. Tautan file Figma ada di folder [`docs/desain/`](../desain/).

### K6. Rute halaman publik mengikuti pola GORO

- `/` untuk beranda, `/kos` untuk daftar kos, dan `/kos/sumbersari-01` untuk detail kos dengan tab Ringkasan, Keuangan, Dokumen, Blockchain, dan Risiko, ditambah kartu penawaran yang menempel di samping.
- Daftar kos hanya berisi Kos Sumbersari 01 ditambah keterangan "Properti berikutnya sedang dinilai", tanpa properti fiktif tambahan.
- Tombol Beli token mengarah ke halaman masuk bila pengguna belum login, lalu ke halaman penawaran investor.
- Navigasi publik: Beranda, Daftar kos, Cara kerja, dan Masuk.

Alasan: koordinator menanyakan mengapa navigasi beranda langsung menuju detail kos, bukan daftar kos, lalu meminta goro.id dipakai sebagai acuan. GORO memakai tiga lapis halaman: beranda, daftar properti, dan detail properti.

### K7. Pemilik kos menjadi aktor di situs publik

- Ada halaman baru `/pemilik` (dana di muka, simulasi dana dengan fee 3%, alur 5 langkah, syarat dan dokumen, FAQ, dan form pengajuan), bagian "Punya kos dekat kampus?" di beranda, serta tautan "Untuk pemilik" di navigasi dan footer.
- Form pengajuan punya tampilan Default, Error, dan Terkirim (contoh nomor pengajuan `AJU-SMR-2026-0007`) dan memakai data dummy.
- Pemilik kos tidak mendapat peran login baru. Peran aplikasi tetap empat: investor, penghuni, pengelola, dan admin.
- Halaman `/pemilik` dikerjakan Jalur 1 dan endpoint `POST /api/owner-applications` dikerjakan Jalur 2, keduanya di P2.

Alasan: desain sebelumnya dinilai terlalu berfokus pada investor, padahal pemilik kos yang ingin mentokenisasi kosnya juga pihak penting.

### K8. Lingkungan pengembangan lokal memakai Docker

PostgreSQL dan Redis untuk pengembangan lokal dijalankan lewat `docker compose up`. Docker Desktop dipasang sebelum P2 dimulai pada 5 November 2026.

### K9. Versi teknologi

- Node.js 24 LTS dan npm, TypeScript mode strict.
- Kontrak: Solidity 0.8.x, OpenZeppelin Contracts 5.x, Hardhat 3 dengan ethers v6, dan Hardhat Ignition untuk deploy.
- Backend: Express 5, Prisma 7 dengan PostgreSQL, Redis dan BullMQ, zod, JWT, `midtrans-client`, serta vitest dan supertest.
- Frontend: Next.js (App Router) dengan React 19, Tailwind CSS 4, shadcn/ui, dan `next-themes` untuk toggle tema.
- Versi pasti dicek dengan `npm view`, lalu dikunci (pin) di `package.json`.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Membangun dan menggabungkan pekerjaan P1 | Semua jalur | 4 November 2026 | Berjalan |
| Memasang Docker Desktop | Koordinator | Sebelum 5 November 2026 | (diisi koordinator) |
| Mendesain layar P2 sampai P4 di file Figma yang sama | Koordinator | Sebelum progress terkait dimulai | (diisi koordinator) |
| Menentukan visibilitas repositori (publik atau privat) dan aturan proteksi branch `main` | Koordinator | (belum ditentukan) | Belum |

## Hal yang masih terbuka

- Jadwal pertemuan progress report masih menunggu pengumuman di kelas (antara 29 Oktober dan 24 November 2026).
- Visibilitas repositori dan aturan proteksi branch `main`.

## Rujukan

- Proposal Tugas Akhir Kelompok 9, Tabel 4.3 (skenario uji), bagian 4.8 (cakupan demo), dan Tabel 5.2 (pembagian tugas).
- Ketentuan tugas akhir dari tim pengampu (jadwal dan rubrik penilaian).
- [`CONTRIBUTING.md`](../../CONTRIBUTING.md) untuk alur kerja Git.
- File Figma "KosBagi Desain UI" (tautannya di folder [`docs/desain/`](../desain/)).
