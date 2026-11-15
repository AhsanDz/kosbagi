# Asumsi dan Unit Ekonomi Kos Sumbersari 01

Status: draf P2, 2 November 2026.

Dokumen ini mengumpulkan semua asumsi angka di satu tempat, lalu menghitung unit ekonomi dari asumsi itu. Isinya menjadi dasar bab model pendapatan dan proyeksi 3 tahun di [business case](business-case.md). Rincian alur bisnisnya ada di [model bisnis](model-bisnis.md), dan aturan pembulatan per periode ada di [perhitungan distribusi](perhitungan-distribusi.md).

Kos Sumbersari 01 adalah studi kasus dummy. Angka di sini adalah asumsi, bukan janji imbal hasil.

## 1. Daftar asumsi

Kolom Dasar menunjukkan asal angka: **Proposal** untuk asumsi kelompok di proposal, **Data sekunder** untuk angka yang punya sumber luar, **Turunan** untuk hasil hitung dari asumsi lain.

| Kode | Asumsi | Nilai | Dasar |
|---|---|---|---|
| A01 | Jumlah kamar | 10 kamar eksklusif (AC, kamar mandi dalam, wifi) | Proposal Tabel 2.6 |
| A02 | Sewa per kamar | Rp1.500.000 per bulan | Proposal Tabel 2.6. Data sekunder: kos eksklusif sekitar UB di atas Rp1.000.000 per bulan (Mamikos, 2026) |
| A03 | Okupansi rata-rata | 90%, setara 9 dari 10 kamar membayar | Proposal Tabel 2.6. Di seed, K06 kosong |
| A04 | Nilai properti | Rp1.800.000.000 (Rp180 juta per kamar) | Proposal Tabel 2.6. Data sekunder: kos 23 kamar dekat UB ditawarkan Rp4,5 miliar, sekitar Rp196 juta per kamar (Brighton Real Estate, 2026) |
| A05 | Harga token | Rp100.000 | Proposal bagian 2.1 |
| A06 | Jumlah token | 18.000 token | Turunan: A04 ÷ A05 |
| A07 | Porsi pemilik lama | 30%, 5.400 token | Proposal bagian 2.2 |
| A08 | Porsi investor | 70%, 12.600 token, Rp1.260.000.000 | Turunan: A06 − A07 |
| A09 | Batas per investor | 10%, 1.800 token, Rp180.000.000 | Proposal bagian 2.2 |
| A10 | Biaya operasional | 20% dari sewa kotor | Proposal Tabel 2.6: pengelola harian, listrik dan air area umum, internet, kebersihan, perawatan, PBB |
| A11 | Fee pengelolaan | 5% dari sewa kotor per bulan | Proposal bagian 2.9 |
| A12 | Pajak | PPh badan 22% atas laba | Proposal Tabel 2.6, asumsi konservatif. Skema final dikonfirmasi ke konsultan pajak **[perlu verifikasi]** |
| A13 | Fee penawaran | 3% dari dana yang dihimpun, dibayar pemilik, sekali | Proposal bagian 2.9 |
| A14 | Fee pasar sekunder | 0,5% per transaksi | Proposal bagian 2.9. Fase kedua, tidak dihitung di sini |
| A15 | Biaya penghuni | Tidak ada biaya tambahan | Proposal bagian 2.9 |

Asumsi A03 dan A10 belum punya data sekunder pembanding, jadi keduanya diuji di bagian 6.

## 2. Unit ekonomi properti

Kolom per bulan adalah rata-rata dalam setahun.

| No | Pos | Rumus | Per bulan | Per tahun | Dari Rp100 sewa |
|---|---|---|---|---|---|
| 1 | Sewa kotor | A01 × A02 × A03 | Rp13.500.000 | Rp162.000.000 | Rp100,00 |
| 2 | Biaya operasional | 20% × (1) | Rp2.700.000 | Rp32.400.000 | Rp20,00 |
| 3 | Fee pengelolaan | 5% × (1) | Rp675.000 | Rp8.100.000 | Rp5,00 |
| 4 | Laba sebelum pajak | (1) − (2) − (3) | Rp10.125.000 | Rp121.500.000 | Rp75,00 |
| 5 | PPh badan | 22% × (4) | Rp2.227.500 | Rp26.730.000 | Rp16,50 |
| 6 | Dibagikan (sewa bersih) | (4) − (5) | Rp7.897.500 | Rp94.770.000 | Rp58,50 |
| 7 | Per token | (6) ÷ 18.000 | Rp438,75 | Rp5.265 | |
| 8 | Imbal hasil | (7 per tahun) ÷ Rp100.000 | | 5,265% | |

Sebagai pembanding, imbal hasil kotor properti adalah Rp162.000.000 ÷ Rp1.800.000.000 = 9,0% per tahun. Biaya, fee, dan pajak menurunkannya menjadi 5,265% bagi pemegang token. Angka ini belum memasukkan kenaikan nilai properti.

## 3. Angka eksak dan angka di proposal

Dokumen dan kode memakai nilai eksak. Proposal memakai nilai yang dibulatkan untuk dibaca.

| Besaran | Nilai eksak | Di proposal | Hubungan |
|---|---|---|---|
| Bagi hasil per token per bulan | **Rp438,75** | ±Rp439 | Dibulatkan ke rupiah terdekat |
| Dibagikan per tahun | Rp94.770.000 | Rp94,8 juta | Dibulatkan ke 0,1 juta |
| Imbal hasil per tahun | 5,265% | ±5,3% | Dibulatkan ke 0,1% |
| 100 token per bulan | Rp43.875 | ±Rp43.900 | Dibulatkan ke ratusan rupiah |
| Fee pengelolaan per tahun | Rp8.100.000 | ±Rp8,1 juta | Sama |
| Imbal hasil skenario PPh final | 6,705% | ±6,7% | Dibulatkan ke 0,1% |

Pembulatan hanya boleh dilakukan di akhir, pada angka yang ditampilkan. Bila angka bulat dipakai untuk menghitung lagi, hasilnya bergeser. Contohnya bagian pemilik lama: 5.400 × Rp438,75 = Rp2.369.250, sedangkan 5.400 × Rp439 = Rp2.370.600, selisih Rp1.350 per bulan.

## 4. Bagian tiap pemegang

| Pemegang | Token | Modal @ Rp100.000 | Per bulan | Per tahun |
|---|---|---|---|---|
| Investor 100 token | 100 | Rp10.000.000 | Rp43.875 | Rp526.500 |
| Investor di batas 10% | 1.800 | Rp180.000.000 | Rp789.750 | Rp9.477.000 |
| Seluruh investor | 12.600 | Rp1.260.000.000 | Rp5.528.250 | Rp66.339.000 |
| Pemilik lama | 5.400 | Rp540.000.000 | Rp2.369.250 | Rp28.431.000 |
| **Total** | **18.000** | **Rp1.800.000.000** | **Rp7.897.500** | **Rp94.770.000** |

## 5. Sisi pemilik dan sisi KosBagi

### Pemilik

| Pos | Rumus | Nilai |
|---|---|---|
| Dana penawaran | 12.600 × Rp100.000 | Rp1.260.000.000 |
| Fee penawaran 3% | 3% × Rp1.260.000.000 | Rp37.800.000 |
| Dana diterima di muka | Rp1.260.000.000 − Rp37.800.000 | Rp1.222.200.000 |
| Bagian 5.400 token | 30% × sewa bersih | Rp2.369.250 per bulan |
| Bagi hasil yang beralih ke investor | 70% × sewa bersih | Rp66.339.000 per tahun |
| Bagi hasil beralih ÷ dana diterima | Rp66.339.000 ÷ Rp1.222.200.000 | ±5,43% per tahun |

Baris terakhir berguna saat membandingkan dengan kredit bank, tetapi bukan bunga. Tidak ada angsuran tetap dan nilainya ikut naik turun bersama sewa. Pembanding bunga kredit belum punya sumber **[perlu verifikasi]**.

Halaman `/pemilik` memakai rumus yang sama untuk simulasi dana: token = nilai properti ÷ Rp100.000, ditawarkan 70%, fee 3%, dan bagi hasil dari sewa kotor × 58,5% × 30%.

### KosBagi per properti

| Pos | Rumus | Nilai |
|---|---|---|
| Fee penawaran, sekali | 3% × Rp1.260.000.000 | Rp37.800.000 |
| Fee pengelolaan per tahun | 5% × Rp162.000.000 | Rp8.100.000 |
| Pendapatan tahun pertama, bila dikelola setahun penuh | Rp37.800.000 + Rp8.100.000 | Rp45.900.000 |
| Pendapatan tahun berikutnya | sama selama sewa tidak berubah | Rp8.100.000 |

Biaya per properti belum punya angka, jadi kontribusi bersih per properti belum bisa dihitung. Yang perlu dihimpun untuk P3:

- biaya penilaian properti (kantor jasa penilai publik) dan notaris/PPAT **[perlu verifikasi]**;
- biaya penurunan SHM menjadi HGB, pajak pengalihan hak, dan BPHTB, serta siapa yang menanggungnya **[perlu verifikasi]**;
- tarif transaksi Midtrans per metode bayar, dan apakah masuk biaya operasional kos atau beban KosBagi **[perlu verifikasi]**;
- biaya verifikasi e-KYC per investor **[perlu verifikasi]**;
- biaya audit smart contract dan gas transaksi di jaringan produksi **[perlu verifikasi]**.

## 6. Analisis sensitivitas

Semua tabel memakai Kos Sumbersari 01 dan mengubah satu asumsi. Baris tebal adalah skenario dasar.

### Pajak

| Skenario | Pajak per tahun | Dibagikan per tahun | Per token per bulan | Imbal hasil |
|---|---|---|---|---|
| **PPh badan 22% atas laba** | Rp26.730.000 | Rp94.770.000 | Rp438,75 | 5,265% |
| PPh final 0,5% dari omzet | Rp810.000 | Rp120.690.000 | Rp558,75 | 6,705% |

Syarat tarif 0,5% bagi kustodian belum dikonfirmasi **[perlu verifikasi]**. Pajak kos daerah Kota Malang belum masuk tabel karena status dan tarifnya belum pasti (Ikatan Konsultan Pajak Indonesia, 2025) **[perlu verifikasi]**.

### Okupansi

Biaya operasional diuji dengan dua cara. Kolom "biaya ikut sewa" memakai asumsi proposal, yaitu 20% dari sewa kotor. Kolom "biaya tetap" menahan biaya di Rp32.400.000 per tahun, karena sebagian besar biaya kos tidak turun saat kamar kosong. Cara kedua lebih konservatif.

| Okupansi | Sewa kotor per tahun | Dibagikan, biaya ikut sewa | Imbal hasil | Dibagikan, biaya tetap | Imbal hasil |
|---|---|---|---|---|---|
| 100% | Rp180.000.000 | Rp105.300.000 | 5,850% | Rp108.108.000 | 6,006% |
| **90%** | Rp162.000.000 | Rp94.770.000 | 5,265% | Rp94.770.000 | 5,265% |
| 80% | Rp144.000.000 | Rp84.240.000 | 4,680% | Rp81.432.000 | 4,524% |
| 70% | Rp126.000.000 | Rp73.710.000 | 4,095% | Rp68.094.000 | 3,783% |
| 60% | Rp108.000.000 | Rp63.180.000 | 3,510% | Rp54.756.000 | 3,042% |

Kehilangan satu kamar selama setahun (90% ke 80%) menurunkan imbal hasil sekitar 0,6 sampai 0,7 poin persen.

### Biaya operasional

| Biaya operasional | Dibagikan per tahun | Per token per bulan | Imbal hasil |
|---|---|---|---|
| 15% | Rp101.088.000 | Rp468,00 | 5,616% |
| **20%** | Rp94.770.000 | Rp438,75 | 5,265% |
| 25% | Rp88.452.000 | Rp409,50 | 4,914% |
| 30% | Rp82.134.000 | Rp380,25 | 4,563% |

## 7. Yang belum termasuk

- Kenaikan nilai properti.
- Dana cadangan setara satu bulan sewa (proposal Tabel 5.1). Bila disisihkan dari sewa bersih, bagi hasil tahun pertama berkurang. Cara penyisihannya belum diputuskan.
- Biaya pengalihan hak ke kustodian dan biaya per properti di bagian 5.
- Kenaikan sewa dan inflasi biaya tahunan.
- Fee pasar sekunder.
- Proyeksi 3 tahun, BEP, dan NPV, yang disusun di P3 memakai dokumen ini sebagai masukan.

## 8. Sumber

- Proposal Tugas Akhir Kelompok 9 (2026), *KosBagi*, bagian 2.1, 2.2, 2.9, 2.10, Tabel 2.6, dan Tabel 5.1. Mata kuliah Teknologi Blockchain dan Platform Keuangan Dijital, Fakultas Ilmu Komputer, Universitas Brawijaya.
- Brighton Real Estate (2026) *Rumah Kos + Toko Dekat Suhat, Rukos Eksklusif Dekat UB (Universitas Brawijaya)*. Tersedia di: https://www.brighton.co.id/cari-properti/view/lowokwaru-57 (Diakses: 15 Oktober 2026).
- Ikatan Konsultan Pajak Indonesia (2025) *Pemkot Malang akan Kembali Berlakukan Pajak Kos*. Tersedia di: https://ikpi.or.id/pemkot-malang-akan-kembali-berlakukan-pajak-kos/ (Diakses: 15 Oktober 2026).
- Mamikos (2026) *Biaya Hidup Mahasiswa Kuliah di Unibraw*. Tersedia di: https://mamikos.com/info/biaya-hidup-mahasiswa-kuliah-di-unibraw/ (Diakses: 15 Oktober 2026).
