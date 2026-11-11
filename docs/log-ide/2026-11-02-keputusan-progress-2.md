# 2 November 2026: Keputusan sebelum progress 2

| Butir | Isi |
|---|---|
| Tanggal | Senin, 2 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Penanganan sewa yang terbayar dua kali
2. Pembulatan bagi hasil dan dasar pajak
3. Jeda antara selesai membayar dan webhook masuk

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Sewa ganda ditolak di backend dan di kontrak

Bila dua percobaan pembayaran untuk tagihan yang sama sama-sama lunas, percobaan kedua dicatat sebagai anomali `DUPLICATE_BILL_PAYMENT` dan tidak membuat job on-chain. `KosLedger.recordRent` juga menolak sewa kedua untuk kamar dan periode yang sama.

Alasan: (diisi koordinator)

### K2. Bagi hasil pro-rata per pemegang, nilai per token dalam sen, sisa masuk cadangan

- Bagian setiap pemegang adalah `floor(sewa bersih × saldo ÷ total suplai)`. 100 token mendapat Rp43.875 dan pemilik 5.400 token mendapat Rp2.369.250.
- Nilai per token disimpan dengan dua desimal dalam satuan sen rupiah: `43875` berarti Rp438,75.
- Sisa pembulatan masuk cadangan, dicatat per periode, dan tidak dibawa ke periode berikutnya.
- Dasar pajak adalah PPh badan 22% atas laba, sesuai asumsi proposal.
- Bagian token yang masih di dompet perbendaharaan diputuskan di progress 4.

Keputusan ini menyelesaikan tiga pertanyaan yang dicatat terbuka di rancangan kontrak bagian 4: dasar pajak, cara pembulatan, dan perlakuan sisa.

Alasan: (diisi koordinator)

### K3. State "Memeriksa pembayaran" di halaman tagihan

Setelah penghuni selesai membayar di Snap dan sebelum webhook masuk, halaman tagihan menampilkan state baru "Memeriksa pembayaran". Halaman memeriksa status tagihan tiap 3 detik sampai 60 detik. State ini ditambahkan di luar brief desain awal dan ikut disetujui bersama layar progress 2.

Alasan: tanpa state ini penghuni melihat tagihan belum dibayar padahal baru saja membayar.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Menerapkan K1 di webhook dan `KosLedger` | Jalur 2, Jalur 3 | Progress 2 | berjalan |
| Menulis aturan K2 dan fixture perhitungan manual | Jalur 1 | Progress 2 | berjalan |
| Menerapkan K3 di halaman tagihan | Jalur 4 | Progress 2 | berjalan |
| Memutuskan bagian token di dompet perbendaharaan | (diisi koordinator) | Progress 4 | belum |

## Rujukan

- [`docs/bisnis/perhitungan-distribusi.md`](../bisnis/perhitungan-distribusi.md) untuk aturan K2 dan contoh angkanya.
- [`docs/kontrak/rancangan-kontrak.md`](../kontrak/rancangan-kontrak.md) bagian 4.
- Figma "KosBagi Desain UI", frame [Tagihan, memeriksa pembayaran](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-1338).
