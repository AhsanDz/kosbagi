# Storyboard video demo KosBagi

Storyboard ini memandu perekaman video demo prototipe. Urutannya mengikuti prototipe klik **07 Alur Demo** di Figma: satu sampul, enam butir demo wajib dari proposal bagian 4.5, dan 29 layar. Setiap adegan menyebut layar aplikasi yang direkam, frame Figma acuannya, aksi di layar, narasi singkat, dan perkiraan durasi.

- Prototipe klik: [07 Alur Demo, sampul](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=178-4802). Jalankan lewat Present dari titik mulai "Demo lengkap" untuk latihan, atau dari titik mulai per butir.
- Langkah menyiapkan data dan menjalankan aplikasi ada di README root, langkah 12 (menyiapkan data demo) dan langkah 13 (alur demo lengkap). Storyboard ini tidak mengulang perintahnya.
- Naskah demo layar demi layar ada di `docs/presentasi/naskah-demo.md` (jalur 1). Narasi di sini sengaja pendek supaya bisa dibacakan siapa pun yang sedang merekam.

## Ringkasan

| Bagian | Isi | Layar | Durasi |
|---|---|---|---|
| Pembuka | Sampul Alur Demo dan beranda | 2 | 0:25 |
| Demo 1 | Investor lolos KYC dan membeli token | 10 | 2:10 |
| Demo 2 | Penghuni membayar sewa | 7 | 1:35 |
| Demo 3 | Pengelola mencatat biaya dan nota | 3 | 0:50 |
| Demo 4 | Admin menutup periode dan menjalankan distribusi | 5 | 1:20 |
| Demo 5 | Portofolio investor bertambah | 2 | 0:40 |
| Demo 6 | Rekonsiliasi tiga sumber | 2 | 0:50 |
| Penutup | Ringkasan bukti on-chain | 1 | 0:20 |
| **Total** | | | **±8:10** |

Durasi sudah termasuk sisipan di luar aplikasi (simulator Midtrans dan Etherscan). Bila video dibatasi lebih pendek, potong dulu sisipan Etherscan di Demo 2 dan Demo 3; bukti on-chain tetap terlihat di aplikasi lewat tautan Etherscan.

## Persiapan sebelum merekam

- Kontrak sudah di-deploy ke Sepolia dan alamatnya terisi di backend dan frontend. Alamat KosToken: `0x2E8Bf3f1ea83A43Ba7e22d046E4e340Fb51C7c26`; alamat KosLedger: `0xE012C3179E9f501b646741491365eF531042c02e` (deploy demo akhir 24 November 2026). Tanpa deploy Sepolia, tautan Etherscan dari transaksi Hardhat lokal akan 404, jadi jangan merekam dengan Hardhat lokal.
- Data demo disiapkan sesuai README root langkah 12: seed, saldo token Bagas, Citra, Eko, dan Fajar lewat `demo:siapkan-investor`, dan biaya Rp2.400.000 lewat `demo:catat-biaya`. Dimas Pratama belum punya pengajuan KYC.
- Backend, worker, dan frontend berjalan. Notifikasi Midtrans masuk lewat ngrok atau `npm run webhook:simulate` (README root langkah 9).
- Peramban di 1440 × 900 (sama dengan ukuran frame Figma), zoom 100%, mode terang, tanpa ekstensi yang menutupi layar. Rekam dari build produksi frontend, bukan server pengembangan, supaya indikator pengembangan Next.js tidak ikut terekam.
- Tab yang dibuka sebelum merekam: aplikasi KosBagi di `/masuk`, simulator Midtrans sandbox, dan Etherscan Sepolia.
- Siapkan berkas nota `backend/scripts/demo/nota/perbaikan-k07.pdf` untuk Demo 3.
- Kata sandi semua akun demo `demo-kosbagi`; kartu akun demo di `/masuk` bisa langsung diklik.

## Pembuka (0:25)

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 0.1 | Sampul Alur Demo | [178-4802](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=178-4802) | Tampilkan sampul berisi enam kartu demo | "KosBagi membagi hasil sewa kos mahasiswa lewat token. Kami tunjukkan enam alur, dari KYC sampai rekonsiliasi." | 0:10 |
| 0.2 | Beranda `/` lalu `/kos/sumbersari-01` | Publik / Beranda | Gulir ke papan kamar dan kuitansi on-chain, buka detail Kos Sumbersari 01 | "Studi kasus kami Kos Sumbersari 01, sepuluh kamar, token KB-SMR01. Semua data dummy, pembayaran di Midtrans sandbox, pencatatan di Sepolia." | 0:15 |

## Demo 1: Investor lolos KYC dan membeli token (2:10)

Peran: investor dan admin. Bukti on-chain: `setKycStatus` dan `transferFromTreasury` di KosToken.

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 1.1 | `/investor/kyc`, belum mengajukan | [177-36](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-36) | Masuk sebagai Dimas Pratama, isi nama dan `DUMMY-0042`, centang data dummy, klik **Ajukan verifikasi** | "Investor wajib lolos KYC dulu. Datanya dummy, nomor identitasnya berawalan DUMMY." | 0:15 |
| 1.2 | `/investor/kyc`, diajukan | [177-53](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-53) | Tunjuk Kartu status KYC dan Jejak KYC, lalu Keluar | "Pengajuan menunggu admin. Yang nanti dicatat on-chain hanya alamat dompet dan status lolos KYC." | 0:10 |
| 1.3 | `/admin/kyc`, Sheet tinjau | [177-62](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-62) | Masuk sebagai Laras Kusuma, klik **Tinjau** pada Dimas, tunjuk Pemeriksaan otomatis, klik **Setujui** | "Admin melihat tiga pemeriksaan otomatis lalu menyetujui." | 0:15 |
| 1.4 | `/admin/kyc`, disetujui | [177-91](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-91) | Tunjuk toast dan dompet kustodian di Sheet, tutup Sheet, Keluar | "Begitu disetujui, backend membuat dompet kustodian untuk investor. Investor tidak perlu memegang ETH." | 0:10 |
| 1.5 | `/investor/kyc`, mendaftarkan dompet | [177-120](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-120) | Masuk lagi sebagai Dimas; status Menunggu pencatatan | "Worker sedang memanggil setKycStatus di KosToken lewat dompet operator." | 0:10 |
| 1.6 | `/investor/kyc`, tercatat | [177-129](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-129) | Tunggu status Tercatat, buka tautan Etherscan (sisipan), kembali, klik **Beli token KB-SMR01** | "Tercatat di blockchain. Di Etherscan terlihat transaksi setKycStatus untuk dompet Dimas." | 0:20 |
| 1.7 | `/investor/penawaran`, siap bayar | [177-138](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-138) | Isi 100 token, tunjuk estimasi bagi hasil, klik **Bayar Rp10.000.000** | "Dimas membeli 100 token, Rp10 juta. Sisa penawaran dan batas 10 persen per investor dicek sebelum pembayaran dibuat." | 0:15 |
| 1.8 | `/investor/penawaran`, menunggu pembayaran | [177-210](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-210) | Pilih virtual account di Snap, salin nomor VA, bayar di simulator Midtrans (sisipan) | "Pembayaran lewat Midtrans Snap. Kami bayar virtual account-nya di simulator sandbox." | 0:25 |
| 1.9 | `/investor/penawaran`, lunas mengirim token | [177-282](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-282) | Tunjuk status pesanan Lunas dan pengiriman token | "Notifikasi Midtrans diverifikasi signature-nya dan dicek ulang ke API status. Setelah lunas, worker memindahkan token dari perbendaharaan." | 0:10 |
| 1.10 | `/investor/penawaran`, lunas tercatat | [177-355](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-355) | Buka tautan Etherscan transfer (sisipan) | "Transfer 100 token tercatat. Siapa pun bisa memeriksanya di Etherscan." | 0:20 |

## Demo 2: Penghuni membayar sewa (1:35)

Peran: penghuni dan pengelola. Bukti on-chain: `recordRent` di KosLedger.

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 2.1 | `/penghuni/tagihan`, belum dibayar | [177-428](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-428) | Masuk sebagai Sari Wulandari, klik **Bayar sewa** | "Sari, penghuni kamar K03, membayar sewa November Rp1,5 juta. Tidak ada biaya tambahan." | 0:10 |
| 2.2 | `/penghuni/tagihan`, menunggu pembayaran | [177-438](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-438) | Pilih QRIS atau VA di Snap, bayar di simulator (sisipan) | "Setiap pembayaran punya order_id unik, misalnya RENT-SMR01-K03-2026-11. Batas bayarnya lima menit." | 0:25 |
| 2.3 | `/penghuni/tagihan`, memeriksa pembayaran | [177-448](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-448) | Biarkan halaman memperbarui sendiri | "Halaman menunggu konfirmasi Midtrans lewat webhook." | 0:10 |
| 2.4 | `/penghuni/tagihan`, lunas menunggu pencatatan | [177-458](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-458) | Tunjuk Jejak pembayaran | "Tagihan lunas. Job recordRent masuk antrean dan diulang otomatis bila RPC bermasalah." | 0:10 |
| 2.5 | `/penghuni/tagihan`, lunas tercatat | [177-469](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-469) | Tunjuk cap TERCATAT, klik **Lihat kuitansi** | "Sewa tercatat di Sepolia." | 0:10 |
| 2.6 | `/penghuni/tagihan/[id]`, kuitansi | [177-479](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-479) | Tunjuk panel argumen recordRent dan baris "Tidak dicatat", buka Etherscan (sisipan) | "Yang dicatat hanya kamar, periode, nominal, dan hash order_id. Nama dan nomor VA tidak pernah masuk blockchain." | 0:20 |
| 2.7 | `/pengelola`, status kamar | [177-496](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-496) | Masuk sebagai Hadi Santoso, tunjuk ubin K03 lime dan hash-nya | "Di papan pengelola, ubin lime berarti sewa sudah tercatat on-chain." | 0:10 |

## Demo 3: Pengelola mencatat biaya dan nota (0:50)

Peran: pengelola. Bukti on-chain: `recordExpense` dengan hash nota.

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 3.1 | `/pengelola/biaya`, Sheet catat biaya | [177-562](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-562) | Klik **Catat biaya**, isi Perbaikan, Rp300.000, 12 Nov 2026, "Ganti keran kamar mandi K07", unggah `perbaikan-k07.pdf`, tunjuk hash SHA-256, klik **Simpan dan catat** | "Nota diunggah dan di-hash SHA-256. Hash itulah yang dicatat on-chain, bukan isi notanya." | 0:25 |
| 3.2 | `/pengelola/biaya`, baru dicatat | [177-594](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-594) | Tunjuk baris baru Menunggu pencatatan | "Biaya masuk antrean pencatatan." | 0:10 |
| 3.3 | `/pengelola/biaya`, semua tercatat | [177-626](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-626) | Tunjuk total Rp2.700.000 dan status Tercatat. Opsional: unggah nota yang sama lagi untuk menunjukkan penolakan nota ganda | "Total biaya November Rp2,7 juta, semuanya tercatat. Nota yang sama tidak bisa dicatat dua kali." | 0:15 |

## Demo 4: Admin menutup periode dan menjalankan distribusi (1:20)

Peran: admin. Bukti on-chain: `closePeriod` dan blok snapshot.

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 4.1 | `/admin/periode`, siap | [177-658](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-658) | Masuk sebagai Laras Kusuma, tunjuk struk dan syarat penutupan, klik **Tutup periode November 2026** | "Struk mengikuti urutan closePeriod: sewa kotor Rp13,5 juta, biaya Rp2,7 juta, fee 5 persen, PPh 22 persen, sewa bersih Rp7.897.500." | 0:20 |
| 4.2 | Dialog konfirmasi | [177-667](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-667) | Klik **Tutup periode** di Dialog | "Penutupan tidak bisa dibatalkan." | 0:10 |
| 4.3 | `/admin/periode`, menutup | [177-678](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-678) | Tunggu status berubah | "Worker mengirim closePeriod ke KosLedger." | 0:10 |
| 4.4 | `/admin/periode`, ditutup | [177-687](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-687) | Tunjuk blok snapshot dan Rp438,75 per token, buka Etherscan (sisipan), klik **Jalankan distribusi** | "Nilai per token Rp438,75, dihitung dari saldo token di blok snapshot." | 0:25 |
| 4.5 | `/admin/periode`, terdistribusi | [177-751](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-751) | Tunjuk Bagian pemegang, bagian perbendaharaan, dan sisa pembulatan Rp0 | "Bagian tiap pemegang masuk saldo, termasuk bagian 8.140 token yang belum terjual untuk pemilik lama. Distribusi hanya bisa dijalankan sekali." | 0:15 |

## Demo 5: Portofolio investor bertambah (0:40)

Peran: investor. Bukti on-chain: `PeriodClosed` dan saldo token di Etherscan.

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 5.1 | `/investor`, setelah distribusi | [177-817](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-817) | Masuk sebagai Dimas, tunjuk saldo Rp43.875 dan grafik sewa tercatat, klik **Lihat portofolio** | "Saldo bagi hasil Dimas Rp43.875, yaitu 100 token kali Rp438,75." | 0:20 |
| 5.2 | `/investor/portofolio` | [177-842](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-842) | Tunjuk Bagi hasil per periode dan Riwayat transaksi, buka dompet kustodian di Etherscan (sisipan) | "Setiap baris punya bukti di Sepolia, termasuk saldo token di dompet kustodian." | 0:20 |

## Demo 6: Rekonsiliasi tiga sumber (0:50)

Peran: admin. Bukti: Midtrans, basis data, dan Sepolia dibandingkan per `order_id`.

| No | Layar | Frame Figma | Aksi | Narasi | Durasi |
|---|---|---|---|---|---|
| 6.1 | `/admin/rekonsiliasi`, semua | [177-955](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-955) | Masuk sebagai Laras, tunjuk ringkasan Cocok dan Selisih, klik **Hanya selisih** | "Setiap order Midtrans dicocokkan dengan basis data dan catatan Sepolia." | 0:25 |
| 6.2 | `/admin/rekonsiliasi`, hanya selisih | [177-1001](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-1001) | Buka baris Selisih untuk melihat nilai ketiga sumber | "Selisih langsung terlihat beserta alasannya, misalnya anomali nominal atau pembayaran setelah periode ditutup." | 0:25 |

## Penutup (0:20)

| No | Layar | Aksi | Narasi | Durasi |
|---|---|---|---|---|
| 7.1 | Etherscan halaman kontrak KosLedger (<https://sepolia.etherscan.io/address/0xE012C3179E9f501b646741491365eF531042c02e#events>) | Gulir daftar transaksi: recordRent, recordExpense, closePeriod | "Semua yang tadi kami lakukan tercatat di Sepolia dan bisa diperiksa siapa pun. Terima kasih." | 0:20 |

## Catatan

- Salinan frame di 07 Alur Demo dibuat dari frame asli P5. Bila tampilan aplikasi berbeda sedikit dari frame (mis. tanggal atau hash), rekam aplikasinya apa adanya; frame hanya acuan urutan dan tombol.
- Investor dan penghuni tidak pernah melihat kata gagal untuk pencatatan. Bila RPC lambat saat merekam, status tetap Menunggu pencatatan; tunggu atau ulangi adegan, jangan memotong ke frame Figma.
- Video direkam di 1440 px. Tampilan ponsel (390 px) cukup ditunjukkan sekilas di slide bila diminta, tidak perlu masuk alur video.
