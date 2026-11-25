# 20 November 2026: Keputusan dari hasil QA progress 4

| Butir | Isi |
|---|---|
| Tanggal | Jumat, 20 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator atas temuan QA progress 4 (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Penghuni masih melihat kata "gagal" untuk pencatatan on-chain (temuan S1)
2. Tampilan penghuni yang membayar setelah periode ditutup (S2)
3. Anomali skenario uji 7 yang tidak terlihat di UI (S3)
4. Job gagal permanen yang memblokir penutupan periode (S4)
5. Strategi gladi dan demo di Sepolia (S5)

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Penghuni tidak pernah melihat kata "gagal" untuk pencatatan on-chain

Pencatatan sewa yang gagal di Sepolia ditampilkan kepada penghuni sebagai "Menunggu pencatatan", sama dengan aturan untuk investor. Hanya admin dan pengelola yang melihat status gagal. Temuan QA ini diperlakukan sebagai bug dan diperbaiki.

Alasan: aturan ini sudah ada di kontrak kerja dan serah terima desain progress 4. Penghuni tidak bisa berbuat apa-apa atas pencatatan yang gagal, sedangkan pengulangannya urusan admin lewat antrean job.

### K2. Penghuni yang membayar setelah periode ditutup diberi tahu dananya akan dikembalikan

Pembayaran yang dimulai sebelum penutupan lalu lunas sesudahnya (16 Nov K4) tidak mengubah tagihan. Penghuni kini melihat status bahwa dana akan dikembalikan, bukan "Belum ada pembayaran", dan admin melihat butir tindak lanjut "Dana perlu dikembalikan". Rekonsiliasi tetap menampilkan order itu sebagai Selisih.

Alasan: saat QA, penghuni yang uangnya sudah terpotong diberi tahu belum ada pembayaran dan bisa mengira harus membayar lagi. Kasus ini sebelumnya hanya terlihat di halaman rekonsiliasi admin.

### K3. Order yang punya anomali selalu Selisih di rekonsiliasi

Order yang punya anomali pembayaran, jenis apa pun, yang terkait order itu atau percobaannya, dinilai Selisih dengan alasan "Ada anomali <jenis>", walaupun Midtrans, basis data, dan Sepolia sepakat. Barisnya bisa dibuka untuk melihat isi anomali: jenis, catatan, dan waktu. Pengecualiannya hanya percobaan yang `order_id`-nya sudah terpakai di Midtrans sebelum basis data ini ada, yang memang tidak ikut rekonsiliasi.

Alasan: notifikasi bernominal palsu di skenario uji 7 ditolak dan dicatat sebagai anomali, tetapi API status Midtrans tetap benar, sehingga sebelumnya order itu tampil Cocok dan anomalinya tidak terlihat di mana pun. Kontrak kerja progress 4 meminta anomali `AMOUNT_MISMATCH` muncul sebagai Selisih.

### K4. Job gagal permanen bisa ditandai ditangani, dan hanya job periode itu yang memblokir penutupan

Admin mendapat tombol "Tandai ditangani" untuk job yang gagal di antrean `/admin`. Syarat penutupan periode hanya memperhitungkan job gagal yang memengaruhi periode itu; job whitelist KYC tidak memblokir.

Alasan: saat QA, satu job gagal permanen di jenis atau periode mana pun membuat Tutup periode tidak pernah bisa ditekan, padahal Coba lagi akan selalu gagal (mis. nota yang sama sudah tercatat di kontrak dengan isi berbeda). Ini paling mungkin terjadi saat persiapan demo di Sepolia.

### K5. Setiap gladi di Sepolia diawali deploy kontrak baru

Setiap gladi di Sepolia dimulai dengan deploy `KosToken` dan `KosLedger` baru, lalu reset basis data dan pengisian alamat kontrak baru di `backend/.env`. Demo akhir memakai deploy terakhir. Gladi di Hardhat lokal tetap bisa diulang dengan deploy ulang biasa. README langkah 12 dan 13 memuat urutannya dan perkiraan ETH per gladi.

Alasan: catatan on-chain tidak ikut terhapus saat basis data di-reset. `closePeriod` untuk satu periode hanya bisa sekali, saldo token investor tetap ada sehingga pembelian ulang ditolak batas 10%, dan nota yang sama sudah tercatat. Gladi kedua di kontrak yang sama tidak mungkin sampai tutup periode.

Catatan: sebagian diganti oleh [keputusan 24 November 2026 K2](2026-11-24-keputusan-akhir-progress-5.md). Kontrak demo akhir di-deploy 24 November 2026 tanpa `DEPLOY_LABEL` sebelum ada gladi Sepolia, jadi demo akhir memakai kontrak itu, bukan deploy terakhir. Gladi Sepolia sesudahnya tetap men-deploy kontrak baru lewat `DEPLOY_LABEL`.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Penghuni melihat "Menunggu pencatatan" untuk pencatatan yang gagal (K1) | (diisi koordinator) | Progress 4 | berjalan |
| Status "dana akan dikembalikan" untuk penghuni dan butir "Dana perlu dikembalikan" untuk admin (K2) | (diisi koordinator) | Progress 4 | berjalan |
| Rekonsiliasi: order beranomali Selisih dan isi anomali bisa dilihat (K3) | Jalur 1 | Progress 4 | selesai |
| Tombol "Tandai ditangani" dan syarat `JOB_FAILED` per periode (K4) | (diisi koordinator) | Progress 4 | berjalan |
| Opsi deploy kontrak baru di skrip deploy Sepolia (K5) | Jalur 3 | Progress 4 | berjalan |
| README langkah 12, 13, dan pemecahan masalah memuat K2, K3, K4, dan K5 | Jalur 1 | Progress 4 | selesai |

## Rujukan

- Laporan QA progress 4, temuan S1 sampai S5.
- [Keputusan sebelum progress 4](2026-11-16-keputusan-progress-4.md) K4: sewa yang dibayar setelah periode ditutup ditolak.
- [`docs/kontrak/deploy-sepolia.md`](../kontrak/deploy-sepolia.md): perkiraan gas deploy dan transaksi operator.
- README root langkah 12 dan 13, serta tabel pemecahan masalah.
