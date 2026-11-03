# User stories KosBagi

Dokumen ini memuat kebutuhan KosBagi dari sudut pandang setiap aktor. Setiap cerita punya kriteria penerimaan yang bisa diuji, prioritas, progress tempat fiturnya dibangun, serta kaitannya dengan enam butir cakupan demo wajib dan dua belas skenario uji di proposal.

Status: versi P1 (29 Okt 2026). Cerita dan kriterianya difinalkan di P4 bersama ERD.

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
| [US-INV-07](#us-inv-07-melihat-riwayat-dan-status-on-chain) | Melihat riwayat dan status on-chain | Wajib | P3, P4 | D5 | |
| [US-INV-08](#us-inv-08-melihat-ringkasan-investor) | Melihat ringkasan investor | Sebaiknya | P3, P4 | | |
| [US-INV-09](#us-inv-09-menarik-saldo-bagi-hasil) | Menarik saldo bagi hasil | Opsional | P5 | | |
| [US-INV-10](#us-inv-10-memberi-suara-on-chain) | Memberi suara on-chain | Opsional | P4, P5 | | |
| [US-PHN-01](#us-phn-01-melihat-tagihan-bulan-berjalan) | Melihat tagihan bulan berjalan | Wajib | P2 | D2 | |
| [US-PHN-02](#us-phn-02-membayar-sewa-lewat-virtual-account) | Membayar sewa lewat Virtual Account | Wajib | P2, P3 | D2 | S1 |
| [US-PHN-03](#us-phn-03-membayar-sewa-lewat-qris) | Membayar sewa lewat QRIS | Wajib | P2, P3 | D2 | S2 |
| [US-PHN-04](#us-phn-04-pembayaran-dibatalkan) | Pembayaran dibatalkan | Wajib | P2 | | S3 |
| [US-PHN-05](#us-phn-05-pembayaran-kedaluwarsa-lalu-bayar-ulang) | Pembayaran kedaluwarsa lalu bayar ulang | Wajib | P2 | | S4 |
| [US-PHN-06](#us-phn-06-pembayaran-tidak-tercatat-dua-kali) | Pembayaran tidak tercatat dua kali | Wajib | P2, P3 | | S5 |
| [US-PHN-07](#us-phn-07-melihat-kuitansi-dan-bukti-on-chain) | Melihat kuitansi dan bukti on-chain | Wajib | P3 | D2, D5 | |
| [US-PHN-08](#us-phn-08-mengetahui-status-bila-pencatatan-on-chain-gagal) | Mengetahui status bila pencatatan on-chain gagal | Sebaiknya | P3 | | |
| [US-PGL-01](#us-pgl-01-melihat-status-kamar-per-periode) | Melihat status kamar per periode | Wajib | P4 | D2 | |
| [US-PGL-02](#us-pgl-02-mencatat-biaya-dan-mengunggah-nota) | Mencatat biaya dan mengunggah nota | Wajib | P4 | D3 | |
| [US-ADM-01](#us-adm-01-menyetujui-atau-menolak-kyc) | Menyetujui atau menolak KYC | Wajib | P3 | D1 | |
| [US-ADM-02](#us-adm-02-menutup-periode) | Menutup periode | Wajib | P3, P4 | D4 | S12 |
| [US-ADM-03](#us-adm-03-menjalankan-distribusi-bagi-hasil) | Menjalankan distribusi bagi hasil | Wajib | P4 | D4, D5 | |
| [US-ADM-04](#us-adm-04-membuka-rekonsiliasi) | Membuka rekonsiliasi | Wajib | P4 | D6 | |
| [US-ADM-05](#us-adm-05-notifikasi-palsu-ditolak) | Notifikasi palsu ditolak | Wajib | P2 | | S6 |
| [US-ADM-06](#us-adm-06-nominal-tidak-cocok-dicatat-sebagai-anomali) | Nominal tidak cocok dicatat sebagai anomali | Wajib | P2, P4 | D6 | S7 |
| [US-ADM-07](#us-adm-07-hanya-pemegang-peran-yang-menulis-ke-kontrak) | Hanya pemegang peran yang menulis ke kontrak | Wajib | P1, P2 | | S11 |
| [US-ADM-08](#us-adm-08-melihat-ringkasan-admin) | Melihat ringkasan admin | Sebaiknya | P4 | | |

Jumlah: 41 cerita (30 wajib, 9 sebaiknya, 2 opsional).

## Pengunjung publik

### US-PUB-01 Memahami KosBagi dari beranda

> Sebagai pengunjung publik, saya ingin memahami cara kerja KosBagi dan contoh bagi hasilnya dari beranda, supaya saya tahu apa yang dibeli sebelum membuat akun.

Prioritas wajib, dibangun di P1, halaman `/`.

- *Isi beranda*
  - **Given** pengunjung membuka `/` tanpa masuk
  - **When** halaman selesai dimuat
  - **Then** tampil hero untuk investor, kartu kos unggulan Kos Sumbersari 01, bagian bukti on-chain (papan kamar dan kuitansi kamar K03), cara kerja, bagian "Dari sewa ke bagi hasil", ajakan untuk pemilik kos, serta risiko dan kanal pengaduan
  - **And** bagian "Dari sewa ke bagi hasil" menunjukkan contoh November 2026: sewa kotor Rp13.500.000 dari 9 kamar terisi, dikurangi biaya operasional 20%, fee pengelolaan 5%, dan PPh badan 22%, menjadi Rp7.897.500 yang dibagikan atau sekitar Rp439 per token per bulan, dengan keterangan bahwa angkanya dummy
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
  - **Given** status KYC investor "Belum mengajukan"
  - **When** investor membuka Penawaran
  - **Then** pembelian terkunci dan ada ajakan untuk melengkapi Verifikasi KYC
- *Mengajukan*
  - **Given** form KYC diisi data dummy
  - **When** investor mengirimnya
  - **Then** status berubah menjadi "Diajukan"
  - **And** form menegaskan larangan memakai KTP atau data pribadi asli
- *Disetujui*
  - **Given** admin menyetujui pengajuan ([US-ADM-01](#us-adm-01-menyetujui-atau-menolak-kyc))
  - **Then** status menjadi "Disetujui" dan alamat dompet kustodian investor tercatat lolos KYC di KosToken dengan tautan Etherscan
- *Ditolak*
  - **Given** admin menolak dengan alasan
  - **Then** investor melihat status "Ditolak" beserta alasannya dan bisa mengajukan ulang

### US-INV-02 Melihat penawaran dan sisa kuota

> Sebagai investor, saya ingin melihat sisa token yang ditawarkan dan sisa kuota pribadi saya, supaya saya tahu berapa token yang masih bisa dibeli.

Prioritas wajib, dibangun di P3, menu Penawaran (`/investor/penawaran`). Terkait demo D1.

- *Kuota awal*
  - **Given** investor lolos KYC dan belum memegang token
  - **When** membuka Penawaran
  - **Then** tampil "Sisa penawaran 8.240 token" dan "Sisa kuota kamu 1.800 token"
- *Hitungan langsung*
  - **When** investor mengisi 100 token
  - **Then** total pembayaran Rp10.000.000 dan "Estimasi bagi hasil ±Rp43.900 per bulan untuk 100 token" langsung tampil

### US-INV-03 Membeli token lewat Midtrans Snap

> Sebagai investor, saya ingin membayar token lewat Midtrans dan melihat token masuk ke portofolio, supaya pembelian saya selesai dan bisa dibuktikan.

Prioritas wajib, dibangun di P3, menu Penawaran. Terkait demo D1 dan D5.

- *Membayar*
  - **Given** jumlah token valid
  - **When** investor menekan tombol beli
  - **Then** popup Snap sandbox terbuka dengan nominal jumlah token × Rp100.000 dan `order_id` berawalan `BUY-`
- *Lunas lalu tercatat*
  - **When** investor menyelesaikan pembayaran di simulator sandbox
  - **Then** pembelian menjadi lunas hanya setelah webhook Midtrans terverifikasi, lalu status on-chain bergerak dari "Menunggu pencatatan" ke "Tercatat" dengan tautan Etherscan transaksi pemindahan token
  - **And** saldo token di portofolio bertambah sebanyak jumlah yang dibeli
- *Tidak jadi membayar*
  - **Given** investor menutup popup tanpa membayar
  - **Then** tidak ada token yang berpindah dan investor bisa memesan ulang

### US-INV-04 Pesanan melebihi sisa penawaran ditolak

> Sebagai investor, saya ingin langsung tahu bila pesanan saya melebihi sisa penawaran, supaya saya tidak membayar untuk token yang tidak tersedia.

Prioritas wajib, dibangun di P3, menu Penawaran. Skenario uji S8.

- *Melebihi sisa*
  - **Given** sisa penawaran 8.240 token
  - **When** investor memesan 9.000 token
  - **Then** pesanan ditolak sebelum transaksi Midtrans dibuat, field menampilkan "Melebihi sisa penawaran. Maksimal 8.240 token.", dan total pembayaran dicoret
- *Lewat API langsung*
  - **When** permintaan yang sama dikirim langsung ke API tanpa lewat halaman
  - **Then** backend tetap menolaknya dan tidak ada transaksi Midtrans yang dibuat

### US-INV-05 Pesanan melebihi batas kepemilikan 10% ditolak

> Sebagai investor, saya ingin pesanan yang membuat saya melewati batas 10% ditolak dengan sisa kuota yang jelas, supaya kepemilikan tetap tersebar dan saya tahu berapa yang masih boleh dibeli.

Prioritas wajib, lapis kontrak di P1 dan lapis backend serta halaman di P3, menu Penawaran. Skenario uji S9 dan S10.

- *Ditolak sebelum bayar (S9)*
  - **Given** investor memegang 1.500 token
  - **When** investor memesan 500 token
  - **Then** pesanan ditolak sebelum transaksi Midtrans dibuat dengan pesan "Melebihi batas kepemilikan 10%. Sisa kuota kamu 300 token."
- *Ditolak kontrak (S10)*
  - **Given** sebuah transfer akan membuat saldo penerima melebihi 1.800 token
  - **When** transfer itu dijalankan di KosToken
  - **Then** transaksi revert (dibuktikan dengan test Hardhat)

### US-INV-06 Melihat portofolio dan bagi hasil

> Sebagai investor, saya ingin melihat jumlah token dan bagi hasil yang saya terima tiap periode, supaya saya tahu hasil investasi saya.

Prioritas wajib, dibangun di P4, menu Portofolio (`/investor/portofolio`). Terkait demo D5.

- *Setelah distribusi*
  - **Given** admin sudah menutup periode November 2026 dan menjalankan distribusi
  - **When** investor membuka Portofolio
  - **Then** saldo bagi hasil bertambah sebesar jumlah token × nilai per token periode itu (contoh: 100 token × sekitar Rp439 = sekitar Rp43.900)
  - **And** setiap periode punya tautan Etherscan transaksi `closePeriod` sebagai bukti nilai per token
- *Saldo cocok dengan blockchain*
  - **Then** jumlah token di portofolio sama dengan saldo dompet kustodian investor di KosToken

### US-INV-07 Melihat riwayat dan status on-chain

> Sebagai investor, saya ingin melihat riwayat pembelian dan bagi hasil beserta status on-chain-nya, supaya setiap transaksi saya bisa dicek.

Prioritas wajib, pembelian di P3 dan distribusi di P4, bagian riwayat di menu Portofolio. Terkait demo D5.

- *Status tiap baris*
  - **Given** investor punya pembelian dan bagi hasil
  - **When** membuka riwayat
  - **Then** setiap baris menunjukkan tanggal, jenis, nominal, dan status on-chain: "Menunggu pencatatan", "Tercatat" (hash 6+4 dan tautan Etherscan), atau "Gagal dicatat"
- *Pembaruan status*
  - **Then** status "Menunggu pencatatan" berubah menjadi "Tercatat" setelah worker menyimpan tx hash, tanpa investor perlu keluar dan masuk lagi

### US-INV-08 Melihat ringkasan investor

> Sebagai investor, saya ingin satu halaman ringkasan, supaya kondisi investasi saya terlihat sekilas.

Prioritas sebaiknya, dibangun di P3 dan P4, menu Ringkasan (`/investor`).

- *Isi ringkasan*
  - **Given** investor masuk
  - **Then** Ringkasan menampilkan jumlah token, nilai token (jumlah × Rp100.000), bagi hasil periode terakhir, dan status KYC
- *Memuat dan gagal*
  - **Then** skeleton tampil saat data dimuat, dan bila gagal, pesan error menjelaskan penyebab dan cara memperbaikinya

### US-INV-09 Menarik saldo bagi hasil

> Sebagai investor, saya ingin menarik saldo bagi hasil, supaya hasilnya bisa saya pakai.

Prioritas opsional, dibangun di P5 bila waktu cukup (disbursement sandbox).

- *Penarikan dummy*
  - **Given** saldo bagi hasil lebih dari nol
  - **When** investor meminta penarikan ke rekening dummy
  - **Then** permintaan tercatat dan saldo berkurang, tanpa uang nyata dan tanpa nomor rekening asli

### US-INV-10 Memberi suara on-chain

> Sebagai investor, saya ingin memberi suara atas usulan pengelolaan kos, supaya pemegang token ikut menentukan keputusan penting.

Prioritas opsional, kontrak `KosVoting` di P4 dan halaman di P5 bila waktu cukup.

- *Bobot suara*
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

Prioritas wajib, dibangun di P3, dibuka dari baris tagihan. Terkait demo D2 dan D5.

- *Isi kuitansi*
  - **Given** tagihan sudah lunas dan tercatat
  - **When** penghuni membuka kuitansi
  - **Then** tampil properti KB-SMR01, kamar K03, periode 2026-11, nominal Rp1.500.000, waktu dan metode bayar, `order_id`, referensi `keccak256` yang disingkat, tx hash 6+4, nomor blok, cap TERCATAT, dan tautan "Lihat di Etherscan"
  - **And** kuitansi menyebut data yang tidak pernah dicatat on-chain: nama penghuni dan investor, nomor identitas, rekening, dan berkas nota
- *Belum tercatat*
  - **Given** pencatatan on-chain belum selesai
  - **Then** kuitansi menampilkan "Menunggu pencatatan on-chain" tanpa cap TERCATAT

### US-PHN-08 Mengetahui status bila pencatatan on-chain gagal

> Sebagai penghuni, saya ingin tahu bahwa pembayaran saya tetap sah walau pencatatan blockchain gagal, supaya saya tidak membayar dua kali.

Prioritas sebaiknya, dibangun di P3, menu Tagihan dan kuitansi.

- *Gagal dicatat*
  - **Given** worker gagal mencatat setelah semua percobaan otomatis
  - **Then** tagihan tetap "Lunas" dan status on-chain menunjukkan "Pencatatan on-chain gagal" dengan keterangan "Jaringan Sepolia tidak merespons. Pembayaranmu tetap lunas di sistem." serta tombol "Coba lagi"
- *Coba lagi*
  - **When** tombol "Coba lagi" ditekan
  - **Then** job yang sama masuk antrean lagi dan tidak menghasilkan catatan ganda

## Pengelola

### US-PGL-01 Melihat status kamar per periode

> Sebagai pengelola, saya ingin melihat status bayar setiap kamar dalam satu papan, supaya saya tahu kamar mana yang sudah lunas tanpa menagih satu per satu.

Prioritas wajib, dibangun di P4 dengan data tagihan dari P2, menu Status kamar (`/pengelola`). Terkait demo D2.

- *Papan kamar*
  - **Given** pengguna masuk sebagai Hadi Santoso dan periode berjalan November 2026
  - **When** membuka Status kamar
  - **Then** papan kamar K01 sampai K10 menunjukkan status setiap kamar: lunas dan tercatat (lime), belum dibayar, atau kosong
- *Setelah penghuni membayar*
  - **When** Sari melunasi tagihan K03 ([US-PHN-02](#us-phn-02-membayar-sewa-lewat-virtual-account))
  - **Then** ubin K03 berubah menjadi lunas setelah data dimuat ulang, dengan tautan Etherscan bila sudah tercatat

### US-PGL-02 Mencatat biaya dan mengunggah nota

> Sebagai pengelola, saya ingin mencatat biaya operasional beserta notanya, supaya pengurang bagi hasil bisa dipertanggungjawabkan.

Prioritas wajib, dibangun di P4, menu Biaya dan nota (`/pengelola/biaya`). Terkait demo D3.

- *Catat biaya*
  - **Given** periode November 2026 masih terbuka
  - **When** pengelola mengisi kategori, tanggal, nominal, dan keterangan biaya, lalu mengunggah nota berupa PDF atau gambar
  - **Then** biaya tersimpan, hash berkas nota dihitung, dan job `recordExpense` masuk antrean
  - **And** status on-chain biaya bergerak dari "Menunggu pencatatan" ke "Tercatat" dengan tautan Etherscan, sedangkan berkas notanya tetap di server KosBagi
- *Berkas tidak sesuai*
  - **Given** berkas bukan PDF atau gambar, atau ukurannya melebihi batas
  - **When** diunggah
  - **Then** unggahan ditolak dengan pesan yang menyebut jenis dan ukuran berkas yang diterima
- *Periode sudah ditutup*
  - **Given** periode November 2026 sudah ditutup
  - **Then** biaya baru untuk periode itu tidak bisa dicatat

## Admin

### US-ADM-01 Menyetujui atau menolak KYC

> Sebagai admin, saya ingin meninjau pengajuan KYC dummy, supaya hanya investor terverifikasi yang bisa menerima token.

Prioritas wajib, dibangun di P3, menu Verifikasi KYC (`/admin/kyc`). Terkait demo D1.

- *Menyetujui*
  - **Given** ada pengajuan berstatus "Diajukan"
  - **When** admin menekan Setujui dan mengonfirmasi
  - **Then** status investor menjadi "Disetujui", job whitelist masuk antrean, dan setelah worker memanggil `setKycStatus`, status on-chain-nya "Tercatat" dengan tautan Etherscan
- *Menolak*
  - **When** admin menolak pengajuan
  - **Then** admin wajib mengisi alasan, dan investor melihat status "Ditolak" beserta alasannya

### US-ADM-02 Menutup periode

> Sebagai admin, saya ingin menutup periode bulanan, supaya sewa bersih dan nilai per token periode itu tercatat permanen sebelum dibagikan.

Prioritas wajib, test kontrak di P3 dan halaman di P4, menu Tutup periode (`/admin/periode`). Terkait demo D4. Skenario uji S12.

- *Konfirmasi*
  - **Given** sewa dan biaya November 2026 sudah tercatat
  - **When** admin menekan Tutup periode
  - **Then** dialog konfirmasi menampilkan sewa kotor, biaya operasional, fee pengelolaan 5%, PPh, sewa bersih, dan nilai per token, serta peringatan bahwa penutupan tidak bisa dibatalkan
- *Tercatat*
  - **When** admin mengonfirmasi
  - **Then** job `closePeriod` masuk antrean, dan setelah tercatat, sewa bersih dan nilai per token tersimpan di KosLedger dengan tautan Etherscan
- *Sesuai hitungan manual (S12)*
  - **Then** nilai per token sama dengan perhitungan manual di fixture (contoh November 2026: Rp7.897.500 ÷ 18.000 token, sekitar Rp439 per token)
- *Masih ada yang menunggu*
  - **Given** masih ada pembayaran atau biaya periode itu yang berstatus "Menunggu pencatatan"
  - **Then** tombol Tutup periode belum aktif dan alasannya dijelaskan

### US-ADM-03 Menjalankan distribusi bagi hasil

> Sebagai admin, saya ingin menjalankan distribusi setelah periode ditutup, supaya setiap investor menerima bagian sesuai token yang dipegangnya.

Prioritas wajib, dibangun di P4, menu Tutup periode. Terkait demo D4 dan D5.

- *Distribusi*
  - **Given** periode sudah ditutup dan tercatat on-chain
  - **When** admin menjalankan distribusi
  - **Then** saldo bagi hasil setiap investor bertambah sebesar saldo tokennya pada blok penutupan × nilai per token
  - **And** hasil distribusi per investor tampil dan bisa dicocokkan dengan nilai per token di KosLedger
- *Tidak dua kali*
  - **When** admin mencoba menjalankan distribusi untuk periode yang sama lagi
  - **Then** permintaan ditolak dan saldo tidak bertambah dua kali

### US-ADM-04 Membuka rekonsiliasi

> Sebagai admin, saya ingin mencocokkan data Midtrans, basis data, dan blockchain, supaya selisih bisa ditemukan sebelum menutup periode.

Prioritas wajib, dibangun di P4 (halaman jalur 1, tautan menu jalur 4), menu Rekonsiliasi (`/admin/rekonsiliasi`). Terkait demo D6.

- *Membuka halaman*
  - **Given** admin berada di app shell
  - **When** memilih menu Rekonsiliasi
  - **Then** halaman `/admin/rekonsiliasi` terbuka
- *Hasil pencocokan*
  - **Then** setiap transaksi dicocokkan antara data Midtrans, basis data, dan blockchain, dan transaksi yang tidak cocok ditandai jelas (misalnya lunas di basis data tetapi belum tercatat on-chain)

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

Prioritas sebaiknya, dibangun di P4, menu Ringkasan (`/admin`).

- *Isi ringkasan*
  - **Given** admin masuk
  - **Then** Ringkasan menampilkan jumlah pengajuan KYC yang menunggu, jumlah tagihan lunas periode berjalan dari kamar terisi, dan transaksi yang belum tercatat on-chain

## Di luar cakupan prototipe

| Fitur | Keterangan |
|---|---|
| Pasar sekunder (jual beli token antarinvestor, fee 0,5%) | Fase kedua, tidak dibangun. Halaman risiko menyebut token belum bisa dijual kembali |
| Pembatalan penawaran dan pengembalian dana otomatis | Aturan bisnisnya dijelaskan di halaman risiko dan business case; prosesnya belum dijadwalkan di P1 sampai P5 |
| Banyak properti sekaligus | Opsional. Daftar kos hanya berisi Kos Sumbersari 01 |
| Dompet mandiri (investor memegang kunci sendiri) | Prototipe memakai dompet kustodian (lihat [arsitektur bagian 3](arsitektur.md#3-dompet-dan-token)) |
| KYC dengan dokumen asli | Hanya KYC dummy, sesuai aturan tugas |

## Keterlacakan ke cakupan demo wajib

| Kode | Butir demo wajib | Cerita |
|---|---|---|
| D1 | Investor lolos KYC dummy dan membeli token via Midtrans sandbox | US-PUB-05, US-PUB-08, US-INV-01, US-ADM-01, US-INV-02, US-INV-03 |
| D2 | Penghuni membayar sewa, status kamar menjadi lunas | US-PHN-01, US-PHN-02, US-PHN-03, US-PHN-07, US-PGL-01 |
| D3 | Pengelola mencatat biaya dan mengunggah nota (di-hash) | US-PGL-02 |
| D4 | Admin menutup periode dan menjalankan distribusi | US-ADM-02, US-ADM-03 |
| D5 | Portofolio investor bertambah; semua transaksi bisa dicek di Etherscan | US-INV-03, US-INV-06, US-INV-07, US-PHN-07, US-PUB-04, US-ADM-03 |
| D6 | Halaman rekonsiliasi mencocokkan data Midtrans, basis data, dan blockchain | US-ADM-04, US-ADM-06 |

## Keterlacakan ke skenario uji

| Kode | Skenario uji (Tabel 4.3 proposal) | Cerita | Cara uji | Progress |
|---|---|---|---|---|
| S1 | Bayar sewa via VA berhasil: lunas, `recordRent` tercatat, tautan Etherscan muncul | US-PHN-02 | Manual di Midtrans sandbox dan test integrasi backend | P2, P3 |
| S2 | Bayar via QRIS berhasil, hasil sama dengan S1 | US-PHN-03 | Manual di Midtrans sandbox | P2, P3 |
| S3 | Pembayaran dibatalkan: tagihan tetap belum dibayar, tidak ada catatan on-chain | US-PHN-04 | Manual dan test integrasi backend | P2 |
| S4 | Kedaluwarsa (batas 5 menit): tetap belum dibayar, bisa dibuat ulang | US-PHN-05 | Manual dan test integrasi backend | P2 |
| S5 | Webhook dikirim dua kali: hanya satu pembayaran dan satu catatan on-chain | US-PHN-06 | Test integrasi backend dan test Hardhat | P2, P3 |
| S6 | Signature palsu: ditolak, tidak ada perubahan | US-ADM-05 | Test integrasi backend | P2 |
| S7 | `gross_amount` tidak cocok: ditolak, dicatat sebagai anomali | US-ADM-06 | Test integrasi backend | P2 |
| S8 | Beli token melebihi sisa penawaran: ditolak sebelum pembayaran dibuat | US-INV-04 | Test integrasi backend dan uji halaman | P3 |
| S9 | Beli melebihi batas kepemilikan (memegang 1.500, memesan 500): ditolak, sisa kuota 300 token | US-INV-05 | Test integrasi backend dan uji halaman | P3 |
| S10 | Transfer membuat saldo penerima lebih dari 1.800 token: revert | US-INV-05 | Test Hardhat | P1 |
| S11 | Pemanggil tidak berwenang memanggil `recordRent`: revert | US-ADM-07 | Test Hardhat | P2 |
| S12 | Unit test `closePeriod`: nilai per token sesuai hitungan manual | US-ADM-02 | Test Hardhat dengan fixture hitungan manual | P3 |
