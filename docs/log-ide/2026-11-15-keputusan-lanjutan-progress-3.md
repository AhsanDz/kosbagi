# 15 November 2026: Keputusan lanjutan progress 3

| Butir | Isi |
|---|---|
| Tanggal | Minggu, 15 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Penyajian proyeksi 3 tahun yang hasilnya negatif
2. Pihak yang menanggung biaya peralihan hak ke kustodian
3. Pemegang peran jeda darurat di kontrak
4. Penyimpanan jejak deploy Sepolia

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Skenario dasar 10 kamar disajikan apa adanya, properti 20 kamar menjadi strategi

Proyeksi 3 tahun tetap memakai properti baru seukuran Kos Sumbersari 01 (10 kamar) sebagai skenario dasar, termasuk NPV 3 tahun −Rp584,0 juta dan BEP 59 properti. Business case bab 7 menuliskan jalan menuju untung sebagai strategi akuisisi: setelah properti percontohan, KosBagi memprioritaskan kos 20 kamar yang masih termasuk segmen proposal. Dengan properti 20 kamar, NPV ≥ 0 tercapai pada 3, 6, dan 10 properti baru.

Alasan: angka skenario dasar berasal dari studi kasus yang sama dengan prototipe, jadi lebih mudah dipertanggungjawabkan. Mengganti skenario dasar hanya supaya NPV positif akan menyembunyikan temuan bahwa ukuran properti adalah pengungkit terbesar.

### K2. Biaya peralihan hak ditanggung pemilik lama

Biaya peralihan sertifikat ke PT KosBagi Properti, yaitu PPh final 2,5%, BPHTB 5%, dan jasa PPAT sekitar 1% (±Rp153 juta untuk properti Rp1,8 miliar), ditanggung pemilik lama dan dibayar dari dana hasil penawaran. Imbal hasil investor dan fee KosBagi tidak berubah. FAQ dan simulasi dana di halaman pemilik kos menyebut potongan ini.

Alasan: membebankannya ke investor menurunkan imbal hasil per token sekitar 8%, dan membebankannya ke KosBagi membuat setiap penerbitan merugi karena fee penawaran 3% hanya Rp37,8 juta.

### K3. Jeda darurat tetap dipegang admin dan operator

Di KosToken dan KosLedger, `PAUSER_ROLE` tetap diberikan ke dompet admin dan dompet operator seperti [rancangan kontrak](../kontrak/rancangan-kontrak.md) bagian 4.3. Tidak ada perubahan kode.

Alasan: operator bisa langsung menjeda dari backend saat ada anomali, sedangkan admin tetap bisa menjeda dan mencabut jeda bila dompet operator bermasalah.

### K4. Jejak Ignition Sepolia tidak di-commit

Setelah deploy Sepolia, yang di-commit hanya `contracts/deployments/sepolia.json` (alamat, tx hash, dan blok) dan `contracts/ignition/parameters/sepolia.json`. Folder jejak `contracts/ignition/deployments/sepolia-smr01/` (±4 MB) masuk `.gitignore` dan disimpan koordinator di luar repo.

Alasan: bukti deploy sudah lengkap lewat `deployments/sepolia.json` dan Etherscan, sedangkan folder jejak hanya dibutuhkan untuk melanjutkan deploy yang terputus.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Bab 7 business case dan proyeksi keuangan memuat K1 dan K2 | Jalur 1 | Progress 3 | selesai |
| FAQ dan simulasi dana halaman pemilik kos menyebut biaya peralihan hak (K2) | Jalur 1 | Progress 3 | selesai |
| `.gitignore` dan panduan deploy Sepolia memuat K4 | Jalur 3 | Progress 3 | selesai |
| Konfirmasi besaran biaya peralihan hak ke notaris dan konsultan pajak | Jalur 1 | Business case | berjalan |

## Rujukan

- [Keputusan sebelum progress 3](2026-11-03-keputusan-progress-3.md).
- [`docs/bisnis/proyeksi-keuangan.md`](../bisnis/proyeksi-keuangan.md), bagian 7 "Biaya peralihan hak".
- [`docs/kontrak/deploy-sepolia.md`](../kontrak/deploy-sepolia.md), langkah setelah deploy.
