# Proyeksi Keuangan 3 Tahun KosBagi

Status: final P5, 24 November 2026, disamakan dengan business case yang dikumpulkan 24 November 2026 (draf P3: 3 November 2026). Bahan bab 7 [business case](business-case.md).

Dokumen ini memproyeksikan arus kas PT KosBagi Teknologi (platform) selama tiga tahun operasi, lalu menghitung rencana anggaran biaya, unit economics, titik impas (BEP), NPV, skenario, dan sensitivitasnya. Angka tingkat properti dan bagi hasil investor ada di [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md); dokumen ini memakai asumsi yang sama dan menambah asumsi biaya platform. Asumsi biaya yang berubah pada 24 November 2026 beserta alasannya ada di bagian 2.

Semua angka adalah asumsi untuk tugas akhir, bukan rencana usaha yang sudah divalidasi. Butir yang belum punya sumber ditandai **[perlu verifikasi]**. Setiap hasil bisa dihitung ulang dengan kalkulator dari tabel asumsi di bagian 2.

## 1. Ringkasan

Skenario dasar, properti baru seukuran Kos Sumbersari 01 (10 kamar):

| Ukuran | Tahun 1 (2027) | Tahun 2 (2028) | Tahun 3 (2029) |
|---|---|---|---|
| Properti baru | 2 | 5 | 8 |
| Properti aktif di akhir tahun | 2 | 7 | 15 |
| Pendapatan | Rp83.700.000 | Rp225.450.000 | Rp391.500.000 |
| Laba (rugi) sebelum pajak | −Rp315.651.280 | −Rp247.567.240 | −Rp156.891.760 |

Skenario dasar dibanding strategi kos 20 kamar:

| Ukuran | Skenario dasar | Strategi kos 20 kamar |
|---|---|---|
| Properti baru tahun 1 sampai 3 | 2, 5, 8 (10 kamar) | 3, 8, 12 (20 kamar) |
| Investasi awal tahun 0 | Rp165.000.000 | Rp165.000.000 |
| Pendapatan tahun 3 | Rp391.500.000 | Rp1.182.600.000 |
| Laba (rugi) tahun 3 | −Rp156.891.760 | Rp420.967.200 |
| Kebutuhan dana sampai akhir tahun 3 | Rp885.110.280 | Rp349.899.840 |
| NPV 3 tahun, tingkat diskonto 20% | −Rp690.758.270 | Rp19.826.967 |
| IRR | Tidak ada | 23,3% |
| Balik modal | Belum tercapai dalam 3 tahun | Sekitar 2,5 tahun setelah operasi dimulai |

| Ukuran | Hasil |
|---|---|
| Biaya tetap per tahun dengan tim 4 orang | Rp351.000.000 |
| Rencana anggaran biaya sampai akhir tahun 1, skenario dasar (bagian 4) | Rp564.351.280 |
| BEP: properti aktif yang menutup biaya tetap tanpa penerbitan baru | 70 properti seukuran Kos Sumbersari 01, atau 28 properti 20 kamar |
| Pendanaan yang disarankan | Rp525.399.840: kebutuhan dana strategi Rp349.899.840 ditambah cadangan enam bulan biaya tetap Rp175.500.000 |

Kesimpulan:

1. Dengan properti seukuran Kos Sumbersari 01, model fee proposal (3% penawaran dan 5% pengelolaan) belum menutup biaya tetap Rp351 juta per tahun dalam tiga tahun. Fee pengelolaan satu properti hanya Rp8,1 juta per tahun.
2. Margin per properti tinggi (93,0% untuk pengelolaan), jadi masalahnya skala, bukan biaya per transaksi. Ukuran properti adalah pengungkit terbesar: properti 20 kamar menggandakan fee tanpa menggandakan biaya penerbitan.
3. Strategi: sejak tahap percontohan, prioritaskan kos 20 kamar, yang masih termasuk segmen 10 sampai 30 kamar (proposal Tabel 2.3). Dengan 3, 8, dan 12 properti baru 20 kamar, NPV 3 tahun Rp19,8 juta, IRR 23,3%, dan modal kembali sekitar 2,5 tahun. Pendanaan yang perlu disiapkan sekitar Rp525,4 juta. Sumbernya bisa modal pendiri, hibah inkubator kampus, atau investor awal, dan belum ditentukan **[perlu verifikasi]**.

## 2. Asumsi

Asumsi properti A01 sampai A15 ada di [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) bagian 1. Kolom Dasar: **Proposal**, **Data sekunder** (dengan sumber), **Asumsi kelompok** (belum bersumber), atau **Turunan**.

### Waktu dan pertumbuhan

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| P01 | Horizon | Tahun 0 (persiapan), tahun 1 sampai 3 (2027 sampai 2029) | Ketentuan tugas: proyeksi 3 tahun |
| P02 | Profil properti rata-rata | Sama dengan Kos Sumbersari 01: 10 kamar, sewa kotor Rp162.000.000 per tahun, dana dihimpun Rp1.260.000.000 | A01 sampai A08. Batas bawah segmen 10 sampai 30 kamar (proposal Tabel 2.3), jadi konservatif. Sewa Rp1,5 juta per bulan sejalan dengan kos eksklusif sekitar UB yang umumnya di atas Rp1 juta per bulan (Mamikos, 2026) |
| P03 | Properti baru per tahun | Skenario dasar 2, 5, 8. Strategi kos 20 kamar 3, 8, 12 (sama dengan 1,5 kali skenario dasar, dibulatkan) | Asumsi kelompok. Skenario dasar memakai properti seukuran Kos Sumbersari 01. Di strategi, ketiga properti tahun 1 adalah kos 20 kamar; Kos Sumbersari 01 tetap studi kasus prototipe dan tidak dihitung. Diuji di bagian 6 |
| P04 | Waktu terbit | Rata-rata pertengahan tahun, jadi properti baru membayar fee pengelolaan 6 bulan di tahun terbitnya | Asumsi kelompok |
| P05 | Penawaran berhasil | 100% | Asumsi kelompok. Penawaran gagal diuji di bagian 6 |
| P06 | Sewa dan okupansi | Tetap selama 3 tahun, tanpa kenaikan sewa maupun inflasi biaya | Asumsi kelompok, menyederhanakan |

### Biaya per properti

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| P07 | Rata-rata satu pembelian token | Rp5.000.000, jadi 252 pembelian per properti 10 kamar | Titik tengah modal segmen investor Rp100 ribu sampai Rp10 juta (proposal Tabel 2.3) |
| P08 | Biaya virtual account Midtrans | Rp4.440 per transaksi: Rp4.000 belum termasuk PPN (Midtrans, 2026), ditambah PPN efektif 11% | Data sekunder. PMK 131/2024 menetapkan PPN 12% dengan dasar pengenaan 11/12 untuk barang dan jasa yang tidak tergolong mewah, sehingga tarif efektifnya 11% (Kementerian Keuangan, 2024) |
| P09 | Metode bayar | Virtual account untuk sewa dan pembelian token, karena QRIS 0,7% per transaksi (Midtrans, 2026) lebih mahal untuk nominal di atas sekitar Rp634.000 (Rp4.440 ÷ 0,7%) | Turunan dari P08 |
| P10 | Verifikasi e-KYC | Rp10.000 per investor | Asumsi kelompok **[perlu verifikasi]** |
| P11 | Gas jaringan produksi | Rp500 per transaksi | Asumsi kelompok untuk jaringan EVM berbiaya rendah. Prototipe memakai Sepolia yang gratis; jaringan produksi belum dipilih **[perlu verifikasi]** |
| P12 | Penilaian properti oleh KJPP | Rp10.000.000 per properti | Asumsi kelompok **[perlu verifikasi]** |
| P13 | Legal dan notaris per properti | Rp5.000.000, di luar biaya peralihan hak | Asumsi kelompok **[perlu verifikasi]** |
| P14 | Pemasaran satu penawaran | Rp5.000.000 | Asumsi kelompok |
| P15 | Biaya transaksi payment gateway | Ditanggung PT KosBagi Teknologi, penghuni tidak dikenai biaya | Proposal Tabel 2.5 (struktur biaya) dan bagian 2.9; [perjanjian pengelolaan dummy](dokumen-penerbitan/perjanjian-pengelolaan.md) Pasal 3 |
| P16 | Biaya peralihan hak ke kustodian | Ditanggung pemilik lama, tidak masuk biaya KosBagi. Rinciannya di bagian 7 | Keputusan tim, 15 November 2026 |

### Biaya tetap dan pendanaan

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| P17 | Tim | 3 orang inti (produk dan teknologi, operasional dan kepatuhan, pemasaran dan kemitraan) ditambah 1 staf operasional per 20 properti aktif, dibulatkan ke atas | Asumsi kelompok. Pengelola harian tiap kos dibayar dari biaya operasional 20% properti (A10), bukan oleh KosBagi |
| P18 | Biaya per orang | Rp4.500.000 per bulan × 13 bulan (termasuk THR) = Rp58.500.000 per tahun | Sekitar 120% UMK Kota Malang 2026 Rp3.736.101 (Metrotvnews, 2025) untuk menampung iuran BPJS dan tunjangan. Persentase tambahan adalah asumsi kelompok |
| P19 | Infrastruktur (server, basis data, RPC, domain) | Rp2.000.000 per bulan | Asumsi kelompok **[perlu verifikasi]** |
| P20 | Kepatuhan dan hukum (konsultan pajak dan hukum, pelaporan sandbox) | Rp3.000.000 per bulan, atau Rp36.000.000 per tahun | Data sekunder: batas atas tarif jasa konsultan pajak Rp1.000.000 sampai Rp3.000.000 per bulan (Jurnal.id, t.t.) |
| P21 | Pemasaran umum | Rp2.000.000 per bulan | Asumsi kelompok |
| P22 | Ruang kerja bersama | Rp2.750.000 per bulan, atau Rp33.000.000 per tahun | Asumsi kelompok untuk ruang kerja bersama tim empat orang **[perlu verifikasi]** |
| P23 | Investasi awal tahun 0 | Rp165.000.000: pendirian dua PT Rp15.000.000, audit smart contract Rp125.000.000, persiapan regulatory sandbox OJK Rp25.000.000 | Audit: kontrak token sederhana sekitar US$3.000 sampai US$15.000 (Sherlock, 2026; CyberScope, t.t.), dan Rp125 juta berada di dalam kisaran itu. Pendirian dan persiapan sandbox: asumsi kelompok **[perlu verifikasi]** |
| P24 | Tingkat diskonto | 20% per tahun | Imbal hasil SUN tenor 10 tahun 7,66% pada 28 Oktober 2026 (Kontan, 2026), ditambah premi risiko usaha rintisan sekitar 12 poin persen (asumsi kelompok) |
| P25 | Pajak penghasilan KosBagi | Rp0 selama rugi | Kerugian fiskal dapat dikompensasikan hingga lima tahun menurut UU PPh (Republik Indonesia, 2008) |

Biaya tetap inti per tahun = 3 × Rp58.500.000 + Rp24.000.000 (P19) + Rp36.000.000 (P20) + Rp24.000.000 (P21) + Rp33.000.000 (P22) = **Rp292.500.000**. Dengan tim 4 orang seperti skenario dasar, biaya tetapnya 4 × Rp58.500.000 + Rp117.000.000 = **Rp351.000.000** per tahun.

### Perubahan asumsi 24 November 2026

Business case yang dikumpulkan 24 November 2026 memakai empat asumsi biaya yang berbeda dari draf P3. Dokumen ini disamakan dengannya ([log ide 24 November 2026](../log-ide/2026-11-24-keputusan-akhir-progress-5.md) K1).

| Kode | Asumsi | Draf P3 (3 November 2026) | Final (24 November 2026) | Alasan dan sumber |
|---|---|---|---|---|
| P08 | Virtual account | Rp4.480: Rp4.000 + PPN 12% sebagai batas atas **[perlu verifikasi]** | Rp4.440: Rp4.000 + PPN efektif 11% | Tarif efektif PPN atas jasa yang tidak tergolong mewah adalah 11% (Kementerian Keuangan, 2024) |
| P20 | Kepatuhan dan hukum | Rp30.000.000 per tahun, asumsi kelompok **[perlu verifikasi]** | Rp36.000.000 per tahun | Mengikuti batas atas tarif konsultan pajak Rp3.000.000 per bulan (Jurnal.id, t.t.) |
| P22 | Ruang kerja bersama | Rp1.000.000 per bulan (Rp12.000.000 per tahun) | Rp2.750.000 per bulan (Rp33.000.000 per tahun) | Asumsi kelompok untuk tim empat orang. Naskah final tidak mencantumkan sumber luar untuk angka ini |
| P23 | Investasi awal | Rp115.000.000, dengan audit smart contract Rp75.000.000 | Rp165.000.000, dengan audit Rp125.000.000 | Kisaran biaya audit kontrak token sederhana US$3.000 sampai US$15.000 (Sherlock, 2026; CyberScope, t.t.) |

Dampaknya pada hasil:

| Hasil | Draf P3 | Final |
|---|---|---|
| Biaya tetap inti per tahun | Rp265.500.000 | Rp292.500.000 |
| Biaya tetap dengan tim 4 orang | Rp324.000.000 | Rp351.000.000 |
| Kontribusi pengelolaan per properti 10 kamar per tahun | Rp7.526.160 | Rp7.530.480 |
| Laba (rugi) tahun 3, skenario dasar | −Rp130.019.920 | −Rp156.891.760 |
| Kebutuhan dana, skenario dasar | Rp754.332.760 | Rp885.110.280 |
| NPV 3 tahun, skenario dasar | −Rp584.026.337 | −Rp690.758.270 |
| BEP operasional | 59 properti 10 kamar, atau 26 properti 20 kamar | 70 properti 10 kamar, atau 28 properti 20 kamar |
| Properti baru 20 kamar agar NPV ≥ 0 (pola skenario dasar) | 3, 6, 10 | 3, 8, 12 |

Selisih NPV skenario dasar, −Rp106.731.933, bisa ditelusuri ke tiga penyebab:

- investasi awal naik Rp50.000.000 di tahun 0, jadi NPV turun Rp50.000.000;
- biaya tetap naik Rp27.000.000 per tahun (P20 +Rp6.000.000, P22 +Rp21.000.000); jumlah faktor diskonto tahun 1 sampai 3 adalah 1/1,2 + 1/1,44 + 1/1,728 = 2,1065, jadi NPV turun Rp27.000.000 × 2,1065 = Rp56.875.000;
- virtual account Rp40 lebih murah per transaksi; selama tiga tahun penghematannya bernilai kini Rp143.067.

Jumlahnya −Rp50.000.000 − Rp56.875.000 + Rp143.067 = −Rp106.731.933. Dengan cara yang sama, kebutuhan dana naik Rp50.000.000 + 3 × Rp27.000.000 − Rp222.480 (penghematan virtual account tanpa diskonto) = Rp130.777.520.

## 3. Unit economics per properti

### Penerbitan, sekali per properti

| Pos | Hitungan | Nilai |
|---|---|---|
| Dana dihimpun | 12.600 token × Rp100.000 | Rp1.260.000.000 |
| **Fee penawaran** | 3% × dana dihimpun | **Rp37.800.000** |
| Penilaian KJPP | P12 | Rp10.000.000 |
| Legal dan notaris | P13 | Rp5.000.000 |
| Pemasaran penawaran | P14 | Rp5.000.000 |
| Verifikasi e-KYC | 252 investor × Rp10.000 | Rp2.520.000 |
| Virtual account pembelian | 252 × Rp4.440 | Rp1.118.880 |
| Gas whitelist KYC dan transfer token | 252 × 2 transaksi × Rp500 | Rp252.000 |
| **Biaya penerbitan** | jumlah enam baris di atas | **Rp23.890.880** |
| **Kontribusi penerbitan** | Rp37.800.000 − Rp23.890.880 | **Rp13.909.120** (36,8% dari fee) |

### Pengelolaan, per tahun per properti aktif

| Pos | Hitungan | Nilai |
|---|---|---|
| **Fee pengelolaan** | 5% × Rp162.000.000 | **Rp8.100.000** |
| Virtual account sewa | 9 kamar × 12 bulan = 108 pembayaran × Rp4.440 | Rp479.520 |
| Gas | (108 `recordRent` + 60 `recordExpense` + 12 `closePeriod`) × Rp500 | Rp90.000 |
| **Kontribusi pengelolaan** | Rp8.100.000 − Rp569.520 | **Rp7.530.480** (93,0% dari fee) |
| Bagian biaya staf operasional | Rp58.500.000 ÷ 20 properti | Rp2.925.000 |
| Kontribusi setelah staf operasional | Rp7.530.480 − Rp2.925.000 | Rp4.605.480 |

Asumsi lima nota biaya per bulan (60 `recordExpense` per tahun) adalah asumsi kelompok.

Satu properti seukuran Kos Sumbersari 01 menyumbang Rp13,9 juta sekali dan Rp7,5 juta per tahun, atau Rp36,5 juta dalam tiga tahun pertamanya. Biaya virtual account per pembayaran sewa (Rp4.440) hanya 5,9% dari fee pengelolaan per kamar per bulan (5% × Rp1.500.000 = Rp75.000).

### Properti 20 kamar

Dengan sewa per kamar dan nilai per kamar yang sama (A02 dan A04), properti 20 kamar menghimpun Rp2.520.000.000 dari 504 pembeli dan menerima 216 pembayaran sewa per tahun:

| Pos | 10 kamar | 20 kamar |
|---|---|---|
| Dana dihimpun (70% nilai properti) | Rp1.260.000.000 | Rp2.520.000.000 |
| Fee penawaran | Rp37.800.000 | Rp75.600.000 |
| Biaya penerbitan | Rp23.890.880 | Rp27.781.760 |
| Kontribusi penerbitan | Rp13.909.120 | Rp47.818.240 |
| Fee pengelolaan per tahun | Rp8.100.000 | Rp16.200.000 |
| Biaya transaksi pengelolaan per tahun | Rp569.520 | Rp1.103.040 |
| Kontribusi pengelolaan per tahun | Rp7.530.480 | Rp15.096.960 |

Biaya penilaian, legal, dan pemasaran tidak berlipat saat jumlah kamar berlipat, jadi kontribusi penerbitan naik 3,4 kali.

## 4. Proyeksi 3 tahun, skenario dasar

### Rencana anggaran biaya sampai akhir tahun 1

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
| **Jumlah** | | | **Rp564.351.280** |

Biaya tetap Rp351 juta adalah porsi terbesar (62%) dan tetap keluar walaupun belum ada properti baru, jadi jumlah properti yang dikelola menentukan kapan KosBagi mulai untung.

### Proyeksi

Arus kas dianggap sama dengan laba sebelum pajak, karena tidak ada penyusutan, piutang, atau pajak yang dibayar (P25).

| Pos | Rumus | Tahun 0 | Tahun 1 | Tahun 2 | Tahun 3 |
|---|---|---|---|---|---|
| Properti baru | P03 | | 2 | 5 | 8 |
| Properti aktif di akhir tahun | | | 2 | 7 | 15 |
| Fee penawaran | baru × Rp37.800.000 | | Rp75.600.000 | Rp189.000.000 | Rp302.400.000 |
| Fee pengelolaan | aktif awal tahun × Rp8.100.000 + baru × Rp4.050.000 | | Rp8.100.000 | Rp36.450.000 | Rp89.100.000 |
| **Pendapatan** | | | **Rp83.700.000** | **Rp225.450.000** | **Rp391.500.000** |
| Biaya penerbitan | baru × Rp23.890.880 | | Rp47.781.760 | Rp119.454.400 | Rp191.127.040 |
| Biaya transaksi pengelolaan | aktif awal tahun × Rp569.520 + baru × Rp284.760 | | Rp569.520 | Rp2.562.840 | Rp6.264.720 |
| **Margin kontribusi** | | | **Rp35.348.720** | **Rp103.432.760** | **Rp194.108.240** |
| Jumlah orang | P17 | | 4 | 4 | 4 |
| Biaya tim | orang × Rp58.500.000 | | Rp234.000.000 | Rp234.000.000 | Rp234.000.000 |
| Biaya tetap lain | P19 sampai P22 | | Rp117.000.000 | Rp117.000.000 | Rp117.000.000 |
| Investasi awal | P23 | Rp165.000.000 | | | |
| **Laba (rugi) = arus kas** | | **−Rp165.000.000** | **−Rp315.651.280** | **−Rp247.567.240** | **−Rp156.891.760** |
| Arus kas kumulatif | | −Rp165.000.000 | −Rp480.651.280 | −Rp728.218.520 | −Rp885.110.280 |

Kebutuhan dana adalah arus kas kumulatif terendah, yaitu Rp885.110.280 di akhir tahun 3.

### NPV

NPV = Σ arus kas tahun ke-t ÷ (1 + 20%)^t, untuk t = 0 sampai 3.

| Tahun | Arus kas | Faktor diskonto | Nilai kini |
|---|---|---|---|
| 0 | −Rp165.000.000 | 1,0000 | −Rp165.000.000 |
| 1 | −Rp315.651.280 | 0,8333 | −Rp263.042.733 |
| 2 | −Rp247.567.240 | 0,6944 | −Rp171.921.694 |
| 3 | −Rp156.891.760 | 0,5787 | −Rp90.793.843 |
| **NPV** | | | **−Rp690.758.270** |

Nilai kini dihitung dengan pecahan eksak lalu dibulatkan ke rupiah; faktor diskonto di tabel dibulatkan ke empat desimal hanya untuk ditampilkan.

NPV tiga tahun tanpa nilai sisa wajar negatif untuk platform yang baru mulai, karena biaya tim sudah penuh sejak tahun 1 sedangkan fee pengelolaan baru menumpuk seiring jumlah properti. Proyeksi ini sengaja tidak menambahkan nilai sisa supaya hasilnya tidak bergantung pada asumsi pertumbuhan setelah tahun 3.

## 5. Titik impas (BEP)

**BEP operasional** adalah jumlah properti aktif yang kontribusi pengelolaannya menutup seluruh biaya tetap, tanpa bergantung pada fee penawaran properti baru.

Rumus pendekatan: biaya tetap inti ÷ (kontribusi pengelolaan − bagian staf operasional) = Rp292.500.000 ÷ Rp4.605.480 = 63,5 properti. Karena staf operasional bertambah per 20 properti, angka tepatnya dicari dengan menaikkan jumlah properti sampai kontribusi ≥ biaya tetap:

| Profil properti | Properti aktif | Kontribusi pengelolaan | Biaya tetap (orang) |
|---|---|---|---|
| 10 kamar | **70** | 70 × Rp7.530.480 = Rp527.133.600 | Rp526.500.000 (7 orang) |
| 20 kamar | **28** | 28 × Rp15.096.960 = Rp422.714.880 | Rp409.500.000 (5 orang) |

Satu properti lebih sedikit belum cukup: 69 × Rp7.530.480 = Rp519.603.120 dan 27 × Rp15.096.960 = Rp407.617.920, keduanya di bawah biaya tetapnya.

**Syarat NPV 3 tahun ≥ 0.** Pola pertumbuhan skenario dasar (2, 5, 8) diperbesar sedikit demi sedikit sampai NPV 3 tahun tidak negatif:

| Profil properti | Properti baru per tahun | Properti aktif tahun 3 | Laba tahun 3 | Kebutuhan dana | NPV |
|---|---|---|---|---|---|
| 10 kamar | 10, 25, 39 (4,9 kali skenario dasar) | 74 | Rp426.366.840 | Rp339.256.400 | Rp11.292.931 |
| 20 kamar | 3, 8, 12 (1,5 kali skenario dasar) | 23 | Rp420.967.200 | Rp349.899.840 | Rp19.826.967 |

Kombinasi ini bukan satu-satunya. Pertumbuhan yang lebih cepat di awal juga bisa, misalnya 5, 7, dan 8 properti baru 20 kamar (20 properti aktif di tahun 3) menghasilkan NPV Rp9.050.852. Untuk properti 10 kamar, targetnya jauh di atas kemampuan tim kecil di satu kota. Untuk properti 20 kamar, targetnya 1,5 kali skenario dasar, dan kombinasi 3, 8, 12 inilah yang dipakai sebagai strategi kos 20 kamar di business case.

## 6. Skenario dan sensitivitas

### Perbandingan tiga skenario

| Ukuran | Konservatif | Dasar | Strategi kos 20 kamar |
|---|---|---|---|
| Properti baru tahun 1 sampai 3 | 1, 3, 5 (10 kamar) | 2, 5, 8 (10 kamar) | 3, 8, 12 (20 kamar) |
| Properti aktif akhir tahun 3 | 9 | 15 | 23 |
| Pendapatan tahun 3 | Rp241.650.000 | Rp391.500.000 | Rp1.182.600.000 |
| Laba (rugi) tahun 3 | −Rp232.506.280 | −Rp156.891.760 | Rp420.967.200 |
| Kebutuhan dana | Rp1.021.278.360 | Rp885.110.280 | Rp349.899.840 |
| NPV 3 tahun (diskonto 20%) | −Rp779.022.529 | −Rp690.758.270 | Rp19.826.967 |
| IRR | Tidak ada | Tidak ada | 23,3% |
| Balik modal | Belum dalam 3 tahun | Belum dalam 3 tahun | Sekitar 2,5 tahun |

### Strategi kos 20 kamar per tahun

| Pos | Tahun 0 | Tahun 1 | Tahun 2 | Tahun 3 |
|---|---|---|---|---|
| Properti baru (20 kamar) | | 3 | 8 | 12 |
| Properti aktif di akhir tahun | | 3 | 11 | 23 |
| Fee penawaran | | Rp226.800.000 | Rp604.800.000 | Rp907.200.000 |
| Fee pengelolaan | | Rp24.300.000 | Rp113.400.000 | Rp275.400.000 |
| **Pendapatan** | | **Rp251.100.000** | **Rp718.200.000** | **Rp1.182.600.000** |
| Biaya penerbitan dan transaksi | | Rp84.999.840 | Rp229.975.360 | Rp352.132.800 |
| Biaya tim | | Rp234.000.000 (4 orang) | Rp234.000.000 (4 orang) | Rp292.500.000 (5 orang) |
| Biaya tetap lain | | Rp117.000.000 | Rp117.000.000 | Rp117.000.000 |
| Investasi awal | Rp165.000.000 | | | |
| **Laba (rugi) = arus kas** | **−Rp165.000.000** | **−Rp184.899.840** | **Rp137.224.640** | **Rp420.967.200** |
| Arus kas kumulatif | −Rp165.000.000 | −Rp349.899.840 | −Rp212.675.200 | Rp208.292.000 |
| Nilai kini (diskonto 20%) | −Rp165.000.000 | −Rp154.083.200 | Rp95.294.889 | Rp243.615.278 |

- NPV = jumlah nilai kini = Rp19.826.967.
- IRR adalah tingkat diskonto yang membuat NPV nol: 23,3%, di atas tingkat diskonto 20%.
- Balik modal: arus kas kumulatif berubah positif di tahun 3, yaitu 2 + Rp212.675.200 ÷ Rp420.967.200 = 2,5 tahun setelah operasi dimulai.
- Kebutuhan dana Rp349.899.840 di akhir tahun 1. Pendanaan yang disarankan menambahkan cadangan enam bulan biaya tetap, Rp351.000.000 ÷ 2 = Rp175.500.000, sehingga jumlahnya Rp525.399.840.

Catatan: strategi menghitung ketiga properti tahun 1 sebagai kos 20 kamar, sesuai roadmap (Kos Sumbersari 01 tetap studi kasus prototipe dan tidak dihitung). Syarat ini ketat. Bila salah satu properti tahun 1 hanya 10 kamar, misalnya Kos Sumbersari 01 ikut dihitung, dengan tahun 2 dan 3 tetap 8 dan 12 properti 20 kamar, laba tahun 1 menjadi −Rp222.592.200, kebutuhan dana Rp387.592.200, dan NPV −Rp21.216.583. Jadi NPV positif strategi ini mensyaratkan ketiga properti tahun 1 berukuran 20 kamar, atau pertumbuhan yang sedikit lebih cepat.

### Sensitivitas

Setiap baris mengubah satu asumsi dari skenario dasar.

| Skenario | Perubahan | Laba tahun 3 | Kebutuhan dana | NPV 20% |
|---|---|---|---|---|
| **Dasar** | | **−Rp156.891.760** | **Rp885.110.280** | **−Rp690.758.270** |
| Pertumbuhan konservatif | 1, 3, 5 properti baru | −Rp232.506.280 | Rp1.021.278.360 | −Rp779.022.529 |
| Pertumbuhan optimis | 4, 10, 16 properti baru | −Rp21.283.520 | Rp610.720.560 | −Rp510.995.707 |
| Properti 20 kamar | P02 diganti 20 kamar, tetap 2, 5, 8 properti baru | Rp197.612.480 | Rp449.239.040 | −Rp281.399.504 |
| Strategi kos 20 kamar | 20 kamar dengan 3, 8, 12 properti baru | Rp420.967.200 | Rp349.899.840 | Rp19.826.967 |
| Okupansi 80% | A03 | −Rp166.139.680 | Rp898.982.160 | −Rp699.437.926 |
| Biaya tetap +20% | P17 sampai P22 | −Rp227.091.760 | Rp1.095.710.280 | −Rp838.633.270 |
| Biaya tetap −20% | P17 sampai P22 | −Rp86.691.760 | Rp674.510.280 | −Rp542.883.270 |
| 25% penawaran gagal | P05; biaya penerbitan tetap keluar, fee hanya dari 75% | −Rp253.200.580 | Rp1.057.923.510 | −Rp802.507.079 |
| Tingkat diskonto 15% | P24 | −Rp156.891.760 | Rp885.110.280 | −Rp729.834.654 |
| Tingkat diskonto 25% | P24 | −Rp156.891.760 | Rp885.110.280 | −Rp656.292.639 |

Kebutuhan dana adalah arus kas kumulatif terendah selama tahun 0 sampai 3. Pada skenario penawaran gagal, jumlah properti adalah nilai harapan (mis. 0,75 × 8 = 6 properti berhasil di tahun 3).

Urutan pengaruh terhadap NPV skenario dasar: ukuran properti (+Rp409,4 juta), jumlah properti baru (+Rp179,8 juta pada skenario optimis, −Rp88,3 juta pada skenario konservatif), biaya tetap (±Rp147,9 juta), keberhasilan penawaran (−Rp111,7 juta). Okupansi hampir tidak berpengaruh pada KosBagi (−Rp8,7 juta) karena fee pengelolaan kecil, tetapi berpengaruh besar pada imbal hasil investor, yang turun menjadi 4,68% per tahun ([asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) bagian 6).

## 7. Sisi properti: pajak dan biaya peralihan

### Skenario pajak dan imbal hasil investor

Proyeksi KosBagi di atas tidak bergantung pada skema pajak kustodian, tetapi imbal hasil investor sangat bergantung padanya. Skenario dasar memakai PPh badan 22% atas laba kustodian. Alternatifnya fasilitas Pasal 31E UU PPh: wajib pajak badan dalam negeri dengan peredaran bruto sampai Rp50 miliar mendapat pengurangan tarif 50% atas penghasilan kena pajak dari bagian peredaran bruto sampai Rp4,8 miliar (DDTCNews, 2024). Untuk PT KosBagi Properti, tarif efektifnya menjadi 11% atas laba.

| Skenario | Pajak per tahun | Dibagikan per tahun | Per token per bulan | Imbal hasil |
|---|---|---|---|---|
| **PPh badan 22% atas laba (dasar)** | Rp26.730.000 | Rp94.770.000 | Rp438,75 | 5,265% |
| PPh badan dengan fasilitas Pasal 31E, tarif efektif 11% | Rp13.365.000 | Rp108.135.000 | Rp500,625 | 6,0075% |

Catatan skenario Pasal 31E:

- Laba kena pajak tetap Rp121.500.000 per tahun (sewa kotor dikurangi biaya 20% dan fee 5%), jadi pajaknya 11% × Rp121.500.000.
- Per bulan, `closePeriod` dengan tarif 1.100 basis poin menghasilkan sewa bersih Rp9.011.250 dan nilai per token 50.062 sen (Rp500,62). Hitungan ini ikut diuji di `backend/src/finance/distribution.test.ts`.
- Fasilitas dihitung per wajib pajak, bukan per properti. Peredaran bruto kustodian adalah sewa semua properti yang dipegangnya, jadi fasilitas penuh hanya berlaku sampai sekitar 29 properti seukuran Kos Sumbersari 01 (Rp4,8 miliar ÷ Rp162 juta = 29,6). Di atas itu tarif efektif naik bertahap.
- Tarif pajak di `KosLedger` tidak bisa diubah setelah deploy. Bila tim memilih skenario ini, kontrak baru di-deploy dengan `taxBps` 1.100.
- Syarat, cara pengajuan, dan status fasilitas ini dikonfirmasi ke konsultan pajak sebelum dipakai **[perlu verifikasi]**.

Skenario PPh final 0,5% dari omzet di proposal (imbal hasil 6,705%) tidak lagi dipakai. PP 20/2026 membatasi tarif itu untuk wajib pajak orang pribadi, PT perorangan, dan koperasi (Republik Indonesia, 2026), sedangkan PT KosBagi Properti adalah perseroan biasa. Hitungannya tetap tercatat di [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) bagian 6 sebagai pembanding angka proposal.

Sebagai pembanding, imbal hasil SUN tenor 10 tahun 7,66% (Kontan, 2026). Bagi hasil sewa KB-SMR01 di kedua skenario lebih rendah dari angka itu. Daya tarik token bergantung pada modal kecil, keterbukaan data sewa, dan kenaikan nilai properti yang belum punya data sekunder **[perlu verifikasi]**. Hal ini dicatat sebagai risiko pasar R15 di business case.

### Biaya peralihan hak

Sertifikat dialihkan dari pemilik lama ke PT KosBagi Properti dan diturunkan dari SHM menjadi HGB ([sertifikat dummy](dokumen-penerbitan/sertifikat-hak-milik.md) bagian 2). Perkiraan biayanya untuk properti Rp1,8 miliar:

| Pos | Hitungan | Nilai | Dasar |
|---|---|---|---|
| PPh final pengalihan hak | 2,5% × Rp1.800.000.000 | Rp45.000.000 | PP 34/2016 (Sekretariat Kabinet, 2016) |
| BPHTB | 5% × (Rp1.800.000.000 − NPOPTKP Rp80.000.000) | Rp86.000.000 | Tarif 5% dan NPOPTKP Rp80 juta menurut Perda Kota Malang 4/2023 (Pemerintah Kota Malang, 2023); tarif yang sama tercantum di profil pajak Kota Malang setelah Perda 1/2025 (DDTCNews, 2026) |
| Jasa PPAT | paling tinggi 0,5% × Rp1.800.000.000 | Rp9.000.000 | Batas honorarium PPAT untuk nilai transaksi ini menurut PP 24/2016 (Republik Indonesia, 2016) |
| **Jumlah** | | **Rp140.000.000** | |

NPOPTKP hanya berlaku untuk perolehan pertama kustodian, jadi properti berikutnya menanggung BPHTB Rp90.000.000 dan biaya peralihan sekitar Rp144.000.000.

Draf P3 menghitung Rp153.000.000 karena BPHTB dihitung tanpa NPOPTKP dan jasa PPAT memakai batas atas 1%. Business case final memakai NPOPTKP Rp80 juta dan batas jasa PPAT 0,5% sesuai sumber di tabel.

Tim memutuskan biaya ini ditanggung pemilik lama (P16, keputusan 15 November 2026), sehingga imbal hasil investor dan fee KosBagi tidak berubah. Dana bersih pemilik menjadi Rp1.222.200.000 − Rp140.000.000 = **Rp1.082.200.000**, atau 85,9% dari dana yang dihimpun. Biaya ini lebih besar dari fee penawaran KosBagi dan bisa membuat pemilik memilih kredit bank, jadi halaman pemilik kos menyebutnya di FAQ dan di simulasi dana. Besaran pastinya dikonfirmasi ke konsultan pajak dan notaris/PPAT sebelum penerbitan pertama **[perlu verifikasi]**.

## 8. Batasan

- Tidak ada kenaikan sewa, inflasi biaya, atau kenaikan gaji.
- Tidak ada pendapatan pasar sekunder (fase kedua) maupun bunga rekening penampungan.
- Tidak ada nilai sisa setelah tahun 3.
- Pajak penghasilan KosBagi dianggap nol karena rugi; kompensasi kerugian belum dihitung untuk tahun setelah laba.
- Semua properti dalam satu skenario dianggap seragam. Kenyataannya ukuran, sewa, dan okupansi berbeda per kos; contohnya strategi kos 20 kamar yang tahun 1-nya memuat Kos Sumbersari 01 (catatan di bagian 6).
- Biaya per transaksi dan sebagian biaya tetap belum dibandingkan dengan penawaran harga penyedia sungguhan.

## 9. Sumber

- Proposal Tugas Akhir Kelompok 9 (2026), *KosBagi*, bagian 2.9, Tabel 2.3, Tabel 2.5, dan Tabel 2.6. Mata kuliah Teknologi Blockchain dan Platform Keuangan Dijital, Fakultas Ilmu Komputer, Universitas Brawijaya.
- CyberScope (t.t.) *How Much Does It Cost to Audit a Smart Contract?* Tersedia di: https://www.cyberscope.io/blog/how-much-does-it-cost-to-audit-a-smart-contract (Diakses: 22 November 2026).
- DDTCNews (2024) *Diskon Tarif Pasal 31E UU PPh Tak Ada Batas Waktu Asal Penuhi Kriteria*, 29 April. Tersedia di: https://news.ddtc.co.id/berita/nasional/1802253/diskon-tarif-pasal-31e-uu-pph-tak-ada-batas-waktu-asal-penuhi-kriteria (Diakses: 3 November 2026).
- DDTCNews (2026) *Update 2026, Intip Profil Pajak Kota Bunga*, 18 September. Tersedia di: https://news.ddtc.co.id/literasi/profil-daerah/1822551/update-2026-intip-profil-pajak-kota-bunga (Diakses: 3 November 2026).
- Jurnal.id (t.t.) *Jasa Konsultan Pajak: Layanan, Tarif, dan Tips Memilihnya*. Tersedia di: https://www.jurnal.id/id/blog/jasa-konsultan-pajak-layanan-tarif-dan-tips-memilihnya/ (Diakses: 22 November 2026).
- Kementerian Keuangan (2024) *Peraturan Menteri Keuangan Nomor 131 Tahun 2024*. Tersedia di: https://www.pajak.go.id/id/artikel/pmk-1312024-tarif-ppn-sebelas-dua-belas (Diakses: 22 November 2026).
- Kontan (2026) *Yield SUN Tembus 7,66%, Pembiayaan Utang Pemerintah Makin Berat*, 28 Oktober. Tersedia di: https://investasi.kontan.co.id/news/yield-sun-tembus-766-pembiayaan-utang-pemerintah-makin-berat (Diakses: 3 November 2026).
- Mamikos (2026) *Biaya Hidup Mahasiswa Kuliah di Unibraw*. Tersedia di: https://mamikos.com/info/biaya-hidup-mahasiswa-kuliah-di-unibraw/ (Diakses: 15 Oktober 2026).
- Metrotvnews (2025) *Resmi Naik, UMK Kota Malang 2026 Jadi Rp3,7 Juta*, 29 Desember. Tersedia di: https://www.metrotvnews.com/read/kj2CDPPO-resmi-naik-umk-kota-malang-2026-jadi-rp3-7-juta (Diakses: 3 November 2026).
- Midtrans (2026) *Pricing*. Tersedia di: https://midtrans.com/pricing (Diakses: 3 November 2026).
- Pemerintah Kota Malang (2023) *Peraturan Daerah Kota Malang Nomor 4 Tahun 2023 tentang Pajak Daerah dan Retribusi Daerah*. Tersedia di: https://perpajakan.ddtc.co.id/id/sumber-hukum/peraturan-daerah/perda-kota-malang-4-tahun-2023 (Diakses: 22 November 2026).
- Republik Indonesia (2008) *Undang-Undang Nomor 36 Tahun 2008 tentang Perubahan Keempat atas Undang-Undang Nomor 7 Tahun 1983 tentang Pajak Penghasilan*. Jakarta: Sekretariat Negara.
- Republik Indonesia (2016) *Peraturan Pemerintah Nomor 24 Tahun 2016 tentang Perubahan atas Peraturan Pemerintah Nomor 37 Tahun 1998 tentang Peraturan Jabatan Pejabat Pembuat Akta Tanah*. Tersedia di: https://peraturan.go.id/files/pp24-2016bt.pdf (Diakses: 22 November 2026).
- Republik Indonesia (2026) *Peraturan Pemerintah Nomor 20 Tahun 2026 tentang Penyesuaian Pengaturan di Bidang Pajak Penghasilan*. Tersedia di: https://www.pajak.go.id/id/artikel/pp-202026-tarif-pph-05-bagi-umkm-orang-pribadi-berlaku-selamanya (Diakses: 22 November 2026).
- Sekretariat Kabinet (2016) *PP No. 34/2016: PPh Pengalihan/Jual Beli Tanah/Bangunan 2,5%, Di bawah Rp 60 Juta Dikecualikan*. Tersedia di: https://setkab.go.id/pp-no-342016-pph-pengalihanjual-beli-tanahbangunan-25-di-bawah-rp-60-juta-dikecualikan/ (Diakses: 3 November 2026).
- Sherlock (2026) *Smart Contract Audit Pricing: A Market Reference for 2026*. Tersedia di: https://sherlock.xyz/post/smart-contract-audit-pricing-a-market-reference-for-2026 (Diakses: 22 November 2026).
