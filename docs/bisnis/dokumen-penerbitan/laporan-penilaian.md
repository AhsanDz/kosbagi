# Laporan Penilaian Properti Kos Sumbersari 01 (Dummy)

> **DOKUMEN DUMMY UNTUK PROTOTIPE TUGAS AKHIR.** Ini bukan laporan penilaian dari Kantor Jasa Penilai Publik dan tidak disusun menurut Standar Penilaian Indonesia. Nama kantor penilai, nama penilai, nomor izin, dan hasil inspeksi fiktif. Angka pendapatan mengikuti asumsi proposal Kelompok 9. Tidak ada data pribadi asli.

| Butir | Isi |
|---|---|
| Jenis dokumen di KosToken | `DOCUMENT_APPRAISAL_REPORT` |
| Kode properti | SMR01 |
| Token | KB-SMR01 |
| Versi dokumen | 1 |
| Nomor laporan | LPP-DUMMY-SMR01-2026-01 |
| Penilai | KJPP Contoh Penilai dan Rekan (fiktif), izin IZIN-DUMMY-0001 |
| Pemberi tugas | PT KosBagi Teknologi |
| Tanggal inspeksi | 14 Oktober 2026 |
| Tanggal penilaian | 15 Oktober 2026 |
| Tanggal laporan | 21 Oktober 2026 |

## 1. Tujuan dan dasar nilai

Penilaian ini menentukan nilai pasar Kos Sumbersari 01 sebagai dasar jumlah token KB-SMR01. Jumlah token sama dengan nilai pasar dibagi harga token Rp100.000.

## 2. Objek penilaian

| Butir | Isi |
|---|---|
| Lokasi | Kelurahan Sumbersari, Kecamatan Lowokwaru, Kota Malang, sekitar Universitas Brawijaya |
| Tanah | 250 m², sertifikat SHM-DUMMY-SMR01-0001 (dialihkan ke kustodian sebagai HGB-DUMMY-SMR01-0001) |
| Bangunan | Rumah kos dua lantai, 330 m², kondisi baik |
| Kamar | 10 kamar eksklusif dengan AC, kamar mandi dalam, dan wifi |
| Sewa | Rp1.500.000 per kamar per bulan |
| Okupansi rata-rata | 90% |

## 3. Pendekatan pendapatan

Nilai dihitung dengan kapitalisasi langsung atas pendapatan operasional bersih satu tahun.

| No | Pos | Hitungan | Nilai per tahun |
|---|---|---|---|
| 1 | Sewa potensial | 10 kamar × Rp1.500.000 × 12 bulan | Rp180.000.000 |
| 2 | Kekosongan 10% | 10% × (1) | Rp18.000.000 |
| 3 | Sewa kotor efektif | (1) − (2) | Rp162.000.000 |
| 4 | Biaya operasional 20% | 20% × (3): pengelola harian, listrik dan air area umum, internet, kebersihan, perawatan, PBB | Rp32.400.000 |
| 5 | Pendapatan operasional bersih | (3) − (4) | Rp129.600.000 |
| 6 | Tingkat kapitalisasi | Asumsi penilai untuk kos eksklusif dekat kampus | 7,2% |
| 7 | Nilai menurut pendekatan pendapatan | (5) ÷ (6) | Rp1.800.000.000 |

Fee platform dan pajak penghasilan tidak dikurangkan di sini karena keduanya bergantung pada struktur penerbitan, bukan pada properti.

## 4. Pendekatan pasar

| No | Pos | Hitungan | Nilai |
|---|---|---|---|
| 1 | Pembanding | Kos 23 kamar dekat UB ditawarkan Rp4.500.000.000 (Brighton Real Estate, 2026) | Rp195.652.174 per kamar |
| 2 | Penyesuaian harga penawaran ke harga transaksi | −5% | |
| 3 | Penyesuaian karena pembanding termasuk ruang toko | −3% | |
| 4 | Nilai per kamar setelah penyesuaian | Rp4.500.000.000 ÷ 23 × 92% | Rp180.000.000 |
| 5 | Nilai menurut pendekatan pasar | 10 kamar × (4) | Rp1.800.000.000 |

## 5. Kesimpulan nilai

| Pendekatan | Nilai | Bobot |
|---|---|---|
| Pendapatan | Rp1.800.000.000 | 50% |
| Pasar | Rp1.800.000.000 | 50% |
| **Nilai pasar** | **Rp1.800.000.000** | |

Nilai pasar Kos Sumbersari 01 per 15 Oktober 2026 adalah **Rp1.800.000.000** (satu miliar delapan ratus juta rupiah), atau Rp180.000.000 per kamar.

Konsekuensi untuk token:

| Pos | Hitungan | Nilai |
|---|---|---|
| Jumlah token | Rp1.800.000.000 ÷ Rp100.000 | 18.000 token |
| Token pemilik lama (30%) | 30% × 18.000 | 5.400 token |
| Token ditawarkan ke investor (70%) | 70% × 18.000 | 12.600 token, Rp1.260.000.000 |

## 6. Asumsi dan syarat pembatas

1. Laporan ini dummy. Inspeksi, data pembanding yang disesuaikan, dan tingkat kapitalisasi adalah asumsi untuk prototipe, bukan hasil kerja penilai publik.
2. Okupansi 90% dan biaya operasional 20% mengikuti asumsi proposal dan belum diuji dengan data historis properti.
3. Nilai tidak memperhitungkan biaya peralihan hak ke kustodian.
4. Penilaian ulang dilakukan paling lambat satu tahun setelah tanggal penilaian. Laporan baru dicatat sebagai versi berikutnya lewat `anchorDocument`, dan versi ini tetap tersimpan.

## 7. Yang dicatat di blockchain

Yang dicatat hanya hash SHA-256 file ini, sebagai versi 1 jenis `DOCUMENT_APPRAISAL_REPORT` di kontrak KosToken saat penerbitan. Hash dihitung dari isi file apa adanya: UTF-8, akhir baris LF. Perubahan sekecil apa pun menghasilkan hash berbeda.

## Sumber

- Brighton Real Estate (2026) *Rumah Kos + Toko Dekat Suhat, Rukos Eksklusif Dekat UB (Universitas Brawijaya)*. Tersedia di: https://www.brighton.co.id/cari-properti/view/lowokwaru-57 (Diakses: 15 Oktober 2026).
- Proposal Tugas Akhir Kelompok 9 (2026), *KosBagi*, Tabel 2.6 dan bagian 2.2.
