# Business Case KosBagi

Status: versi lengkap P4, 19 November 2026. Menggantikan kerangka P2 dan P3. Dikumpulkan sebagai PDF di forum Brone paling lambat 24 November 2026. Bobot penilaian 25%, dengan indikator pasar, proyeksi keuangan, risiko, dan kepatuhan.

Urutan bab mengikuti bagian "Isi Business Case" di ketentuan tugas. Angka di dokumen ini bersumber dari dokumen lain di folder `docs/bisnis/` dan `docs/regulasi/`, yang memuat rumus dan sumber lengkapnya. Butir yang belum punya sumber atau masih asumsi kelompok ditandai **[perlu verifikasi]**. Tim tidak melakukan wawancara atau survei, jadi semua data pasar berasal dari sumber sekunder.

| No | Bab | Bahan rinci |
|---|---|---|
| 1 | Ringkasan eksekutif | Bab 2 sampai 10 |
| 2 | Masalah dan segmen pengguna | [Model bisnis](model-bisnis.md) bagian 1 |
| 3 | Pasar (TAM, SAM, SOM) dan pesaing | Bab ini |
| 4 | Proposisi nilai dan Business Model Canvas | [Model bisnis](model-bisnis.md) bagian 1, 2, 3, 6 |
| 5 | Peta regulasi dan perizinan | [Peta regulasi](../regulasi/peta-regulasi.md) |
| 6 | Model pendapatan | [Model bisnis](model-bisnis.md) bagian 7, [perhitungan distribusi](perhitungan-distribusi.md) |
| 7 | Proyeksi 3 tahun: unit economics, BEP, NPV | [Proyeksi keuangan](proyeksi-keuangan.md), [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) |
| 8 | Manajemen risiko | Bab ini |
| 9 | KYC/AML dan perlindungan data | Bab ini, [peta regulasi](../regulasi/peta-regulasi.md) |
| 10 | Arsitektur sistem, roadmap, dan KPI | Bab ini, `docs/desain/`, [rancangan kontrak](../kontrak/rancangan-kontrak.md) |

## 1. Ringkasan eksekutif

**Masalah.** Kos mahasiswa di Malang memberi pendapatan sewa yang relatif stabil, tetapi satu properti bernilai miliaran rupiah sehingga hanya terjangkau segelintir orang. Pemilik kos yang butuh modal renovasi atau ekspansi umumnya bergantung pada kredit bank beragunan. Di platform tokenisasi properti yang sudah ada, investor menerima laporan pengelola secara berkala dan sulit memeriksa angka yang menjadi dasar bagi hasil.

**Solusi.** KosBagi menokenisasi hak manfaat ekonomi satu kos mahasiswa. Investor membeli token mulai Rp100.000 dan menerima bagi hasil sewa bulanan. Penghuni membayar sewa lewat payment gateway, dan setiap pembayaran yang terverifikasi otomatis dicatat ke smart contract, begitu juga biaya beserta hash notanya serta penutupan periode. Yang dijual adalah hak manfaat ekonomi atas satu aset tertentu, bukan efek perusahaan, sehingga KosBagi tidak berbentuk securities crowdfunding.

**Studi kasus.** Kos Sumbersari 01: 10 kamar eksklusif @ Rp1.500.000, okupansi 90%, nilai Rp1,8 miliar, diterbitkan sebagai 18.000 token KB-SMR01. Pemilik lama memegang 30% (5.400 token) dan 70% (12.600 token, Rp1,26 miliar) dijual ke investor, dengan batas 10% (1.800 token) per investor.

**Pasar.** Lebih dari 330 ribu mahasiswa di Malang (TIMES Indonesia, 2022). Dengan asumsi kelompok yang dijelaskan di bab 3, pasar terlayani (kos eksklusif di Malang) diperkirakan sekitar 33.000 kamar senilai Rp5,9 triliun, dan target tiga tahun 15 properti hanya 0,45% dari kamar itu **[perlu verifikasi]**.

**Model pendapatan.** Fee penawaran 3% (Rp37,8 juta sekali per properti, dibayar pemilik), fee pengelolaan 5% dari sewa kotor (Rp8,1 juta per properti per tahun), dan fee pasar sekunder 0,5% di fase kedua. Penghuni tidak dikenai biaya tambahan.

**Angka utama.** Investor menerima Rp438,75 per token per bulan, atau imbal hasil 5,265% per tahun dengan asumsi PPh badan 22% (6,0% dengan fasilitas Pasal 31E, 6,7% dengan PPh final 0,5% omzet, keduanya **[perlu verifikasi]**). Pada skenario dasar 2, 5, dan 8 properti baru seukuran Kos Sumbersari 01, KosBagi masih rugi di tahun 3 (−Rp130,0 juta), NPV 3 tahun −Rp584,0 juta, dan butuh pendanaan Rp754,3 juta. BEP operasional tercapai pada 59 properti 10 kamar atau 26 properti 20 kamar. Ukuran properti adalah pengungkit terbesar: dengan kos 20 kamar, tahun 3 sudah laba Rp224,4 juta.

**Risiko utama.** Skala platform yang belum menutup biaya tetap, imbal hasil yang lebih rendah dari SUN 10 tahun (7,66%), pembayaran sewa di luar platform, aturan tokenisasi yang belum final, dan likuiditas token. Mitigasinya di bab 8.

**Status prototipe.** Keenam butir demo wajib dibangun: KYC dummy dan pembelian token lewat Midtrans sandbox, pembayaran sewa yang tercatat di `KosLedger`, pencatatan biaya dengan hash nota, penutupan periode dan distribusi, portofolio investor, serta halaman rekonsiliasi Midtrans, basis data, dan blockchain. Semua alur diuji di jaringan Hardhat lokal; deploy ke Ethereum Sepolia dijalankan koordinator setelah kunci testnet siap **(diperbarui setelah deploy Sepolia)**.

## 2. Masalah dan segmen pengguna

### Masalah

| Pihak | Masalah | Dampak | Jawaban KosBagi |
|---|---|---|---|
| Pemilik kos | Butuh modal renovasi atau menambah kamar, pilihan utamanya kredit bank beragunan | Rencana pengembangan tertunda, nilai properti tidak bisa dicairkan sebagian | Dana dari penjualan 70% token tanpa utang bank; tetap memegang 30% token dan tetap mengelola kos |
| Calon investor ritel | Harga satu kos mencapai miliaran rupiah; pembanding Rp4,5 miliar untuk 23 kamar (Brighton Real Estate, 2026) | Tidak punya akses ke pendapatan sewa properti | Ikut menerima bagi hasil mulai Rp100.000 per token |
| Investor di platform tokenisasi | Pendapatan dan biaya dilaporkan pengelola secara berkala, umumnya per enam bulan (KrASIA, 2023) | Sulit memverifikasi angka dasar bagi hasil | Setiap pembayaran sewa tercatat on-chain; biaya dicatat bersama hash notanya |
| Penghuni | Bayar tunai atau transfer manual tanpa catatan rapi | Riwayat dan kuitansi rawan hilang atau salah catat | Virtual account, QRIS, atau e-wallet dengan kuitansi digital dan pengingat jatuh tempo |

Sumber: proposal Tabel 1.1 dan [model bisnis](model-bisnis.md) bagian 1.

### Segmen sasaran

| Segmen | Profil | Kebutuhan utama | Ukuran dari data sekunder |
|---|---|---|---|
| Investor ritel | 20 sampai 35 tahun, sudah punya akun saham, reksa dana, atau aset kripto, modal Rp100 ribu sampai Rp10 juta | Pendapatan pasif dari aset riil yang angkanya bisa diperiksa sendiri | 30,30 juta SID pasar modal per 7 Agustus 2026 (Bisnis.com, 2026b) dan 20,7 juta konsumen aset kripto awal 2026 (Investortrust, 2026). Irisan dengan rentang usia dan modal sasaran belum ada datanya **[perlu verifikasi]** |
| Pemilik kos | Kos 10 sampai 30 kamar di sekitar kampus | Modal tanpa utang, tetap mengelola kos | Jumlah kos terdaftar di Malang belum diperoleh dari data pemerintah daerah atau platform listing **[perlu verifikasi]** |
| Penghuni | Mahasiswa penyewa kos bulanan | Cara bayar mudah dan kuitansi | Lebih dari 330 ribu mahasiswa di Malang, sekitar 90 ribu di UB (TIMES Indonesia, 2022) |

Segmen investor dan pemilik kos adalah pelanggan yang membayar atau menghasilkan pendapatan bagi KosBagi. Penghuni adalah pengguna pembayaran: tanpa mereka tidak ada sewa yang tercatat, tetapi mereka tidak dikenai biaya.

## 3. Pasar dan pesaing

### TAM, SAM, dan SOM

Proposal bagian 2.7 mendefinisikan TAM sebagai nilai properti kos di kota-kota kampus besar, SAM sebagai kos eksklusif 10 sampai 30 kamar di Malang, dan SOM sebagai properti yang realistis dikelola dalam tiga tahun. Data jumlah kos di Malang belum ditemukan, jadi perkiraan di bawah memakai pendekatan dari atas (top-down) berbasis jumlah mahasiswa, dengan dua asumsi kelompok yang ditandai.

| Lapisan | Rumus | Hasil | Dasar |
|---|---|---|---|
| TAM lokal (Malang) | 330.000 mahasiswa × 50% tinggal di kos × Rp180 juta per kamar | 165.000 kamar, nilai properti Rp29,7 triliun | Jumlah mahasiswa: TIMES Indonesia (2022). Porsi 50% tinggal di kos: asumsi kelompok **[perlu verifikasi]**. Nilai per kamar: [laporan penilaian dummy](dokumen-penerbitan/laporan-penilaian.md), di bawah pembanding Rp196 juta per kamar (Brighton Real Estate, 2026) |
| TAM nasional | Jumlah kamar kos di kota kampus besar × nilai per kamar | Belum dihitung | Data jumlah kos per kota belum ada **[perlu verifikasi]** |
| SAM | 165.000 kamar × 20% kamar eksklusif di kos 10 sampai 30 kamar | 33.000 kamar, nilai Rp5,94 triliun; 70% yang bisa ditawarkan Rp4,16 triliun; sewa kotor Rp534,6 miliar per tahun (Rp1,5 juta × 12 × okupansi 90%) | Porsi 20%: asumsi kelompok **[perlu verifikasi]**. Sewa eksklusif di atas Rp1 juta per bulan (Mamikos, 2026) |
| SOM, skenario dasar | 15 properti aktif di akhir tahun 3 × 10 kamar | 150 kamar (0,45% kamar SAM), dana dihimpun Rp18,9 miliar, sewa kotor dikelola Rp2,43 miliar per tahun | [Proyeksi keuangan](proyeksi-keuangan.md) bagian 4 |
| SOM, strategi kos 20 kamar | 19 properti aktif di akhir tahun 3 × 20 kamar | 380 kamar (1,15% kamar SAM) | Kombinasi NPV ≥ 0 di [proyeksi keuangan](proyeksi-keuangan.md) bagian 5 |

Dua asumsi kelompok di atas paling berpengaruh. Bila porsi mahasiswa yang tinggal di kos hanya 30% dan porsi kamar eksklusif hanya 10%, SAM menjadi 9.900 kamar dan SOM skenario dasar menjadi 1,5% dari SAM. Target tiga tahun tetap kecil dibanding pasar di kedua kasus, jadi hambatan KosBagi bukan ukuran pasar, melainkan kecepatan akuisisi properti dan kepercayaan investor. Tugas sebelum naskah final: mencari jumlah kos terdaftar di Kota Malang dari data pemerintah daerah atau platform listing untuk menggantikan kedua asumsi itu **[perlu verifikasi]**.

### Pesaing

| Pemain | Model | Irisan dengan KosBagi | Posisi KosBagi |
|---|---|---|---|
| GORO (KrASIA, 2023; Bisnis.com, 2026a) | Tokenisasi manfaat properti sewaan, token Rp10.000, ada pasar sekunder, lulus regulatory sandbox OJK | Paling dekat: investor ritel di properti sewaan | Khusus kos mahasiswa; pendapatan tercatat per pembayaran di blockchain, bukan laporan pengelola per enam bulan. Fakta GORO bersumber dari 2023 dan bisa sudah berubah **[perlu verifikasi]** |
| Mamikos, SinggahSini, dan APIK (Mamikos, 2022) | Marketplace kos dengan pembayaran online dan layanan pengelolaan | Sisi penghuni dan pengelolaan kos | Tidak melayani investor; calon mitra listing atau pengelola |
| Bizhare dan urun dana lain (Kontan, 2026a) | Penawaran saham atau sukuk usaha lewat securities crowdfunding | Investor ritel yang mencari imbal hasil sektor riil | Menawarkan hak manfaat atas satu aset tertentu, bukan efek perusahaan |
| Tokenisasi emas, mis. Blocktogo atau GIDR (Bisnis.com, 2026a) | Tokenisasi emas, lulus sandbox OJK | Investor aset riil berbentuk token | Aset berbeda; menjadi preseden bahwa tokenisasi aset riil diterima regulator |
| Investasi properti konvensional | Membeli kos sendiri atau reksa dana properti | Investor properti | Modal kecil, dan investor memilih sendiri properti spesifiknya |

Sumber pemetaan: proposal Tabel 2.2 dan 2.4.

Keunggulan KosBagi yang sulit ditiru cepat adalah jalur data dari pembayaran penghuni sampai catatan on-chain: setiap sewa yang lunas lewat Midtrans tercatat di `KosLedger` dengan referensi `keccak256(order_id)`, dan halaman rekonsiliasi mencocokkan ketiga sumber per transaksi. Kelemahannya adalah skala: GORO sudah punya izin sandbox, pasar sekunder, dan basis investor, sedangkan KosBagi baru punya satu properti percontohan.

## 4. Proposisi nilai dan Business Model Canvas

### Proposisi nilai

| Pihak | Nilai yang diterima |
|---|---|
| Investor | Ikut menerima bagi hasil sewa kos mulai Rp100.000 per token; setiap pembayaran sewa, biaya, dan penutupan periode bisa dicek di Etherscan; status setiap kamar terlihat |
| Pemilik kos | Dana Rp1,22 miliar dari penjualan 70% token setelah fee 3% (Rp1,07 miliar setelah biaya peralihan hak sekitar Rp153 juta, keputusan 15 November 2026), tanpa utang bank; tetap memegang 30% token dan mengelola kos. Bagian bagi hasil dari token yang belum terjual juga masuk ke pemilik lama (keputusan 16 November 2026) |
| Penghuni | Bayar sewa lewat virtual account, QRIS, atau e-wallet tanpa biaya tambahan, dengan kuitansi digital dan catatan on-chain yang tidak bisa diubah |

Yang dijual adalah hak manfaat ekonomi, jadi naskah memakai frasa "ikut menerima bagi hasil", bukan "memiliki bagian kos".

### Business Model Canvas

| Blok | Isi |
|---|---|
| Segmen pelanggan | Investor ritel muda; pemilik kos di kota kampus yang butuh modal; penghuni kos sebagai pengguna pembayaran |
| Proposisi nilai | Lihat tabel di atas |
| Saluran | Aplikasi web, media sosial dan komunitas investasi, paguyuban pemilik kos, jaringan kampus |
| Hubungan pelanggan | Dashboard okupansi dan pendapatan real-time, laporan bulanan otomatis, voting pemegang token (pengembangan lanjutan), layanan pelanggan |
| Arus pendapatan | Fee penawaran 3% (pemilik), fee pengelolaan 5% dari sewa kotor, fee pasar sekunder 0,5% (fase kedua) |
| Sumber daya utama | Backend dan smart contract, kemitraan payment gateway, tim kurasi properti dan legal, status peserta sandbox OJK |
| Aktivitas utama | Kurasi dan penilaian properti, penerbitan token, penagihan sewa, distribusi bagi hasil, KYC dan kepatuhan, rekonsiliasi |
| Mitra utama | Midtrans, KJPP, notaris/PPAT, pengelola kos lokal, penyedia node blockchain, konsultan pajak dan hukum |
| Struktur biaya | Pengembangan dan infrastruktur, biaya transaksi payment gateway, verifikasi KYC, notaris dan penilaian, audit smart contract, pemasaran |

Sumber: proposal Tabel 2.5 dan [model bisnis](model-bisnis.md) bagian 6.

### Alasan bisnis memakai blockchain

Proposal bagian 2.5 menyebut empat manfaat smart contract (Buterin, 2014): catatan sewa, biaya, dan distribusi yang sama untuk semua pihak dan tidak bisa diubah sepihak; daftar pemilik token yang sah; rumus bagi hasil yang tertulis di kode; dan hasil voting yang bisa diaudit. Di prototipe, tiga manfaat pertama sudah berjalan:

- `KosLedger.recordRent` mencatat setiap sewa lunas dan menolak referensi pembayaran ganda; `recordExpense` mencatat biaya bersama hash notanya dan menolak nota yang sama dua kali.
- `KosToken` adalah daftar pemilik, hanya menerima alamat lolos KYC, dan menolak saldo di atas 10%.
- `closePeriod` menghitung fee, pajak, sewa bersih, dan nilai per token dengan rumus yang sama dengan kalkulator backend dan dokumen [perhitungan distribusi](perhitungan-distribusi.md).

Batasnya: blockchain hanya menjamin catatan yang sudah masuk. Pembayaran tunai di luar platform dan keaslian isi nota tetap butuh kontrol lain, yaitu kewajiban membayar lewat virtual account di kontrak sewa, audit berkala, dan kontrak kinerja pengelola (bab 8).

## 5. Peta regulasi dan perizinan

Rincian dan sumber tiap baris ada di [peta regulasi](../regulasi/peta-regulasi.md).

| Area | Regulator dan dasar hukum | Implikasi | Status bagi KosBagi |
|---|---|---|---|
| Kerangka umum | UU 4/2023 (P2SK) | Inovasi teknologi sektor keuangan dan aset keuangan digital diawasi OJK | Model dirancang untuk diawasi OJK |
| Tokenisasi dan penawaran | POJK 27/2024, diubah POJK 23/2025 **[perlu verifikasi]**; rancangan POJK penawaran aset ditokenisasi (RCTI+, 2026) | Penawaran token ke publik kemungkinan butuh izin | Menunggu POJK penawaran aset ditokenisasi terbit **[perlu verifikasi]** |
| Uji coba terbatas | POJK 3/2024 (regulatory sandbox) | Model baru diuji sebelum izin | Jalur awal yang dipilih: sandbox dengan satu properti percontohan |
| Pasar sekunder | POJK 23/2025 **[perlu verifikasi]** | Perdagangan wajib lewat pihak berizin dan aset tercantum di daftar bursa | Fase kedua, bersama pedagang berizin |
| Pembayaran | PBI 22/23/PBI/2020; PADG 24/1/PADG/2022 (QRIS) | KosBagi menjadi merchant penyedia jasa pembayaran berizin; QRIS maksimal Rp10 juta per transaksi **[perlu verifikasi: versi terkini]** | Midtrans; pembelian di atas 100 token hanya ditawari virtual account |
| APU-PPT dan KYC | POJK 8/2023 | Identitas investor diverifikasi sebelum membeli, transaksi mencurigakan dipantau | Bab 9 |
| Pelindungan konsumen | POJK 22/2023 | Risiko dan biaya diungkapkan, ada kanal pengaduan | Tab Risiko di halaman kos dan grafik potongan sewa di beranda |
| Data pribadi | UU 27/2022 | Data investor dan penghuni adalah data pribadi; blockchain publik tidak bisa dihapus | Tidak ada data pribadi on-chain (bab 9) |
| Pajak usaha kos | PP 34/2017; PP 20/2026 **[perlu verifikasi]** | Kos bukan objek PPh final sewa 10%, diperlakukan sebagai penghasilan usaha | Skenario dasar PPh badan 22%; Pasal 31E dan PPh final 0,5% di sensitivitas |
| Pajak daerah kos | UU 1/2022 | Pajak kos daerah dihapus, tetapi Pemkot Malang berupaya memberlakukannya kembali | Dipantau **[perlu verifikasi]** |
| Pajak transaksi token | PMK 50/2025 | Perlakuan pajak token aset riil belum jelas | **[perlu verifikasi]** |
| Pertanahan | UU 5/1960 | Perseroan tidak bisa memegang Hak Milik; SHM diturunkan menjadi HGB atas nama kustodian | Biaya sekitar Rp153 juta per properti Rp1,8 miliar, ditanggung pemilik lama ([proyeksi](proyeksi-keuangan.md) bagian 7) **[perlu verifikasi]** |
| Urun dana dan P2P | POJK 57/2020 jo. 16/2021; POJK 40/2024 | KosBagi menawarkan hak manfaat satu aset, bukan efek perusahaan, dan tidak menyalurkan pinjaman | Tidak berlaku, dengan catatan penggolongan akhir bergantung pada POJK aset ditokenisasi |

### Perizinan dan struktur

1. **Dua entitas.** PT KosBagi Teknologi menjalankan platform; PT KosBagi Properti menjadi kustodian sertifikat dan pemegang rekening penampungan bagi hasil, mengikuti struktur GORO yang lulus sandbox (Bisnis.com, 2026a).
2. **Sandbox OJK.** Mendaftar sebagai peserta regulatory sandbox dengan Kos Sumbersari 01 sebagai properti percontohan, sambil menunggu POJK penawaran aset ditokenisasi.
3. **Mitra berizin.** Pembayaran lewat penyedia jasa pembayaran berizin; pasar sekunder nanti lewat bursa atau pedagang aset keuangan digital berizin.
4. **Pajak dan legal properti.** Skema pajak kustodian dan biaya peralihan hak dikonfirmasi ke konsultan pajak dan notaris sebelum penerbitan pertama.

Daftar cek verifikasi ada di [peta regulasi](../regulasi/peta-regulasi.md) bagian 6 dan harus selesai sebelum naskah PDF dikumpulkan.

## 6. Model pendapatan

| Sumber | Besaran | Dibayar oleh | Kos Sumbersari 01 |
|---|---|---|---|
| Fee penawaran | 3% dari dana dihimpun, sekali | Pemilik, dipotong dari dana penawaran | Rp37.800.000 |
| Fee pengelolaan | 5% dari sewa kotor per bulan | Dipotong dari sewa sebelum pajak | Rp675.000 per bulan, Rp8.100.000 per tahun |
| Fee pasar sekunder | 0,5% per transaksi | Belum ditentukan | Fase kedua, tidak dihitung |

Biaya transaksi payment gateway ditanggung PT KosBagi Teknologi dan tidak dibebankan kepada penghuni. Dengan virtual account Rp4.000 per transaksi sebelum PPN (Midtrans, 2026), biaya ini sekitar 6% dari fee pengelolaan per kamar per bulan. Aturan ini juga tertulis di [perjanjian pengelolaan dummy](dokumen-penerbitan/perjanjian-pengelolaan.md) Pasal 3.

### Arus uang satu periode

Contoh November 2026 di demo prototipe, dengan sembilan kamar lunas dan biaya dari nota senilai Rp2.700.000 ([perhitungan distribusi](perhitungan-distribusi.md) bagian 6):

| Pos | Nominal | Penerima |
|---|---|---|
| Sewa kotor | Rp13.500.000 | Rekening penampungan kustodian |
| Biaya operasional (nota) | Rp2.700.000 | Pengelola dan pemasok |
| Fee pengelolaan 5% | Rp675.000 | PT KosBagi Teknologi |
| PPh 22% atas laba Rp10.125.000 | Rp2.227.500 | Negara |
| Sewa bersih dibagikan | Rp7.897.500 | Pemegang token, Rp438,75 per token |
| Bagian investor (4.460 token) | Rp1.956.825 | Saldo akun lima investor |
| Bagian pemilik lama (5.400 token) | Rp2.369.250 | Saldo pemilik lama |
| Bagian perbendaharaan (8.140 token belum terjual) | Rp3.571.425 | Ditambahkan ke saldo pemilik lama |

Bagian perbendaharaan ditambahkan ke pemilik lama karena hak manfaat token yang belum terjual masih miliknya (keputusan 16 November 2026). Bagi KosBagi, pendapatan per periode hanya fee pengelolaan, jadi okupansi dan biaya berpengaruh kecil pada pendapatan platform tetapi besar pada imbal hasil investor.

## 7. Proyeksi 3 tahun

Bahan lengkap: [proyeksi keuangan](proyeksi-keuangan.md), memakai [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) untuk tingkat properti. Skenario dasar: 2, 5, dan 8 properti baru seukuran Kos Sumbersari 01 (2027 sampai 2029), tim 4 orang, tingkat diskonto 20% (SUN 10 tahun 7,66% ditambah premi risiko usaha rintisan sekitar 12 poin persen).

### Unit economics per properti

| Ukuran | 10 kamar | 20 kamar |
|---|---|---|
| Fee penawaran | Rp37.800.000 | Rp75.600.000 |
| Biaya penerbitan (KJPP, legal, pemasaran, e-KYC, virtual account, gas) | Rp23.900.960 | Rp27.801.920 |
| Kontribusi penerbitan | Rp13.899.040 | Rp47.798.080 |
| Fee pengelolaan per tahun | Rp8.100.000 | Rp16.200.000 |
| Kontribusi pengelolaan per tahun | Rp7.526.160 (92,9%) | Rp15.088.320 |

Margin per properti tinggi, jadi persoalan KosBagi adalah skala, bukan biaya per transaksi.

### Proyeksi skenario dasar

| Ukuran | Tahun 1 | Tahun 2 | Tahun 3 |
|---|---|---|---|
| Properti aktif di akhir tahun | 2 | 7 | 15 |
| Pendapatan | Rp83,7 juta | Rp225,5 juta | Rp391,5 juta |
| Margin kontribusi | Rp35,3 juta | Rp103,4 juta | Rp194,0 juta |
| Biaya tetap (tim 4 orang dan operasional) | Rp324,0 juta | Rp324,0 juta | Rp324,0 juta |
| Laba (rugi) sebelum pajak | −Rp288,7 juta | −Rp220,6 juta | −Rp130,0 juta |

| Ukuran | Hasil |
|---|---|
| Investasi awal tahun 0 (dua PT, audit kontrak, persiapan sandbox) | Rp115,0 juta **[perlu verifikasi]** |
| Kebutuhan dana sampai tahun 3 | Rp754,3 juta |
| NPV 3 tahun, diskonto 20% | −Rp584,0 juta |
| BEP operasional | 59 properti 10 kamar, atau 26 properti 20 kamar |
| Syarat NPV ≥ 0 | 9, 22, 36 properti baru 10 kamar; atau 3, 6, 10 properti baru 20 kamar |

### Sensitivitas

| Skenario | Laba tahun 3 | NPV |
|---|---|---|
| Dasar | −Rp130,0 juta | −Rp584,0 juta |
| Properti 20 kamar | Rp224,4 juta | −Rp174,8 juta |
| Pertumbuhan optimis (4, 10, 16) | Rp5,5 juta | −Rp404,4 juta |
| Biaya tetap −20% | −Rp65,2 juta | −Rp447,5 juta |
| 25% penawaran gagal | −Rp226,3 juta | −Rp695,8 juta |
| Okupansi 80% | −Rp139,3 juta | −Rp592,7 juta |

Kesimpulan bab ini:

1. Dengan properti 10 kamar, fee 3% dan 5% belum menutup biaya tim dalam tiga tahun. Proyeksi disajikan apa adanya, termasuk NPV negatifnya (keputusan 15 November 2026).
2. Jalan menuju untung adalah strategi akuisisi: setelah properti percontohan, KosBagi memprioritaskan kos 20 kamar yang masih termasuk segmen proposal. Dengan 3, 6, dan 10 properti baru 20 kamar, NPV 3 tahun sudah tidak negatif.
3. Pendanaan awal sekitar Rp750 juta perlu disiapkan sampai BEP. Sumbernya belum ditentukan (modal pendiri, hibah inkubator kampus, atau investor awal) **[perlu verifikasi]**.

Bagi investor, imbal hasil 5,265% lebih rendah dari SUN 10 tahun (Kontan, 2026b). Daya tarik token bergantung pada modal kecil, keterbukaan data, skema pajak yang lebih ringan, dan kenaikan nilai properti yang belum punya data sekunder **[perlu verifikasi]**. Hal ini masuk risiko pasar di bab 8.

## 8. Manajemen risiko

Dampak finansial dihitung dari skenario dasar. Bila biaya operasional ikut turun bersama sewa (20% dari sewa), setiap Rp1 sewa yang hilang mengurangi bagi hasil Rp0,585; bila biaya tetap, Rp0,741 ([asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) bagian 6).

### Daftar risiko

| No | Kategori | Risiko | Dampak finansial | Mitigasi | Bukti di prototipe |
|---|---|---|---|---|---|
| R1 | Kredit | Penghuni menunggak | Satu kamar satu bulan: sewa kotor −Rp1.500.000, dibagikan −Rp877.500, per token −Rp48,75 | Deposit satu bulan, pengingat otomatis, denda sesuai kontrak sewa | Status kamar dan daftar tindak lanjut "lewat jatuh tempo" di halaman pengelola |
| R2 | Pasar | Okupansi turun saat libur semester atau ada kos baru di sekitarnya | 90% ke 80%: imbal hasil 5,265% menjadi 4,680% (biaya ikut sewa) atau 4,524% (biaya tetap) | Kurasi lokasi, kontrak semester atau tahunan, dana cadangan setara satu bulan sewa | Investor melihat sewa tercatat per kamar setiap periode |
| R3 | Fraud | Penghuni bayar di luar platform atau pengelola menahan sewa | Sama dengan menunggak, tetapi tidak tercatat | Kontrak sewa mewajibkan virtual account, peringatan kamar terisi tanpa pembayaran, inspeksi mendadak | Kamar terisi tanpa sewa tercatat terlihat di halaman pengelola dan investor |
| R4 | Fraud | Nota fiktif atau digelembungkan | Tiap Rp1.000.000 biaya palsu: dibagikan −Rp780.000 | Batas per kategori, persetujuan admin di atas ambang, hash nota on-chain, audit | Nota yang sama ditolak backend dan kontrak; hash nota bisa dicocokkan dengan file |
| R5 | Operasional | Gangguan Midtrans atau RPC, pencatatan on-chain gagal | Pencatatan tertunda; tidak ada pembayaran yang hilang | Pola outbox dan antrean dengan retry, status "menunggu pencatatan", RPC cadangan, tombol Coba lagi admin; job yang gagal permanen ditandai ditangani oleh admin dan hanya job periode itu yang memblokir penutupan | Rekonsiliasi menandai sewa lunas yang belum tercatat; periode tidak bisa ditutup sebelum semua tercatat |
| R6 | Operasional | Pembayaran lunas setelah periode ditutup | Satu sewa tidak ikut dibagikan dan harus dikembalikan | Tagihan periode tertutup tidak bisa dibayar; pembayaran yang terlanjur lunas dicatat sebagai anomali (keputusan 16 November 2026 K4) | Penghuni melihat bahwa dananya akan dikembalikan, admin melihat "Dana perlu dikembalikan", dan rekonsiliasi menampilkan Selisih |
| R7 | Operasional | Pembayaran ganda untuk satu tagihan | Dana penghuni tertahan dan harus dikembalikan | Tiga lapis anti ganda: constraint unik `order_id`, deduplikasi webhook, penolakan referensi ganda di kontrak | Skenario uji 5; anomali `DUPLICATE_BILL_PAYMENT` tampil sebagai Selisih |
| R8 | Siber | Kunci operator bocor atau bug kontrak | Catatan palsu atau token berpindah tanpa hak | Kunci di secret manager, admin multisig saat produksi, jeda darurat, unit test dan audit kontrak | Dompet admin dan operator terpisah; skenario uji 10 dan 11; coverage test kontrak |
| R9 | Siber | Webhook dipalsukan atau nominalnya diubah | Tagihan lunas tanpa pembayaran | Verifikasi signature SHA-512, cek ulang status dan nominal ke API Midtrans, rate limit | Skenario uji 6 dan 7; order dengan anomali `AMOUNT_MISMATCH` selalu Selisih di rekonsiliasi |
| R10 | Siber dan hukum | Kebocoran data pribadi | Sanksi UU PDP dan hilangnya kepercayaan | Enkripsi, akses berbasis peran, tanpa data pribadi on-chain, minimisasi data | Data on-chain hanya kode properti, kamar, periode, nominal, dan hash |
| R11 | Regulasi | POJK aset ditokenisasi terbit berbeda dari asumsi, atau pajak kos daerah kembali | Struktur harus diubah atau imbal hasil turun | Ikut sandbox sejak awal, struktur dua entitas yang bisa disesuaikan, sensitivitas pajak | Tarif pajak adalah parameter deploy `KosLedger` |
| R12 | Likuiditas | Token sulit dijual kembali | Investor tidak bisa keluar sebelum properti dijual | Pengungkapan risiko, pasar sekunder fase kedua, voting penjualan properti | Tab Risiko di halaman kos |
| R13 | Hukum dan operasional | Sengketa sertifikat atau kerusakan besar | Nilai aset turun atau sewa terhenti | Pemeriksaan notaris, penilaian independen, asuransi, dana cadangan | Hash dokumen penerbitan dicatat di `KosToken` |
| R14 | Keuangan platform | Jumlah atau ukuran properti tidak menutup biaya tetap | Rugi tiga tahun pertama; kebutuhan dana Rp754,3 juta | Prioritas kos 20 sampai 30 kamar, tim kecil, pendanaan disiapkan sampai BEP | Proyeksi bab 7 |
| R15 | Pasar | Imbal hasil di bawah SUN 10 tahun (5,265% dibanding 7,66%) | Penawaran lambat terjual; 25% penawaran gagal menurunkan NPV Rp111,7 juta | Tonjolkan modal kecil dan keterbukaan data, skenario pajak yang lebih ringan, pengungkapan jujur | Penawaran yang tidak habis sampai batas waktu dibatalkan dan dana dikembalikan |
| R16 | Hukum dan biaya | Biaya peralihan hak sekitar Rp153 juta per properti Rp1,8 miliar | Dana bersih pemilik turun menjadi 84,9% dari dana dihimpun | Ditanggung pemilik lama dan disebut di halaman pemilik; dikonfirmasi ke notaris | FAQ dan simulasi dana di `/pemilik` |

### Matriks risiko

Penilaian kualitatif usulan jalur 1, untuk disepakati tim sebelum naskah final **[perlu verifikasi]**. Kemungkinan dan dampak bernilai 1 (sangat rendah) sampai 5 (sangat tinggi), dinilai sebelum mitigasi. Skor = kemungkinan × dampak.

| Skor | Risiko | Kemungkinan | Dampak | Alasan singkat |
|---|---|---|---|---|
| 16 | R14 skala platform | 4 | 4 | Proyeksi dasar memang rugi tiga tahun |
| 12 | R3 bayar di luar platform | 3 | 4 | Kebiasaan bayar tunai ke pemilik masih umum; tidak tercatat sama sekali |
| 12 | R11 regulasi | 3 | 4 | POJK aset ditokenisasi masih rancangan |
| 12 | R12 likuiditas | 4 | 3 | Pasar sekunder baru di fase kedua |
| 12 | R15 imbal hasil di bawah SUN | 4 | 3 | Selisih 2,4 poin persen pada skenario dasar |
| 10 | R10 kebocoran data | 2 | 5 | Dampak hukum besar, kemungkinan ditekan oleh minimisasi data |
| 9 | R2 okupansi turun | 3 | 3 | Musiman, tetapi permintaan kos dekat kampus stabil |
| 9 | R16 biaya peralihan hak | 3 | 3 | Bisa membuat pemilik memilih kredit bank |
| 8 | R9 webhook dipalsukan | 2 | 4 | Sudah dimitigasi berlapis dan diuji |
| 6 | R1 penghuni menunggak | 3 | 2 | Dampak per kamar kecil dan sementara |
| 6 | R4 nota fiktif | 2 | 3 | Hash nota mencegah perubahan, bukan pemalsuan isi |
| 6 | R5 gangguan pencatatan | 3 | 2 | Sering terjadi di testnet, tetapi tidak menghilangkan uang |
| 5 | R8 kunci operator dan bug kontrak | 1 | 5 | Jarang, tetapi dampaknya pada kepercayaan sangat besar |
| 5 | R13 sengketa atau kerusakan | 1 | 5 | Disaring saat kurasi |
| 4 | R7 pembayaran ganda | 2 | 2 | Tiga lapis anti ganda |
| 2 | R6 pembayaran setelah periode ditutup | 2 | 1 | Ditolak sejak tagihan, sisanya dicatat anomali |

Prioritas penanganan: risiko berskor 12 ke atas ditangani di tingkat strategi (akuisisi properti 20 kamar, sandbox OJK, pengungkapan risiko, kontrak sewa wajib virtual account). Risiko teknis (R5 sampai R9) sudah dimitigasi di prototipe dan diuji lewat skenario uji 1 sampai 12 (laporan di `docs/pengujian/`).

### Rekonsiliasi sebagai kontrol harian

Halaman `/admin/rekonsiliasi` mencocokkan setiap order Midtrans satu periode dengan basis data dan catatan on-chain. Sebuah order dihitung Cocok bila ketiga sumber sepakat soal uang (Midtrans lunas tepat ketika basis data mencatatnya lunas, dengan nominal sama) dan soal catatan (order lunas tercatat di Sepolia dengan nominal sama, order yang tidak lunas tidak tercatat). Percobaan yang kedaluwarsa atau dibatalkan juga Cocok karena tidak ada uang dan tidak ada catatan. Sebaliknya, order yang punya anomali pembayaran selalu Selisih walaupun ketiga sumber sepakat (keputusan 20 November 2026), supaya notifikasi tidak wajar seperti nominal palsu di skenario uji 7 tetap terlihat. Selisih yang ditemukan, misalnya pencatatan gagal (R5), nominal tidak cocok (R9), pembayaran ganda (R7), atau pembayaran setelah periode ditutup (R6), menjadi daftar tindak lanjut admin sebelum periode ditutup.

### Dana cadangan dan defisit

Sisa pembulatan distribusi masuk cadangan per periode, dan defisit (biaya melebihi sewa setelah fee) tidak dibawa ke periode berikutnya ([perhitungan distribusi](perhitungan-distribusi.md)). Untuk operasi nyata, proposal Tabel 5.1 mengusulkan dana cadangan setara satu bulan sewa. Cara penyisihannya (dari dana penawaran atau dari sewa bersih bulan-bulan awal) belum diputuskan dan dicatat sebagai pengembangan lanjutan di bab 10.

## 9. KYC/AML dan perlindungan data

### Alur KYC dan pemantauan

1. **Sebelum pembelian pertama**, investor mengajukan identitas. Di produksi ini e-KYC dengan penyedia berizin; di prototipe, KYC dummy dengan nomor identitas berawalan `DUMMY-`.
2. **Pemeriksaan otomatis** di prototipe: awalan `DUMMY-`, nama sama dengan nama akun, dan tidak ada pengajuan lain yang masih aktif. Admin tetap memutuskan setuju atau tolak, dan alasan penolakan wajib ditulis.
3. **Persetujuan** membuat dompet kustodian untuk investor dan mencatat alamatnya sebagai lolos KYC di `KosToken`. Kontrak hanya mengizinkan alamat lolos KYC menerima token, jadi token tidak bisa sampai ke alamat yang belum diverifikasi walau backend keliru.
4. **Batas pembelian**: 10% (1.800 token) per investor, diperiksa sebelum pembayaran dibuat (skenario uji 9) dan ditegakkan lagi di kontrak (skenario uji 10). Pembelian di atas 100 token hanya lewat virtual account.
5. **Pemantauan transaksi** (POJK 8/2023): di prototipe, setiap notifikasi Midtrans yang tidak wajar dicatat sebagai anomali (nominal tidak cocok, order tidak dikenal, pembayaran ganda, pembayaran setelah periode ditutup) dan muncul di rekonsiliasi. Di produksi ditambah aturan transaksi mencurigakan, misalnya beberapa pembelian bernilai besar dalam waktu singkat dan pelaporan ke PPATK **[perlu verifikasi]**.

### Pemisahan data

| Lokasi | Isi | Alasan |
|---|---|---|
| Basis data (terenkripsi saat produksi) | Nama, email, data KYC dummy, nama penghuni, hubungan akun dengan dompet kustodian | Data pribadi bisa diperbaiki dan dihapus sesuai hak subjek data |
| Blockchain publik | Kode properti, nomor kamar, periode, nominal, `keccak256(order_id)`, hash nota, hash dokumen penerbitan, alamat dompet | Catatan yang perlu bisa diperiksa publik, tanpa data yang menunjuk ke orang |
| Midtrans | Data transaksi yang dibutuhkan pembayaran | Diproses penyedia jasa pembayaran berizin |

`order_id` seperti `RENT-SMR01-K03-2026-11` tidak memuat nama penghuni, dan yang dicatat on-chain hanya hash-nya. Alamat dompet kustodian tidak tercatat bersama nama di mana pun di luar basis data.

### Hak subjek data (UU 27/2022)

Data di blockchain publik tidak bisa dihapus, padahal UU PDP memberi hak untuk menghapus dan memperbaiki data. Karena itu tidak ada data pribadi di blockchain: bila investor meminta datanya dihapus, baris di basis data dihapus atau dianonimkan, dan catatan on-chain yang tersisa tidak lagi bisa dihubungkan ke orang itu. Di produksi, KosBagi juga perlu menunjuk pejabat pelindungan data, menyusun pemberitahuan privasi, dan prosedur pemberitahuan kebocoran **[perlu verifikasi]**.

### Prototipe dibanding produksi

| Ketentuan | Di prototipe | Rencana produksi |
|---|---|---|
| Verifikasi identitas | KYC dummy `DUMMY-` disetujui admin | e-KYC penyedia berizin, biometrik bila diwajibkan |
| Whitelist on-chain | Berjalan (`setKycStatus`) | Sama |
| Batas pembelian | Berjalan di backend dan kontrak | Sama, ditambah batas per profil risiko investor **[perlu verifikasi]** |
| Pemantauan transaksi | Anomali pembayaran dan rekonsiliasi | Aturan transaksi mencurigakan dan pelaporan |
| Data pribadi | Hanya data dummy; tidak ada di blockchain | Enkripsi kolom sensitif, audit akses |
| Dompet investor | Dompet kustodian dari satu mnemonic testnet, investor tidak memegang kunci | Kunci di HSM atau layanan kustodian berizin |

## 10. Arsitektur sistem, roadmap, dan KPI

### Arsitektur

Rincian diagram ada di `docs/desain/arsitektur.md` dan ERD di `docs/desain/erd.md` (jalur 4); kontrak di [rancangan kontrak](../kontrak/rancangan-kontrak.md) (jalur 3).

| Komponen | Teknologi | Peran |
|---|---|---|
| Frontend | Next.js, Tailwind, shadcn/ui, Midtrans Snap | Halaman publik, investor, penghuni, pengelola, admin |
| Backend API | Node.js, Express, PostgreSQL, Prisma | Akun dan peran, KYC, tagihan, pembelian token, biaya, periode, distribusi, rekonsiliasi |
| Pembayaran | Midtrans Snap dan Core API (sandbox) | Virtual account, QRIS, e-wallet; webhook bertanda tangan |
| Antrean | Redis dan BullMQ dengan pola outbox | Job blockchain ditulis dalam transaksi DB yang sama dengan perubahan status, dicoba ulang bila gagal |
| Worker blockchain | ethers.js, satu dompet operator | `recordRent`, `recordExpense`, `closePeriod`, `setKycStatus`, `transferFromTreasury`; investor tidak membayar gas |
| Smart contract | Solidity, OpenZeppelin, Ethereum Sepolia | `KosToken` (ERC-20 + ERC20Votes, KYC, batas 10%), `KosLedger` (sewa, biaya, tutup periode) |

Alur inti: penghuni membayar, Midtrans mengirim notifikasi, backend memverifikasi signature dan mengecek ulang status, menandai lunas dan menulis job dalam satu transaksi DB, lalu worker mencatat `keccak256(order_id)` di `KosLedger`. Admin menutup periode setelah semua sewa, biaya, dan transfer token tercatat; `closePeriod` menyimpan sewa bersih dan nilai per token, lalu distribusi membaca saldo setiap pemegang di blok snapshot dan menambahkan bagiannya ke saldo akun.

### Roadmap

Prototipe tugas akhir:

| Tahap | Waktu | Hasil |
|---|---|---|
| P1 Fondasi | 29 Okt sampai 4 Nov 2026 | Kerangka aplikasi, halaman publik, `KosToken` dan `KosLedger` awal |
| P2 Fitur inti dan pembayaran | 5 sampai 11 Nov 2026 | Pembayaran sewa di Midtrans sandbox, skenario uji 1 sampai 7 |
| P3 Integrasi blockchain | 12 sampai 18 Nov 2026 | Worker blockchain, KYC dan dompet kustodian, pembelian token, kuitansi on-chain, proyeksi keuangan |
| P4 Distribusi dan rekonsiliasi | 19 sampai 24 Nov 2026 | Biaya dan nota, tutup periode, distribusi, portofolio, rekonsiliasi, business case ini |
| P5 Finalisasi | 25 Nov sampai 2 Des 2026 | Slide, video demo, pernyataan AI, dokumen final |

Sesudah prototipe, mengikuti horizon proyeksi (rencana, belum komitmen):

| Fase | Waktu | Sasaran | Prasyarat |
|---|---|---|---|
| Persiapan | Tahun 0 (2026 sampai 2027) | Pendirian PT KosBagi Teknologi dan PT KosBagi Properti, audit smart contract, pendaftaran sandbox OJK, konfirmasi skema pajak dan biaya peralihan hak | Pendanaan awal Rp115 juta **[perlu verifikasi]** |
| Percontohan | Tahun 1 (2027) | Kos Sumbersari 01 dan satu properti lain di sandbox; virtual account per kamar dan e-KYC sungguhan | Persetujuan sandbox |
| Skala lokal | Tahun 2 (2028) | 5 properti baru, prioritas kos 20 kamar; pencairan bagi hasil lewat disbursement; voting on-chain | POJK aset ditokenisasi terbit |
| Pasar sekunder | Tahun 3 (2029) | 8 properti baru; pasar sekunder bersama pedagang aset keuangan digital berizin dengan fee 0,5% | Izin pedagang mitra, aset tercantum di daftar bursa |

### Pengembangan lanjutan

| Fitur | Status | Rencana |
|---|---|---|
| Voting on-chain (`KosVoting`) | Tidak dibangun di prototipe (keputusan 16 November 2026 K5) | Kontrak `propose`, `vote`, dan `tally` untuk keputusan besar seperti renovasi besar, penggantian pengelola, dan penjualan properti. Bobot suara memakai `getPastVotes` di blok saat proposal dibuat, jadi token yang dibeli setelah proposal tidak menambah suara. `KosToken` sudah memakai ERC20Votes dan mendelegasikan suara ke pemegangnya sendiri, sehingga checkpoint yang dibutuhkan sudah tersedia. Kuorum dan ambang persetujuan diputuskan bersama konsultan hukum **[perlu verifikasi]** |
| Pencairan saldo | Tombol Tarik saldo tampil nonaktif | Disbursement dari rekening penampungan kustodian ke rekening investor |
| Pasar sekunder | Tidak dibangun | Lewat pedagang berizin, fee 0,5% |
| Multi-properti | Satu properti | Satu `KosToken` per properti; backend sudah menyimpan kode properti di setiap order |
| Dana cadangan | Belum diputuskan | Penyisihan untuk menalangi defisit dan perbaikan besar |
| Pembatalan penawaran | Aturan tertulis, belum dibangun | Pengembalian dana otomatis bila penawaran tidak habis sampai batas waktu |

### KPI

Target tahun 1 sampai 3 mengikuti proyeksi skenario dasar. Target operasional adalah usulan jalur 1 **[perlu verifikasi tim]**. Kolom terakhir menunjukkan cara mengukurnya; sebagian sudah bisa dibaca dari prototipe.

| Area | KPI | Target | Sumber data |
|---|---|---|---|
| Properti | Properti aktif di akhir tahun | 2, 7, 15 | Basis data properti |
| Properti | Okupansi rata-rata | ≥ 90% (asumsi A03) | Status kamar pengelola |
| Penawaran | Dana dihimpun per properti 10 kamar | Rp1,26 miliar, habis sebelum batas waktu | Penawaran dan pembelian `BUY-` |
| Penawaran | Penawaran gagal | ≤ 25% (batas sensitivitas bab 7) | Penawaran berstatus dibatalkan |
| Sewa | Sewa lunas sebelum jatuh tempo | ≥ 95% tagihan **[perlu verifikasi tim]** | Tagihan dan waktu bayar |
| Sewa | Sewa yang dibayar lewat platform | 100% kamar terisi | Kamar terisi dibanding sewa tercatat |
| Keterbukaan | Pembayaran lunas yang tercatat on-chain saat periode ditutup | 100% (syarat tutup periode) | Syarat penutupan di `/admin/periode` |
| Keterbukaan | Jeda dari notifikasi Midtrans sampai tercatat di Sepolia | Median ≤ 2 menit **[perlu verifikasi tim]** | Waktu pembayaran dan blok transaksi |
| Keterbukaan | Selisih rekonsiliasi saat periode ditutup | 0, setiap selisih ditindaklanjuti ≤ 2 hari kerja | `/admin/rekonsiliasi` |
| Keuangan | Pendapatan fee | Rp83,7 juta, Rp225,5 juta, Rp391,5 juta | Fee penawaran dan fee pengelolaan |
| Keuangan | Imbal hasil investor | ≥ 5,265% per tahun pada skema pajak dasar | `closePeriod` per periode |
| Keuangan | Biaya operasional terhadap sewa kotor | ≤ 20% (asumsi A10) | Biaya tercatat per periode |
| Kepatuhan | Pembeli token yang lolos KYC sebelum membeli | 100% (dijamin kontrak) | Whitelist `KosToken` |

## Daftar pustaka

- Bisnis.com (2025) *OJK Perketat Pengaturan Perdagangan Aset Keuangan Digital, Kripto cs.* Tersedia di: https://market.bisnis.com/read/20251204/94/1934197/ojk-perketat-pengaturan-perdagangan-aset-keuangan-digital-kripto-cs (Diakses: 15 Oktober 2026).
- Bisnis.com (2026a) *OJK Setujui 29 Entitas Kripto, Empat Perusahaan Lulus Sandbox.* Tersedia di: https://market.bisnis.com/read/20260304/94/1957543/ojk-setujui-29-entitas-kripto-empat-perusahaan-lulus-sandbox (Diakses: 15 Oktober 2026).
- Bisnis.com (2026b) *HUT ke-49 Pasar Modal: Total Investor Tembus 30,30 Juta SID.* Tersedia di: https://market.bisnis.com/read/20260810/7/1994994/hut-ke-49-pasar-modal-total-investor-tembus-3030-juta-sid (Diakses: 15 Oktober 2026).
- Brighton Real Estate (2026) *Rumah Kos + Toko Dekat Suhat, Rukos Eksklusif Dekat UB (Universitas Brawijaya).* Tersedia di: https://www.brighton.co.id/cari-properti/view/lowokwaru-57 (Diakses: 15 Oktober 2026).
- Buterin, V. (2014) *Ethereum White Paper.* Tersedia di: https://ethereum.org/en/whitepaper (Diakses: 15 Oktober 2026).
- Investortrust (2026) *Di Tengah Polemik Kripto Haram atau Halal, OJK Buka Peluang Pembentukan Daftar Token Syariah.* Tersedia di: https://investortrust.id/market/96087/di-tengah-polemik-kripto-haram-atau-halal-ojk-buka-peluang-pembentukan-daftar-token-syariah (Diakses: 15 Oktober 2026).
- Kontan (2026a) *Urun Dana Bizhare Terapkan Strategi Ini Guna Dorong Kinerja hingga Akhir 2026.* Tersedia di: https://keuangan.kontan.co.id/news/urun-dana-bizhare-terapkan-strategi-ini-guna-dorong-kinerja-hingga-akhir-2026 (Diakses: 15 Oktober 2026).
- Kontan (2026b) *Yield SUN Tembus 7,66%, Pembiayaan Utang Pemerintah Makin Berat*, 28 Oktober. Tersedia di: https://investasi.kontan.co.id/news/yield-sun-tembus-766-pembiayaan-utang-pemerintah-makin-berat (Diakses: 3 November 2026).
- KrASIA (2023) *Unlocking Access to Real Estate: GORO's Tokenization of Rental Properties in Indonesia.* Tersedia di: https://kr-asia.com/unlocking-access-to-real-estate-goros-tokenization-of-rental-properties-in-indonesia (Diakses: 15 Oktober 2026).
- Mamikos (2022) *Pakai Aplikasi Mamikos, Pemilik Kos Tinggal Duduk Manis.* Tersedia di: https://mamikos.com/info/pakai-aplikasi-mamikos/ (Diakses: 15 Oktober 2026).
- Mamikos (2026) *Biaya Hidup Mahasiswa Kuliah di Unibraw.* Tersedia di: https://mamikos.com/info/biaya-hidup-mahasiswa-kuliah-di-unibraw/ (Diakses: 15 Oktober 2026).
- Midtrans (2026) *Pricing.* Tersedia di: https://midtrans.com/pricing (Diakses: 3 November 2026).
- Proposal Tugas Akhir Kelompok 9 (2026) *KosBagi.* Mata kuliah Teknologi Blockchain dan Platform Keuangan Dijital, Fakultas Ilmu Komputer, Universitas Brawijaya.
- RCTI+ (2026) *Maksimalkan Inklusivitas Keuangan, OJK Siapkan Regulasi Aset Riil Tertokenisasi.* Tersedia di: https://www.rctiplus.com/news/detail/ekonomi/5490379/maksimalkan-inklusivitas-keuangan--ojk-siapkan-regulasi-aset-riil-tertokenisasi (Diakses: 15 Oktober 2026).
- TIMES Indonesia (2022) *Jumlah Mahasiswa Baru di Perguruan Tinggi Malang, Universitas Brawijaya Tertinggi.* Tersedia di: https://timesindonesia.co.id/pendidikan/425231/jumlah-mahasiswa-baru-di-perguruan-tinggi-malang-universitas-brawijaya-tertinggi (Diakses: 15 Oktober 2026).

Sumber regulasi (UU, POJK, PBI, PP, PMK) tercantum lengkap di [peta regulasi](../regulasi/peta-regulasi.md) bagian 7, dan sumber pajak serta biaya peralihan hak di [proyeksi keuangan](proyeksi-keuangan.md) bagian 9. Naskah PDF business case mencantumkan penggunaan alat AI di lampirannya, seperti proposal.
