# User stories KosBagi

Dokumen ini memuat kebutuhan KosBagi dari sudut pandang setiap aktor. Setiap cerita punya kriteria penerimaan yang bisa diuji, prioritas, progress tempat fiturnya dibangun, serta kaitannya dengan enam butir cakupan demo wajib dan dua belas skenario uji di proposal.

Status: versi final P4 (19 Nov 2026). Cerita investor, pengelola, dan admin mengikuti desain P4 yang disetujui 16 Nov 2026 dan keputusan pengguna di hari yang sama (bagian perbendaharaan untuk pemilik lama, sewa setelah periode ditutup ditolak, KosVoting tidak dibangun).

## Cara membaca

- **Format cerita:** "Sebagai *aktor*, saya ingin *tujuan*, supaya *manfaat*."
- **Kriteria penerimaan** memakai pola Given (keadaan awal), When (aksi), Then (hasil yang bisa dicek), dan And (tambahan untuk langkah sebelumnya). Satu cerita bisa punya beberapa skenario.
- **Prioritas** memakai MoSCoW: *Wajib* (harus ada untuk demo dan rubrik), *Sebaiknya* (penting, tetapi demo tetap berjalan tanpanya), *Opsional* (dikerjakan bila waktu cukup). Fitur yang sengaja tidak dibangun ada di bagian [Di luar cakupan prototipe](#di-luar-cakupan-prototipe).
- **Progress:** P1 Fondasi (29 Okt sampai 4 Nov), P2 Fitur inti dan pembayaran (5 sampai 11 Nov), P3 Integrasi blockchain (12 sampai 18 Nov), P4 Distribusi dan rekonsiliasi (19 sampai 24 Nov), P5 Finalisasi (25 Nov sampai 2 Des 2026).
- **Kode demo D1 sampai D6 dan skenario S1 sampai S12** dijelaskan di [tabel keterlacakan](#keterlacakan-ke-cakupan-demo-wajib) di akhir dokumen.
- **Data contoh** memakai studi kasus Kos Sumbersari 01 (token KB-SMR01) dan akun dummy. Teks dalam tanda kutip adalah teks antarmuka dari desain Figma.
- **Rute halaman** peran mengikuti daftar di [README desain](README.md#rute-halaman).

## Aktor

| Aktor | Siapa | Akun |
|---|---|---|
| Pengunjung publik | Siapa pun yang membuka situs tanpa masuk, termasuk dosen penguji | Tidak perlu akun |
| Calon pemilik kos | Pemilik kos dekat kampus yang ingin mentokenisasi kosnya | Tidak ada akun; mengajukan lewat halaman `/pemilik` |
| Investor | Membeli token dan menerima bagi hasil sewa | Dimas Pratama (dummy) |
| Penghuni | Membayar sewa bulanan | Sari Wulandari, kamar K03 (dummy) |
| Pengelola | Mengurus kamar dan mencatat biaya operasional | Hadi Santoso (dummy) |
| Admin | Menyetujui KYC, menutup periode, menjalankan distribusi, rekonsiliasi | Laras Kusuma (dummy) |

## Ringkasan

| ID | Cerita | Prioritas | Progress | Demo | Skenario |
|---|---|---|---|---|---|
| [US-PUB-01](#us-pub-01-memahami-kosbagi-dari-beranda) | Memahami KosBagi dari beranda | Wajib | P1 | | |
| [US-PUB-02](#us-pub-02-melihat-daftar-kos) | Melihat daftar kos | Wajib | P1 | | |
| [US-PUB-03](#us-pub-03-menilai-detail-kos-sebelum-membeli) | Menilai detail kos sebelum membeli | Wajib | P1, P3 | | |
| [US-PUB-04](#us-pub-04-memeriksa-bukti-on-chain-tanpa-akun) | Memeriksa bukti on-chain tanpa akun | Wajib | P1, P3 | D5 | |
| [US-PUB-05](#us-pub-05-mulai-membeli-token-dari-halaman-publik) | Mulai membeli token dari halaman publik | Wajib | P1, P2, P3 | D1 | |
| [US-PUB-06](#us-pub-06-memahami-risiko-dan-kanal-pengaduan) | Memahami risiko dan kanal pengaduan | Wajib | P1 | | |
| [US-PUB-07](#us-pub-07-mengganti-tema-terang-dan-gelap) | Mengganti tema terang dan gelap | Sebaiknya | P1 | | |
| [US-PUB-08](#us-pub-08-masuk-dengan-akun-demo) | Masuk dengan akun demo | Wajib | P1, P2 | D1 sampai D6 | |
| [US-PUB-09](#us-pub-09-memakai-situs-dari-ponsel-dan-keyboard) | Memakai situs dari ponsel dan keyboard | Sebaiknya | P1, P5 | | |
| [US-PML-01](#us-pml-01-menemukan-jalur-khusus-pemilik-kos) | Menemukan jalur khusus pemilik kos | Sebaiknya | P1, P2 | | |
| [US-PML-02](#us-pml-02-menghitung-dana-yang-diterima) | Menghitung dana yang diterima | Sebaiknya | P2 | | |
| [US-PML-03](#us-pml-03-memahami-alur-syarat-dan-dokumen) | Memahami alur, syarat, dan dokumen | Sebaiknya | P2 | | |
| [US-PML-04](#us-pml-04-mengajukan-kos) | Mengajukan kos | Sebaiknya | P2 | | |
| [US-INV-01](#us-inv-01-mengirim-kyc-dummy) | Mengirim KYC dummy | Wajib | P2, P3 | D1 | |
| [US-INV-02](#us-inv-02-melihat-penawaran-dan-sisa-kuota) | Melihat penawaran dan sisa kuota | Wajib | P3 | D1 | |
| [US-INV-03](#us-inv-03-membeli-token-lewat-midtrans-snap) | Membeli token lewat Midtrans Snap | Wajib | P3 | D1, D5 | |
| [US-INV-04](#us-inv-04-pesanan-melebihi-sisa-penawaran-ditolak) | Pesanan melebihi sisa penawaran ditolak | Wajib | P3 | | S8 |
| [US-INV-05](#us-inv-05-pesanan-melebihi-batas-kepemilikan-10-ditolak) | Pesanan melebihi batas kepemilikan 10% ditolak | Wajib | P1, P3 | | S9, S10 |
| [US-INV-06](#us-inv-06-melihat-portofolio-dan-bagi-hasil) | Melihat portofolio dan bagi hasil | Wajib | P4 | D5 | |
| [US-INV-07](#us-inv-07-melihat-riwayat-dan-status-on-chain) | Melihat riwayat dan status on-chain | Wajib | P4 | D5 | |
| [US-INV-08](#us-inv-08-melihat-ringkasan-investor) | Melihat ringkasan investor | Sebaiknya | P4 | D5 | |
| [US-INV-09](#us-inv-09-menarik-saldo-bagi-hasil) | Menarik saldo bagi hasil | Opsional | P5 (tombol nonaktif sejak P4) | | |
| [US-INV-10](#us-inv-10-memberi-suara-on-chain) | Memberi suara on-chain | Opsional | Tidak dibangun | | |
| [US-PHN-01](#us-phn-01-melihat-tagihan-bulan-berjalan) | Melihat tagihan bulan berjalan | Wajib | P2 | D2 | |
| [US-PHN-02](#us-phn-02-membayar-sewa-lewat-virtual-account) | Membayar sewa lewat Virtual Account | Wajib | P2, P3 | D2 | S1 |
| [US-PHN-03](#us-phn-03-membayar-sewa-lewat-qris) | Membayar sewa lewat QRIS | Wajib | P2, P3 | D2 | S2 |
| [US-PHN-04](#us-phn-04-pembayaran-dibatalkan) | Pembayaran dibatalkan | Wajib | P2 | | S3 |
| [US-PHN-05](#us-phn-05-pembayaran-kedaluwarsa-lalu-bayar-ulang) | Pembayaran kedaluwarsa lalu bayar ulang | Wajib | P2 | | S4 |
| [US-PHN-06](#us-phn-06-pembayaran-tidak-tercatat-dua-kali) | Pembayaran tidak tercatat dua kali | Wajib | P2, P3 | | S5 |
| [US-PHN-07](#us-phn-07-melihat-kuitansi-dan-bukti-on-chain) | Melihat kuitansi dan bukti on-chain | Wajib | P3 | D2, D5 | |
| [US-PHN-08](#us-phn-08-tetap-tenang-bila-pencatatan-on-chain-tertunda) | Tetap tenang bila pencatatan on-chain tertunda | Sebaiknya | P3, P4 | | |
| [US-PHN-09](#us-phn-09-tagihan-periode-yang-sudah-ditutup-tidak-bisa-dibayar) | Tagihan periode yang sudah ditutup tidak bisa dibayar, dan pembayaran telat dikembalikan | Sebaiknya | P4 | | |
| [US-PGL-01](#us-pgl-01-melihat-status-kamar-per-periode) | Melihat status kamar per periode | Wajib | P4 | D2 | |
| [US-PGL-02](#us-pgl-02-mencatat-biaya-dan-mengunggah-nota) | Mencatat biaya dan mengunggah nota | Wajib | P4 | D3 | |
| [US-PGL-03](#us-pgl-03-menindaklanjuti-tagihan-telat-dan-pencatatan-yang-belum-selesai) | Menindaklanjuti tagihan telat dan pencatatan yang belum selesai | Sebaiknya | P4 | D2 | |
| [US-ADM-01](#us-adm-01-menyetujui-atau-menolak-kyc) | Menyetujui atau menolak KYC | Wajib | P3 | D1 | |
| [US-ADM-02](#us-adm-02-menutup-periode) | Menutup periode | Wajib | P3, P4 | D4 | S12 |
| [US-ADM-03](#us-adm-03-menjalankan-distribusi-bagi-hasil) | Menjalankan distribusi bagi hasil | Wajib | P4 | D4, D5 | |
| [US-ADM-04](#us-adm-04-membuka-rekonsiliasi) | Membuka rekonsiliasi | Wajib | P4 | D6 | |
| [US-ADM-05](#us-adm-05-notifikasi-palsu-ditolak) | Notifikasi palsu ditolak | Wajib | P2 | | S6 |
| [US-ADM-06](#us-adm-06-nominal-tidak-cocok-dicatat-sebagai-anomali) | Nominal tidak cocok dicatat sebagai anomali | Wajib | P2, P4 | D6 | S7 |
| [US-ADM-07](#us-adm-07-hanya-pemegang-peran-yang-menulis-ke-kontrak) | Hanya pemegang peran yang menulis ke kontrak | Wajib | P1, P2 | | S11 |
| [US-ADM-08](#us-adm-08-melihat-ringkasan-admin) | Melihat ringkasan admin | Sebaiknya | P4 | D4, D6 | |
| [US-ADM-09](#us-adm-09-mengulang-atau-menandai-job-on-chain-yang-gagal) | Mengulang atau menandai job on-chain yang gagal | Sebaiknya | P4 | | S5 |

Jumlah: 44 cerita (30 wajib, 12 sebaiknya, 2 opsional). US-INV-10 tetap dicatat walau tidak dibangun, supaya keputusannya bisa ditelusuri.

## Pengunjung publik

### US-PUB-01 Memahami KosBagi dari beranda

> Sebagai pengunjung publik, saya ingin memahami cara kerja KosBagi dan contoh bagi hasilnya dari beranda, supaya saya tahu apa yang dibeli sebelum membuat akun.

Prioritas wajib, dibangun di P1, halaman `/`.

- *Isi beranda*
  - **Given** pengunjung membuka `/` tanpa masuk
  - **When** halaman selesai dimuat
  - **Then** tampil hero untuk investor, kartu kos unggulan Kos Sumbersari 01, bagian bukti on-chain (papan kamar dan kuitansi kamar K03), cara kerja, bagian "Dari sewa ke bagi hasil", ajakan untuk pemilik kos, serta risiko dan kanal pengaduan
  - **And** bagian "Dari sewa ke bagi hasil" menunjukkan contoh November 2026: sewa kotor Rp13.500.000 dari 9 kamar terisi, dikurangi biaya operasional 20%, fee pengelolaan 5%, dan PPh badan 22%, menjadi Rp7.897.500 yang dibagikan atau Rp438,75 per token per bulan, dengan keterangan bahwa angkanya dummy
- *Token bukan kepemilikan*
  - **Given** pengunjung membaca hero dan bagian risiko
  - **Then** token disebut sebagai hak atas bagi hasil sewa, bukan sertifikat tanah atau bangunan

### US-PUB-02 Melihat daftar kos

> Sebagai pengunjung publik, saya ingin melihat semua kos yang sedang ditawarkan, supaya saya bisa memilih kos yang ingin dipelajari.

Prioritas wajib, dibangun di P1, halaman `/kos`.

- *Daftar berisi satu kos*
  - **Given** pengunjung membuka `/kos`
  - **Then** tampil satu kartu Kos Sumbersari 01 dengan foto berlabel "Foto ilustrasi", kode token KB-SMR01, dan ringkasan penawarannya
  - **And** di bawahnya ada empty state "Properti berikutnya sedang dinilai", tanpa kos fiktif tambahan
- *Membuka detail*
  - **When** pengunjung memilih kartu Kos Sumbersari 01
  - **Then** halaman `/kos/sumbersari-01` terbuka

### US-PUB-03 Menilai detail kos sebelum membeli

> Sebagai calon investor, saya ingin membaca profil, keuangan, dokumen, catatan blockchain, dan risiko satu kos di satu halaman, supaya keputusan membeli token didasarkan pada informasi yang lengkap.

Prioritas wajib, dibangun di P1 dengan data statis dan memakai data nyata setelah API properti (P2) serta deploy Sepolia (P3), halaman `/kos/sumbersari-01`.

- *Tab dan panel penawaran*
  - **Given** pengunjung membuka detail Kos Sumbersari 01
  - **Then** tampil lima tab (Ringkasan, Keuangan, Dokumen, Blockchain, Risiko) dan panel penawaran yang tetap terlihat di samping konten pada layar laptop
  - **And** panel penawaran menunjukkan Rp100.000 per token, 4.360 dari 12.600 token terjual, sisa penawaran 8.240 token, batas 1.800 token (10%) per investor, estimasi bagi hasil ±5,3% per tahun, dan tanggal ditutup 31 Des 2026
- *Tautan langsung ke tab*
  - **When** pengunjung membuka `/kos/sumbersari-01?tab=dokumen`
  - **Then** tab Dokumen langsung terbuka, dan nilai `?tab=` yang tidak dikenal kembali ke tab Ringkasan
- *Dokumen bisa dicocokkan*
  - **Given** pengunjung membuka tab Dokumen
  - **Then** ketiga dokumen dummy (sertifikat hak milik, laporan penilaian, perjanjian pengelolaan) bisa diunduh, dan masing-masing menampilkan status on-chain karena hash SHA-256-nya tercatat di registri dokumen KosToken
  - **And** hash yang ditampilkan sama dengan `currentDocumentHash` untuk jenis dokumen itu, disertai tautan Etherscan dan petunjuk cara mencocokkan hash berkas yang diunduh
  - **And** bila sebuah dokumen diganti, versi lamanya tetap tersimpan di riwayat dokumen kontrak dan tidak hilang
- *Foto jujur*
  - **Then** foto kos diberi keterangan "Foto ilustrasi buatan AI, bukan foto properti sebenarnya."

### US-PUB-04 Memeriksa bukti on-chain tanpa akun

> Sebagai pengunjung publik (termasuk dosen penguji), saya ingin membuka catatan sewa dan alamat kontrak di Etherscan tanpa membuat akun, supaya klaim bahwa setiap sewa tercatat bisa saya periksa sendiri.

Prioritas wajib, tampilan di P1 dan data Sepolia asli di P3, tab Blockchain di `/kos/sumbersari-01` dan bagian bukti on-chain di beranda. Terkait demo D5.

- *Tab Blockchain*
  - **Given** pengunjung membuka tab Blockchain
  - **Then** tampil alamat KosToken (KB-SMR01) dan KosLedger yang disingkat 6+4 karakter dengan tautan Etherscan, papan kamar bulan berjalan, dan tabel transaksi terbaru dengan status on-chain tiap baris
- *Membuka Etherscan*
  - **When** pengunjung memilih tautan Etherscan
  - **Then** halaman `sepolia.etherscan.io` terbuka di tab baru dan menampilkan alamat atau transaksi yang sama dengan yang tertulis di KosBagi
- *Tanpa data pribadi*
  - **Then** tidak ada nama penghuni atau investor, nomor identitas, nomor rekening, maupun berkas nota yang tercatat sebagai data on-chain

### US-PUB-05 Mulai membeli token dari halaman publik

> Sebagai calon investor, saya ingin tombol Beli token membawa saya ke langkah berikutnya yang tepat, supaya alur membeli tidak terputus.

Prioritas wajib, tautan di P1, sesi login di P2, halaman penawaran di P3. Terkait demo D1.

- *Belum masuk*
  - **Given** pengunjung belum masuk
  - **When** menekan Beli token di panel penawaran
  - **Then** pengunjung diarahkan ke `/masuk`
  - **And** panel penawaran sudah menjelaskan syaratnya: "Kamu perlu masuk dan lolos KYC dummy sebelum membeli. Pembayaran lewat Midtrans sandbox."
- *Sudah masuk sebagai investor*
  - **Given** pengguna sudah masuk sebagai investor
  - **When** menekan Beli token
  - **Then** pengguna diarahkan ke halaman Penawaran investor (`/investor/penawaran`)

### US-PUB-06 Memahami risiko dan kanal pengaduan

> Sebagai calon investor, saya ingin membaca risiko token dan cara mengadu sebelum membeli, supaya saya tidak mengira bagi hasil itu dijamin.

Prioritas wajib, dibangun di P1, bagian risiko di beranda dan tab Risiko di detail kos.

- *Daftar risiko*
  - **Given** pengunjung membaca bagian risiko
  - **Then** tercantum lima risiko: bagi hasil bisa turun (estimasi ±5,3% per tahun bukan jaminan), token belum bisa dijual kembali karena pasar sekunder belum ada, token adalah hak manfaat dan bukan kepemilikan (sertifikat dipegang PT KosBagi Properti), risiko teknologi, dan penawaran bisa batal bila target belum tercapai sampai 31 Des 2026 dengan dana dikembalikan
- *Kanal pengaduan*
  - **Then** tercantum alamat pengaduan dummy `pengaduan@kosbagi.test` dan janji balasan paling lambat 2 hari kerja

### US-PUB-07 Mengganti tema terang dan gelap

> Sebagai pengunjung, saya ingin mengganti tema terang atau gelap, supaya halaman nyaman dibaca di ruangan terang maupun gelap.

Prioritas sebaiknya, dibangun di P1, semua halaman.

- *Mengganti tema*
  - **Given** halaman tampil dengan tema terang
  - **When** pengunjung menekan tombol tema
  - **Then** seluruh halaman berganti ke tema gelap, pilihan diingat pada kunjungan berikutnya, dan tidak ada kedipan tema yang salah saat halaman dimuat ulang
  - **And** bagian "Dari sewa ke bagi hasil" di beranda dan panel penawaran di detail kos tetap gelap di kedua tema
- *Aksesibel*
  - **Then** tombol tema bisa dioperasikan dengan keyboard dan punya label yang dibacakan pembaca layar

### US-PUB-08 Masuk dengan akun demo

> Sebagai pengguna demo, saya ingin masuk dengan memilih kartu peran atau email dummy, supaya demo setiap peran cepat dan tidak memakai data asli.

Prioritas wajib, tampilan dan state error di P1, berfungsi dengan JWT di P2, halaman `/masuk`. Dipakai di semua demo D1 sampai D6.

- *Isi halaman*
  - **Given** pengguna membuka `/masuk`
  - **Then** tampil empat kartu akun demo (Investor Dimas Pratama, Penghuni Sari Wulandari kamar K03, Pengelola Hadi Santoso, Admin Laras Kusuma), form email dan kata sandi, catatan "Akun demo hanya untuk prototipe. Jangan memakai email atau kata sandi asli.", dan tautan "Ajukan kos" untuk pemilik kos
- *Kredensial salah*
  - **Given** email atau kata sandi salah
  - **When** pengguna menekan Masuk
  - **Then** pesan error tampil di dekat field, menjelaskan penyebab dan cara memperbaikinya, dan isian email tidak hilang
- *Berhasil masuk (P2)*
  - **When** pengguna memilih kartu peran dan masuk berhasil
  - **Then** pengguna diarahkan ke halaman awal perannya, dan banner "Mode sandbox: data dummy, tanpa uang nyata" tampil di atas header di semua layar setelah masuk
- *Batas peran (P2)*
  - **Given** pengguna masuk sebagai penghuni
  - **When** membuka rute peran lain, misalnya `/admin`
  - **Then** akses ditolak dan pengguna diarahkan kembali ke halaman perannya sendiri

### US-PUB-09 Memakai situs dari ponsel dan keyboard

> Sebagai pengunjung yang membuka KosBagi dari ponsel atau hanya memakai keyboard, saya ingin semua halaman tetap bisa dipakai, supaya saya tidak tertinggal informasi.

Prioritas sebaiknya, dibangun di P1 dan dipoles di P5, semua halaman.

- *Ponsel*
  - **Given** lebar layar 375 piksel
  - **Then** semua halaman publik terbaca tanpa gulir horizontal dan navigasi berubah menjadi menu ringkas
- *Keyboard*
  - **Given** pengguna hanya memakai keyboard
  - **Then** semua tautan, tab, tombol, dan field bisa dijangkau dengan tombol Tab, dan fokusnya terlihat jelas
- *Kontras dan label*
  - **Then** setiap field punya label, kontras teks memenuhi WCAG AA, dan warna lime tidak dipakai sebagai warna teks di latar terang

## Calon pemilik kos

### US-PML-01 Menemukan jalur khusus pemilik kos

> Sebagai pemilik kos dekat kampus, saya ingin menemukan informasi untuk pemilik dengan mudah, supaya saya tahu KosBagi juga melayani pemilik, bukan hanya investor.

Prioritas sebaiknya, tautan dan bagian beranda di P1, halaman `/pemilik` di P2 (jalur 1).

- *Pintu masuk*
  - **Given** pengunjung berada di halaman publik mana pun
  - **Then** ada tautan "Untuk pemilik" di navbar dan footer, dan halaman Masuk punya tautan "Ajukan kos"
- *Bagian beranda*
  - **Then** beranda punya bagian "Punya kos dekat kampus?" dengan tiga angka: Rp1,22 M dana diterima di muka (setelah fee 3%), 30% token tetap milik pemilik, dan Rp0 biaya tambahan untuk penghuni

### US-PML-02 Menghitung dana yang diterima

> Sebagai pemilik kos, saya ingin menyimulasikan dana yang saya terima dan bagi hasil yang tetap saya dapat, supaya saya bisa menilai untung rugi tokenisasi.

Prioritas sebaiknya, dibangun di P2 (jalur 1), halaman `/pemilik`.

- *Contoh Kos Sumbersari 01*
  - **Given** simulasi memakai contoh Kos Sumbersari 01 (nilai Rp1,8 miliar, 70% token dijual)
  - **Then** hasilnya menunjukkan dana penawaran Rp1.260.000.000, fee penawaran 3% Rp37.800.000, dana diterima Rp1.222.200.000, 5.400 token tetap milik pemilik, dan bagi hasil sekitar Rp2.370.600 per bulan
- *Mengubah masukan*
  - **When** pemilik mengubah masukan simulasi
  - **Then** panel hasil langsung diperbarui dengan format rupiah seperti Rp1.500.000

### US-PML-03 Memahami alur, syarat, dan dokumen

> Sebagai pemilik kos, saya ingin mengetahui alur, syarat, dan dokumen yang dibutuhkan, supaya saya bisa menyiapkan pengajuan.

Prioritas sebaiknya, dibangun di P2 (jalur 1), halaman `/pemilik`.

- *Isi informasi*
  - **Given** pemilik membuka `/pemilik`
  - **Then** tampil alur lima langkah (ajukan, penilaian dan dokumen, penerbitan token, penawaran, pengelolaan bulanan), syarat kos, daftar dokumen dummy, dan FAQ
  - **And** setiap pertanyaan FAQ bisa dibuka dan ditutup dengan keyboard

### US-PML-04 Mengajukan kos

> Sebagai pemilik kos, saya ingin mengajukan kos saya lewat form, supaya tim KosBagi bisa menilainya.

Prioritas sebaiknya, dibangun di P2 (halaman jalur 1, endpoint `POST /api/owner-applications` jalur 2), halaman `/pemilik`.

- *Isian belum lengkap*
  - **Given** ada field wajib yang kosong atau formatnya salah
  - **When** pemilik mengirim form
  - **Then** pengajuan tidak terkirim dan setiap field yang salah menampilkan pesan di bawahnya
- *Pengajuan terkirim*
  - **Given** semua field valid dan berisi data dummy
  - **When** pemilik mengirim form
  - **Then** tampil state terkirim dengan nomor pengajuan seperti AJU-SMR-2026-0007 dan lima tahap status pengajuan
  - **And** form mengingatkan agar tidak memakai data pribadi asli

## Investor

### US-INV-01 Mengirim KYC dummy

> Sebagai investor, saya ingin mengirim data KYC dummy, supaya saya boleh membeli token.

Prioritas wajib, API KYC di P2 dan halaman serta whitelist on-chain di P3, menu Verifikasi KYC (`/investor/kyc`). Terkait demo D1.

- *Belum mengajukan*
  - **Given** Dimas belum pernah mengajukan KYC
  - **When** membuka Verifikasi KYC
  - **Then** tampil form "Data identitas dummy" dengan dua isian (Nama lengkap, Nomor identitas dummy), centang "Saya memakai data dummy, bukan data pribadi asli.", dan Jejak KYC empat tahap di kanan
  - **And** Penawaran menampilkan "Verifikasi KYC dulu" dengan tombol Verifikasi KYC, tanpa tombol Bayar
- *Form error*
  - **Given** nama kosong dan nomor identitas tidak berawalan `DUMMY-`
  - **When** investor menekan Ajukan verifikasi
  - **Then** tidak ada data yang dikirim, isian salah diberi garis merah, dan pesan "Nama lengkap wajib diisi." serta "Nomor identitas harus berawalan DUMMY-. Jangan memakai nomor KTP asli." tampil di bawah isiannya
- *Mengajukan*
  - **Given** isian valid dan centang data dummy dicentang
  - **When** investor mengirimnya
  - **Then** form diganti Kartu status KYC "Pengajuanmu sedang ditinjau" berbadge "Diajukan", dan Jejak KYC maju ke tahap "Admin meninjau"
- *Disetujui, dompet sedang didaftarkan*
  - **Given** admin menyetujui pengajuan ([US-ADM-01](#us-adm-01-menyetujui-atau-menolak-kyc))
  - **Then** kartu menampilkan "KYC disetujui, dompet sedang didaftarkan", alamat dompet kustodian 6+4, dan "Menunggu pencatatan on-chain"; tombol "Beli token KB-SMR01" masih nonaktif
- *Dompet tercatat*
  - **When** worker selesai mencatat `setKycStatus` di KosToken
  - **Then** halaman berubah sendiri menjadi "Kamu sudah bisa membeli token" dengan "Tercatat di blockchain", hash 6+4, nomor blok, dan tautan Etherscan, lalu tombol "Beli token KB-SMR01" aktif
- *Ditolak*
  - **Given** admin menolak dengan alasan
  - **Then** kartu "Pengajuanmu ditolak" menampilkan "Alasan dari admin", Jejak KYC menandai "Pengajuan ditolak", dan form "Ajukan lagi" muncul di bawah kartu dengan data sebelumnya

### US-INV-02 Melihat penawaran dan sisa kuota

> Sebagai investor, saya ingin melihat sisa token yang ditawarkan dan sisa kuota pribadi saya, supaya saya tahu berapa token yang masih bisa dibeli.

Prioritas wajib, dibangun di P3, menu Penawaran (`/investor/penawaran`). Terkait demo D1.

- *Kuota awal*
  - **Given** dompet kustodian investor sudah tercatat lolos KYC dan investor belum memegang token
  - **When** membuka Penawaran
  - **Then** Ringkasan penawaran menampilkan "8.240 token tersisa dari 12.600", dan Tiket beli menampilkan "Sisa penawaran 8.240 token" serta "Sisa kuota kamu 1.800 token"
- *Hitungan langsung*
  - **When** investor mengisi 100 token
  - **Then** total Rp10.000.000 dan "Estimasi bagi hasil ±Rp43.875 per bulan untuk 100 token." langsung tampil
- *Token disisihkan*
  - **Given** ada pesanan 100 token yang masih menunggu bayar
  - **Then** kartu penawaran menulis "8.140 token tersisa" dan "4.360 terjual, 100 sedang dipesan"
- *Tiket tetap terlihat*
  - **Given** layar desktop
  - **When** investor menggulir dokumen dan ringkasan risiko
  - **Then** Tiket beli tetap terlihat di kolom kanan; di ponsel tiket berada tepat di bawah Ringkasan penawaran

### US-INV-03 Membeli token lewat Midtrans Snap

> Sebagai investor, saya ingin membayar token lewat Midtrans dan melihat token masuk ke dompet kustodian saya, supaya pembelian saya selesai dan bisa dibuktikan.

Prioritas wajib, dibangun di P3, menu Penawaran. Terkait demo D1 dan D5.

- *Membayar*
  - **Given** jumlah token valid dan "Saya sudah membaca ringkasan risiko ..." dicentang
  - **When** investor menekan "Bayar Rp10.000.000"
  - **Then** popup Snap sandbox terbuka dengan `order_id` berawalan `BUY-`, tiket menjadi "Menunggu pembayaran" dengan hitung mundur 5 menit, dan token disisihkan untuk investor itu
  - **And** di atas 100 token Snap hanya menawarkan virtual account, sesuai catatan di tiket
- *Lunas lalu tercatat*
  - **When** investor menyelesaikan pembayaran di simulator sandbox
  - **Then** tiket menjadi "Memeriksa pembayaran" sampai webhook terverifikasi, lalu "100 token sedang dikirim" dengan "Menunggu pencatatan on-chain"
  - **And** setelah worker memanggil `transferFromTreasury`, tiket menjadi "100 token sudah di dompetmu" dengan cap TERCATAT, hash 6+4, nomor blok, dan tautan Etherscan
- *Kedaluwarsa atau gagal*
  - **Given** batas 5 menit lewat atau Midtrans membatalkan transaksi
  - **Then** tiket menjadi "Pesanan kedaluwarsa" atau "Pembayaran dibatalkan", token yang disisihkan dilepas lagi, dan "Buat pesanan baru" membuka form dengan jumlah yang sama
- *Penawaran penuh*
  - **Given** seluruh 12.600 token sudah terjual
  - **Then** tiket menampilkan "Penawaran sudah penuh" tanpa form

### US-INV-04 Pesanan melebihi sisa penawaran ditolak

> Sebagai investor, saya ingin langsung tahu bila pesanan saya melebihi sisa penawaran, supaya saya tidak membayar untuk token yang tidak tersedia.

Prioritas wajib, dibangun di P3, menu Penawaran. Skenario uji S8.

- *Melebihi sisa*
  - **Given** sisa penawaran 120 token
  - **When** investor mengisi 200 token
  - **Then** pesanan ditolak sebelum transaksi Midtrans dibuat: isian bergaris merah, pesan "Melebihi sisa penawaran. Maksimal 120 token." tampil di bawahnya, kotak "Sisa penawaran" berwarna merah, total diredupkan, dan tombol Bayar nonaktif
- *Lewat API langsung*
  - **When** permintaan yang sama dikirim langsung ke API tanpa lewat halaman
  - **Then** backend tetap menolaknya dengan `OFFERING_EXCEEDED` dan tidak ada transaksi Midtrans yang dibuat; halaman memperbarui sisa penawaran dari jawaban itu

### US-INV-05 Pesanan melebihi batas kepemilikan 10% ditolak

> Sebagai investor, saya ingin pesanan yang membuat saya melewati batas 10% ditolak dengan sisa kuota yang jelas, supaya kepemilikan tetap tersebar dan saya tahu berapa yang masih boleh dibeli.

Prioritas wajib, lapis kontrak di P1 dan lapis backend serta halaman di P3, menu Penawaran. Skenario uji S9 dan S10.

- *Ditolak sebelum bayar (S9)*
  - **Given** investor memegang 1.500 token
  - **When** investor mengisi 500 token
  - **Then** pesanan ditolak sebelum transaksi Midtrans dibuat dengan pesan "Melebihi batas kepemilikan 10%. Sisa kuota kamu 300 token.", kotak "Sisa kuota kamu" berwarna merah, dan tombol Bayar nonaktif
  - **And** tiket menulis "Kamu sudah memegang 1.500 token KB-SMR01." dengan tombol "Pakai 300 token"
- *Pakai sisa kuota*
  - **When** investor menekan "Pakai 300 token"
  - **Then** jumlah menjadi 300, pesan galat hilang, dan tombol berubah menjadi "Bayar Rp30.000.000" setelah risiko dicentang
- *Ditolak kontrak (S10)*
  - **Given** sebuah transfer akan membuat saldo penerima melebihi 1.800 token
  - **When** transfer itu dijalankan di KosToken
  - **Then** transaksi revert (dibuktikan dengan test Hardhat)

### US-INV-06 Melihat portofolio dan bagi hasil

> Sebagai investor, saya ingin melihat jumlah token dan bagi hasil yang saya terima tiap periode, supaya saya tahu hasil investasi saya.

Prioritas wajib, dibangun di P4, menu Portofolio (`/investor/portofolio`). Terkait demo D5.

- *Kepemilikan dan dompet*
  - **Given** Dimas memegang 100 token KB-SMR01
  - **When** membuka Portofolio
  - **Then** kartu token menampilkan "100 token" dan "Nilai beli Rp10.000.000, atau 0,56% dari 18.000 token" beserta tanggal beli
  - **And** kartu Dompet kustodian menampilkan alamat lengkap, tombol "Lihat di Etherscan", dan "Salin alamat"
- *Setelah distribusi*
  - **Given** admin sudah menutup periode November 2026 dan menjalankan distribusi
  - **Then** tabel "Bagi hasil per periode" berisi baris November 2026: saldo di blok snapshot 100 token, nilai per token Rp438,75, bagianmu Rp43.875 (Rp7.897.500 × 100 ÷ 18.000, dibulatkan ke bawah), dan status "Tercatat" yang menaut ke transaksi `closePeriod`
  - **And** periode berjalan tampil sebagai baris "Belum ada snapshot" dan "Belum dihitung" dengan batas tutupnya
- *Belum punya token*
  - **Given** investor belum pernah membeli token
  - **Then** halaman menampilkan "Belum ada token di portofoliomu" dan tombol "Lihat penawaran"
- *Saldo cocok dengan blockchain*
  - **Then** jumlah token di portofolio sama dengan saldo dompet kustodian investor di KosToken

### US-INV-07 Melihat riwayat dan status on-chain

> Sebagai investor, saya ingin melihat riwayat pembelian dan bagi hasil beserta status on-chain-nya, supaya setiap transaksi saya bisa dicek.

Prioritas wajib, dibangun di P4 di menu Portofolio. Status on-chain pembelian sudah tampil di Tiket beli sejak P3 ([US-INV-03](#us-inv-03-membeli-token-lewat-midtrans-snap)). Terkait demo D5.

- *Status tiap baris*
  - **Given** investor punya pembelian dan bagi hasil
  - **When** membuka "Riwayat transaksi"
  - **Then** setiap baris menunjukkan tanggal, jenis ("Beli token" atau "Bagi hasil"), rincian (mis. "BUY-SMR01-0003, 100 token ke dompet kustodian"), nominal, dan status on-chain "Menunggu pencatatan" atau "Tercatat" (hash 6+4 dan tautan Etherscan)
- *Tidak pernah melihat kata gagal*
  - **Given** pemindahan token atau pencatatan lain gagal setelah semua percobaan otomatis
  - **Then** investor tetap melihat "Menunggu pencatatan", karena pengulangannya tugas admin
- *Pembaruan status*
  - **Then** status "Menunggu pencatatan" berubah menjadi "Tercatat" setelah worker menyimpan tx hash, tanpa investor perlu memuat ulang halaman

### US-INV-08 Melihat ringkasan investor

> Sebagai investor, saya ingin satu halaman ringkasan, supaya saldo bagi hasil dan sewa yang masuk terlihat sekilas.

Prioritas sebaiknya, dibangun di P4, menu Ringkasan (`/investor`). Terkait demo D5.

- *Kartu saldo bagi hasil*
  - **Given** distribusi November 2026 sudah dijalankan
  - **When** Dimas membuka Ringkasan
  - **Then** kartu gelap "Saldo bagi hasil" menampilkan Rp43.875 dengan keterangan "Dari distribusi November 2026: 100 token × Rp438,75."
  - **And** grafik "Sewa tercatat di Sepolia" menjumlahkan sewa tercatat per tanggal bayar sampai Rp13.500.000
- *Periode berjalan*
  - **Given** periode November 2026 masih berjalan dan belum ada distribusi
  - **Then** saldo Rp0 dengan keterangan bahwa bagi hasil pertama masuk setelah periode ditutup, garis putus-putus "Hari ini" tampil di grafik, dan kaki kartu menulis perkiraan bagian bila 9 kamar membayar (±Rp43.875)
- *Daftar sewa masuk*
  - **Then** kartu "Sewa masuk November" menampilkan K01 sampai K10 dengan tanggal bayar dan hash transaksi `recordRent`, tanpa nama penghuni; kamar yang belum dibayar menulis "Belum dibayar" dan kamar kosong "Tidak ditagih"
  - **And** sewa yang pencatatannya belum selesai atau sedang diulang admin selalu ditulis "Menunggu pencatatan"
- *Belum punya token*
  - **Given** investor belum memegang token
  - **Then** kartu saldo diganti kartu "Kamu belum punya token" dengan tombol "Lihat penawaran", sedangkan Daftar sewa masuk tetap tampil
- *Memuat dan gagal*
  - **Then** kerangka tampil saat data dimuat, dan bila server tidak merespons, pesan galat beserta tombol "Muat ulang" tampil

### US-INV-09 Menarik saldo bagi hasil

> Sebagai investor, saya ingin menarik saldo bagi hasil, supaya hasilnya bisa saya pakai.

Prioritas opsional. Di P4 tombol "Tarik saldo" sudah tampil tetapi nonaktif dengan keterangan "Penarikan dibuka setelah disbursement sandbox tersedia." Penarikan dibangun di P5 bila waktu cukup.

- *Penarikan belum tersedia (P4)*
  - **Given** saldo bagi hasil lebih dari nol
  - **Then** tombol "Tarik saldo" nonaktif dan keterangannya terbaca pembaca layar
- *Penarikan dummy (P5, bila dibangun)*
  - **When** investor meminta penarikan ke rekening dummy
  - **Then** permintaan tercatat dan saldo berkurang, tanpa uang nyata dan tanpa nomor rekening asli

### US-INV-10 Memberi suara on-chain

> Sebagai investor, saya ingin memberi suara atas usulan pengelolaan kos, supaya pemegang token ikut menentukan keputusan penting.

Tidak dibangun di prototipe (keputusan 16 Nov 2026). KosToken sudah memakai ERC20Votes, jadi bobot suara per blok bisa dipakai kontrak `KosVoting` di pengembangan lanjutan yang dicatat di business case.

- *Bobot suara (rancangan)*
  - **Given** ada usulan yang masih dibuka
  - **When** investor memberi suara
  - **Then** bobot suaranya sama dengan saldo token investor di blok saat usulan dibuat

## Penghuni

### US-PHN-01 Melihat tagihan bulan berjalan

> Sebagai penghuni, saya ingin melihat tagihan sewa bulan berjalan, supaya saya tahu berapa yang harus dibayar dan kapan jatuh temponya.

Prioritas wajib, dibangun di P2, menu Tagihan (`/penghuni/tagihan`). Terkait demo D2.

- *Tagihan November*
  - **Given** pengguna masuk sebagai Sari Wulandari (kamar K03)
  - **When** membuka Tagihan
  - **Then** tampil "Sewa Kamar K03, November 2026", kode `RENT-SMR01-K03-2026-11`, Rp1.500.000, "Jatuh tempo 10 Nov 2026", lencana "Belum dibayar", dan tombol "Bayar sewa"
- *Hanya tagihan sendiri*
  - **Then** penghuni hanya bisa melihat tagihan kamarnya sendiri, termasuk bila mencoba membuka tagihan kamar lain lewat API

### US-PHN-02 Membayar sewa lewat Virtual Account

> Sebagai penghuni, saya ingin membayar sewa lewat Virtual Account di Midtrans, supaya tagihan saya lunas tanpa transfer manual dan pembayarannya bisa dibuktikan.

Prioritas wajib, lunas di P2 dan tercatat on-chain di P3, menu Tagihan. Terkait demo D2. Skenario uji S1.

- *Mulai membayar*
  - **Given** tagihan berstatus "Belum dibayar"
  - **When** penghuni menekan "Bayar sewa"
  - **Then** popup Snap sandbox terbuka dengan nominal tepat Rp1.500.000 tanpa biaya tambahan
  - **And** baris tagihan berubah menjadi "Menunggu pembayaran" dengan hitung mundur 5 menit dan tombol "Lanjutkan pembayaran"
- *Lunas*
  - **When** penghuni membayar lewat Virtual Account di simulator sandbox
  - **Then** tagihan menjadi "Lunas" hanya setelah notifikasi Midtrans terverifikasi, dengan keterangan waktu dan metode, misalnya "Dibayar 9 Nov 2026, 10.42 lewat Virtual Account"
  - **And** status kamar K03 di halaman pengelola ikut menjadi lunas
- *Tercatat on-chain (P3)*
  - **Then** status on-chain bergerak dari "Menunggu pencatatan" ke "Tercatat" dengan hash disingkat (mis. 0x8f3a…c21d) dan tautan Etherscan transaksi `recordRent`

### US-PHN-03 Membayar sewa lewat QRIS

> Sebagai penghuni, saya ingin membayar sewa dengan QRIS, supaya saya bisa memakai aplikasi pembayaran di ponsel.

Prioritas wajib, lunas di P2 dan tercatat on-chain di P3, menu Tagihan. Terkait demo D2. Skenario uji S2.

- *Bayar QRIS*
  - **Given** tagihan berstatus "Belum dibayar"
  - **When** penghuni memilih QRIS di popup Snap dan menyelesaikan pembayaran di simulator sandbox
  - **Then** hasilnya sama dengan [US-PHN-02](#us-phn-02-membayar-sewa-lewat-virtual-account): tagihan lunas, tercatat on-chain, dan tautan Etherscan muncul, dengan metode tercatat QRIS

### US-PHN-04 Pembayaran dibatalkan

> Sebagai penghuni, saya ingin tagihan saya tetap aman bila pembayaran batal, supaya saya bisa mencoba lagi tanpa tagihan dianggap lunas.

Prioritas wajib, dibangun di P2, menu Tagihan. Skenario uji S3.

- *Dibatalkan atau ditolak*
  - **Given** penghuni sudah memulai pembayaran
  - **When** pembayaran dibatalkan atau ditolak (Midtrans mengirim status cancel atau deny)
  - **Then** tagihan tetap belum dibayar, baris tagihan menunjukkan "Gagal" dengan keterangan "Pembayaran ditolak atau dibatalkan. Tagihan belum dibayar.", tidak ada catatan on-chain, dan tombol "Bayar ulang" muncul
- *Popup ditutup*
  - **When** penghuni menutup popup Snap sebelum membayar
  - **Then** tagihan tidak berubah menjadi lunas, dan penghuni bisa melanjutkan pembayaran selama batas 5 menit belum lewat

### US-PHN-05 Pembayaran kedaluwarsa lalu bayar ulang

> Sebagai penghuni, saya ingin bisa membayar ulang setelah batas waktu bayar habis, supaya keterlambatan tidak membuat tagihan saya macet.

Prioritas wajib, dibangun di P2, menu Tagihan. Skenario uji S4.

- *Kedaluwarsa*
  - **Given** pembayaran sudah dibuat tetapi tidak diselesaikan
  - **When** batas 5 menit lewat dan Midtrans mengirim status expire
  - **Then** baris tagihan menunjukkan "Kedaluwarsa" dengan keterangan "Waktu pembayaran 5 menit habis. Tagihan belum dibayar.", dan tidak ada catatan on-chain
- *Bayar ulang*
  - **When** penghuni menekan "Bayar ulang"
  - **Then** percobaan pembayaran baru dibuat dengan `order_id` baru di Midtrans untuk tagihan yang sama, dan alur [US-PHN-02](#us-phn-02-membayar-sewa-lewat-virtual-account) bisa diulang sampai lunas

### US-PHN-06 Pembayaran tidak tercatat dua kali

> Sebagai penghuni, saya ingin satu pembayaran saya tercatat tepat satu kali, supaya catatan sewa dan bagi hasil tidak menggelembung.

Prioritas wajib, lapis basis data dan webhook di P2, lapis kontrak di P3. Skenario uji S5.

- *Notifikasi ganda*
  - **Given** tagihan sudah lunas
  - **When** Midtrans mengirim notifikasi yang sama untuk kedua kalinya
  - **Then** backend membalas HTTP 200 tanpa mengubah data, sehingga hanya ada satu pembayaran lunas di basis data dan satu catatan `recordRent` di KosLedger
- *Job terulang*
  - **When** job pencatatan untuk pembayaran yang sama dijalankan lagi
  - **Then** KosLedger menolak referensi `keccak256(order_id)` yang sudah tercatat

### US-PHN-07 Melihat kuitansi dan bukti on-chain

> Sebagai penghuni, saya ingin kuitansi yang menyertakan bukti on-chain, supaya saya punya tanda bayar yang bisa diperiksa siapa pun.

Prioritas wajib, dibangun di P3, halaman `/penghuni/tagihan/[id]` yang dibuka dari tombol "Lihat kuitansi" di slip dan tautan "Kuitansi" di kolom Aksi riwayat. Terkait demo D2 dan D5.

- *Isi kuitansi*
  - **Given** tagihan November 2026 sudah lunas dan tercatat
  - **When** penghuni membuka kuitansi
  - **Then** Kuitansi sewa menampilkan nomor tagihan `RENT-SMR01-K03-2026-11`, "Sari Wulandari (dummy)", kamar, periode sewa, metode, waktu bayar, ID transaksi Midtrans, rincian dan total dibayar, serta cap TERCATAT
  - **And** panel gelap "Yang tercatat di Sepolia" menampilkan argumen `recordRent` dengan nilai mentahnya dalam kurung supaya bisa dicocokkan dengan event `RentRecorded` di Etherscan: kamar `K03 (room = 3)`, periode `2026-11 (period = 202611)`, nominal `1.500.000 (amount = 1500000)`, dan `paymentRef` = `keccak256` nomor tagihan. Properti SMR01 ditandai "dari alamat kontrak" karena bukan argumen. Panel juga memuat hash transaksi dan blok, tombol "Lihat di Etherscan", dan baris "Tidak dicatat: nama penghuni, email, dan nomor virtual account."
- *Belum tercatat*
  - **Given** pencatatan on-chain belum selesai
  - **Then** status panel "Menunggu pencatatan", hash transaksi "Belum ada", tombol Etherscan nonaktif, tanpa cap TERCATAT, dan halaman diperbarui sendiri sampai tercatat
- *Data lampau*
  - **Given** tagihan Agu sampai Okt 2026 yang lunas tanpa pembayaran Midtrans
  - **Then** riwayat menampilkan "Data lampau" tanpa tautan, dan panel kuitansi menyatakan tagihan itu tidak punya catatan on-chain
  - **And** baris Nomor tagihan berbunyi "Data lampau, tanpa order Midtrans", catatan kaki tidak menyebut Midtrans sandbox, dan tombol "Salin nomor tagihan" tidak ada
- *Cetak dan salin*
  - **When** penghuni menekan "Cetak kuitansi"
  - **Then** cetak peramban hanya memuat kartu kuitansi dengan warna terang
  - **And** "Salin nomor tagihan" menyalin nomor tagihan lengkap (hanya di desktop)
- *Tidak ditemukan*
  - **Given** tagihan tidak ada, milik penghuni lain, atau belum lunas
  - **Then** tampil "Kuitansi tidak ditemukan" dengan tombol "Kembali ke Tagihan"

### US-PHN-08 Tetap tenang bila pencatatan on-chain tertunda

> Sebagai penghuni, saya ingin tahu bahwa pembayaran saya tetap sah walau pencatatan blockchain belum selesai, supaya saya tidak membayar dua kali.

Prioritas sebaiknya, dibangun di P3 dan diubah di P4 (temuan QA S1), menu Tagihan dan kuitansi.

- *Pencatatan gagal setelah semua percobaan otomatis*
  - **Given** worker gagal mencatat setelah semua percobaan otomatis
  - **Then** tagihan tetap "Lunas" dan status on-chain di slip, riwayat, jejak, dan kuitansi tetap "Menunggu pencatatan"; penghuni tidak pernah melihat kata gagal
  - **And** penghuni tidak mendapat tombol apa pun, karena pengulangan pencatatan adalah tugas admin
- *Pertahanan berlapis*
  - **Given** backend P4 sudah memetakan FAILED menjadi PENDING untuk penghuni
  - **Then** frontend tetap memetakannya sekali lagi, sedangkan pengelola dan admin tetap melihat "Gagal dicatat"
- *Diulang admin*
  - **When** admin menekan "Coba lagi" di antrean admin ([US-ADM-09](#us-adm-09-mengulang-atau-menandai-job-on-chain-yang-gagal))
  - **Then** job yang sama masuk antrean lagi dan tidak menghasilkan catatan ganda

### US-PHN-09 Tagihan periode yang sudah ditutup tidak bisa dibayar

> Sebagai penghuni, saya ingin tahu bila tagihan sebuah periode sudah tidak bisa dibayar lewat KosBagi, supaya saya menghubungi pengelola alih-alih membayar ke sistem.

Prioritas sebaiknya, backend di P4 (keputusan 16 Nov 2026).

- *Periode sudah ditutup*
  - **Given** admin sudah menutup periode dan tagihan penghuni masih belum dibayar (`periodClosed: true`)
  - **When** penghuni membuka Tagihan
  - **Then** tombol "Bayar sewa" nonaktif dengan keterangan bahwa periode sudah ditutup dan tagihan tidak bisa dibayar lewat KosBagi, dan jejak pembayaran menulis hal yang sama
  - **And** bila permintaan bayar tetap dikirim, backend menolak dengan 409 `PERIOD_CLOSED` sebelum transaksi Midtrans dibuat
- *Terlanjur dibayar setelah ditutup*
  - **Given** pembayaran sudah dimulai sebelum penutupan tetapi baru lunas sesudahnya (`paymentState: PAID_AFTER_CLOSE` atau `refund` terisi)
  - **Then** tagihan tidak berubah dan tidak ada job on-chain; slip berlabel "Dana dikembalikan" dan menulis "Pembayaran diterima setelah periode ditutup, dana akan dikembalikan" beserta nominal, waktu bayar, dan nomor order, tanpa tombol bayar
  - **And** jejak pembayaran menandai Bayar dan Konfirmasi Midtrans selesai, Tagihan lunas tidak tercapai, dan menulis nominal serta tanggalnya
  - **And** admin melihat butir "Dana perlu dikembalikan" di kartu Perlu perhatian `/admin` yang menaut ke rekonsiliasi, tempat pembayaran itu muncul sebagai Selisih

## Pengelola

### US-PGL-01 Melihat status kamar per periode

> Sebagai pengelola, saya ingin melihat status bayar setiap kamar dalam satu papan, supaya saya tahu kamar mana yang sudah lunas tanpa menagih satu per satu.

Prioritas wajib, dibangun di P4 dengan data tagihan dari P2, menu Status kamar (`/pengelola`). Terkait demo D2.

- *Ringkasan sewa masuk*
  - **Given** pengguna masuk sebagai Hadi Santoso dan periode berjalan November 2026
  - **When** membuka Status kamar
  - **Then** kartu "Sewa masuk November" menampilkan jumlah lunas (mis. Rp10.500.000) dari Rp13.500.000 untuk 9 kamar terisi, bilah dua segmen (tercatat di Sepolia dan menunggu pencatatan), dan keterangan warna berjumlah
- *Papan kamar*
  - **Then** papan K01 sampai K10 menunjukkan status setiap kamar: lunas dan tercatat (ubin lime dengan hash yang menaut ke Etherscan), lunas tetapi belum tercatat ("Belum tercatat"), belum dibayar (nominal, atau "Lewat 8 hari" bila lewat jatuh tempo), atau kosong
- *Setelah penghuni membayar*
  - **When** Sari melunasi tagihan K03 ([US-PHN-02](#us-phn-02-membayar-sewa-lewat-virtual-account))
  - **Then** ubin K03 berubah menjadi lunas tanpa memuat ulang halaman, lalu menjadi lime setelah tercatat

### US-PGL-02 Mencatat biaya dan mengunggah nota

> Sebagai pengelola, saya ingin mencatat biaya operasional beserta notanya, supaya pengurang bagi hasil bisa dipertanggungjawabkan.

Prioritas wajib, dibangun di P4, menu Biaya dan nota (`/pengelola/biaya`). Terkait demo D3.

- *Catat biaya*
  - **Given** periode November 2026 masih terbuka
  - **When** pengelola menekan "Catat biaya", memilih kategori (Listrik dan air, Kebersihan, Internet, Perbaikan, Keamanan), mengisi nominal, tanggal nota, dan keterangan, lalu memilih file nota PDF, JPG, atau PNG paling besar 5 MB
  - **Then** Sheet menampilkan "Hash SHA-256 nota (dicatat on-chain)" yang dihitung dari isi file, dan tombol "Simpan dan catat" baru aktif setelah semua isian dan file lengkap
  - **And** setelah disimpan, toast "Biaya perbaikan dicatat" muncul, baris biaya tampil "Menunggu pencatatan", lalu berubah menjadi "Tercatat" dengan tautan Etherscan, sedangkan file notanya tetap di server KosBagi
- *Nota ganda*
  - **Given** nota yang sama sudah pernah dicatat (contoh: nota listrik 5 Nov 2026)
  - **When** pengelola menyimpannya lagi
  - **Then** Alert error "Nota ini sudah tercatat" di atas form menyebut hash, biaya, dan tanggal nota pertama, tombol "Simpan dan catat" nonaktif sampai file diganti, dan tidak ada job on-chain baru
- *Berkas tidak sesuai*
  - **Given** berkas bukan PDF, JPG, atau PNG, atau lebih dari 5 MB
  - **When** dipilih
  - **Then** pesan di bawah isian menyebut format dan ukuran yang diterima
- *Periode sudah ditutup*
  - **Given** periode November 2026 sudah ditutup
  - **Then** Alert info menyatakan biaya November tidak bisa diubah lagi, tabel hanya bisa dibaca, dan tombol berganti menjadi "Catat biaya Desember"
- *Kosong*
  - **Given** belum ada biaya di periode itu
  - **Then** tampil "Belum ada biaya November" beserta penjelasan singkat

### US-PGL-03 Menindaklanjuti tagihan telat dan pencatatan yang belum selesai

> Sebagai pengelola, saya ingin daftar hal yang perlu ditindaklanjuti, supaya saya bisa menagih penghuni yang telat dan tahu pencatatan mana yang sedang diulang.

Prioritas sebaiknya, dibangun di P4, kartu "Perlu ditindaklanjuti" di Status kamar. Terkait demo D2.

- *Tagihan lewat jatuh tempo*
  - **Given** tagihan K04 dan K09 jatuh tempo 10 Nov dan belum dibayar pada 18 Nov
  - **Then** kartu menampilkan "K04 Belum dibayar" dengan "Jatuh tempo 10 Nov sudah lewat 8 hari."
- *Pencatatan gagal*
  - **Given** K08 lunas 14 Nov tetapi `recordRent` gagal
  - **Then** kartu menampilkan "Lunas 14 Nov, belum tercatat" dan menjelaskan bahwa admin sedang mengulangnya dan penghuni tidak perlu membayar lagi; pengelola tidak punya tombol mengulang
- *Semua tercatat*
  - **Given** semua sewa kamar terisi sudah tercatat
  - **Then** kartu menulis bahwa tidak ada yang perlu ditindaklanjuti dan periode siap ditutup admin

## Admin

### US-ADM-01 Menyetujui atau menolak KYC

> Sebagai admin, saya ingin meninjau pengajuan KYC dummy, supaya hanya investor terverifikasi yang bisa menerima token.

Prioritas wajib, dibangun di P3, menu Verifikasi KYC (`/admin/kyc`). Terkait demo D1.

- *Daftar bertab*
  - **Given** admin membuka Verifikasi KYC
  - **Then** tampil tab "Menunggu", "Disetujui", dan "Ditolak" dengan jumlahnya, serta tabel investor dummy, nomor identitas, waktu pengajuan, dompet kustodian, status, dan aksi
- *Meninjau*
  - **When** admin menekan baris atau tombol Tinjau
  - **Then** Sheet tinjau terbuka di kanan berisi data pengajuan dan "Pemeriksaan otomatis" dari backend: nomor berawalan `DUMMY-`, nama sama dengan nama akun, dan tidak ada pengajuan aktif lain
- *Menyetujui*
  - **When** admin menekan Setujui
  - **Then** backend membuat dompet kustodian dan job whitelist dalam satu transaksi, toast "Pengajuan Dimas Pratama disetujui" muncul, dan Sheet menampilkan dompet beserta "Menunggu pencatatan on-chain"
  - **And** setelah worker memanggil `setKycStatus`, Sheet dan kolom Status tab Disetujui menampilkan "Tercatat" dengan tautan Etherscan
- *Menolak*
  - **When** admin menekan Tolak
  - **Then** Dialog tolak meminta alasan; tanpa alasan muncul "Alasan wajib diisi supaya investor tahu apa yang harus diperbaiki."
  - **And** setelah dikirim, investor melihat status "Ditolak" beserta alasannya

### US-ADM-02 Menutup periode

> Sebagai admin, saya ingin menutup periode bulanan, supaya sewa bersih dan nilai per token periode itu tercatat permanen sebelum dibagikan.

Prioritas wajib, test kontrak di P3 dan halaman di P4, menu Tutup periode (`/admin/periode`). Terkait demo D4. Skenario uji S12.

- *Struk sementara dan syarat*
  - **Given** masih ada sewa atau nota November 2026 yang belum tercatat, atau ada job yang gagal
  - **When** admin membuka Tutup periode
  - **Then** struk berlabel "Struk sementara" menghitung dari data yang sudah tercatat saja (contoh: Rp12.000.000 dan Rp2.400.000 menghasilkan Rp390 per token)
  - **And** kartu "Syarat penutupan" menandai syarat yang belum terpenuhi beserta penyebabnya (mis. "Kamar K08 gagal dicatat. Ulangi dari antrean job."), dan tombol "Tutup periode November 2026" nonaktif
- *Konfirmasi*
  - **Given** semua sewa dan nota tercatat dan tidak ada job gagal
  - **When** admin menekan Tutup periode
  - **Then** Dialog konfirmasi menulis "Sewa bersih Rp7.897.500 dan nilai Rp438,75 per token akan dicatat permanen di Sepolia. Langkah ini tidak bisa dibatalkan."
- *Tercatat*
  - **When** admin mengonfirmasi
  - **Then** kartu berubah menjadi "Menutup periode" selama job `closePeriod` dikirim, lalu "Periode ditutup" dengan tautan Etherscan, blok snapshot, dan cap TERCATAT di struk
- *Penutupan gagal*
  - **Given** `closePeriod` gagal setelah semua percobaan otomatis
  - **Then** kartu "Penutupan gagal dicatat" menampilkan penyebab terakhir dan tombol "Coba lagi"; data periode belum berubah
- *Sesuai hitungan manual (S12)*
  - **Then** struk penutupan November 2026 menulis sewa kotor Rp13.500.000, biaya Rp2.700.000, fee 5% Rp675.000, PPh 22% Rp2.227.500 dari laba Rp10.125.000, sewa bersih Rp7.897.500, dan Rp438,75 per token (disimpan on-chain sebagai 43875 sen)

### US-ADM-03 Menjalankan distribusi bagi hasil

> Sebagai admin, saya ingin menjalankan distribusi setelah periode ditutup, supaya setiap pemegang menerima bagian sesuai token yang dipegangnya.

Prioritas wajib, dibangun di P4, menu Tutup periode. Terkait demo D4 dan D5.

- *Distribusi*
  - **Given** periode November 2026 sudah ditutup dan tercatat on-chain
  - **When** admin menekan "Jalankan distribusi"
  - **Then** toast "Distribusi November selesai" muncul dan tabel "Bagian pemegang" menampilkan saldo di blok snapshot dan bagian tiap pemegang: pemilik lama 5.400 token Rp2.369.250, Bagas 1.800 token Rp789.750, Citra 1.200 token Rp526.500, Eko 800 token Rp351.000, Fajar 560 token Rp245.700, Dimas 100 token Rp43.875
  - **And** baris terpisah "Bagian perbendaharaan (8.140 token belum terjual)" Rp3.571.425 masuk ke saldo pemilik lama, "Sisa pembulatan" Rp0, dan total sewa bersih Rp7.897.500
  - **And** saldo bagi hasil Dimas di `/investor` menjadi Rp43.875
- *Tidak dua kali*
  - **Then** tombol berganti menjadi "Distribusi sudah dijalankan" dan nonaktif
  - **When** permintaan distribusi untuk periode yang sama dikirim lagi
  - **Then** backend menolak dengan 409 `ALREADY_DISTRIBUTED` dan saldo tidak bertambah dua kali
- *Sepolia tidak bisa dibaca*
  - **Given** RPC Sepolia tidak merespons saat saldo snapshot dibaca
  - **Then** distribusi tidak dijalankan, saldo tidak berubah, dan pesan meminta admin mencoba lagi

### US-ADM-04 Membuka rekonsiliasi

> Sebagai admin, saya ingin mencocokkan data Midtrans, basis data, dan blockchain, supaya selisih bisa ditemukan sebelum menutup periode.

Prioritas wajib, dibangun di P4 (modul dan halaman jalur 1, tautan menu dan kartu ringkasan jalur 4), menu Rekonsiliasi (`/admin/rekonsiliasi`). Terkait demo D6.

- *Membuka halaman*
  - **Given** admin berada di app shell
  - **When** memilih menu Rekonsiliasi atau butir Rekonsiliasi di kartu "Perlu perhatian"
  - **Then** halaman `/admin/rekonsiliasi` terbuka
- *Hasil pencocokan*
  - **Then** setiap `order_id` dicocokkan antara status Midtrans (ditulis apa adanya, mis. `settlement`, `expire`), basis data, dan Sepolia, dengan hasil "Cocok" atau "Selisih"
  - **And** percobaan yang kedaluwarsa atau dibatalkan dihitung Cocok bila ketiga sumber sepakat tidak ada uang dan tidak ada catatan, sedangkan anomali nominal dan pembayaran setelah periode ditutup muncul sebagai Selisih
- *Hanya selisih*
  - **When** admin menekan "Hanya selisih"
  - **Then** tabel hanya menampilkan baris Selisih, dan baris Selisih bisa dibuka untuk melihat nilai dari ketiga sumber

### US-ADM-05 Notifikasi palsu ditolak

> Sebagai admin platform, saya ingin notifikasi pembayaran palsu ditolak, supaya tidak ada tagihan yang lunas tanpa pembayaran.

Prioritas wajib, dibangun di P2, endpoint webhook. Skenario uji S6.

- *Signature salah*
  - **Given** notifikasi dengan `signature_key` yang tidak cocok
  - **When** dikirim ke endpoint webhook
  - **Then** backend menolaknya, tidak ada data yang berubah, dan percobaan itu tercatat di log
- *Rate limit*
  - **Given** endpoint webhook menerima terlalu banyak permintaan dalam waktu singkat
  - **Then** permintaan berikutnya dibatasi

### US-ADM-06 Nominal tidak cocok dicatat sebagai anomali

> Sebagai admin, saya ingin pembayaran dengan nominal yang tidak sesuai tagihan ditolak dan dicatat, supaya saya bisa menelusurinya.

Prioritas wajib, backend di P2 dan tampilan di halaman rekonsiliasi P4. Terkait demo D6. Skenario uji S7.

- *Nominal berbeda*
  - **Given** notifikasi bersignature valid tetapi `gross_amount` berbeda dari nominal tagihan
  - **When** diproses
  - **Then** tagihan tidak berubah dan anomali tercatat dengan `order_id`, nominal yang diharapkan, dan nominal yang diterima
  - **And** anomali itu terlihat oleh admin di halaman rekonsiliasi

### US-ADM-07 Hanya pemegang peran yang menulis ke kontrak

> Sebagai admin platform, saya ingin fungsi tulis kontrak hanya bisa dipanggil alamat yang memegang peran (operator untuk transaksi harian, admin untuk pengaturan peran dan dokumen), supaya catatan sewa, perpindahan token, dan hash dokumen tidak bisa dipalsukan pihak lain.

Prioritas wajib, KosToken di P1 dan KosLedger di P2. Skenario uji S11.

- *Pemanggil tidak berwenang*
  - **Given** alamat yang tidak punya peran operator
  - **When** memanggil `recordRent` atau fungsi tulis harian lain
  - **Then** transaksi revert (dibuktikan dengan test Hardhat)
- *Dokumen hanya oleh admin*
  - **Given** alamat yang tidak punya peran admin, termasuk alamat yang hanya berperan operator
  - **When** memanggil `anchorDocument`
  - **Then** transaksi revert (dibuktikan dengan test Hardhat). Bila peran admin dipegang dompet terpisah, kunci operator yang bocor tidak bisa mengganti hash dokumen
- *Jeda darurat*
  - **Given** keadaan darurat
  - **When** pemegang peran jeda memanggil `pause`
  - **Then** semua perpindahan token berhenti sampai `unpause` dipanggil

### US-ADM-08 Melihat ringkasan admin

> Sebagai admin, saya ingin satu halaman ringkasan, supaya pekerjaan yang menunggu terlihat sekilas.

Prioritas sebaiknya, dibangun di P4, menu Ringkasan (`/admin`). Terkait demo D4 dan D6.

- *Periode berjalan*
  - **Given** admin masuk dan periode November 2026 belum siap ditutup
  - **Then** kartu "Periode berjalan" menampilkan sewa tercatat (Rp12.000.000, 8 dari 9 kamar terisi), biaya tercatat (Rp2.400.000, 4 dari 5 nota), dan perkiraan per token (Rp390 bila ditutup sekarang), lalu kalimat "Belum siap ditutup: 1 sewa gagal dicatat dan 1 nota masih menunggu pencatatan."
  - **And** tombol "Buka tutup periode" membuka `/admin/periode`
- *Perlu perhatian*
  - **Then** kartu "Perlu perhatian" menautkan ke Verifikasi KYC ("1 pengajuan menunggu"), Rekonsiliasi ("2 selisih perlu dicek"), dan Antrean job ("1 job gagal"); angka yang perlu tindakan ditulis merah
  - **And** bila ada pembayaran sewa yang masuk setelah periode ditutup, butir "Dana perlu dikembalikan" ikut tampil dan menaut ke rekonsiliasi
  - **And** setelah job yang dikirim ulang selesai, kartu ini dibaca ulang otomatis sehingga angkanya sama dengan tabel antrean
- *Periode tanpa parameter*
  - **Given** admin membuka `/admin/periode` tanpa `?periode=`
  - **Then** halaman membuka periode berjalan dari backend, bukan periode yang ditulis tetap di frontend
- *Antrean bersih*
  - **Given** semua job sudah tercatat
  - **Then** tab "Menunggu atau gagal (0)" menampilkan "Tidak ada job yang menunggu atau gagal" dan kartu periode menulis "Semua syarat penutupan terpenuhi. Periode siap ditutup."

### US-ADM-09 Mengulang atau menandai job on-chain yang gagal

> Sebagai admin, saya ingin mengulang job blockchain yang gagal, atau menandainya ditangani bila gagalnya permanen, supaya sewa, biaya, dan penutupan periode tetap tercatat dan periode tidak tertahan selamanya.

Prioritas sebaiknya, dibangun di P4, tabel "Antrean job on-chain" di Ringkasan admin dan kartu penutupan gagal di Tutup periode. Terkait skenario S5 (tidak ada catatan ganda).

- *Antrean*
  - **Given** admin membuka Ringkasan
  - **Then** tabel antrean punya tab "Menunggu atau gagal" dan "Semua" berjumlah, dengan kolom Jenis, Referensi, Dibuat, Percobaan ("5 dari 5"), Status, dan Aksi
- *Coba lagi*
  - **Given** job "Catat sewa" `RENT-SMR01-K08-2026-11` berstatus "Gagal dicatat"
  - **When** admin menekan tombol Outline "Coba lagi" di kolom Aksi
  - **Then** job masuk antrean lagi dan statusnya berubah menjadi "Menunggu pencatatan", lalu "Tercatat"
  - **And** bila transaksinya ternyata sudah masuk blok, job diakui tercatat tanpa mengirim transaksi kedua
- *Hanya job gagal*
  - **Then** job yang masih menunggu menulis "Otomatis" di kolom Aksi, dan permintaan Coba lagi untuk job yang tidak gagal ditolak 409 `JOB_NOT_FAILED`
- *Tandai ditangani (temuan QA S4)*
  - **Given** job gagal permanen, mis. nota yang sudah tercatat lewat transaksi lain
  - **When** admin menekan tombol Outline "Tandai ditangani" di samping Coba lagi
  - **Then** Dialog konfirmasi meminta catatan wajib 5 sampai 300 karakter; tanpa catatan muncul pesan di bawah isian
  - **And** setelah dikonfirmasi, job hilang dari tab "Menunggu atau gagal", tidak lagi menghalangi penutupan periode, dan tampil di tab "Semua" dengan nama admin, tanggal, dan catatannya, tanpa Coba lagi
  - **And** Coba lagi untuk job yang sudah ditangani ditolak 409 `JOB_RESOLVED`, dan menandai dua kali ditolak 409 `JOB_ALREADY_RESOLVED`

## Di luar cakupan prototipe

| Fitur | Keterangan |
|---|---|
| Pasar sekunder (jual beli token antarinvestor, fee 0,5%) | Fase kedua, tidak dibangun. Halaman risiko menyebut token belum bisa dijual kembali |
| Pembatalan penawaran dan pengembalian dana otomatis | Aturan bisnisnya dijelaskan di halaman risiko dan business case; prosesnya belum dijadwalkan di P1 sampai P5 |
| Banyak properti sekaligus | Opsional. Daftar kos hanya berisi Kos Sumbersari 01 |
| Dompet mandiri (investor memegang kunci sendiri) | Prototipe memakai dompet kustodian (lihat [arsitektur bagian 3](arsitektur.md#3-dompet-dan-token)) |
| KYC dengan dokumen asli | Hanya KYC dummy, sesuai aturan tugas |
| Voting on-chain (`KosVoting`) | Tidak dibangun (keputusan 16 Nov 2026); dicatat sebagai pengembangan lanjutan di business case. Lihat US-INV-10 |
| Penarikan saldo bagi hasil | Tombol Tarik saldo tampil nonaktif sejak P4; disbursement sandbox opsional di P5 (US-INV-09) |

## Keterlacakan ke cakupan demo wajib

| Kode | Butir demo wajib | Cerita |
|---|---|---|
| D1 | Investor lolos KYC dummy dan membeli token via Midtrans sandbox | US-PUB-05, US-PUB-08, US-INV-01, US-ADM-01, US-INV-02, US-INV-03 |
| D2 | Penghuni membayar sewa, status kamar menjadi lunas | US-PHN-01, US-PHN-02, US-PHN-03, US-PHN-07, US-PGL-01, US-PGL-03 |
| D3 | Pengelola mencatat biaya dan mengunggah nota (di-hash) | US-PGL-02 |
| D4 | Admin menutup periode dan menjalankan distribusi | US-ADM-02, US-ADM-03, US-ADM-08 |
| D5 | Portofolio investor bertambah; semua transaksi bisa dicek di Etherscan | US-INV-03, US-INV-06, US-INV-07, US-INV-08, US-PHN-07, US-PUB-04, US-ADM-03 |
| D6 | Halaman rekonsiliasi mencocokkan data Midtrans, basis data, dan blockchain | US-ADM-04, US-ADM-06, US-ADM-08 |

## Keterlacakan ke skenario uji

| Kode | Skenario uji (Tabel 4.3 proposal) | Cerita | Cara uji | Progress |
|---|---|---|---|---|
| S1 | Bayar sewa via VA berhasil: lunas, `recordRent` tercatat, tautan Etherscan muncul | US-PHN-02 | Manual di Midtrans sandbox dan test integrasi backend | P2, P3 |
| S2 | Bayar via QRIS berhasil, hasil sama dengan S1 | US-PHN-03 | Manual di Midtrans sandbox | P2, P3 |
| S3 | Pembayaran dibatalkan: tagihan tetap belum dibayar, tidak ada catatan on-chain | US-PHN-04 | Manual dan test integrasi backend | P2 |
| S4 | Kedaluwarsa (batas 5 menit): tetap belum dibayar, bisa dibuat ulang | US-PHN-05 | Manual dan test integrasi backend | P2 |
| S5 | Webhook dikirim dua kali: hanya satu pembayaran dan satu catatan on-chain | US-PHN-06, US-ADM-09 | Test integrasi backend dan test Hardhat | P2, P3, P4 |
| S6 | Signature palsu: ditolak, tidak ada perubahan | US-ADM-05 | Test integrasi backend | P2 |
| S7 | `gross_amount` tidak cocok: ditolak, dicatat sebagai anomali | US-ADM-06 | Test integrasi backend | P2 |
| S8 | Beli token melebihi sisa penawaran: ditolak sebelum pembayaran dibuat | US-INV-04 | Test integrasi backend dan uji halaman | P3 |
| S9 | Beli melebihi batas kepemilikan (memegang 1.500, memesan 500): ditolak, sisa kuota 300 token | US-INV-05 | Test integrasi backend dan uji halaman | P3 |
| S10 | Transfer membuat saldo penerima lebih dari 1.800 token: revert | US-INV-05 | Test Hardhat | P1 |
| S11 | Pemanggil tidak berwenang memanggil `recordRent`: revert | US-ADM-07 | Test Hardhat | P2 |
| S12 | Unit test `closePeriod`: nilai per token sesuai hitungan manual | US-ADM-02 | Test Hardhat dengan fixture hitungan manual | P3 |
