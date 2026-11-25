# Pernyataan Penggunaan AI

Status: versi akhir progress 5. Dokumen ini melanjutkan Lampiran A proposal.

Kelompok 9 memakai alat AI secara luas. Hampir seluruh kode prototipe, test otomatis, dan draf dokumen di repositori ini disusun dengan Claude Code. Keputusan produk, desain, dan teknis diambil koordinator bersama tim dan dicatat di [log ide](log-ide/). Anggota membaca penjelasan paket jalurnya, memeriksa isinya, lalu meng-commit atas nama sendiri.

## 1. Alat yang dipakai

| Alat | Model | Dipakai untuk |
|---|---|---|
| Claude (claude.ai), Anthropic | Tidak dicatat | Kerangka, draf awal, dan pencarian sumber untuk proposal |
| Claude Code, Anthropic | Claude Opus 5.5 | Kode prototipe (kontrak, backend, frontend), test, dokumentasi, dan panduan kerja tim.|
| Claude dengan Figma MCP, Anthropic dan Figma | Claude Opus 5.5 | Desain antarmuka di Figma dan prototipe klik Alur Demo |
| Generator gambar AI di Figma | gemini-3.1-flash-lite-image | Satu foto ilustrasi Kos Sumbersari 01, selalu diberi label "Foto ilustrasi" |
| Skill untuk Claude Code | Tidak berlaku | Rujukan teknis per bidang (smart contract, Prisma, Midtrans, Next.js, dan lainnya) dari repositori publik, serta panduan gaya desain |

Ikon diambil dari paket Phosphor (`@phosphor-icons`), bukan buatan AI. Semua data di prototipe adalah data dummy: tanpa KTP, tanpa nomor rekening asli, dan tanpa uang nyata.

## 2. Cara kerja

1. Koordinator menetapkan keputusan tiap progress, lalu mencatatnya di log ide.
2. Desain disusun di Figma dan disetujui koordinator sebelum dibangun.
3. Claude Code membangun di folder kerja koordinator, lalu agen QA yang terpisah menguji dan meninjau keamanannya.

## 3. Yang dikerjakan anggota

| Siapa | Yang dikerjakan |
|---|---|
| Koordinator (Ahsan Faqih) | Menetapkan keputusan tiap progress, menyetujui desain, menyiapkan akun dan kunci (Midtrans sandbox, RPC dan dompet Sepolia), meninjau dan me-merge Pull Request |
| Setiap anggota | Menegerjakan sesuai pembagian, meng-commit atas nama sendiri, dan membuka Pull Request |
| Tim | Menyusun proposal bersama Claude, meninjau business case, serta menyampaikan presentasi dan demo |

## 4. Cara verifikasi

Kode dan test ditulis alat yang sama, jadi hasilnya diperiksa dengan beberapa lapis:

- **Test otomatis.** Test Hardhat untuk smart contract (cakupan `KosToken` dan `KosLedger` 100%), test backend, serta lint dan build frontend. Mulai progress 5, GitHub Actions menjalankannya di setiap Pull Request.
- **QA terpisah tiap progress.** Test diulang di salinan bersih, skenario uji dan alur demo dijalankan, dan keamanan ditinjau (signature webhook, idempotensi, rahasia, kontrol akses, privasi data on-chain).
- **Midtrans sandbox sungguhan.** Skenario uji 1 sampai 7 diuji pada 3 November 2026 ([laporan uji pembayaran](pengujian/pembayaran.md)).
- **Angka yang sama di semua lapisan.** Angka November (sewa bersih Rp7.897.500, Rp438,75 per token) dicocokkan lewat test antara [perhitungan distribusi](bisnis/perhitungan-distribusi.md), kalkulator backend, dan `closePeriod` di kontrak.
- **Uji ulang paket.** Setiap paket diuji sendirian, lalu semua paket di-merge ulang dengan urutan acak dan hasilnya dibandingkan.
- **Sumber.** Nomor regulasi dan angka pasar dicocokkan dengan sumbernya; yang belum pasti ditandai [perlu verifikasi].

## 5. Batasan

- AI bisa keliru, misalnya menyebut nomor atau isi regulasi yang salah. Karena itu tidak ada sumber yang dikarang: setiap rujukan menunjuk sumber yang bisa dibuka, atau ditandai belum diverifikasi.
- Hitungan manual di perhitungan distribusi juga disusun AI dan belum dihitung ulang anggota dengan tangan.
- Business case dan peta regulasi masih memuat butir [perlu verifikasi] yang sengaja dibiarkan tertulis.

## 6. Alat AI tambahan

Diisi tim bila memakai alat AI lain, misalnya untuk slide, narasi, atau video demo. Bila tidak ada, tulis "tidak ada".

| Alat | Dipakai untuk | Cara verifikasi |
|---|---|---|
| (diisi tim) | | |

## 7. Pernyataan kelompok

Kami, Kelompok 9, menyatakan bahwa penggunaan alat AI dalam tugas akhir ini tercatat di dokumen ini sejauh yang kami ketahui, bahwa pembagian pekerjaan antara anggota dan AI ditulis apa adanya di bagian 2 sampai 4, dan bahwa kami bertanggung jawab atas seluruh isi repositori yang kami commit.
