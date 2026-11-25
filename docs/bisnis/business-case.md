# Business Case KosBagi

Status: versi final P5, 24 November 2026. Menggantikan versi lengkap P4 (19 November 2026). Bobot penilaian 25%, dengan indikator pasar, proyeksi keuangan, risiko, dan kepatuhan.

Versi PDF/docx yang dikumpulkan 24 November 2026 adalah ringkasan dokumen ini, dan angka di repositori sama dengannya (disamakan 24 November 2026, [log ide 24 November 2026](../log-ide/2026-11-24-keputusan-akhir-progress-5.md) K1).

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

**Pasar.** Lebih dari 330 ribu mahasiswa di Malang (TIMES Indonesia, 2022) dan 1.113 rumah kos dengan lebih dari 10 kamar yang terdaftar sebagai wajib pajak pada 2018 (Wati, Muchsin dan Hayat, 2019). Pasar terlayani diperkirakan sekitar 16.700 kamar senilai Rp3,0 triliun, dan target tiga tahun skenario dasar (150 kamar) hanya 0,9% darinya (bab 3).

**Model pendapatan.** Fee penawaran 3% (Rp37,8 juta sekali per properti, dibayar pemilik), fee pengelolaan 5% dari sewa kotor (Rp8,1 juta per properti per tahun), dan fee pasar sekunder 0,5% di fase kedua. Penghuni tidak dikenai biaya tambahan.

**Angka utama.** Investor menerima Rp438,75 per token per bulan, atau imbal hasil 5,265% per tahun dengan PPh badan 22% (6,0075% bila kustodian memperoleh fasilitas Pasal 31E). Dengan properti 10 kamar, biaya tetap Rp351 juta per tahun belum tertutup dalam tiga tahun: pada skenario dasar 2, 5, dan 8 properti baru, KosBagi masih rugi Rp156,9 juta di tahun 3, NPV 3 tahun −Rp690,8 juta, dan kebutuhan dana Rp885,1 juta. BEP operasional tercapai pada 70 properti 10 kamar atau 28 properti 20 kamar. Strategi kos 20 kamar (3, 8, dan 12 properti baru) membuat NPV positif dan modal kembali sekitar 2,5 tahun setelah operasi dimulai.

| Ukuran | Skenario dasar | Strategi kos 20 kamar |
|---|---|---|
| Properti baru tahun 1 sampai 3 | 2, 5, 8 (10 kamar) | 3, 8, 12 (20 kamar) |
| Investasi awal | Rp165.000.000 | Rp165.000.000 |
| Pendapatan tahun 3 | Rp391.500.000 | Rp1.182.600.000 |
| Laba (rugi) tahun 3 | −Rp156.891.760 | Rp420.967.200 |
| Kebutuhan dana | Rp885.110.280 | Rp349.899.840 |
| NPV 3 tahun (diskonto 20%) | −Rp690.758.270 | Rp19.826.967 |
| IRR | Tidak ada | 23,3% |
| Balik modal | Belum tercapai dalam 3 tahun | Sekitar 2,5 tahun |

**Rekomendasi.** KosBagi dilanjutkan ke regulatory sandbox OJK dengan kos 20 kamar sebagai properti percontohan, sedangkan Kos Sumbersari 01 tetap menjadi studi kasus prototipe. Pendanaan yang perlu disiapkan sekitar Rp525,4 juta, yaitu kebutuhan dana strategi Rp349,9 juta ditambah cadangan enam bulan biaya tetap Rp175,5 juta.

**Risiko utama.** Skala platform yang belum menutup biaya tetap, imbal hasil yang lebih rendah dari SUN 10 tahun (7,66%), pembayaran sewa di luar platform, aturan tokenisasi aset nyata yang belum terbit, dan likuiditas token. Mitigasinya di bab 8. Semua angka merupakan simulasi berdasarkan asumsi kelompok dan data sekunder, tanpa uang nyata.

**Status prototipe.** Keenam butir demo wajib dibangun: KYC dummy dan pembelian token lewat Midtrans sandbox, pembayaran sewa yang tercatat di `KosLedger`, pencatatan biaya dengan hash nota, penutupan periode dan distribusi, portofolio investor, serta halaman rekonsiliasi Midtrans, basis data, dan blockchain. Semua alur diuji di jaringan Hardhat lokal, dan kontrak demo akhir di-deploy ke Ethereum Sepolia pada 24 November 2026 serta terverifikasi di Etherscan (README bagian "Kontrak di Sepolia").

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
| Investor ritel | 20 sampai 35 tahun, sudah punya akun saham, reksa dana, atau aset kripto, modal Rp100 ribu sampai Rp10 juta | Pendapatan pasif dari aset riil yang angkanya bisa diperiksa sendiri | 31,14 juta investor pasar modal per Agustus 2026, dan 55,25% investor individunya berusia 30 tahun ke bawah (Databoks, 2026); 20,7 juta konsumen aset kripto awal 2026 (Investortrust, 2026); GORO menyebut lebih dari 60% penggunanya investor pemula (Kompas.com, 2025). Irisan dengan rentang modal sasaran belum ada datanya **[perlu verifikasi]** |
| Pemilik kos | Kos 10 sampai 30 kamar di sekitar kampus | Modal tanpa utang, tetap mengelola kos | 1.113 rumah kos dengan lebih dari 10 kamar terdaftar sebagai wajib pajak di Kota Malang pada 2018 (Wati, Muchsin dan Hayat, 2019) |
| Penghuni | Mahasiswa penyewa kos bulanan | Cara bayar mudah dan kuitansi | Lebih dari 330 ribu mahasiswa di Malang, sekitar 90 ribu di UB (TIMES Indonesia, 2022); 60% mahasiswa UB berasal dari luar Jawa Timur (ANTARA, 2013) |

Segmen investor dan pemilik kos adalah pelanggan yang membayar atau menghasilkan pendapatan bagi KosBagi. Penghuni adalah pengguna pembayaran: tanpa mereka tidak ada sewa yang tercatat, tetapi mereka tidak dikenai biaya.

## 3. Pasar dan pesaing

### TAM, SAM, dan SOM

Proposal bagian 2.7 mendefinisikan TAM sebagai nilai properti kos di kota-kota kampus besar, SAM sebagai kos eksklusif 10 sampai 30 kamar di Malang, dan SOM sebagai properti yang realistis dikelola dalam tiga tahun. TAM dihitung dari jumlah mahasiswa, sedangkan SAM dihitung dari jumlah kos besar yang terdaftar sebagai wajib pajak. Dua asumsi kelompok di dalamnya ditandai.

| Lapisan | Rumus | Hasil | Dasar |
|---|---|---|---|
| TAM lokal (Malang) | 330.000 mahasiswa × 60% tinggal di kos × Rp180 juta per kamar | Sekitar 198.000 kamar, nilai properti Rp35,6 triliun | Jumlah mahasiswa: TIMES Indonesia (2022). Porsi 60% tinggal di kos: asumsi kelompok. Nilai per kamar: [laporan penilaian dummy](dokumen-penerbitan/laporan-penilaian.md), di bawah pembanding Rp196 juta per kamar (Brighton Real Estate, 2026) |
| TAM nasional | Jumlah kamar kos di kota kampus besar × nilai per kamar | Belum dihitung | Data jumlah kos per kota belum ada **[perlu verifikasi]** |
| SAM | 1.113 kos dengan lebih dari 10 kamar × rata-rata 15 kamar | Sekitar 16.700 kamar, nilai Rp3,0 triliun; sewa kotor sekitar Rp270,5 miliar per tahun (Rp1,5 juta × 12 × okupansi 90%) | Jumlah kos: data wajib pajak 2018 (Wati, Muchsin dan Hayat, 2019). Data 2018 dipakai karena kos tidak lagi menjadi objek pajak daerah sejak UU 1/2022 berlaku penuh pada 2024 (Metrotvnews, 2025a). Rata-rata 15 kamar: asumsi kelompok. Sewa eksklusif di atas Rp1 juta per bulan (Mamikos, 2026) |
| SOM, skenario dasar | 15 properti aktif di akhir tahun 3 × 10 kamar | 150 kamar (0,9% kamar SAM), dana dihimpun Rp18,9 miliar, sewa kotor dikelola Rp2,43 miliar per tahun | [Proyeksi keuangan](proyeksi-keuangan.md) bagian 4 |
| SOM, strategi kos 20 kamar | 23 properti aktif di akhir tahun 3 × 20 kamar | 460 kamar (2,8% kamar SAM) | [Proyeksi keuangan](proyeksi-keuangan.md) bagian 6 |

Target tiga tahun itu kecil dibanding pasar. Bila rata-rata kos besar hanya 12 kamar, SAM menjadi sekitar 13.400 kamar dan SOM skenario dasar tetap hanya 1,1% dari SAM. Hambatan KosBagi karenanya bukan ukuran pasar, melainkan kecepatan akuisisi properti dan kepercayaan investor.

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
| Pemilik kos | Dana Rp1,22 miliar dari penjualan 70% token setelah fee 3% (sekitar Rp1,08 miliar setelah biaya peralihan hak Rp140 juta yang ditanggung pemilik, keputusan 15 November 2026), tanpa utang bank; tetap memegang 30% token dan mengelola kos. Bagian bagi hasil dari token yang belum terjual juga masuk ke pemilik lama (keputusan 16 November 2026) |
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
| Uji coba terbatas | POJK 3/2024 (regulatory sandbox) | Model baru diuji sebelum izin | Jalur awal yang dipilih: sandbox dengan properti percontohan |
| Pasar sekunder | POJK 23/2025 **[perlu verifikasi]** | Perdagangan wajib lewat pihak berizin dan aset tercantum di daftar bursa | Fase kedua, bersama pedagang berizin |
| Pembayaran | PBI 22/23/PBI/2020; PADG 24/1/PADG/2022 (QRIS) | KosBagi menjadi merchant penyedia jasa pembayaran berizin; QRIS maksimal Rp10 juta per transaksi **[perlu verifikasi: versi terkini]** | Midtrans; pembelian di atas 100 token hanya ditawari virtual account |
| APU-PPT dan KYC | POJK 8/2023 | Identitas investor diverifikasi sebelum membeli, transaksi mencurigakan dipantau | Bab 9 |
| Pelindungan konsumen | POJK 22/2023 | Risiko dan biaya diungkapkan, ada kanal pengaduan | Tab Risiko di halaman kos dan grafik potongan sewa di beranda |
| Data pribadi | UU 27/2022 | Data investor dan penghuni adalah data pribadi; blockchain publik tidak bisa dihapus | Tidak ada data pribadi on-chain (bab 9) |
| Pajak usaha kos | PP 34/2017; PP 20/2026 | Kos bukan objek PPh final sewa 10%, diperlakukan sebagai penghasilan usaha. PPh final 0,5% hanya untuk orang pribadi, PT perorangan, dan koperasi, jadi tidak tersedia bagi PT kustodian | Skenario dasar PPh badan 22%; fasilitas Pasal 31E di sensitivitas |
| Pajak daerah kos | UU 1/2022 | Pajak kos daerah dihapus, tetapi Pemkot Malang berupaya memberlakukannya kembali | Dipantau **[perlu verifikasi]** |
| Pajak transaksi token | PMK 50/2025 | Perlakuan pajak token aset riil belum jelas | **[perlu verifikasi]** |
| Pertanahan | UU 5/1960; PP 34/2016; PP 24/2016; Perda Kota Malang 4/2023 | Perseroan tidak bisa memegang Hak Milik; SHM diturunkan menjadi HGB atas nama kustodian | Biaya peralihan sekitar Rp140 juta per properti Rp1,8 miliar (PPh final 2,5%, BPHTB 5% setelah NPOPTKP Rp80 juta, jasa PPAT paling tinggi 0,5%), ditanggung pemilik lama ([proyeksi](proyeksi-keuangan.md) bagian 7); dikonfirmasi ke notaris/PPAT sebelum penerbitan pertama |
| Urun dana dan P2P | POJK 57/2020 jo. 16/2021; POJK 40/2024 | KosBagi menawarkan hak manfaat satu aset, bukan efek perusahaan, dan tidak menyalurkan pinjaman | Tidak berlaku, dengan catatan penggolongan akhir bergantung pada POJK aset ditokenisasi |

### Perizinan dan struktur

1. **Dua entitas.** PT KosBagi Teknologi menjalankan platform; PT KosBagi Properti menjadi kustodian sertifikat dan pemegang rekening penampungan bagi hasil, mengikuti struktur GORO yang lulus sandbox (Bisnis.com, 2026a).
2. **Sandbox OJK.** Mendaftar sebagai peserta regulatory sandbox dengan properti percontohan kos 20 kamar (Kos Sumbersari 01 adalah studi kasus prototipe), sambil menunggu POJK penawaran aset ditokenisasi.
3. **Mitra berizin.** Pembayaran lewat penyedia jasa pembayaran berizin; pasar sekunder nanti lewat bursa atau pedagang aset keuangan digital berizin.
4. **Pajak dan legal properti.** Skema pajak kustodian dan biaya peralihan hak dikonfirmasi ke konsultan pajak dan notaris sebelum penerbitan pertama.

Daftar cek verifikasi ada di [peta regulasi](../regulasi/peta-regulasi.md) bagian 6. Dua butirnya sudah dijawab di naskah yang dikumpulkan 24 November 2026: PPh final 0,5% tidak tersedia bagi PT kustodian (PP 20/2026), dan biaya peralihan hak sudah dihitung (bab 8, R16).

## 6. Model pendapatan

| Sumber | Besaran | Dibayar oleh | Kos Sumbersari 01 |
|---|---|---|---|
| Fee penawaran | 3% dari dana dihimpun, sekali | Pemilik, dipotong dari dana penawaran | Rp37.800.000 |
| Fee pengelolaan | 5% dari sewa kotor per bulan | Dipotong dari sewa sebelum pajak | Rp675.000 per bulan, Rp8.100.000 per tahun |
| Fee pasar sekunder | 0,5% per transaksi | Belum ditentukan | Fase kedua, tidak dihitung |

Biaya transaksi payment gateway ditanggung PT KosBagi Teknologi dan tidak dibebankan kepada penghuni. Virtual account Rp4.000 per transaksi ditambah PPN efektif 11% (Midtrans, 2026; Kementerian Keuangan, 2024) menjadi Rp4.440, atau sekitar 5,9% dari fee pengelolaan per kamar per bulan (Rp75.000). Untuk Kos Sumbersari 01, 108 pembayaran sewa per tahun memakan Rp479.520. QRIS bertarif 0,7% lebih mahal untuk sewa bulanan, sehingga proyeksi memakai virtual account. Aturan ini juga tertulis di [perjanjian pengelolaan dummy](dokumen-penerbitan/perjanjian-pengelolaan.md) Pasal 3.

### Skenario pajak

Skenario dasar memakai PPh badan 22% atas laba kustodian. Bila kustodian memperoleh fasilitas Pasal 31E UU PPh, yaitu pengurangan tarif 50% atas penghasilan dari peredaran bruto sampai Rp4,8 miliar (DDTCNews, 2024), bagi hasil naik menjadi Rp500,625 per token per bulan atau 6,0075% per tahun. Fasilitas ini berlaku penuh sampai sekitar 29 properti seukuran Kos Sumbersari 01. Skenario PPh final 0,5% di proposal (imbal hasil 6,705%) tidak lagi dipakai karena PP 20/2026 membatasinya untuk orang pribadi, PT perorangan, dan koperasi ([proyeksi keuangan](proyeksi-keuangan.md) bagian 7). Kedua angka masih di bawah imbal hasil SUN 10 tahun 7,66% (Kontan, 2026b), sehingga daya tarik token bertumpu pada modal kecil dan keterbukaan data sewa. Kenaikan nilai properti belum punya data sekunder **[perlu verifikasi]**. Hal ini masuk risiko pasar R15 di bab 8.

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

Bahan lengkap: [proyeksi keuangan](proyeksi-keuangan.md), memakai [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) untuk tingkat properti.

### Asumsi proyeksi

Proyeksi menghitung arus kas PT KosBagi Teknologi selama tahun 0 (persiapan) dan tiga tahun operasi, 2027 sampai 2029. Skenario dasar memakai 2, 5, dan 8 properti baru seukuran Kos Sumbersari 01. Properti baru rata-rata terbit di pertengahan tahun, sehingga hanya membayar enam bulan fee pengelolaan di tahun terbitnya, dan setiap properti dibeli rata-rata 252 investor dengan pembelian Rp5 juta.

Gaji Rp4,5 juta per orang per bulan, sekitar 120% UMK Kota Malang 2026 (Metrotvnews, 2025b), dibayar 13 kali termasuk THR. Biaya konsultan Rp3 juta per bulan mengikuti batas atas tarif konsultan pajak (Jurnal.id, t.t.), audit smart contract Rp125 juta berada dalam kisaran US$3.000 sampai US$15.000 untuk kontrak token sederhana (Sherlock, 2026; CyberScope, t.t.), dan virtual account Rp4.440 sudah termasuk PPN efektif 11% (Kementerian Keuangan, 2024). Biaya lain merupakan asumsi kelompok. Sewa dan biaya dianggap tetap selama tiga tahun, dan tingkat diskonto 20% berasal dari SUN 10 tahun 7,66% (Kontan, 2026b) ditambah premi risiko usaha rintisan sekitar 12 poin persen.

Empat asumsi biaya (virtual account, kepatuhan, ruang kerja, dan investasi awal) berubah dari versi P4 saat naskah final disusun. Perbandingan lama dan baru beserta dampaknya ada di [proyeksi keuangan](proyeksi-keuangan.md) bagian 2.

### Rencana anggaran biaya

Biaya sampai akhir tahun pertama skenario dasar Rp564,4 juta, terdiri atas investasi awal Rp165 juta, biaya tetap Rp351 juta, serta biaya penerbitan dan transaksi untuk dua properti pertama Rp48,4 juta. Biaya tetap adalah porsi terbesar (62%) dan tetap keluar walaupun belum ada properti baru, sehingga jumlah properti yang dikelola menentukan kapan KosBagi mulai untung.

| Uraian | Volume | Harga satuan | Total |
|---|---|---|---|
| **Investasi awal (tahun 0)** | | | |
| Pendirian PT KosBagi Teknologi dan PT KosBagi Properti | 2 paket | Rp7.500.000 | Rp15.000.000 |
| Audit smart contract | 1 paket | Rp125.000.000 | Rp125.000.000 |
| Persiapan regulatory sandbox OJK | 1 paket | Rp25.000.000 | Rp25.000.000 |
| Total investasi awal | | | **Rp165.000.000** |
| **Biaya tetap tahun 1** | | | |
| Gaji tim 4 orang, termasuk THR | 13 bulan | Rp18.000.000 | Rp234.000.000 |
| Infrastruktur (server, basis data, RPC, domain) | 12 bulan | Rp2.000.000 | Rp24.000.000 |
| Kepatuhan, konsultan pajak dan hukum | 12 bulan | Rp3.000.000 | Rp36.000.000 |
| Pemasaran umum | 12 bulan | Rp2.000.000 | Rp24.000.000 |
| Ruang kerja bersama | 12 bulan | Rp2.750.000 | Rp33.000.000 |
| Total biaya tetap | | | **Rp351.000.000** |
| **Biaya penerbitan dua properti** | | | |
| Penilaian properti oleh KJPP | 2 properti | Rp10.000.000 | Rp20.000.000 |
| Legal dan notaris | 2 properti | Rp5.000.000 | Rp10.000.000 |
| Pemasaran penawaran | 2 properti | Rp5.000.000 | Rp10.000.000 |
| Verifikasi e-KYC investor | 504 investor | Rp10.000 | Rp5.040.000 |
| Virtual account pembelian token | 504 transaksi | Rp4.440 | Rp2.237.760 |
| Gas whitelist KYC dan transfer token | 1.008 transaksi | Rp500 | Rp504.000 |
| Total biaya penerbitan | | | **Rp47.781.760** |
| **Biaya transaksi pengelolaan (dua properti, enam bulan)** | | | |
| Virtual account pembayaran sewa | 108 transaksi | Rp4.440 | Rp479.520 |
| Gas pencatatan sewa, biaya, dan periode | 180 transaksi | Rp500 | Rp90.000 |
| Total biaya transaksi pengelolaan | | | **Rp569.520** |
| **Jumlah total** | | | **Rp564.351.280** |

### Unit economics per properti

| Uraian | 10 kamar | 20 kamar |
|---|---|---|
| Dana dihimpun (70% nilai properti) | Rp1.260.000.000 | Rp2.520.000.000 |
| Fee penawaran 3% | Rp37.800.000 | Rp75.600.000 |
| Biaya penerbitan (KJPP, legal, pemasaran, e-KYC, virtual account, gas) | Rp23.890.880 | Rp27.781.760 |
| **Kontribusi penerbitan (sekali)** | **Rp13.909.120** | **Rp47.818.240** |
| Fee pengelolaan per tahun | Rp8.100.000 | Rp16.200.000 |
| Biaya transaksi pengelolaan per tahun | Rp569.520 | Rp1.103.040 |
| **Kontribusi pengelolaan per tahun** | **Rp7.530.480** | **Rp15.096.960** |
| Titik impas operasional | 70 properti aktif | 28 properti aktif |

Margin pengelolaan sekitar 93%, jadi persoalan KosBagi adalah skala, bukan biaya per transaksi. Properti 20 kamar menggandakan fee tanpa menggandakan biaya penilaian, legal, dan pemasaran, sehingga kontribusi penerbitannya 3,4 kali properti 10 kamar. Titik impas operasional, yaitu jumlah properti aktif yang kontribusi pengelolaannya menutup seluruh biaya tetap, baru tercapai pada 70 properti 10 kamar atau 28 properti 20 kamar ([proyeksi keuangan](proyeksi-keuangan.md) bagian 5).

### Proyeksi skenario dasar, NPV, dan balik modal

Arus kas dianggap sama dengan laba karena tidak ada penyusutan dan piutang, dan kerugian fiskal dapat dikompensasikan hingga lima tahun, sehingga tidak ada pajak yang dibayar selama rugi.

| Uraian | Tahun 0 | Tahun 1 (2027) | Tahun 2 (2028) | Tahun 3 (2029) |
|---|---|---|---|---|
| Properti baru | | 2 | 5 | 8 |
| Properti aktif akhir tahun | | 2 | 7 | 15 |
| Fee penawaran | | Rp75.600.000 | Rp189.000.000 | Rp302.400.000 |
| Fee pengelolaan | | Rp8.100.000 | Rp36.450.000 | Rp89.100.000 |
| **Total pendapatan** | | **Rp83.700.000** | **Rp225.450.000** | **Rp391.500.000** |
| Investasi awal | Rp165.000.000 | | | |
| Biaya penerbitan dan transaksi | | Rp48.351.280 | Rp122.017.240 | Rp197.391.760 |
| Biaya tim (4 orang) | | Rp234.000.000 | Rp234.000.000 | Rp234.000.000 |
| Biaya tetap lain | | Rp117.000.000 | Rp117.000.000 | Rp117.000.000 |
| **Total biaya** | **Rp165.000.000** | **Rp399.351.280** | **Rp473.017.240** | **Rp548.391.760** |
| Arus kas bersih | −Rp165.000.000 | −Rp315.651.280 | −Rp247.567.240 | −Rp156.891.760 |
| Arus kas kumulatif | −Rp165.000.000 | −Rp480.651.280 | −Rp728.218.520 | −Rp885.110.280 |

| Ukuran | Hasil |
|---|---|
| NPV 3 tahun (diskonto 20%) | **−Rp690.758.270** |
| Balik modal | Belum tercapai dalam tiga tahun |

Pendapatan naik dari Rp83,7 juta menjadi Rp391,5 juta, tetapi biaya tetap Rp351 juta membuat arus kas tetap negatif setiap tahun. Kebutuhan dana, yaitu arus kas kumulatif terendah, mencapai Rp885,1 juta, dan NPV tiga tahun −Rp690,8 juta. Proyeksi sengaja tidak menambahkan nilai sisa setelah tahun ketiga agar hasilnya tidak bergantung pada asumsi pertumbuhan jangka panjang.

### Analisis skenario

Proyeksi dasar dibandingkan dengan skenario konservatif (pertumbuhan lebih lambat) dan strategi kos 20 kamar:

| Ukuran | Konservatif | Dasar | Strategi kos 20 kamar |
|---|---|---|---|
| Properti baru tahun 1 sampai 3 | 1, 3, 5 (10 kamar) | 2, 5, 8 (10 kamar) | 3, 8, 12 (20 kamar) |
| Properti aktif akhir tahun 3 | 9 | 15 | 23 |
| Pendapatan tahun 3 | Rp241.650.000 | Rp391.500.000 | Rp1.182.600.000 |
| Laba (rugi) tahun 3 | −Rp232.506.280 | −Rp156.891.760 | Rp420.967.200 |
| Kebutuhan dana | Rp1.021.278.360 | Rp885.110.280 | Rp349.899.840 |
| **NPV 3 tahun (diskonto 20%)** | **−Rp779.022.529** | **−Rp690.758.270** | **Rp19.826.967** |
| IRR | Tidak ada | Tidak ada | 23,3% |
| Balik modal | Belum dalam 3 tahun | Belum dalam 3 tahun | Sekitar 2,5 tahun |

Pada strategi kos 20 kamar, KosBagi sudah laba Rp137,2 juta pada tahun kedua, IRR-nya 23,3% atau di atas tingkat diskonto 20%, dan modal kembali sekitar 2,5 tahun setelah operasi dimulai. Pendapatannya Rp251,1 juta, Rp718,2 juta, dan Rp1.182,6 juta di tahun 1 sampai 3. Rincian per tahunnya ada di [proyeksi keuangan](proyeksi-keuangan.md) bagian 6.

Hasil ini tetap sensitif. Bila 25% penawaran gagal, NPV skenario dasar turun Rp111,7 juta, dan bila biaya tetap naik 20%, NPV turun Rp147,9 juta. Okupansi 80% hampir tidak memengaruhi KosBagi (NPV turun Rp8,7 juta), tetapi menurunkan imbal hasil investor menjadi 4,68% per tahun.

| Skenario (satu asumsi diubah) | Laba tahun 3 | NPV |
|---|---|---|
| Dasar | −Rp156.891.760 | −Rp690.758.270 |
| Properti 20 kamar, tetap 2, 5, 8 properti baru | Rp197.612.480 | −Rp281.399.504 |
| Pertumbuhan optimis (4, 10, 16) | −Rp21.283.520 | −Rp510.995.707 |
| Biaya tetap −20% | −Rp86.691.760 | −Rp542.883.270 |
| Biaya tetap +20% | −Rp227.091.760 | −Rp838.633.270 |
| 25% penawaran gagal | −Rp253.200.580 | −Rp802.507.079 |
| Okupansi 80% | −Rp166.139.680 | −Rp699.437.926 |

Kesimpulan bab ini:

1. Dengan properti 10 kamar, fee 3% dan 5% belum menutup biaya tetap dalam tiga tahun. Proyeksi disajikan apa adanya, termasuk NPV negatifnya (keputusan 15 November 2026).
2. Fee 3% dan 5% baru menguntungkan bila KosBagi mengelola properti yang lebih besar. Karena itu, sejak tahap percontohan KosBagi memprioritaskan kos 20 kamar yang masih termasuk segmen 10 sampai 30 kamar. Dengan 3, 8, dan 12 properti baru 20 kamar, NPV 3 tahun Rp19,8 juta.
3. Pendanaan yang perlu disiapkan sekitar Rp525,4 juta, yaitu kebutuhan dana strategi Rp349,9 juta ditambah cadangan enam bulan biaya tetap Rp175,5 juta. Sumbernya bisa modal pendiri, hibah inkubator kampus, atau investor awal, dan belum ditentukan **[perlu verifikasi]**.

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
| R14 | Keuangan platform | Jumlah atau ukuran properti tidak menutup biaya tetap | Skenario dasar rugi tiga tahun pertama dengan kebutuhan dana Rp885,1 juta; strategi kos 20 kamar butuh Rp349,9 juta | Prioritas kos 20 sampai 30 kamar, tim kecil, pendanaan sekitar Rp525,4 juta disiapkan sampai titik impas | Proyeksi bab 7 |
| R15 | Pasar | Imbal hasil di bawah SUN 10 tahun (5,265% dibanding 7,66%) | Penawaran lambat terjual; 25% penawaran gagal menurunkan NPV Rp111,7 juta | Tonjolkan modal kecil dan keterbukaan data, skenario pajak yang lebih ringan, pengungkapan jujur | Penawaran yang tidak habis sampai batas waktu dibatalkan dan dana dikembalikan |
| R16 | Hukum dan biaya | Biaya peralihan hak sekitar Rp140 juta per properti Rp1,8 miliar (sekitar Rp144 juta untuk properti berikutnya karena NPOPTKP hanya untuk perolehan pertama) | Dana bersih pemilik turun menjadi Rp1,08 miliar, atau 85,9% dari dana dihimpun | Ditanggung pemilik lama dan diungkapkan sejak awal di halaman pemilik; dikonfirmasi ke notaris/PPAT | FAQ dan simulasi dana di `/pemilik` |

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

Data di blockchain publik tidak bisa dihapus, padahal UU PDP memberi hak untuk menghapus dan memperbaiki data. Karena itu tidak ada data pribadi di blockchain: bila investor meminta datanya dihapus, baris di basis data dihapus atau dianonimkan, dan catatan on-chain yang tersisa tidak lagi bisa dihubungkan ke orang itu. Di produksi, KosBagi juga menunjuk petugas pelindungan data (Pasal 53), menyusun pemberitahuan privasi, dan menyiapkan pemberitahuan tertulis paling lambat 3 × 24 jam bila terjadi kegagalan pelindungan data (Pasal 46).

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
| Persiapan | Tahun 0 (2026 sampai 2027) | Pendirian PT KosBagi Teknologi dan PT KosBagi Properti, audit smart contract, pendaftaran sandbox OJK, konfirmasi skema pajak dan biaya peralihan hak | Investasi awal Rp165 juta, bagian dari pendanaan sekitar Rp525,4 juta (bab 7) |
| Percontohan | Tahun 1 (2027) | Tiga kos 20 kamar di sandbox; virtual account per kamar dan e-KYC sungguhan. Kos Sumbersari 01 tetap studi kasus prototipe dan tidak dihitung dalam proyeksi strategi | Persetujuan sandbox |
| Skala lokal | Tahun 2 (2028) | Delapan properti baru, prioritas kos 20 kamar; pencairan bagi hasil lewat disbursement; voting on-chain | Aturan tokenisasi aset nyata terbit |
| Pasar sekunder | Tahun 3 (2029) | Dua belas properti baru; pasar sekunder bersama pedagang aset keuangan digital berizin dengan fee 0,5% | Izin pedagang mitra, aset tercantum di daftar bursa |

Jumlah properti baru per tahun mengikuti strategi kos 20 kamar (3, 8, 12). Ketiga properti tahun 1 adalah kos 20 kamar. Syarat ini ketat: bila salah satu properti tahun 1 hanya 10 kamar, NPV strategi menjadi −Rp21,2 juta ([proyeksi keuangan](proyeksi-keuangan.md) bagian 6). Roadmap di draf naskah sempat menulis "Kos Sumbersari 01 dan dua kos 20 kamar"; kalimat itu diperbaiki 24 November 2026 sebelum dikumpulkan ([log ide 24 November 2026](../log-ide/2026-11-24-keputusan-akhir-progress-5.md) K4).

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

Target tahun 1 sampai 3 mengikuti strategi kos 20 kamar, dengan skenario dasar sebagai batas bawah. Target operasional adalah usulan jalur 1 **[perlu verifikasi tim]**. Kolom terakhir menunjukkan cara mengukurnya; sebagian sudah bisa dibaca dari prototipe.

| Area | KPI | Target | Sumber data |
|---|---|---|---|
| Properti | Properti aktif di akhir tahun 1 sampai 3 | 3, 11, 23 (minimal 2, 7, 15) | Basis data properti |
| Properti | Okupansi rata-rata | ≥ 90% (asumsi A03) | Status kamar pengelola |
| Penawaran | Dana dihimpun per properti | Rp1.260.000.000 per properti 10 kamar atau Rp2.520.000.000 per properti 20 kamar, habis sebelum batas waktu | Penawaran dan pembelian `BUY-` |
| Penawaran | Penawaran gagal | ≤ 25% (batas sensitivitas bab 7) | Penawaran berstatus dibatalkan |
| Sewa | Sewa lunas sebelum jatuh tempo | ≥ 95% tagihan **[perlu verifikasi tim]** | Tagihan dan waktu bayar |
| Sewa | Sewa yang dibayar lewat platform | 100% kamar terisi | Kamar terisi dibanding sewa tercatat |
| Keterbukaan | Pembayaran lunas yang tercatat on-chain saat periode ditutup | 100% (syarat tutup periode) | Syarat penutupan di `/admin/periode` |
| Keterbukaan | Jeda dari notifikasi Midtrans sampai tercatat di Sepolia | Median ≤ 2 menit **[perlu verifikasi tim]** | Waktu pembayaran dan blok transaksi |
| Keterbukaan | Selisih rekonsiliasi saat periode ditutup | 0, setiap selisih ditindaklanjuti ≤ 2 hari kerja | `/admin/rekonsiliasi` |
| Keuangan | Pendapatan fee tahun 1 sampai 3 | Rp251.100.000; Rp718.200.000; Rp1.182.600.000 (minimal Rp83.700.000; Rp225.450.000; Rp391.500.000) | Fee penawaran dan fee pengelolaan |
| Keuangan | Imbal hasil investor | ≥ 5,265% per tahun pada skema pajak dasar | `closePeriod` per periode |
| Keuangan | Biaya operasional terhadap sewa kotor | ≤ 20% (asumsi A10) | Biaya tercatat per periode |
| Kepatuhan | Pembeli token yang lolos KYC sebelum membeli | 100% (dijamin kontrak) | Whitelist `KosToken` |

## Daftar pustaka

- Bisnis.com (2025) *OJK Perketat Pengaturan Perdagangan Aset Keuangan Digital, Kripto cs.* Tersedia di: https://market.bisnis.com/read/20251204/94/1934197/ojk-perketat-pengaturan-perdagangan-aset-keuangan-digital-kripto-cs (Diakses: 15 Oktober 2026).
- Bisnis.com (2026a) *OJK Setujui 29 Entitas Kripto, Empat Perusahaan Lulus Sandbox.* Tersedia di: https://market.bisnis.com/read/20260304/94/1957543/ojk-setujui-29-entitas-kripto-empat-perusahaan-lulus-sandbox (Diakses: 15 Oktober 2026).
- ANTARA (2013) *60 Persen Mahasiswa UB dari Luar Jatim*, 21 Juni. Tersedia di: https://jogja.antaranews.com/berita/312983/60-persen-mahasiswa-ub-dari-luar-jatim (Diakses: 22 November 2026).
- Brighton Real Estate (2026) *Rumah Kos + Toko Dekat Suhat, Rukos Eksklusif Dekat UB (Universitas Brawijaya).* Tersedia di: https://www.brighton.co.id/cari-properti/view/lowokwaru-57 (Diakses: 15 Oktober 2026).
- Buterin, V. (2014) *Ethereum White Paper.* Tersedia di: https://ethereum.org/en/whitepaper (Diakses: 15 Oktober 2026).
- CyberScope (t.t.) *How Much Does It Cost to Audit a Smart Contract?* Tersedia di: https://www.cyberscope.io/blog/how-much-does-it-cost-to-audit-a-smart-contract (Diakses: 22 November 2026).
- Databoks (2026) *Investor Muda Mendominasi Pasar Modal Indonesia pada Agustus 2026*, 29 September. Tersedia di: https://databoks.katadata.co.id/datapublish/2026/09/29/investor-muda-mendominasi-pasar-modal-indonesia-pada-agustus-2026 (Diakses: 22 November 2026).
- DDTCNews (2024) *Diskon Tarif Pasal 31E UU PPh Tak Ada Batas Waktu Asal Penuhi Kriteria*, 29 April. Tersedia di: https://news.ddtc.co.id/berita/nasional/1802253/diskon-tarif-pasal-31e-uu-pph-tak-ada-batas-waktu-asal-penuhi-kriteria (Diakses: 3 November 2026).
- Investortrust (2026) *Di Tengah Polemik Kripto Haram atau Halal, OJK Buka Peluang Pembentukan Daftar Token Syariah.* Tersedia di: https://investortrust.id/market/96087/di-tengah-polemik-kripto-haram-atau-halal-ojk-buka-peluang-pembentukan-daftar-token-syariah (Diakses: 15 Oktober 2026).
- Jurnal.id (t.t.) *Jasa Konsultan Pajak: Layanan, Tarif, dan Tips Memilihnya.* Tersedia di: https://www.jurnal.id/id/blog/jasa-konsultan-pajak-layanan-tarif-dan-tips-memilihnya/ (Diakses: 22 November 2026).
- Kementerian Keuangan (2024) *Peraturan Menteri Keuangan Nomor 131 Tahun 2024.* Tersedia di: https://www.pajak.go.id/id/artikel/pmk-1312024-tarif-ppn-sebelas-dua-belas (Diakses: 22 November 2026).
- Kompas.com (2025) *GORO Lulus Sandbox OJK, Perkuat Akses Investasi Properti lewat Tokenisasi*, 19 November. Tersedia di: https://money.kompas.com/read/2025/11/19/223241026/goro-lulus-sandbox-ojk-perkuat-akses-investasi-properti-lewat-tokenisasi (Diakses: 22 November 2026).
- Kontan (2026a) *Urun Dana Bizhare Terapkan Strategi Ini Guna Dorong Kinerja hingga Akhir 2026.* Tersedia di: https://keuangan.kontan.co.id/news/urun-dana-bizhare-terapkan-strategi-ini-guna-dorong-kinerja-hingga-akhir-2026 (Diakses: 15 Oktober 2026).
- Kontan (2026b) *Yield SUN Tembus 7,66%, Pembiayaan Utang Pemerintah Makin Berat*, 28 Oktober. Tersedia di: https://investasi.kontan.co.id/news/yield-sun-tembus-766-pembiayaan-utang-pemerintah-makin-berat (Diakses: 3 November 2026).
- KrASIA (2023) *Unlocking Access to Real Estate: GORO's Tokenization of Rental Properties in Indonesia.* Tersedia di: https://kr-asia.com/unlocking-access-to-real-estate-goros-tokenization-of-rental-properties-in-indonesia (Diakses: 15 Oktober 2026).
- Mamikos (2022) *Pakai Aplikasi Mamikos, Pemilik Kos Tinggal Duduk Manis.* Tersedia di: https://mamikos.com/info/pakai-aplikasi-mamikos/ (Diakses: 15 Oktober 2026).
- Mamikos (2026) *Biaya Hidup Mahasiswa Kuliah di Unibraw.* Tersedia di: https://mamikos.com/info/biaya-hidup-mahasiswa-kuliah-di-unibraw/ (Diakses: 15 Oktober 2026).
- Metrotvnews (2025a) *Pemkot Malang Kehilangan Potensi PAD Rp8 Miliar dari Pajak Indekos*, 12 Juni. Tersedia di: https://www.metrotvnews.com/read/NP6C3V8L-pemkot-malang-kehilangan-potensi-pad-rp8-miliar-dari-pajak-indekos (Diakses: 22 November 2026).
- Metrotvnews (2025b) *Resmi Naik, UMK Kota Malang 2026 Jadi Rp3,7 Juta*, 29 Desember. Tersedia di: https://www.metrotvnews.com/read/kj2CDPPO-resmi-naik-umk-kota-malang-2026-jadi-rp3-7-juta (Diakses: 3 November 2026).
- Midtrans (2026) *Pricing.* Tersedia di: https://midtrans.com/pricing (Diakses: 3 November 2026).
- Proposal Tugas Akhir Kelompok 9 (2026) *KosBagi.* Mata kuliah Teknologi Blockchain dan Platform Keuangan Dijital, Fakultas Ilmu Komputer, Universitas Brawijaya.
- RCTI+ (2026) *Maksimalkan Inklusivitas Keuangan, OJK Siapkan Regulasi Aset Riil Tertokenisasi.* Tersedia di: https://www.rctiplus.com/news/detail/ekonomi/5490379/maksimalkan-inklusivitas-keuangan--ojk-siapkan-regulasi-aset-riil-tertokenisasi (Diakses: 15 Oktober 2026).
- Sherlock (2026) *Smart Contract Audit Pricing: A Market Reference for 2026.* Tersedia di: https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026 (Diakses: 22 November 2026).
- TIMES Indonesia (2022) *Jumlah Mahasiswa Baru di Perguruan Tinggi Malang, Universitas Brawijaya Tertinggi.* Tersedia di: https://timesindonesia.co.id/pendidikan/425231/jumlah-mahasiswa-baru-di-perguruan-tinggi-malang-universitas-brawijaya-tertinggi (Diakses: 15 Oktober 2026).
- Wati, S., Muchsin, S. dan Hayat (2019) 'Pengelolaan Pajak Rumah Kos di Kota Malang dalam Meningkatkan Pendapatan Asli Daerah', *Jurnal Respon Publik*, 13(4), hlm. 19-24. Tersedia di: https://jim.unisma.ac.id/index.php/rpp/article/view/3578 (Diakses: 22 November 2026).

Sumber regulasi (UU, POJK, PBI, PP, PMK) tercantum lengkap di [peta regulasi](../regulasi/peta-regulasi.md) bagian 7, dan sumber pajak, biaya peralihan hak, PP 20/2026, serta kompensasi kerugian fiskal (UU 36/2008) di [proyeksi keuangan](proyeksi-keuangan.md) bagian 9. Penggunaan alat AI dicatat di [pernyataan AI](../pernyataan-ai.md); naskah PDF/docx yang dikumpulkan memuat lampiran Pernyataan Penggunaan AI khusus business case.
