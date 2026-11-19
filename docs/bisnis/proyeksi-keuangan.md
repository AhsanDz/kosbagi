# Proyeksi Keuangan 3 Tahun KosBagi

Status: draf P3, 3 November 2026. Bahan bab 7 [business case](business-case.md).

Dokumen ini memproyeksikan arus kas PT KosBagi Teknologi (platform) selama tiga tahun operasi, lalu menghitung unit economics, titik impas (BEP), NPV, dan sensitivitasnya. Angka tingkat properti dan bagi hasil investor ada di [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md); dokumen ini memakai asumsi yang sama dan menambah asumsi biaya platform.

Semua angka adalah asumsi untuk tugas akhir, bukan rencana usaha yang sudah divalidasi. Butir yang belum punya sumber ditandai **[perlu verifikasi]**. Setiap hasil bisa dihitung ulang dengan kalkulator dari tabel asumsi di bagian 2.

## 1. Ringkasan

| Ukuran | Tahun 1 | Tahun 2 | Tahun 3 |
|---|---|---|---|
| Properti baru | 2 | 5 | 8 |
| Properti aktif di akhir tahun | 2 | 7 | 15 |
| Pendapatan | Rp83,7 juta | Rp225,5 juta | Rp391,5 juta |
| Laba (rugi) sebelum pajak | −Rp288,7 juta | −Rp220,6 juta | −Rp130,0 juta |

| Ukuran | Hasil |
|---|---|
| Kebutuhan dana sampai akhir tahun 3, termasuk investasi awal Rp115 juta | Rp754,3 juta |
| NPV 3 tahun, tingkat diskonto 20% | −Rp584,0 juta |
| BEP: properti aktif yang menutup biaya tetap tanpa penerbitan baru | 59 properti seukuran Kos Sumbersari 01, atau 26 properti 20 kamar |
| Syarat NPV 3 tahun ≥ 0 | 67 properti 10 kamar aktif di tahun 3 (9, 22, 36 properti baru), atau 19 properti 20 kamar (3, 6, 10 properti baru) |

Kesimpulan:

1. Dengan properti seukuran Kos Sumbersari 01, model fee proposal (3% penawaran dan 5% pengelolaan) belum menutup biaya tim dalam tiga tahun. Fee pengelolaan satu properti hanya Rp8,1 juta per tahun, sedangkan biaya tetap inti Rp265,5 juta per tahun.
2. Margin per properti tinggi (92,9% untuk pengelolaan), jadi masalahnya skala, bukan biaya per transaksi. Ukuran properti adalah pengungkit terbesar: properti 20 kamar menggandakan fee tanpa menggandakan biaya penerbitan, sehingga tahun 3 sudah laba Rp224,4 juta.
3. Rekomendasi untuk dibahas tim: prioritaskan kos 20 sampai 30 kamar (masih di segmen proposal Tabel 2.3), jaga tim tetap kecil, dan siapkan pendanaan awal sekitar Rp750 juta sampai titik impas.

## 2. Asumsi

Asumsi properti A01 sampai A15 ada di [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) bagian 1. Kolom Dasar: **Proposal**, **Data sekunder** (dengan sumber), **Asumsi kelompok** (belum bersumber), atau **Turunan**.

### Waktu dan pertumbuhan

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| P01 | Horizon | Tahun 0 (persiapan), tahun 1 sampai 3 (2027 sampai 2029) | Ketentuan tugas: proyeksi 3 tahun |
| P02 | Profil properti rata-rata | Sama dengan Kos Sumbersari 01: 10 kamar, sewa kotor Rp162.000.000 per tahun, dana dihimpun Rp1.260.000.000 | A01 sampai A08. Batas bawah segmen 10 sampai 30 kamar (proposal Tabel 2.3), jadi konservatif |
| P03 | Properti baru per tahun | 2, 5, 8 | Asumsi kelompok. Tahun 1 memuat Kos Sumbersari 01 sebagai properti percontohan. Diuji di bagian 6 |
| P04 | Waktu terbit | Rata-rata pertengahan tahun, jadi properti baru membayar fee pengelolaan 6 bulan di tahun terbitnya | Asumsi kelompok |
| P05 | Penawaran berhasil | 100% | Asumsi kelompok. Penawaran gagal diuji di bagian 6 |
| P06 | Sewa dan okupansi | Tetap selama 3 tahun, tanpa kenaikan sewa maupun inflasi biaya | Asumsi kelompok, menyederhanakan |

### Biaya per properti

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| P07 | Rata-rata satu pembelian token | Rp5.000.000, jadi 252 pembelian per properti | Titik tengah modal segmen investor Rp100 ribu sampai Rp10 juta (proposal Tabel 2.3) |
| P08 | Biaya virtual account Midtrans | Rp4.480 per transaksi: Rp4.000 belum termasuk PPN (Midtrans, 2026), ditambah PPN 12% sebagai batas atas | Data sekunder. Tarif efektif PPN atas fee **[perlu verifikasi]** |
| P09 | Metode bayar | Virtual account untuk sewa dan pembelian token, karena QRIS 0,7% per transaksi (Midtrans, 2026) lebih mahal untuk nominal di atas Rp640.000 | Turunan dari P08 |
| P10 | Verifikasi e-KYC | Rp10.000 per investor | Asumsi kelompok **[perlu verifikasi]** |
| P11 | Gas jaringan produksi | Rp500 per transaksi | Asumsi kelompok untuk jaringan EVM berbiaya rendah. Prototipe memakai Sepolia yang gratis; jaringan produksi belum dipilih **[perlu verifikasi]** |
| P12 | Penilaian properti oleh KJPP | Rp10.000.000 per properti | Asumsi kelompok **[perlu verifikasi]** |
| P13 | Legal dan notaris per properti | Rp5.000.000 | Asumsi kelompok **[perlu verifikasi]** |
| P14 | Pemasaran satu penawaran | Rp5.000.000 | Asumsi kelompok |
| P15 | Biaya transaksi payment gateway | Ditanggung PT KosBagi Teknologi, penghuni tidak dikenai biaya | Proposal Tabel 2.5 (struktur biaya) dan bagian 2.9; [perjanjian pengelolaan dummy](dokumen-penerbitan/perjanjian-pengelolaan.md) Pasal 3 |
| P16 | Biaya peralihan hak ke kustodian | Ditanggung pemilik lama, tidak masuk biaya KosBagi. Rinciannya di bagian 7 | Keputusan tim, 15 November 2026 |

### Biaya tetap dan pendanaan

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| P17 | Tim | 3 orang inti (produk dan teknologi, operasional dan kepatuhan, pemasaran dan kemitraan) ditambah 1 staf operasional per 20 properti aktif, dibulatkan ke atas | Asumsi kelompok. Pengelola harian tiap kos dibayar dari biaya operasional 20% properti (A10), bukan oleh KosBagi |
| P18 | Biaya per orang | Rp4.500.000 per bulan × 13 bulan (termasuk THR) = Rp58.500.000 per tahun | Sekitar 120% UMK Kota Malang 2026 Rp3.736.101 (Metrotvnews, 2025) untuk menampung iuran BPJS dan tunjangan. Persentase tambahan adalah asumsi kelompok |
| P19 | Infrastruktur (server, basis data, RPC, domain) | Rp2.000.000 per bulan | Asumsi kelompok **[perlu verifikasi]** |
| P20 | Kepatuhan dan hukum (konsultan pajak dan hukum, pelaporan sandbox) | Rp30.000.000 per tahun | Asumsi kelompok **[perlu verifikasi]** |
| P21 | Pemasaran umum | Rp2.000.000 per bulan | Asumsi kelompok |
| P22 | Ruang kerja bersama | Rp1.000.000 per bulan | Asumsi kelompok **[perlu verifikasi]** |
| P23 | Investasi awal tahun 0 | Rp115.000.000: pendirian dua PT Rp15.000.000, audit smart contract Rp75.000.000, persiapan regulatory sandbox OJK Rp25.000.000 | Asumsi kelompok **[perlu verifikasi]** |
| P24 | Tingkat diskonto | 20% per tahun | Imbal hasil SUN tenor 10 tahun 7,66% pada 28 Oktober 2026 (Kontan, 2026), ditambah premi risiko usaha rintisan sekitar 12 poin persen (asumsi kelompok) |
| P25 | Pajak penghasilan KosBagi | Rp0 selama rugi | Kerugian fiskal dapat dikompensasikan ke tahun berikutnya **[perlu verifikasi]** |

Biaya tetap inti per tahun = 3 × Rp58.500.000 + Rp24.000.000 (P19) + Rp30.000.000 (P20) + Rp24.000.000 (P21) + Rp12.000.000 (P22) = **Rp265.500.000**.

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
| Virtual account pembelian | 252 × Rp4.480 | Rp1.128.960 |
| Gas whitelist KYC dan transfer token | 252 × 2 transaksi × Rp500 | Rp252.000 |
| **Biaya penerbitan** | jumlah enam baris di atas | **Rp23.900.960** |
| **Kontribusi penerbitan** | Rp37.800.000 − Rp23.900.960 | **Rp13.899.040** (36,8% dari fee) |

### Pengelolaan, per tahun per properti aktif

| Pos | Hitungan | Nilai |
|---|---|---|
| **Fee pengelolaan** | 5% × Rp162.000.000 | **Rp8.100.000** |
| Virtual account sewa | 9 kamar × 12 bulan = 108 pembayaran × Rp4.480 | Rp483.840 |
| Gas | (108 `recordRent` + 60 `recordExpense` + 12 `closePeriod`) × Rp500 | Rp90.000 |
| **Kontribusi pengelolaan** | Rp8.100.000 − Rp573.840 | **Rp7.526.160** (92,9% dari fee) |
| Bagian biaya staf operasional | Rp58.500.000 ÷ 20 properti | Rp2.925.000 |
| Kontribusi setelah staf operasional | Rp7.526.160 − Rp2.925.000 | Rp4.601.160 |

Asumsi lima nota biaya per bulan (60 `recordExpense` per tahun) adalah asumsi kelompok.

Satu properti seukuran Kos Sumbersari 01 menyumbang Rp13,9 juta sekali dan Rp7,5 juta per tahun, atau Rp36,5 juta dalam tiga tahun pertamanya. Biaya transaksi Midtrans per pembayaran sewa (Rp4.480) hanya 6% dari fee pengelolaan per kamar per bulan (5% × Rp1.500.000 = Rp75.000).

### Properti 20 kamar

Dengan sewa per kamar dan nilai per kamar yang sama (A02 dan A04):

| Pos | 10 kamar | 20 kamar |
|---|---|---|
| Fee penawaran | Rp37.800.000 | Rp75.600.000 |
| Biaya penerbitan | Rp23.900.960 | Rp27.801.920 |
| Kontribusi penerbitan | Rp13.899.040 | Rp47.798.080 |
| Fee pengelolaan per tahun | Rp8.100.000 | Rp16.200.000 |
| Kontribusi pengelolaan per tahun | Rp7.526.160 | Rp15.088.320 |

Biaya penilaian, legal, dan pemasaran tidak berlipat saat jumlah kamar berlipat, jadi kontribusi penerbitan naik 3,4 kali.

## 4. Proyeksi 3 tahun, skenario dasar

Semua nominal dalam rupiah. Arus kas dianggap sama dengan laba sebelum pajak, karena tidak ada penyusutan, piutang, atau pajak yang dibayar.

| Pos | Rumus | Tahun 0 | Tahun 1 | Tahun 2 | Tahun 3 |
|---|---|---|---|---|---|
| Properti baru | P03 | | 2 | 5 | 8 |
| Properti aktif di akhir tahun | | | 2 | 7 | 15 |
| Fee penawaran | baru × Rp37.800.000 | | 75.600.000 | 189.000.000 | 302.400.000 |
| Fee pengelolaan | aktif awal tahun × Rp8.100.000 + baru × Rp4.050.000 | | 8.100.000 | 36.450.000 | 89.100.000 |
| **Pendapatan** | | | **83.700.000** | **225.450.000** | **391.500.000** |
| Biaya penerbitan | baru × Rp23.900.960 | | 47.801.920 | 119.504.800 | 191.207.680 |
| Biaya transaksi pengelolaan | aktif awal tahun × Rp573.840 + baru × Rp286.920 | | 573.840 | 2.582.280 | 6.312.240 |
| **Margin kontribusi** | | | **35.324.240** | **103.362.920** | **193.980.080** |
| Jumlah orang | P17 | | 4 | 4 | 4 |
| Biaya tim | orang × Rp58.500.000 | | 234.000.000 | 234.000.000 | 234.000.000 |
| Biaya tetap lain | P19 sampai P22 | | 90.000.000 | 90.000.000 | 90.000.000 |
| Investasi awal | P23 | 115.000.000 | | | |
| **Laba (rugi) = arus kas** | | **−115.000.000** | **−288.675.760** | **−220.637.080** | **−130.019.920** |
| Arus kas kumulatif | | −115.000.000 | −403.675.760 | −624.312.840 | −754.332.760 |

### NPV

NPV = Σ arus kas tahun ke-t ÷ (1 + 20%)^t, untuk t = 0 sampai 3.

| Tahun | Arus kas | Faktor diskonto | Nilai kini |
|---|---|---|---|
| 0 | −115.000.000 | 1,0000 | −115.000.000 |
| 1 | −288.675.760 | 0,8333 | −240.563.133 |
| 2 | −220.637.080 | 0,6944 | −153.220.194 |
| 3 | −130.019.920 | 0,5787 | −75.243.009 |
| **NPV** | | | **−584.026.336** |

Nilai kini dihitung dengan pecahan eksak lalu dibulatkan ke rupiah; faktor diskonto di tabel dibulatkan ke empat desimal hanya untuk ditampilkan.

NPV tiga tahun tanpa nilai sisa wajar negatif untuk platform yang baru mulai, karena biaya tim sudah penuh sejak tahun 1 sedangkan fee pengelolaan baru menumpuk seiring jumlah properti. Proyeksi ini sengaja tidak menambahkan nilai sisa supaya hasilnya tidak bergantung pada asumsi pertumbuhan setelah tahun 3.

## 5. Titik impas (BEP)

**BEP operasional** adalah jumlah properti aktif yang kontribusi pengelolaannya menutup seluruh biaya tetap, tanpa bergantung pada fee penawaran properti baru.

Rumus pendekatan: biaya tetap inti ÷ (kontribusi pengelolaan − bagian staf operasional) = Rp265.500.000 ÷ Rp4.601.160 = 57,7 properti. Karena staf operasional bertambah per 20 properti, angka tepatnya dicari dengan menaikkan jumlah properti sampai kontribusi ≥ biaya tetap:

| Profil properti | Properti aktif | Kontribusi pengelolaan | Biaya tetap (orang) |
|---|---|---|---|
| 10 kamar | **59** | 59 × Rp7.526.160 = Rp444.043.440 | Rp441.000.000 (6 orang) |
| 20 kamar | **26** | 26 × Rp15.088.320 = Rp392.296.320 | Rp382.500.000 (5 orang) |

**Syarat NPV 3 tahun ≥ 0.** Kombinasi properti baru per tahun yang membuat NPV 3 tahun tidak negatif, dengan pertumbuhan yang naik tiap tahun seperti skenario dasar. Kombinasi ini dicari dengan menaikkan jumlah properti baru sedikit demi sedikit, jadi bukan satu-satunya kombinasi yang mungkin:

| Profil properti | Properti baru per tahun | Properti aktif tahun 3 | Laba tahun 3 | NPV |
|---|---|---|---|---|
| 10 kamar | 9, 22, 36 | 67 | Rp369,6 juta | +Rp12,6 juta |
| 20 kamar | 3, 6, 10 | 19 | Rp365,2 juta | +Rp1,7 juta |

Untuk properti 10 kamar, target itu jauh di atas kemampuan tim kecil di satu kota. Untuk properti 20 kamar, targetnya hanya sedikit di atas skenario dasar.

## 6. Analisis sensitivitas

Setiap baris mengubah satu asumsi dari skenario dasar. Nominal dalam juta rupiah.

| Skenario | Perubahan | Laba tahun 3 | Kebutuhan dana | NPV 20% |
|---|---|---|---|---|
| **Dasar** | | **−130,0** | **754,3** | **−584,0** |
| Pertumbuhan konservatif | 1, 3, 5 properti baru | −205,6 | 890,4 | −672,2 |
| Pertumbuhan optimis | 4, 10, 16 properti baru | 5,5 | 485,6 | −404,4 |
| Properti 20 kamar | P02 diganti 20 kamar | 224,4 | 345,4 | −174,8 |
| Okupansi 80% | A03 | −139,3 | 768,2 | −592,7 |
| Biaya tetap +20% | P17 sampai P22 | −194,8 | 948,7 | −720,5 |
| Biaya tetap −20% | P17 sampai P22 | −65,2 | 559,9 | −447,5 |
| 25% penawaran gagal | P05; biaya penerbitan tetap keluar, fee hanya dari 75% | −226,3 | 927,1 | −695,8 |
| Tingkat diskonto 15% | P24 | −130,0 | 754,3 | −618,3 |
| Tingkat diskonto 25% | P24 | −130,0 | 754,3 | −553,7 |

Kebutuhan dana adalah arus kas kumulatif terendah selama tahun 0 sampai 3. Pada skenario penawaran gagal, jumlah properti adalah nilai harapan (mis. 0,75 × 8 = 6 properti berhasil di tahun 3).

Urutan pengaruh terhadap NPV: ukuran properti (+Rp409,2 juta), jumlah properti baru (+Rp179,6 juta pada skenario optimis), biaya tetap (±Rp136,5 juta), keberhasilan penawaran (−Rp111,7 juta). Okupansi hampir tidak berpengaruh pada KosBagi karena fee pengelolaan kecil, tetapi berpengaruh besar pada imbal hasil investor ([asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) bagian 6).

## 7. Sisi properti: pajak dan biaya peralihan

### Skenario pajak dan imbal hasil investor

Proyeksi KosBagi di atas tidak bergantung pada skema pajak kustodian, tetapi imbal hasil investor sangat bergantung padanya. Selain dua skenario di proposal, ada fasilitas Pasal 31E UU PPh: wajib pajak badan dalam negeri dengan peredaran bruto sampai Rp50 miliar mendapat pengurangan tarif 50% atas penghasilan kena pajak dari bagian peredaran bruto sampai Rp4,8 miliar (DDTCNews, 2024). Untuk PT KosBagi Properti, tarif efektifnya menjadi 11% atas laba **[perlu verifikasi]**.

| Skenario | Pajak per tahun | Dibagikan per tahun | Per token per bulan | Imbal hasil |
|---|---|---|---|---|
| **PPh badan 22% atas laba (dasar)** | Rp26.730.000 | Rp94.770.000 | Rp438,75 | 5,265% |
| PPh badan dengan fasilitas Pasal 31E, tarif efektif 11% **[perlu verifikasi]** | Rp13.365.000 | Rp108.135.000 | Rp500,625 | 6,0075% |
| PPh final 0,5% dari omzet **[perlu verifikasi]** | Rp810.000 | Rp120.690.000 | Rp558,75 | 6,705% |

Catatan skenario Pasal 31E:

- Laba kena pajak tetap Rp121.500.000 per tahun (sewa kotor dikurangi biaya 20% dan fee 5%), jadi pajaknya 11% × Rp121.500.000.
- Per bulan, `closePeriod` dengan tarif 1.100 basis poin menghasilkan sewa bersih Rp9.011.250 dan nilai per token 50.062 sen (Rp500,62). Hitungan ini ikut diuji di `backend/src/finance/distribution.test.ts`.
- Fasilitas dihitung per wajib pajak, bukan per properti. Peredaran bruto kustodian adalah sewa semua properti yang dipegangnya, jadi fasilitas penuh hanya berlaku sampai sekitar 29 properti seukuran Kos Sumbersari 01 (Rp4,8 miliar ÷ Rp162 juta = 29,6). Di atas itu tarif efektif naik bertahap.
- Tarif pajak di `KosLedger` tidak bisa diubah setelah deploy. Bila tim memilih skenario ini, kontrak baru di-deploy dengan `taxBps` 1.100.
- Syarat, cara pengajuan, dan status fasilitas ini dikonfirmasi ke konsultan pajak sebelum dipakai **[perlu verifikasi]**.

Sebagai pembanding, imbal hasil SUN tenor 10 tahun 7,66% (Kontan, 2026). Bagi hasil sewa KB-SMR01 di ketiga skenario lebih rendah dari angka itu. Daya tarik token bergantung pada modal kecil, keterbukaan data sewa, dan kenaikan nilai properti yang belum punya data sekunder **[perlu verifikasi]**. Hal ini dicatat sebagai risiko pasar di business case.

### Biaya peralihan hak

Sertifikat dialihkan dari pemilik lama ke PT KosBagi Properti dan diturunkan dari SHM menjadi HGB ([sertifikat dummy](dokumen-penerbitan/sertifikat-hak-milik.md) bagian 2). Perkiraan biayanya untuk properti Rp1,8 miliar:

| Pos | Hitungan | Nilai | Dasar |
|---|---|---|---|
| PPh final pengalihan hak | 2,5% × Rp1.800.000.000 | Rp45.000.000 | PP 34/2016 (Sekretariat Kabinet, 2016) |
| BPHTB | 5% × Rp1.800.000.000, tanpa pengurang NPOPTKP | Rp90.000.000 | Tarif BPHTB Kota Malang 5% menurut Perda Kota Malang 4/2023 sebagaimana diubah Perda 1/2025 (DDTCNews, 2026). NPOPTKP belum diketahui, jadi diabaikan supaya konservatif **[perlu verifikasi]** |
| Jasa PPAT | 1% × Rp1.800.000.000 | Rp18.000.000 | Asumsi batas atas **[perlu verifikasi]** |
| **Jumlah** | | **Rp153.000.000** | |

Tim memutuskan biaya ini ditanggung pemilik lama (P16, keputusan 15 November 2026), sehingga imbal hasil investor dan fee KosBagi tidak berubah. Dana bersih pemilik menjadi Rp1.222.200.000 − Rp153.000.000 = **Rp1.069.200.000**, atau 84,9% dari dana yang dihimpun. Biaya ini lebih besar dari fee penawaran KosBagi dan bisa membuat pemilik memilih kredit bank, jadi halaman pemilik kos menyebutnya di FAQ dan di simulasi dana. Besaran pastinya dan kemungkinan struktur yang lebih murah masih perlu dikonfirmasi ke notaris **[perlu verifikasi]**.

## 8. Batasan

- Tidak ada kenaikan sewa, inflasi biaya, atau kenaikan gaji.
- Tidak ada pendapatan pasar sekunder (fase kedua) maupun bunga rekening penampungan.
- Tidak ada nilai sisa setelah tahun 3.
- Pajak penghasilan KosBagi dianggap nol karena rugi; kompensasi kerugian belum dihitung.
- Semua properti dianggap seragam. Kenyataannya ukuran, sewa, dan okupansi berbeda per kos.
- Biaya per transaksi dan biaya tetap belum dibandingkan dengan penawaran harga penyedia sungguhan.

## 9. Sumber

- Proposal Tugas Akhir Kelompok 9 (2026), *KosBagi*, bagian 2.9, Tabel 2.3, Tabel 2.5, dan Tabel 2.6. Mata kuliah Teknologi Blockchain dan Platform Keuangan Dijital, Fakultas Ilmu Komputer, Universitas Brawijaya.
- DDTCNews (2024) *Diskon Tarif Pasal 31E UU PPh Tak Ada Batas Waktu Asal Penuhi Kriteria*, 29 April. Tersedia di: https://news.ddtc.co.id/berita/nasional/1802253/diskon-tarif-pasal-31e-uu-pph-tak-ada-batas-waktu-asal-penuhi-kriteria (Diakses: 3 November 2026).
- DDTCNews (2026) *Update 2026, Intip Profil Pajak Kota Bunga*, 18 September. Tersedia di: https://news.ddtc.co.id/literasi/profil-daerah/1822551/update-2026-intip-profil-pajak-kota-bunga (Diakses: 3 November 2026).
- Kontan (2026) *Yield SUN Tembus 7,66%, Pembiayaan Utang Pemerintah Makin Berat*, 28 Oktober. Tersedia di: https://investasi.kontan.co.id/news/yield-sun-tembus-766-pembiayaan-utang-pemerintah-makin-berat (Diakses: 3 November 2026).
- Metrotvnews (2025) *Resmi Naik, UMK Kota Malang 2026 Jadi Rp3,7 Juta*, 29 Desember. Tersedia di: https://www.metrotvnews.com/read/kj2CDPPO-resmi-naik-umk-kota-malang-2026-jadi-rp3-7-juta (Diakses: 3 November 2026).
- Midtrans (2026) *Pricing*. Tersedia di: https://midtrans.com/pricing (Diakses: 3 November 2026).
- Sekretariat Kabinet (2016) *PP No. 34/2016: PPh Pengalihan/Jual Beli Tanah/Bangunan 2,5%, Di bawah Rp 60 Juta Dikecualikan*. Tersedia di: https://setkab.go.id/pp-no-342016-pph-pengalihanjual-beli-tanahbangunan-25-di-bawah-rp-60-juta-dikecualikan/ (Diakses: 3 November 2026).
