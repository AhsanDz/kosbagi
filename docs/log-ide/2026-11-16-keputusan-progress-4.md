# 16 November 2026: Keputusan sebelum progress 4

| Butir | Isi |
|---|---|
| Tanggal | Senin, 16 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Bagian bagi hasil untuk token yang belum terjual (dompet perbendaharaan)
2. Cara menyiapkan saldo token investor untuk demo
3. Biaya operasional November untuk demo
4. Pembayaran sewa yang lunas setelah periode ditutup
5. Kontrak voting `KosVoting`

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Bagian perbendaharaan ditambahkan ke saldo pemilik lama

Token yang belum terjual tetap ikut menerima bagi hasil dengan rumus yang sama dengan pemegang lain, `floor(sewa bersih × saldo ÷ total suplai)`. Bagian itu ditambahkan ke saldo pemilik lama dan dicatat sebagai baris tersendiri "Bagian perbendaharaan (… token belum terjual)" dengan tujuan "pemilik lama". Untuk November 2026, 8.140 token belum terjual menghasilkan Rp3.571.425.

Alasan: selama token belum terjual, hak manfaat ekonominya masih milik pemilik lama, dan setiap periode tetap berdiri sendiri tanpa sisa yang tertahan. Rincian hitungannya di [perhitungan distribusi](../bisnis/perhitungan-distribusi.md) bagian 6.

### K2. Saldo token investor demo disiapkan lewat jalur sungguhan

Skrip persiapan demo jalur 2 menyetujui KYC Bagas, Citra, Eko, dan Fajar lewat API, membuat pesanan `BUY-` dengan virtual account Midtrans sandbox, lalu menunggu tim membayar di simulator. Token pindah lewat webhook dan worker seperti pembelian biasa. Jumlahnya Bagas 1.800, Citra 1.200, Eko 800, dan Fajar 560 token. Dimas membeli 100 token saat demo. Bila sandbox menolak virtual account Rp180 juta, pesanan Bagas dipecah berurutan.

Alasan: saldo yang dibuat langsung di basis data atau kontrak tidak punya pembayaran Midtrans, sehingga halaman rekonsiliasi akan menampilkannya sebagai selisih dan demo kehilangan buktinya.

### K3. Biaya November: Rp2.400.000 disiapkan, Rp300.000 dicatat saat demo

Skrip persiapan jalur 2 mencatat biaya Rp2.400.000 lewat API pengelola dengan nota dummy dari repositori. Saat demo, pengelola mencatat nota perbaikan K07 Rp300.000 lewat halaman Biaya dan nota. Total biaya menjadi Rp2.700.000 dan struk penutupan menghasilkan Rp438,75 per token, sama dengan angka proposal.

Alasan: demo tetap memperlihatkan alur pencatatan nota dari awal (unggah, hash, `recordExpense`) tanpa mengetik semua nota bulanan di depan dosen.

### K4. Sewa yang dibayar setelah periode ditutup ditolak

Tagihan dari periode yang sudah ditutup tidak bisa dibayar lagi (409 `PERIOD_CLOSED`). Pembayaran yang dimulai sebelum penutupan lalu lunas sesudahnya dicatat sebagai anomali untuk dikembalikan dananya, tanpa job on-chain, dan tagihannya tidak berubah. Pembayaran seperti ini tampil sebagai Selisih di halaman rekonsiliasi.

Alasan: setelah `closePeriod`, angka periode di `KosLedger` final. Sewa yang masuk sesudahnya tidak bisa lagi ikut dibagikan tanpa mengubah catatan yang sudah dipakai investor.

### K5. `KosVoting` tidak dibangun

Voting on-chain tidak dibangun di prototipe dan dicatat sebagai pengembangan lanjutan di [business case](../bisnis/business-case.md) bab 10. `KosToken` tetap memakai ERC20Votes, jadi checkpoint saldo yang dibutuhkan voting sudah tersedia.

Alasan: voting termasuk butir opsional di proposal, sedangkan sisa waktu progress 4 dipakai untuk enam butir demo wajib.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Distribusi menambahkan bagian perbendaharaan ke saldo pemilik lama (K1) | Jalur 2 | Progress 4 | berjalan |
| Perhitungan distribusi dan test kalkulator memuat K1 | Jalur 1 | Progress 4 | selesai |
| Skrip `demo:siapkan-investor` dan `demo:catat-biaya` (K2, K3) | Jalur 2 | Progress 4 | berjalan |
| Penolakan `PERIOD_CLOSED` dan anomali pembayaran telat (K4) | Jalur 2 | Progress 4 | berjalan |
| Rekonsiliasi menampilkan pembayaran telat sebagai Selisih (K4) | Jalur 1 | Progress 4 | selesai |
| Business case bab 10 mencatat `KosVoting` sebagai pengembangan lanjutan (K5) | Jalur 1 | Progress 4 | selesai |
| Membayar pesanan investor dan tagihan di simulator Midtrans sebelum demo | Koordinator | Sebelum demo | belum |

## Rujukan

- Proposal bagian 4.5 (cakupan demo wajib dan butir opsional) dan Tabel 4.3 (skenario uji).
- [Keputusan sebelum progress 2](2026-11-02-keputusan-progress-2.md) K2: bagi hasil pro-rata dan sisa pembulatan.
- [`docs/bisnis/perhitungan-distribusi.md`](../bisnis/perhitungan-distribusi.md), bagian 6.
