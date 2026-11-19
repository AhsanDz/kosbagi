# 3 November 2026: Keputusan sebelum progress 3

| Butir | Isi |
|---|---|
| Tanggal | Selasa, 3 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Tagihan November di data seed dan pencatatannya di blockchain
2. Pemeriksaan otomatis pengajuan KYC
3. Jumlah investor dummy di data seed
4. Dompet yang dipakai di Sepolia

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Tagihan seed dibayar lewat Midtrans sandbox

Seed tidak lagi membuat tagihan November yang langsung lunas. Kesembilan tagihan November 2026 dibuat belum dibayar, lalu sebelum demo tim membayar semuanya lewat Midtrans sandbox dengan bantuan skrip. Dengan begitu setiap pembayaran melewati webhook, antrean, dan `recordRent` seperti pembayaran biasa. Tagihan lampau K03 (Agustus sampai Oktober 2026) tetap lunas tanpa catatan on-chain dan tampil tanpa tautan Etherscan.

Alasan: catatan QA progress 2 menemukan bahwa tagihan lunas dari seed tidak punya pembayaran Midtrans, jadi tidak pernah bisa tercatat di blockchain. Demo `closePeriod` butuh sewa kotor on-chain Rp13.500.000 dari sembilan kamar supaya menghasilkan Rp438,75 per token.

### K2. Pemeriksaan otomatis KYC dibangun

Saat admin meninjau pengajuan KYC, backend menghitung tiga pemeriksaan: nomor identitas berawalan `DUMMY-`, nama di pengajuan sama dengan nama akun (tanpa membedakan huruf besar kecil dan spasi di tepi), dan tidak ada pengajuan lain yang masih menunggu.

Alasan: Sheet tinjau KYC di desain progress 3 memuat kotak "Pemeriksaan otomatis", dan serah terima desain meminta kotak itu dihapus bila pemeriksaannya tidak dibangun, bukan diisi statis.

### K3. Tujuh investor dummy

Seed menambah enam investor dummy sehingga ada tujuh, dengan nama dan status mengikuti daftar admin KYC di Figma: Dimas Pratama, Rani Aulia, Fajar Nugroho, Eko Saputra, Citra Lestari, Bagas Wicaksono, dan Hendra Kusuma, semuanya dengan email `*.dummy@kosbagi.test`. Dimas tidak punya pengajuan KYC supaya demo dimulai dari mengajukan KYC. Seed tidak membuat pengajuan yang sudah disetujui, karena persetujuan harus membuat dompet kustodian dan job whitelist; persetujuan dilakukan saat demo.

Alasan: catatan desain progress 3 mencatat bahwa daftar admin di Figma memakai tujuh investor, sedangkan seed baru punya satu.

### K4. Dua dompet Sepolia: admin dan operator

Dompet admin memegang `DEFAULT_ADMIN_ROLE`, men-deploy kontrak, mencatat dokumen penerbitan, dan bisa menjeda kontrak. Dompet operator mengirim transaksi harian. Kunci admin hanya dipakai skrip deploy di folder `contracts/` dan tidak pernah masuk `backend/.env`.

Alasan: prosedur darurat di [rancangan kontrak](../kontrak/rancangan-kontrak.md) bagian 3.13 hanya bisa dijalankan bila dompet admin terpisah dari dompet operator.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Seed tagihan November belum dibayar, tujuh investor, pengajuan KYC, dan penawaran KB-SMR01 (K1, K3) | Jalur 1 | Progress 3 | berjalan |
| Skrip membayar semua tagihan satu periode lewat Midtrans sandbox (K1) | Jalur 2 | Progress 3 | berjalan |
| Pemeriksaan otomatis di API KYC admin (K2) | Jalur 2 | Progress 3 | berjalan |
| Skrip deploy Sepolia dengan dompet admin dan operator terpisah (K4) | Jalur 3 | Progress 3 | berjalan |
| Menyiapkan RPC, kedua dompet berisi ETH Sepolia, dan API key Etherscan, lalu menjalankan deploy | Koordinator | Sebelum demo progress 3 | berjalan |

## Rujukan

- [Keputusan dari hasil QA progress 2](2026-11-03-keputusan-qa-progress-2.md).
- [`docs/bisnis/perhitungan-distribusi.md`](../bisnis/perhitungan-distribusi.md), kasus 1.
- [`docs/bisnis/dokumen-penerbitan/`](../bisnis/dokumen-penerbitan/), dokumen yang hash-nya dicatat dompet admin saat deploy.
- Figma "KosBagi Desain UI", frame [Admin KYC, menunggu](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-146) dan [Admin KYC, tab disetujui](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-1084).
