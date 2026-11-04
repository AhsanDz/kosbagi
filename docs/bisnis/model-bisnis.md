# Model Bisnis KosBagi

Status: draf P1, 29 Oktober 2026.

Dokumen ini merangkum BAB II proposal tugas akhir Kelompok 9 dan menjadi bahan bab model bisnis di business case (24 November 2026). Angka di bagian 8 adalah asumsi awal proposal. Angka itu akan diuji ulang di business case, tetapi aritmetikanya sudah dihitung ulang dan hasilnya dicantumkan di bagian 8.7.

## 1. Gambaran umum

KosBagi adalah platform tokenisasi hak manfaat ekonomi kos mahasiswa di sekitar Universitas Brawijaya, Malang. Hak atas pendapatan sewa sebuah kos dipecah menjadi token seharga Rp100.000. Penghuni membayar sewa lewat payment gateway, lalu setiap pembayaran dan pembagian hasil dicatat di smart contract. Dengan cara ini investor ritel bisa ikut menerima bagi hasil sewa dengan modal kecil dan memeriksa sendiri pendapatan yang menjadi dasar bagi hasilnya.

Objek yang ditokenisasi adalah **hak manfaat ekonomi atas satu properti tertentu**, yaitu sewa bersih dan hasil penjualan kos tersebut. Token KosBagi bukan saham perusahaan, sehingga model ini berbeda dari layanan urun dana (securities crowdfunding) yang menawarkan efek milik penerbit. Token juga bukan sertifikat tanah; sertifikat dipegang kustodian (bagian 2).

### Masalah yang dijawab

| Pihak | Masalah (proposal Tabel 1.1) | Yang ditawarkan KosBagi |
|---|---|---|
| Pemilik kos | Butuh modal untuk renovasi atau menambah kamar, sedangkan pilihan utamanya kredit bank dengan agunan | Dana dari penjualan 70% token tanpa utang bank; pemilik tetap memegang 30% token dan tetap mengelola kosnya |
| Calon investor ritel | Harga satu properti kos mencapai miliaran rupiah | Ikut menerima bagi hasil sewa mulai Rp100.000 per token |
| Investor di platform tokenisasi | Pendapatan dan biaya hanya dilaporkan pengelola secara berkala, sehingga sulit diverifikasi | Setiap pembayaran sewa tercatat di blockchain; biaya dicatat bersama hash notanya |
| Penghuni kos | Pembayaran tunai atau transfer manual tidak menghasilkan catatan yang rapi | Bayar lewat virtual account, QRIS, atau e-wallet, dengan kuitansi digital dan pengingat jatuh tempo |

### Posisi terhadap pesaing

Pesaing terdekat adalah GORO, platform tokenisasi manfaat properti sewaan yang sudah lulus regulatory sandbox OJK (Bisnis.com, 2026a). Menurut liputan KrASIA (2023), saat itu GORO belum memakai blockchain dan pendapatan sewanya dilaporkan lewat laporan pengelola yang umumnya mencakup periode enam bulan. Praktik ini mungkin sudah berubah sejak liputan itu terbit.

KosBagi membedakan diri dengan dua hal: fokus pada kos mahasiswa di kota kampus, dan setiap pembayaran sewa tercatat on-chain, bukan hanya dilaporkan berkala. Mamikos dan platform sejenis lebih tepat diposisikan sebagai calon mitra karena tidak melayani investor (proposal bagian 2.8; Mamikos, 2022). Analisis pesaing lengkap disusun di business case.

## 2. Struktur dua entitas

| Entitas | Peran |
|---|---|
| PT KosBagi Teknologi | Menjalankan platform: mengkurasi properti, menjalankan backend dan smart contract, menagih sewa, dan menghitung distribusi |
| PT KosBagi Properti | Kustodian yang memegang sertifikat properti atas nama pemegang token. Saldo bagi hasil investor disimpan di rekening penampungan milik kustodian (proposal bagian 3.3) |

Pemisahan ini mengikuti struktur GORO yang telah lulus regulatory sandbox OJK, dengan PT Teknologi Gotong Royong sebagai platform dan PT Properti Gotong Royong sebagai pemilik sekaligus kustodian properti (Bisnis.com, 2026a).

Perseroan tidak dapat memegang Hak Milik, sehingga sertifikat SHM perlu diturunkan menjadi HGB saat dialihkan ke kustodian. Biaya pengalihan hak ini dihitung di business case (lihat [peta regulasi](../regulasi/peta-regulasi.md)).

## 3. Struktur kepemilikan token

Setiap properti diterbitkan sebagai satu jenis token. Kos Sumbersari 01 diterbitkan sebagai token **KB-SMR01**.

```
Jumlah token = nilai properti ÷ harga token
             = Rp1.800.000.000 ÷ Rp100.000
             = 18.000 token
```

| Pemegang | Porsi | Token | Nilai @ Rp100.000 |
|---|---|---|---|
| Pemilik lama | 30% | 5.400 | Rp540.000.000 |
| Dijual ke investor | 70% | 12.600 | Rp1.260.000.000 |
| **Total** | **100%** | **18.000** | **Rp1.800.000.000** |

Pemilik lama menyerahkan sertifikat kepada kustodian, mempertahankan 30% token, dan menjual 70% sisanya kepada investor. Dana hasil penjualan, setelah dipotong fee penawaran 3%, menjadi modal pemilik untuk renovasi atau membangun kos baru. Kepemilikan 30% menjaga kepentingan pemilik tetap sejalan dengan kepentingan investor. Saat penerbitan, hash dokumen sertifikat dan laporan penilaian disimpan di blockchain sebagai bukti.

**Batas kepemilikan.** Setiap investor boleh memegang paling banyak 10% token satu properti, yaitu 1.800 token KB-SMR01 (Rp180.000.000). Akibatnya:

- porsi investor mana pun (paling banyak 1.800 token) tidak dapat melebihi porsi pemilik lama (5.400 token);
- keputusan besar seperti penjualan properti tidak dapat ditentukan oleh satu pemegang token saja;
- 12.600 token investor baru habis terjual bila ada paling sedikit 7 investor (12.600 ÷ 1.800 = 7).

Batas ini ditegakkan di smart contract `KosToken`: pengalihan ditolak bila saldo penerima menjadi lebih dari 10%, kecuali untuk dompet pemilik lama dan dompet perbendaharaan properti (tempat token yang belum terjual). Hanya alamat yang lolos KYC yang boleh menerima token.

**Penawaran gagal.** Jika target penjualan tidak tercapai hingga batas waktu, penawaran dibatalkan dan dana investor dikembalikan.

## 4. Pihak yang terlibat

Kolom "Peran" dan "Titik interaksi" diambil dari proposal Tabel 2.1. Kolom terakhir menjelaskan bentuknya di prototipe.

| Pihak | Peran | Titik interaksi | Di prototipe |
|---|---|---|---|
| Investor | Membeli token, menerima bagi hasil, dan ikut voting | Aplikasi investor, pembayaran virtual account atau QRIS | Peran login investor. Backend membuatkan dompet kustodian per investor, jadi investor tidak perlu memegang ETH |
| Pemilik properti | Menyerahkan properti, memegang 30% token, dan menerima dana penawaran | Kontrak penerbitan, dashboard pemilik | Halaman informasi dan form pengajuan kos (data dummy). Tidak ada peran login maupun dashboard pemilik |
| Pengelola | Mengurus kamar dan penghuni serta mencatat biaya operasional | Dashboard pengelola | Peran login pengelola: status kamar, catat biaya, unggah nota |
| Penghuni | Membayar sewa bulanan | Aplikasi penghuni, virtual account per kamar | Peran login penghuni: tagihan, bayar lewat Midtrans Snap, kuitansi |
| PT KosBagi Properti | Memegang sertifikat sebagai kustodian | Akta dan kontrak kustodian | Tidak dibangun sebagai peran aplikasi |
| Platform KosBagi | Mengkurasi properti, menjalankan backend dan smart contract, serta menghitung distribusi | Seluruh sistem | Peran login admin (persetujuan KYC, tutup periode, rekonsiliasi) dan satu dompet operator yang mengirim semua transaksi on-chain |
| Midtrans | Memproses pembayaran dan mengirim webhook | API Snap dan notifikasi HTTP | Midtrans sandbox |
| Ethereum Sepolia | Mencatat token, sewa, biaya, distribusi, dan voting | Smart contract | `KosToken`, `KosLedger`, dan `KosVoting` (opsional) di testnet Sepolia |

## 5. Alur bisnis

Alur bisnis KosBagi terdiri atas enam tahap, dari kurasi properti sampai keputusan penjualan (proposal bagian 2.4).

| No | Tahap | Yang terjadi | Di prototipe |
|---|---|---|---|
| 1 | Kurasi dan penerbitan | Platform menilai lokasi, okupansi historis, kondisi bangunan, dan legalitas sertifikat. Setelah penilaian independen, smart contract menerbitkan token sejumlah nilai properti dibagi Rp100.000, dan hash dokumen sertifikat serta laporan penilaian disimpan di blockchain | `KosToken` untuk KB-SMR01 dengan hash dokumen dummy. Penilaian dan proses hukum tidak disimulasikan |
| 2 | Penawaran | Investor membeli token lewat virtual account, QRIS, atau e-wallet. Token dipindahkan ke dompet investor setelah webhook pembayaran terverifikasi. Bila target tidak tercapai hingga batas waktu, penawaran dibatalkan dan dana dikembalikan | Pembelian dengan `order_id` berawalan `BUY-` di Midtrans sandbox; token dipindahkan dari dompet perbendaharaan ke dompet kustodian investor. Pembatalan penawaran dan pengembalian dana tidak termasuk cakupan demo wajib |
| 3 | Penagihan sewa | Setiap kamar memiliki virtual account. Pembayaran yang berhasil langsung dicatat ke smart contract beserta nomor kamar dan periode sewanya | Virtual account dibuat per tagihan bulanan, misalnya `RENT-SMR01-K03-2026-11`. `recordRent` mencatat `keccak256(order_id)` dan menolak referensi ganda; halaman menampilkan tautan Etherscan |
| 4 | Pencatatan biaya | Pengelola memasukkan biaya bulanan dan mengunggah nota. Hash nota disimpan di blockchain sehingga biaya yang sudah dicatat tidak dapat diubah diam-diam | `recordExpense` dengan hash nota |
| 5 | Distribusi bulanan | Sewa masuk dikurangi biaya operasional, fee platform, dan pajak, lalu bagian setiap token dicatat. Pencairan ke rekening investor disimulasikan lewat fitur disbursement di sandbox | Admin menutup periode; `closePeriod` menyimpan sewa bersih dan nilai per token. Bagi hasil masuk saldo akun investor. Disbursement sandbox bersifat opsional |
| 6 | Keputusan besar dan exit | Renovasi besar atau penjualan properti diputuskan lewat voting pemegang token yang tercatat on-chain. Hasil penjualan dibagi sesuai jumlah token | `KosVoting` bersifat opsional; penjualan properti tidak disimulasikan |

Aliran uang, token, dan data (disederhanakan dari Gambar 2.1 proposal):

```
 Penghuni                         Investor
 bayar sewa (RENT-...)            beli token (BUY-...)
      │                                │
      └───────────────┬────────────────┘
                      ▼
      Midtrans (virtual account, QRIS, e-wallet)
                      │  notifikasi webhook
                      ▼
      Backend KosBagi
      verifikasi signature, cek ulang status, catat di basis data
                      │  antrean tugas
                      ▼
      Dompet operator ──────────▶ Ethereum Sepolia
                                  KosLedger: sewa, biaya, tutup periode
                                  KosToken : token ke dompet kustodian investor

 Pengelola mencatat biaya + nota ──▶ backend ──▶ KosLedger (hash nota)
 Admin menutup periode ──▶ KosLedger menyimpan sewa bersih dan nilai per token
 Bagi hasil investor = nilai per token × saldo token, masuk saldo akun investor,
 dan dibayarkan dari rekening penampungan kustodian saat investor menarik dana
```

## 6. Business Model Canvas

Isi diambil dari proposal Tabel 2.5.

| Blok | Isi |
|---|---|
| Segmen pelanggan | Investor ritel muda (pekerja awal karier, alumni, dan mahasiswa tingkat akhir); pemilik kos di kota kampus yang membutuhkan modal; penghuni kos sebagai pengguna pembayaran |
| Proposisi nilai | Investor: ikut menerima bagi hasil sewa kos mulai Rp100.000 per token, dengan pendapatan yang terverifikasi per transaksi. Pemilik: memperoleh dana tanpa utang bank, tetap memegang 30% token, dan tetap mengelola kosnya. Penghuni: membayar lewat virtual account atau QRIS dengan kuitansi digital dan pengingat jatuh tempo |
| Saluran | Aplikasi web, media sosial dan komunitas investasi, paguyuban pemilik kos, serta jaringan kampus |
| Hubungan pelanggan | Dashboard okupansi dan pendapatan secara real-time, laporan bulanan otomatis, voting pemegang token, dan layanan pelanggan |
| Arus pendapatan | Fee penawaran 3% (dibayar pemilik properti), fee pengelolaan 5% dari sewa kotor, dan fee pasar sekunder 0,5% per transaksi (fase kedua) |
| Sumber daya utama | Backend dan smart contract, kemitraan payment gateway, tim kurasi properti dan legal, serta status peserta regulatory sandbox OJK |
| Aktivitas utama | Kurasi dan penilaian properti, penerbitan token, penagihan sewa, distribusi bagi hasil, serta KYC dan kepatuhan |
| Mitra utama | Midtrans, kantor jasa penilai publik, notaris/PPAT, pengelola kos lokal, penyedia node blockchain, serta konsultan pajak dan hukum |
| Struktur biaya | Pengembangan dan infrastruktur, biaya transaksi payment gateway, verifikasi KYC, notaris dan penilaian properti, audit smart contract, serta pemasaran |

Catatan istilah: proposal menulis "memiliki bagian kos" pada proposisi nilai investor. Di sini ditulis "ikut menerima bagi hasil" karena yang dijual adalah hak manfaat ekonomi, bukan kepemilikan atas bangunan.

## 7. Sumber pendapatan

| Sumber | Besaran | Dibayar oleh | Frekuensi | Kos Sumbersari 01 |
|---|---|---|---|---|
| Fee penawaran | 3% dari dana yang dihimpun | Pemilik properti, dipotong dari dana penawaran | Sekali per penawaran | 3% × Rp1.260.000.000 = Rp37.800.000 |
| Fee pengelolaan | 5% dari sewa kotor | Dipotong dari sewa sebelum dibagikan | Setiap bulan | 5% × Rp13.500.000 = Rp675.000 per bulan, atau Rp8.100.000 per tahun |
| Fee pasar sekunder | 0,5% per transaksi | Belum ditentukan | Fase kedua | Tidak dihitung; pasar sekunder tidak dibangun di prototipe |

Penghuni tidak dikenai biaya tambahan.

Bila Kos Sumbersari 01 dikelola setahun penuh setelah penawaran, pendapatan KosBagi pada tahun pertama Rp37.800.000 + Rp8.100.000 = Rp45.900.000, lalu Rp8.100.000 per tahun berikutnya selama sewa tidak berubah. Karena fee pengelolaan per properti relatif kecil, keberlanjutan bisnis bergantung pada jumlah properti yang dikelola. Target jumlah properti dan titik impasnya dihitung di business case.

## 8. Ilustrasi unit ekonomi Kos Sumbersari 01

### 8.1 Asumsi

| Asumsi | Nilai | Dasar |
|---|---|---|
| Jumlah kamar | 10 kamar eksklusif (AC, kamar mandi dalam, wifi) | Studi kasus dummy (proposal Tabel 2.6) |
| Sewa per kamar | Rp1.500.000 per bulan | Kos eksklusif di sekitar UB di atas Rp1.000.000 per bulan (Mamikos, 2026) |
| Okupansi rata-rata | 90% | Asumsi kelompok (proposal Tabel 2.6) |
| Nilai properti | Rp1,8 miliar (Rp180 juta per kamar) | Pembanding: kos 23 kamar dekat UB ditawarkan Rp4,5 miliar, sekitar Rp196 juta per kamar (Brighton Real Estate, 2026) |
| Jumlah token | 18.000 token @ Rp100.000 | Nilai properti ÷ harga token |
| Porsi pemilik lama | 30% (5.400 token) | Rancangan struktur token (proposal bagian 2.2) |
| Dana dari investor | Rp1,26 miliar (12.600 token) | 70% token × Rp100.000 |
| Biaya operasional | 20% dari sewa kotor (pengelola harian, listrik dan air area umum, internet, kebersihan, perawatan, dan PBB) | Asumsi kelompok (proposal Tabel 2.6) |
| Fee pengelolaan | 5% dari sewa kotor | Model pendapatan (proposal bagian 2.9) |
| Pajak | PPh badan 22% atas laba | Asumsi konservatif (proposal Tabel 2.6); alternatifnya di bagian 8.5 |

### 8.2 Perhitungan langkah demi langkah

Kolom per bulan adalah rata-rata dalam setahun. Okupansi 90% dari 10 kamar setara dengan 9 kamar terisi dan membayar setiap bulan.

| No | Langkah | Rumus | Per bulan | Per tahun |
|---|---|---|---|---|
| 1 | Sewa kotor | 10 kamar × Rp1.500.000 × 90% | Rp13.500.000 | Rp162.000.000 |
| 2 | Biaya operasional | 20% × (1) | Rp2.700.000 | Rp32.400.000 |
| 3 | Fee pengelolaan KosBagi | 5% × (1) | Rp675.000 | Rp8.100.000 |
| 4 | Laba sebelum pajak | (1) − (2) − (3) | Rp10.125.000 | Rp121.500.000 |
| 5 | PPh badan | 22% × (4) | Rp2.227.500 | Rp26.730.000 |
| 6 | Dibagikan ke pemegang token (sewa bersih) | (4) − (5) | Rp7.897.500 | Rp94.770.000 |
| 7 | Bagi hasil per token | (6) ÷ 18.000 token | Rp438,75 | Rp5.265 |
| 8 | Imbal hasil per tahun | (7, per tahun) ÷ Rp100.000 | | 5,265% |

Urutan potongan penting: biaya operasional dan fee dikurangkan lebih dulu, baru pajak dihitung dari sisanya. Urutan inilah yang menghasilkan angka Rp94,8 juta di proposal. Bila fee tidak dikurangkan sebelum pajak, hasilnya menjadi Rp92.988.000 per tahun.

PPh badan sebenarnya dihitung per tahun. Angka bulanan di tabel adalah 1/12 dari pajak tahunan. Karena semua potongan berupa persentase, hasil bulanan × 12 sama persis dengan hasil tahunan.

Pembagi di langkah 7 adalah **seluruh 18.000 token**, bukan hanya 12.600 token investor, karena 5.400 token pemilik lama juga menerima bagi hasil yang sama per token.

### 8.3 Rumus ringkas

```
Dibagikan = sewa kotor × (1 − 20% − 5%) × (1 − 22%)
          = sewa kotor × 75% × 78%
          = sewa kotor × 58,5%

Per token per bulan = Rp13.500.000 × 58,5% ÷ 18.000 = Rp438,75
```

Jadi dari setiap Rp100 sewa yang dibayar penghuni, Rp58,50 sampai ke pemegang token dalam skenario dasar.

### 8.4 Bagian setiap pemegang token

| Pemegang | Token | Per bulan | Per tahun |
|---|---|---|---|
| Investor dengan 100 token (Rp10.000.000) | 100 | Rp43.875 | Rp526.500 |
| Investor di batas maksimal 10% | 1.800 | Rp789.750 | Rp9.477.000 |
| Seluruh investor | 12.600 | Rp5.528.250 | Rp66.339.000 |
| Pemilik lama | 5.400 | Rp2.369.250 | Rp28.431.000 |
| **Total** | **18.000** | **Rp7.897.500** | **Rp94.770.000** |

Bagian pemilik lama dihitung dari nilai eksak 5.400 × Rp438,75. Bila memakai nilai per token yang sudah dibulatkan (5.400 × Rp439), hasilnya Rp2.370.600 per bulan, lebih besar Rp1.350. Selisih ini menunjukkan mengapa pembulatan sebaiknya dilakukan sekali di akhir perhitungan.

### 8.5 Sensitivitas pajak

Pajak adalah asumsi yang paling sensitif. Penghasilan rumah kos tidak dikenai PPh final sewa 10% karena rumah kos digolongkan sebagai jasa pemondokan, sehingga diperlakukan sebagai penghasilan usaha (Direktorat Jenderal Pajak, 2026). Proposal memakai PPh badan 22% sebagai skenario dasar yang konservatif. Jika kustodian memenuhi syarat tarif PPh final 0,5% dari omzet, hasilnya menjadi:

| Skenario pajak | Pajak per tahun | Dibagikan per tahun | Per token per bulan | Imbal hasil per tahun |
|---|---|---|---|---|
| PPh badan 22% atas laba (dasar) | 22% × Rp121.500.000 = Rp26.730.000 | Rp94.770.000 | Rp438,75 | 5,265% (±5,3%) |
| PPh final 0,5% dari omzet | 0,5% × Rp162.000.000 = Rp810.000 | Rp120.690.000 | Rp558,75 | 6,705% (±6,7%) |

Pada skenario PPh final, dibagikan = Rp162.000.000 − Rp32.400.000 − Rp8.100.000 − Rp810.000 = Rp120.690.000. Skema pajak yang tepat dikonfirmasi kepada konsultan pajak (proposal bagian 2.10), dan kemungkinan pajak kos daerah Kota Malang dimasukkan ke analisis sensitivitas business case (proposal bagian 3.3).

### 8.6 Pendapatan KosBagi dan dana yang diterima pemilik

| Pos | Rumus | Nilai |
|---|---|---|
| Dana penawaran dari investor | 12.600 × Rp100.000 | Rp1.260.000.000 |
| Fee penawaran KosBagi (sekali) | 3% × Rp1.260.000.000 | Rp37.800.000 |
| Dana yang diterima pemilik | Rp1.260.000.000 − Rp37.800.000 | Rp1.222.200.000 |
| Fee pengelolaan KosBagi per tahun | 5% × Rp162.000.000 | Rp8.100.000 |
| Bagi hasil pemilik dari 5.400 token per tahun | 5.400 × Rp5.265 | Rp28.431.000 |

### 8.7 Hasil cek ulang aritmetika

Semua angka dihitung ulang dengan pecahan eksak, tanpa pembulatan di tengah jalan, lalu dibandingkan dengan angka di proposal.

| Angka di proposal | Hasil hitung ulang | Keterangan |
|---|---|---|
| Sewa kotor Rp162 juta per tahun | Rp162.000.000 | Cocok |
| Fee pengelolaan ±Rp8,1 juta per tahun | Rp8.100.000 | Cocok |
| Dibagikan Rp94,8 juta per tahun | Rp94.770.000 | Cocok, dibulatkan ke 0,1 juta |
| ±Rp439 per token per bulan | Rp438,75 | Cocok, dibulatkan ke rupiah terdekat |
| ±5,3% per tahun | 5,265% | Cocok, dibulatkan ke 0,1% |
| 100 token ±Rp43.900 per bulan | Rp43.875 | Cocok, dibulatkan ke ratusan rupiah |
| PPh final 0,5%: imbal hasil ±6,7% per tahun | 6,705% | Cocok |
| Fee penawaran Rp37,8 juta | Rp37.800.000 | Cocok |

### 8.8 Catatan penerapan di prototipe

- Uang dihitung dalam bilangan bulat rupiah, bukan bilangan pecahan (float), supaya tidak ada selisih pembulatan tersembunyi.
- Pembulatan dilakukan sekali di akhir. Aturan pastinya (arah pembulatan, satuan nilai per token, dan pencatatan sisa) ditetapkan bersama fixture perhitungan manual pada P2, supaya hasil backend sama persis dengan kontrak `KosLedger`. Contoh dampaknya: bila nilai per token dibulatkan ke bawah menjadi Rp438, ada sisa Rp7.897.500 − 18.000 × Rp438 = Rp13.500 per bulan yang harus dicatat, misalnya dibawa ke periode berikutnya.
- Setiap periode, prototipe memakai angka nyata: sewa yang benar-benar lunas lewat Midtrans dan biaya yang dicatat pengelola beserta notanya, bukan persentase asumsi 20%.
- Bagian setiap pemegang = nilai per token × saldo token pada blok penutupan periode. Saldo ini dibaca dari checkpoint di `KosToken`.
- Bagi hasil diakumulasi di saldo akun investor dan baru dicairkan saat investor menarik dana, sehingga platform tidak perlu mentransfer dana ke ratusan rekening setiap bulan (proposal bagian 2.10).

### 8.9 Yang belum termasuk ilustrasi

Butir berikut dibahas di business case:

- kenaikan nilai properti (imbal hasil 5,3% belum memasukkannya);
- biaya penurunan SHM menjadi HGB, pajak pengalihan hak, dan BPHTB saat sertifikat dialihkan ke kustodian;
- kemungkinan pajak kos daerah Kota Malang;
- dana cadangan setara satu bulan sewa, salah satu mitigasi risiko okupansi (proposal Tabel 5.1);
- biaya transaksi payment gateway, yang di Business Model Canvas tercantum sebagai struktur biaya KosBagi; pihak yang menanggungnya per transaksi perlu ditegaskan;
- proyeksi 3 tahun, titik impas (BEP), NPV, dan target jumlah properti.

## 9. Sumber

- Proposal Tugas Akhir Kelompok 9 (2026), *KosBagi*, BAB II (bagian 2.1 sampai 2.10) dan Tabel 5.1. Mata kuliah Teknologi Blockchain dan Platform Keuangan Dijital, Fakultas Ilmu Komputer, Universitas Brawijaya.
- Bisnis.com (2026a) *OJK Setujui 29 Entitas Kripto, Empat Perusahaan Lulus Sandbox*. Tersedia di: https://market.bisnis.com/read/20260304/94/1957543/ojk-setujui-29-entitas-kripto-empat-perusahaan-lulus-sandbox (Diakses: 15 Oktober 2026).
- Brighton Real Estate (2026) *Rumah Kos + Toko Dekat Suhat, Rukos Eksklusif Dekat UB (Universitas Brawijaya)*. Tersedia di: https://www.brighton.co.id/cari-properti/view/lowokwaru-57 (Diakses: 15 Oktober 2026).
- Direktorat Jenderal Pajak (2026) *PPh atas Kontrakan Bukan Pajak Baru, Apa Bedanya dengan Rumah Kos?* Tersedia di: https://pajak.go.id/id/artikel/pph-atas-kontrakan-bukan-pajak-baru-apa-bedanya-dengan-rumah-kos (Diakses: 15 Oktober 2026).
- KrASIA (2023) *Unlocking Access to Real Estate: GORO's Tokenization of Rental Properties in Indonesia*. Tersedia di: https://kr-asia.com/unlocking-access-to-real-estate-goros-tokenization-of-rental-properties-in-indonesia (Diakses: 15 Oktober 2026).
- Mamikos (2022) *Pakai Aplikasi Mamikos, Pemilik Kos Tinggal Duduk Manis*. Tersedia di: https://mamikos.com/info/pakai-aplikasi-mamikos/ (Diakses: 15 Oktober 2026).
- Mamikos (2026) *Biaya Hidup Mahasiswa Kuliah di Unibraw*. Tersedia di: https://mamikos.com/info/biaya-hidup-mahasiswa-kuliah-di-unibraw/ (Diakses: 15 Oktober 2026).
