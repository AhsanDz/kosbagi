# 20 November 2026: Keputusan sebelum progress 5

| Butir | Isi |
|---|---|
| Tanggal | Jumat, 20 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Tempat menjalankan demo: laptop presenter atau layanan online
2. Pemeriksaan otomatis untuk setiap Pull Request
3. Alat lint untuk backend
4. Bentuk bahan presentasi
5. Alamat kontrak Sepolia di dokumen
6. Persetujuan desain progress 5

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Demo dijalankan di laptop presenter, konfigurasi online disiapkan

Demo di depan dosen berjalan di laptop presenter, dengan ngrok untuk menerima notifikasi Midtrans. Progress 5 tetap menyiapkan berkas konfigurasi dan panduan deploy online (frontend di Vercel, server API, worker, PostgreSQL, dan Redis di Railway) supaya aplikasi bisa di-deploy kapan saja. Deploy online tidak wajib dan tidak dijalankan sebagai bagian dari progress 5.

Alasan: alur demo sudah disiapkan dan diuji untuk laptop (README langkah 12 dan 13). Konfigurasi online disiapkan supaya aplikasi bisa di-deploy kapan saja, misalnya bila tautan prototipe yang bisa dibuka dibutuhkan untuk forum Brone.

### K2. GitHub Actions memeriksa setiap Pull Request

Repositori mendapat alur kerja CI yang berjalan saat Pull Request dibuat dan saat ada push ke `main`, dengan Node.js 24. Backend: lint, typecheck, test, build, dan test integrasi dengan PostgreSQL dan Redis di dalam CI. Kontrak: test Hardhat. Frontend: lint dan build. CI tidak memakai secret repositori; Midtrans ditiru di test.

Alasan: pemeriksaan otomatis di GitHub menunjukkan bila sebuah Pull Request merusak build atau test sebelum di-merge. CI sudah masuk rencana progress 5 jalur 2 sejak pembagian progress 29 Oktober 2026.

### K3. Lint backend memakai Oxlint 1.94.0

Backend diperiksa dengan Oxlint 1.94.0 (kategori correctness sebagai galat, ditambah beberapa aturan pilihan), lewat perintah `npm run lint`. Frontend tetap memakai ESLint. Temuan awal diperbaiki oleh pemilik file masing-masing, bukan dengan melonggarkan aturan.

Alasan: ESLint untuk TypeScript belum mendukung TypeScript 7.0.2 yang dipakai backend. Catatan lint backend sudah tertunda sejak progress 2 dan diputuskan bersama CI.

### K4. Presentasi: kerangka slide dan naskah saja

Progress 5 menyiapkan kerangka slide per bagian rubrik, naskah demo per butir, perkiraan waktu, dan usulan pembagian bicara di `docs/presentasi/`. Slide dan video demo dibuat tim sendiri.

Alasan: slide disusun sendiri oleh tim yang menyampaikannya. Kerangka dan naskah membantu supaya semua bagian rubrik tercakup dan angka di slide sama dengan dokumen.

### K5. Alamat Sepolia diisi setelah deploy

Kontrak belum di-deploy ke Sepolia. Alamat kontrak, hash transaksi dokumen penerbitan, dan tautan Etherscan ditulis dengan penanda `<diisi setelah deploy Sepolia>` di README dan dokumen lain, lalu diisi koordinator setelah deploy demo akhir.

Alasan: setiap gladi di Sepolia men-deploy kontrak baru ([keputusan 20 November 2026 K5](2026-11-20-keputusan-qa-progress-4.md)), jadi alamat yang benar baru diketahui setelah deploy terakhir.

### K6. Desain progress 5 disetujui

Desain progress 5 disetujui tanpa revisi: Figma disamakan dengan aplikasi progress 4, dan halaman 07 Alur Demo berisi prototipe klik untuk keenam butir demo wajib. Desain ini tidak meminta perubahan perilaku aplikasi. Naskah demo di `docs/presentasi/` mengikuti urutan layar prototipe itu.

Alasan: prototipe klik memperlihatkan urutan layar demo dari awal sampai akhir, sehingga bisa dipakai untuk latihan dan sebagai cadangan bila demo langsung terganggu.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Konfigurasi dan panduan deploy online (K1) | Jalur 2 dan jalur 4 | Progress 5 | selesai (Pull Request progress 5) |
| CI GitHub Actions dan lint backend (K2, K3) | Jalur 2 | Progress 5 | selesai (Pull Request progress 5) |
| Perbaikan temuan lint di file masing-masing (K3) | Jalur 1, 2, dan 3 | Progress 5 | selesai (Pull Request progress 5) |
| Kerangka slide, naskah demo, dan pembagian bicara (K4) | Jalur 1 | Progress 5 | selesai |
| Slide dan video demo (K4) | Tim | Sebelum presentasi | belum |
| Deploy demo akhir ke Sepolia dan pengisian penanda alamat (K5) | Koordinator | Sebelum presentasi | selesai, 24 November 2026 ([keputusan 24 November 2026](2026-11-24-keputusan-akhir-progress-5.md) K2 dan K3) |

## Rujukan

- Ketentuan tugas akhir: hasil yang dikumpulkan (slide, video demo, tautan prototipe) dan rubrik penilaian.
- [Keputusan dari hasil QA progress 4](2026-11-20-keputusan-qa-progress-4.md) K5: setiap gladi Sepolia diawali deploy kontrak baru.
- [Pernyataan penggunaan AI](../pernyataan-ai.md).
- `docs/presentasi/`, `docs/deploy/online.md`, dan `.github/workflows/ci.yml`.
