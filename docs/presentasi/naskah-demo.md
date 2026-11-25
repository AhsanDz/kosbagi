# Naskah Demo KosBagi

Naskah ini mengikuti urutan layar prototipe klik Figma halaman 07 Alur Demo (29 layar, enam butir) dan README langkah 13. Nomor layar seperti "1.3" sama dengan nama frame di Figma ("Alur Demo / 1.3 / Admin / KYC / Tinjau"), jadi tim bisa berlatih alurnya di Figma sebelum mencoba aplikasi. Kalimat narasi adalah usulan; ucapkan dengan kata-kata sendiri, asal isi dan angkanya sama.

Target waktu demo 10 menit. Kata sandi semua akun `demo-kosbagi`.

## 1. Sebelum hari presentasi

### Gladi akhir (H-1)

1. Kontrak demo akhir sudah di-deploy ke Sepolia **tanpa** `DEPLOY_LABEL` dan terverifikasi di Etherscan (24 November 2026, README bagian "Kontrak di Sepolia"). Jangan dipakai untuk latihan: gladi sebelumnya memakai kontrak berlabel (README langkah 12), lalu `backend/.env` dikembalikan ke alamat demo akhir sebelum langkah 2. Pakai RPC Infura atau paket RPC berbayar di `backend/.env`, bukan paket gratis Alchemy (README langkah 11, "Memilih RPC Sepolia").
2. Reset basis data, seed, lalu siapkan data demo sesuai README langkah 12: sewa November dibayar kecuali K03, saldo token Bagas, Citra, Eko, dan Fajar, serta biaya November Rp2.400.000.
3. Periksa kesiapan sebagai Laras Kusuma: `/admin` tanpa job gagal, `/admin/rekonsiliasi` semuanya Cocok.
4. Jangan reset basis data dan jangan deploy ulang setelah langkah ini. Gladi berikutnya butuh deploy baru dan menghabiskan data demo.
5. Cek saldo ETH Sepolia dompet operator. Demo langsung masih mengirim lima transaksi dari dompet operator (whitelist, transfer token, `recordRent`, `recordExpense`, `closePeriod`), ditambah transaksi ulang bila ada yang gagal, jadi saldo harus cukup.
6. Rekam video demo dari gladi ini mengikuti storyboard di [`docs/desain/storyboard-demo.md`](../desain/storyboard-demo.md). Video ini juga menjadi cadangan bila demo langsung terganggu.
7. Catat berapa lama satu transaksi Sepolia tercatat saat gladi, supaya narator tahu berapa lama harus mengisi waktu tunggu.

### Satu jam sebelum presentasi

| Siapkan | Keterangan |
|---|---|
| Proses berjalan | Docker (PostgreSQL dan Redis), backend (`npm run dev`), worker (`npm run worker`), frontend (`npm run dev`), dan ngrok bila memakai notifikasi asli (README langkah 9 Cara B) |
| Payment Notification URL | Bila memakai ngrok: alamat ngrok yang sedang berjalan sudah terpasang di dashboard Midtrans sandbox |
| Terminal cadangan | Satu terminal di folder `backend` untuk `npm run webhook:simulate -- <order_id>` (README langkah 9 Cara A) bila notifikasi tidak datang |
| Jendela peramban per peran | Satu profil peramban terpisah untuk setiap akun, sudah login: Dimas Pratama (investor), Laras Kusuma (admin), Sari Wulandari (penghuni K03), Hadi Santoso (pengelola). Jendela penyamaran saling berbagi cookie, jadi hanya satu peran yang boleh memakainya |
| Tab tambahan | Simulator Midtrans sandbox, halaman `KosToken` (<https://sepolia.etherscan.io/address/0x2E8Bf3f1ea83A43Ba7e22d046E4e340Fb51C7c26>) dan `KosLedger` (<https://sepolia.etherscan.io/address/0xE012C3179E9f501b646741491365eF531042c02e#events>) di Etherscan, Figma prototipe Alur Demo, slide demo di presentasi |
| Berkas nota | `backend/scripts/demo/nota/perbaikan-k07.pdf` di folder yang mudah dibuka dari dialog unggah |
| Tampilan | Zoom peramban sekitar 125% supaya terbaca di proyektor; mode terang; notifikasi sistem dimatikan |
| Keamanan layar | Tutup editor yang membuka `.env`. Jangan menampilkan isi `.env`, private key, atau server key saat berbagi layar |
| Pemeriksaan terakhir | `/admin` tanpa job gagal, `/admin/rekonsiliasi` semuanya Cocok, tagihan K03 November masih belum dibayar, Dimas belum punya pengajuan KYC |

### Peran saat demo

Usulan, disepakati tim saat gladi:

- **Operator laptop**: satu orang sepanjang demo supaya tidak berganti tempat duduk (usulan: Zahra, karena paling hafal halaman). Operator yang mengklik; narator menjelaskan.
- **Narator per butir**: butir 1 Ahsan, butir 2 Nofita, butir 3 dan 5 Zahra, butir 4 dan 6 Izza. Saat Zahra menjadi narator, operator tetap dia.
- **Pemegang cadangan**: satu orang memantau terminal worker dan halaman `/admin` selama demo, lalu memberi tanda bila ada job yang tertahan.

Butir 4 hanya bisa berjalan setelah job dari butir 1 sampai 3 tercatat: kartu syarat di `/admin/periode` menahan Tutup periode selama masih ada transfer token, sewa, atau nota yang belum tercatat. Jadi urutan butir jangan ditukar.

## 2. Butir 1: Investor lolos KYC dan membeli token

Narator Ahsan, 2:45. Mulai prototipe: [layar 1.1](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-36). Bukti: `setKycStatus` dan `transferFromTreasury` di `KosToken`.

| Layar | Operator | Narator |
|---|---|---|
| 1.1 Investor, KYC, belum mengajukan | Jendela Dimas, buka `/investor/kyc`. Isi nama `Dimas Pratama`, nomor `DUMMY-0042`, centang pernyataan data dummy, tekan **Ajukan verifikasi** | "Dimas ingin membeli token. Sebelum itu ia harus lolos KYC. Di prototipe kami hanya memakai data dummy berawalan DUMMY, tanpa KTP asli." |
| 1.2 Investor, KYC, diajukan | Tunjukkan status Diajukan | "Pengajuan masuk ke antrean admin." |
| 1.3 Admin, KYC, tinjau | Jendela Laras, buka `/admin/kyc`, buka pengajuan Dimas | "Admin melihat tiga pemeriksaan otomatis: awalan DUMMY, nama sama dengan nama akun, dan tidak ada pengajuan lain yang masih aktif. Keputusan tetap di tangan admin." |
| 1.4 Admin, KYC, disetujui | Tekan **Setujui** | "Saat disetujui, backend membuat dompet kustodian untuk Dimas. Investor tidak memegang ETH; semua transaksi dikirim dari satu dompet operator." |
| 1.5 Investor, KYC, dompet sedang didaftarkan | Jendela Dimas, muat ulang `/investor/kyc` | "Worker sedang memanggil `setKycStatus` di KosToken. Kontrak hanya mengizinkan alamat lolos KYC menerima token, jadi walau backend keliru, token tidak bisa sampai ke alamat yang belum diverifikasi." Isi waktu tunggu blok dengan kalimat ini. |
| 1.6 Investor, KYC, tercatat | Tunjukkan hash transaksi, lalu buka penawaran | "Whitelist sudah tercatat di Sepolia, lengkap dengan hash transaksinya." |
| 1.7 Investor, penawaran, siap bayar | `/investor/penawaran`, isi `100` token (Rp10.000.000), centang pernyataan risiko, tekan bayar | "Satu token Rp100.000. Batas 10% per investor, 1.800 token, diperiksa sebelum pembayaran dibuat, dan ditegakkan lagi di kontrak." |
| 1.8 Investor, penawaran, menunggu pembayaran | Di jendela Midtrans pilih virtual account BCA, salin nomornya. Di tab simulator: tempel, Inquire, Pay. Kembali dan tekan **Check status** | "Pembayaran berjalan di Midtrans sandbox, tidak ada uang nyata. Nomor pesanannya berawalan BUY." |
| 1.9 Investor, penawaran, lunas mengirim token | Tunggu notifikasi. Bila setelah 30 detik belum lunas, jalankan `npm run webhook:simulate -- <nomor pesanan BUY->` di terminal cadangan | "Notifikasi Midtrans diterima dan diverifikasi. Pesanan lunas, dan worker memanggil `transferFromTreasury`." |
| 1.10 Investor, penawaran, lunas tercatat | Tunjukkan status tercatat, buka tautan Etherscan | "Seratus token KB-SMR01 pindah dari dompet perbendaharaan ke dompet kustodian Dimas. Ini transaksinya di Etherscan." |

Bila tersendat: whitelist atau transfer yang lama tercatat tidak menghentikan demo. Lanjutkan ke butir 2 dan kembali ke sini sebelum butir 4. Bila Midtrans sandbox tidak bisa dibuka, tunjukkan layar 1.7 sampai 1.10 dari prototipe klik dan putar bagian ini dari video demo.

## 3. Butir 2: Penghuni membayar sewa

Narator Nofita, 2:15. Mulai prototipe: [layar 2.1](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-428). Bukti: `recordRent` di `KosLedger`.

| Layar | Operator | Narator |
|---|---|---|
| 2.1 Penghuni, tagihan, belum dibayar | Jendela Sari, buka `/penghuni/tagihan`, tekan **Bayar sewa** | "Sari, penghuni kamar K03, punya tagihan November Rp1.500.000. Penghuni tidak dikenai biaya tambahan." |
| 2.2 Penghuni, tagihan, menunggu pembayaran | Pilih virtual account BCA (atau QRIS), bayar di simulator, lalu **Check status** | "Backend membuat transaksi Midtrans dengan order_id unik, misalnya RENT-SMR01-K03-2026-11. Batas bayarnya lima menit; kalau kedaluwarsa, tagihan tetap belum dibayar dan bisa dibayar ulang." |
| 2.3 Penghuni, tagihan, memeriksa pembayaran | Tunggu notifikasi (cadangan: `npm run webhook:simulate -- <order_id RENT->`) | "Status lunas hanya berubah lewat webhook. Backend memeriksa signature SHA-512, lalu mengecek ulang status dan nominal ke API Midtrans sebelum mengubah apa pun." |
| 2.4 Penghuni, tagihan, lunas menunggu pencatatan | Tunjukkan status Menunggu pencatatan | "Tagihan lunas dan job pencatatan ditulis dalam satu transaksi basis data, jadi tidak ada pembayaran yang lunas tanpa job." |
| 2.5 Penghuni, tagihan, lunas tercatat | Tunjukkan status Tercatat | "Worker memanggil `recordRent` dengan keccak256 dari order_id. Kontrak menolak referensi yang sama dua kali." |
| 2.6 Penghuni, kuitansi, tercatat | Tekan **Lihat kuitansi**, lalu **Lihat di Etherscan** | "Di kanan ada argumen yang tercatat: kamar, periode, nominal, dan hash referensi. Tidak ada nama penghuni di blockchain." |
| 2.7 Pengelola, status kamar | Jendela Hadi, buka `/pengelola` | "Pengelola melihat sembilan kamar terisi sudah lunas dan tercatat. K06 kosong." |

Opsional bila waktu cukup, skenario uji 5: di inspektur ngrok (<http://127.0.0.1:4040>), tekan Replay pada notifikasi K03. Server membalas 200, tetapi tidak ada pembayaran atau catatan on-chain kedua.

Bila tersendat: bila notifikasi tidak datang lewat ngrok, pakai terminal cadangan. Bila pencatatan lama, lanjut ke butir 3; status di halaman tagihan berubah sendiri.

## 4. Butir 3: Pengelola mencatat biaya dan nota

Narator Zahra, 1:30. Mulai prototipe: [layar 3.1](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-562). Bukti: `recordExpense` dengan hash nota.

| Layar | Operator | Narator |
|---|---|---|
| 3.1 Pengelola, biaya, catat biaya | Jendela Hadi, buka `/pengelola/biaya`, tekan **Catat biaya**. Isi kategori Perbaikan, nominal Rp300.000, tanggal nota 12 November 2026, keterangan "Ganti keran kamar mandi K07", unggah `perbaikan-k07.pdf`, tekan **Simpan dan catat** | "Biaya November sebelumnya Rp2.400.000. Pengelola mencatat perbaikan keran K07 dan mengunggah notanya. Hash SHA-256 nota dihitung langsung di peramban sebelum disimpan." |
| 3.2 Pengelola, biaya, baru dicatat | Tunjukkan baris baru dengan status menunggu | "Total biaya November sekarang Rp2.700.000. Yang dicatat on-chain hanya kategori, nominal, dan hash nota, bukan isi notanya." |
| 3.3 Pengelola, biaya, semua tercatat | Tunggu status tercatat | "`recordExpense` tercatat. Siapa pun yang memegang file nota bisa menghitung hash-nya dan mencocokkan dengan catatan di kontrak." |

Opsional: unggah berkas yang sama sekali lagi. Backend menolak dengan pesan nota sudah tercatat, dan kontrak juga menolak hash yang sama.

## 5. Butir 4: Admin menutup periode dan menjalankan distribusi

Narator Izza, 1:45. Mulai prototipe: [layar 4.1](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-658). Bukti: `closePeriod` dan blok snapshot.

| Layar | Operator | Narator |
|---|---|---|
| 4.1 Admin, periode, siap | Jendela Laras, buka `/admin/periode`. Tunjukkan struk dan kartu syarat | "Struk November dihitung dari data yang sudah tercatat on-chain: sewa kotor Rp13.500.000, biaya Rp2.700.000, fee pengelolaan 5% Rp675.000, laba kena pajak Rp10.125.000, PPh 22% Rp2.227.500. Sewa bersih Rp7.897.500, atau Rp438,75 per token. Semua syarat terpenuhi." |
| 4.2 Admin, periode, konfirmasi | Tekan **Tutup periode**, baca dialog, konfirmasi | "Penutupan tidak bisa dibatalkan. Setelah ini tagihan November tidak bisa dibayar lagi." |
| 4.3 Admin, periode, menutup | Tunggu | "Worker memanggil `closePeriod`. Kontrak menghitung ulang dengan rumus yang sama dengan backend dan menyimpan blok snapshot." |
| 4.4 Admin, periode, ditutup | Tunjukkan angka final dan blok snapshot, tekan **Jalankan distribusi** | "Angka di struk sekarang dibaca dari KosLedger. Saldo setiap pemegang diambil di blok snapshot ini, jadi transfer token sesudahnya tidak mengubah bagian siapa pun." |
| 4.5 Admin, periode, terdistribusi | Tunjukkan tabel Bagian pemegang | "Bagian tiap pemegang dibulatkan ke bawah per rupiah: pemilik lama Rp2.369.250, Bagas Rp789.750, Citra Rp526.500, Eko Rp351.000, Fajar Rp245.700, dan Dimas Rp43.875 untuk 100 token. Token yang belum terjual, 8.140 token, menghasilkan Rp3.571.425 yang masuk ke saldo pemilik lama. Sisa pembulatan Rp0. Distribusi hanya bisa dijalankan sekali." |

Bila Tutup periode tetap nonaktif: baca kartu syarat. Biasanya masih ada transfer token, sewa, atau nota yang menunggu pencatatan. Tunggu worker, lalu muat ulang halaman.

## 6. Butir 5: Portofolio investor bertambah

Narator Zahra, 0:45. Mulai prototipe: [layar 5.1](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-817). Bukti: `PeriodClosed` dan saldo token di Etherscan.

| Layar | Operator | Narator |
|---|---|---|
| 5.1 Investor, ringkasan, setelah distribusi | Jendela Dimas, buka `/investor` | "Saldo bagi hasil Dimas bertambah Rp43.875. Tombol tarik saldo masih nonaktif karena pencairan ke rekening adalah pengembangan lanjutan." |
| 5.2 Investor, portofolio | Buka `/investor/portofolio`, lalu tautan Etherscan | "Riwayat menampilkan pembelian dan bagi hasil November, masing-masing dengan tautan Etherscan: transaksi transfer token untuk pembelian, dan transaksi penutupan periode untuk bagi hasil." |

## 7. Butir 6: Rekonsiliasi tiga sumber

Narator Izza, 1:00. Mulai prototipe: [layar 6.1](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=177-955). Bukti: Midtrans, basis data, dan Sepolia dibandingkan per `order_id`.

| Layar | Operator | Narator |
|---|---|---|
| 6.1 Admin, rekonsiliasi, semua | Jendela Laras, buka `/admin/rekonsiliasi`, tekan **Periksa ulang** | "Setiap order Midtrans November dicocokkan dengan basis data dan catatan Sepolia. Cocok berarti ketiga sumber sepakat soal uang dan soal catatan. Percobaan yang kedaluwarsa atau dibatalkan juga Cocok karena tidak ada uang dan tidak ada catatan." |
| 6.2 Admin, rekonsiliasi, hanya selisih | Tekan **Hanya selisih** | "Admin bisa menyaring hanya order yang bermasalah, membukanya, dan melihat nilai dari ketiga sumber beserta alasannya." |

Opsional, skenario uji 7 secara langsung (sekitar 30 detik): sebelum layar 6.2, jalankan `npm run webhook:simulate -- <order_id K03> --gross-amount 1000.00` di terminal cadangan. Server menolak notifikasi karena nominalnya tidak cocok dan mencatatnya sebagai anomali. Tekan **Periksa ulang**: order K03 menjadi Selisih dengan alasan "Ada anomali", lalu buka barisnya dan tekan **Lihat anomali**. Narasi: "Signature-nya sah, tetapi nominalnya Rp1.000. Notifikasi ditolak, tagihan tidak berubah, dan kejadiannya terlihat di rekonsiliasi." Langkah ini meninggalkan satu Selisih di data demo, jadi kerjakan hanya di akhir.

Tanpa langkah opsional itu, data demo yang bersih tidak punya Selisih, dan layar 6.2 menampilkan keadaan "tidak ada selisih". Itu juga hasil yang benar.

## 8. Bila demo langsung terganggu

| Gangguan | Langkah |
|---|---|
| Notifikasi Midtrans tidak datang | Jalankan `npm run webhook:simulate -- <order_id>` di terminal cadangan. Server tetap mengecek ulang ke Midtrans |
| Transaksi Sepolia lama tercatat | Lanjutkan narasi atau butir berikutnya; status berubah sendiri. Pemegang cadangan memantau `/admin` |
| Job gagal di `/admin` | Tekan **Coba lagi**. Worker memeriksa status on-chain dulu, jadi tidak ada transaksi ganda |
| Midtrans sandbox atau internet mati | Tunjukkan butir yang tersisa dari prototipe klik Figma, lalu putar bagian video demo yang sesuai |
| Laptop presenter bermasalah | Putar video demo penuh, lalu jawab pertanyaan sambil membuka transaksi gladi di Etherscan dari perangkat lain |

## 9. Setelah demo

- Jangan reset basis data sampai nilai keluar; data demo menjadi bukti bila dosen ingin memeriksa ulang.
- Tautan transaksi penting (whitelist Dimas, pembelian Dimas, `recordRent` K03, `recordExpense` K07, `closePeriod` November) bisa dicetak dengan skrip tautan demo jalur 3 dan disalin ke README bagian "Kontrak di Sepolia".
