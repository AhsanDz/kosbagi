# Business Case KosBagi: Kerangka

Status: kerangka P2, 2 November 2026; bab 3, 5, 6, 7, dan 8 diperbarui P3, 3 November 2026. Dikumpulkan sebagai PDF di forum Brone paling lambat 24 November 2026. Bobot penilaian 25%, dengan indikator pasar, proyeksi keuangan, risiko, dan kepatuhan.

Urutan bab mengikuti bagian "Isi Business Case" di ketentuan tugas. Setiap bab mencantumkan bahan yang sudah ada dan yang masih harus dikerjakan. Teks di bawah judul "Bahan yang sudah ada" berupa ringkasan, bukan naskah akhir.

| No | Bab | Status | Dilengkapi di |
|---|---|---|---|
| 1 | Ringkasan eksekutif | Belum, ditulis paling akhir | P4 |
| 2 | Masalah dan segmen pengguna | Bahan siap | P3 |
| 3 | Pasar (TAM, SAM, SOM) dan pesaing | SOM berangka dari proyeksi; TAM dan SAM belum ada data | P4 |
| 4 | Proposisi nilai dan Business Model Canvas | Bahan siap | P3 |
| 5 | Peta regulasi dan perizinan | Bahan siap, skenario Pasal 31E dan biaya peralihan hak ditambahkan, butir verifikasi terbuka | P4 |
| 6 | Model pendapatan | Siap | P3 |
| 7 | Proyeksi 3 tahun: unit economics, BEP, NPV | Proyeksi, BEP, NPV, dan sensitivitas siap; banyak asumsi biaya **[perlu verifikasi]** | P3 |
| 8 | Manajemen risiko | Daftar risiko siap, dampak sebagian | P4 |
| 9 | KYC/AML dan perlindungan data | Bahan siap, penerapan prototipe menyusul | P4 |
| 10 | Arsitektur sistem, roadmap, dan KPI | Arsitektur siap, KPI belum | P4 |

## 1. Ringkasan eksekutif

Satu halaman yang berdiri sendiri: masalah, solusi, pasar, model pendapatan, angka utama proyeksi, risiko utama, dan status prototipe. Ditulis setelah bab lain selesai supaya angkanya final.

## 2. Masalah dan segmen pengguna

Bahan yang sudah ada:

- Masalah empat pihak: pemilik kos, calon investor ritel, investor di platform tokenisasi, penghuni ([model bisnis bagian 1](model-bisnis.md), proposal Tabel 1.1).
- Segmen sasaran (proposal Tabel 2.3): investor ritel 20 sampai 35 tahun dengan modal Rp100 ribu sampai Rp10 juta; pemilik kos 10 sampai 30 kamar di sekitar kampus; mahasiswa penghuni kos bulanan.

Yang masih dikerjakan: perkiraan besar tiap segmen di Malang dari data sekunder. Tugas ini tidak memakai wawancara atau survei.

## 3. Pasar dan pesaing

Metode dari proposal bagian 2.7:

| Lapisan | Definisi | Rumus | Data |
|---|---|---|---|
| TAM | Nilai properti kos di kota-kota kampus besar | jumlah kos × rata-rata kamar × nilai per kamar | Belum ada **[perlu verifikasi]** |
| SAM | Kos eksklusif 10 sampai 30 kamar di Malang | jumlah kos segmen ini × rata-rata kamar × nilai per kamar | Belum ada: jumlah kos terdaftar dicari dari data pemerintah daerah dan platform listing **[perlu verifikasi]** |
| SOM | Properti yang realistis dikelola dalam 3 tahun | target properti × dana per properti | 15 properti aktif di akhir tahun 3 × Rp1.260.000.000 = Rp18.900.000.000 dana dihimpun, dengan sewa kotor dikelola Rp2.430.000.000 per tahun ([proyeksi](proyeksi-keuangan.md), skenario dasar). Asumsi kelompok, belum dibandingkan dengan SAM |

Angka pendukung yang sudah bersumber: lebih dari 330 ribu mahasiswa di Malang dan sekitar 90 ribu di UB (TIMES Indonesia, 2022); nilai pembanding Rp196 juta per kamar (Brighton Real Estate, 2026); 30,30 juta SID per 7 Agustus 2026 (Bisnis.com, 2026b); 20,7 juta konsumen aset kripto pada awal 2026 (Investortrust, 2026).

Pesaing: tabel proposal 2.2 dan 2.4 (GORO, Mamikos dan sejenisnya sebagai calon mitra, Bizhare dan urun dana, Blocktogo atau GIDR, investasi properti konvensional).

Yang masih dikerjakan: data jumlah kos, perbarui fakta GORO karena sumbernya dari 2023 **[perlu verifikasi]**, dan peta posisi pesaing.

## 4. Proposisi nilai dan Business Model Canvas

Bahan yang sudah ada: [model bisnis bagian 1, 2, 3, dan 6](model-bisnis.md). Saat menyalin, pakai frasa "ikut menerima bagi hasil", bukan "memiliki bagian kos", karena yang dijual adalah hak manfaat ekonomi.

Yang masih dikerjakan: alasan bisnis memakai blockchain, yang juga diminta di syarat prototipe blockchain (proposal bagian 2.5), diringkas di bab ini beserta batasnya.

## 5. Peta regulasi dan perizinan

Bahan yang sudah ada: [peta regulasi](../regulasi/peta-regulasi.md).

Tambahan P3 di [proyeksi keuangan bagian 7](proyeksi-keuangan.md):

- Skenario fasilitas Pasal 31E UU PPh: tarif efektif 11% atas laba kustodian, imbal hasil investor 6,0075% per tahun. Berlaku penuh selama peredaran bruto kustodian tidak melebihi Rp4,8 miliar, sekitar 29 properti seukuran Kos Sumbersari 01 **[perlu verifikasi]**.
- Biaya peralihan hak SHM ke HGB atas nama kustodian sekitar Rp153.000.000 untuk properti Rp1,8 miliar (PPh 2,5%, BPHTB 5%, jasa PPAT) **[perlu verifikasi]**.

Yang masih dikerjakan: menyelesaikan daftar cek bagian 6 dokumen itu sebelum 24 November.

## 6. Model pendapatan

Bahan yang sudah ada: [model bisnis bagian 7](model-bisnis.md) dan [asumsi bagian 5](asumsi-unit-ekonomi.md).

| Sumber | Besaran | Kos Sumbersari 01 |
|---|---|---|
| Fee penawaran | 3% dari dana dihimpun, dibayar pemilik, sekali | Rp37.800.000 |
| Fee pengelolaan | 5% dari sewa kotor per bulan | Rp8.100.000 per tahun |
| Fee pasar sekunder | 0,5% per transaksi, fase kedua | Tidak dihitung |

Biaya transaksi payment gateway ditanggung PT KosBagi Teknologi dan tidak dibebankan kepada penghuni, sesuai struktur biaya di Business Model Canvas (proposal Tabel 2.5). Dengan virtual account Rp4.000 per transaksi sebelum PPN (Midtrans, 2026), biaya ini sekitar 6% dari fee pengelolaan per kamar per bulan. Aturan ini juga tertulis di [perjanjian pengelolaan dummy](dokumen-penerbitan/perjanjian-pengelolaan.md) Pasal 3.

## 7. Proyeksi 3 tahun

Bahan lengkap: [proyeksi keuangan](proyeksi-keuangan.md), memakai [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md) untuk tingkat properti.

Skenario dasar: 2, 5, dan 8 properti baru seukuran Kos Sumbersari 01, tim 4 orang, tingkat diskonto 20%.

| Ukuran | Tahun 1 | Tahun 2 | Tahun 3 |
|---|---|---|---|
| Properti aktif di akhir tahun | 2 | 7 | 15 |
| Pendapatan | Rp83,7 juta | Rp225,5 juta | Rp391,5 juta |
| Laba (rugi) sebelum pajak | −Rp288,7 juta | −Rp220,6 juta | −Rp130,0 juta |

| Ukuran | Hasil |
|---|---|
| Unit economics penerbitan | Fee Rp37,8 juta, biaya Rp23,9 juta, kontribusi Rp13,9 juta per properti |
| Unit economics pengelolaan | Fee Rp8,1 juta, biaya transaksi Rp0,57 juta, kontribusi Rp7,5 juta per properti per tahun (92,9%) |
| Kebutuhan dana sampai tahun 3 | Rp754,3 juta, termasuk investasi awal Rp115 juta |
| NPV 3 tahun | −Rp584,0 juta |
| BEP operasional | 59 properti aktif seukuran Kos Sumbersari 01, atau 26 properti 20 kamar |

Temuan utama untuk naskah bab ini:

1. Dengan properti 10 kamar, fee 3% dan 5% belum menutup biaya tim dalam tiga tahun. Ini sesuai catatan awal di unit ekonomi: kelayakan bergantung pada jumlah dan ukuran properti.
2. Ukuran properti adalah pengungkit terbesar. Properti 20 kamar (masih di segmen proposal) membuat tahun 3 laba Rp224,4 juta dan NPV naik Rp409,2 juta. NPV ≥ 0 tercapai dengan 3, 6, dan 10 properti baru 20 kamar.
3. Biaya tetap dan keberhasilan penawaran berpengaruh sekitar Rp110 sampai Rp140 juta pada NPV; okupansi hampir tidak berpengaruh pada KosBagi tetapi berpengaruh besar pada investor.

Keputusan tim (15 November 2026): skenario dasar tetap memakai properti seukuran Kos Sumbersari 01 dan disajikan apa adanya, termasuk NPV negatifnya. Jalan menuju untung ditulis sebagai strategi akuisisi: setelah properti percontohan, KosBagi memprioritaskan kos 20 kamar yang masih termasuk segmen proposal. Biaya peralihan hak ke kustodian ditanggung pemilik lama (P16).

Yang masih dikerjakan: memverifikasi asumsi biaya yang ditandai **[perlu verifikasi]** (KJPP, notaris, e-KYC, gas jaringan produksi, kepatuhan) dan menentukan sumber pendanaan awal.

## 8. Manajemen risiko

Bahan yang sudah ada: proposal Tabel 5.1. Dampak di bawah dihitung dari skenario dasar dengan biaya operasional 20% ikut sewa, jadi setiap Rp1 sewa yang hilang mengurangi bagi hasil Rp0,585. Bila biaya tidak ikut turun, dampaknya lebih besar: Rp0,741 per Rp1.

| Kategori | Risiko | Dampak finansial | Mitigasi |
|---|---|---|---|
| Kredit | Penghuni menunggak | Satu kamar satu bulan: sewa kotor −Rp1.500.000, dibagikan −Rp877.500, per token −Rp48,75 | Deposit satu bulan, pengingat otomatis, denda sesuai kontrak |
| Pasar | Okupansi turun | 90% ke 80%: imbal hasil 5,265% menjadi 4,680% (biaya ikut sewa) atau 4,524% (biaya tetap) | Kurasi lokasi, kontrak semester atau tahunan, dana cadangan |
| Fraud | Bayar di luar platform atau pengelola menahan sewa | Sama dengan menunggak, dan tidak tercatat | Kontrak mewajibkan virtual account, peringatan kamar terisi tanpa pembayaran, inspeksi mendadak |
| Fraud | Nota fiktif atau digelembungkan | Tiap Rp1.000.000 biaya palsu: dibagikan −Rp780.000 | Batas per kategori, persetujuan admin, hash nota on-chain, audit |
| Operasional | Gangguan Midtrans atau RPC | Pencatatan tertunda, tidak kehilangan pembayaran | Antrean dengan retry, status menunggu pencatatan, RPC cadangan |
| Siber | Kunci operator bocor atau bug kontrak | Catatan palsu atau token berpindah tanpa hak | Secret manager, admin multisig saat produksi, jeda darurat, test dan audit |
| Siber | Webhook dipalsukan | Tagihan lunas tanpa pembayaran | Verifikasi signature, cek ulang status, rate limit |
| Siber dan hukum | Kebocoran data pribadi | Sanksi UU PDP dan hilangnya kepercayaan | Enkripsi, akses berbasis peran, tanpa data pribadi on-chain |
| Regulasi | Aturan terbit berbeda, pajak kos daerah kembali | Struktur berubah atau imbal hasil turun | Ikut sandbox OJK, sensitivitas pajak |
| Likuiditas | Token sulit dijual kembali | Investor tidak bisa keluar sebelum properti dijual | Pengungkapan risiko, pasar sekunder fase kedua, voting penjualan |
| Hukum dan operasional | Sengketa sertifikat atau kerusakan besar | Nilai aset turun atau sewa terhenti | Pemeriksaan notaris, penilaian independen, asuransi, dana cadangan |
| Keuangan platform | Jumlah atau ukuran properti tidak cukup untuk menutup biaya tetap | Rugi tiga tahun pertama; kebutuhan dana Rp754,3 juta pada skenario dasar ([proyeksi](proyeksi-keuangan.md) bagian 4) | Prioritas kos 20 sampai 30 kamar, tim kecil, pendanaan awal disiapkan sampai BEP |
| Pasar | Imbal hasil sewa di bawah SUN 10 tahun (5,265% dibanding 7,66%) | Penawaran lambat terjual atau gagal; 25% penawaran gagal menurunkan NPV Rp111,7 juta | Tonjolkan modal kecil dan keterbukaan data, skenario pajak Pasal 31E, pengungkapan risiko yang jujur |
| Hukum dan biaya | Biaya peralihan hak ke kustodian sekitar Rp153 juta per properti Rp1,8 miliar | Dana bersih pemilik turun menjadi 84,9% dari dana dihimpun, pemilik bisa memilih kredit bank | Biaya ditanggung pemilik lama (keputusan tim 15 November 2026) dan disebut di halaman pemilik kos; besaran dan strukturnya dikonfirmasi ke notaris dan konsultan pajak |

Yang masih dikerjakan: peringkat kemungkinan dan dampak (matriks risiko), serta bukti pengujian dari skenario 1 sampai 12.

## 9. KYC/AML dan perlindungan data

Bahan yang sudah ada: [peta regulasi](../regulasi/peta-regulasi.md) baris POJK 8/2023, POJK 22/2023, dan UU 27/2022, serta aturan data on-chain di proposal bagian 4.4.

Struktur:

1. Alur KYC investor sebelum pembelian pertama dan whitelist alamat di `KosToken`.
2. Pemantauan transaksi dan batas pembelian.
3. Pemisahan data: data pribadi di basis data, blockchain hanya hash dan alamat dompet.
4. Hak subjek data dan alasan data pribadi tidak boleh masuk blockchain.
5. Yang berjalan di prototipe (KYC dummy) dan yang hanya rencana produksi.

## 10. Arsitektur sistem, roadmap, dan KPI

Bahan arsitektur: `docs/desain/` dan [rancangan kontrak](../kontrak/rancangan-kontrak.md).

Roadmap yang sudah pasti adalah jadwal prototipe:

| Tahap | Waktu | Hasil |
|---|---|---|
| Fondasi | 29 Okt sampai 4 Nov 2026 | Kerangka aplikasi, `KosToken`, halaman publik |
| Fitur inti dan pembayaran | 5 sampai 11 Nov 2026 | Pembayaran sewa di Midtrans sandbox, `KosLedger` |
| Integrasi blockchain | 12 sampai 18 Nov 2026 | Sewa tercatat di Sepolia, pembelian token |
| Distribusi dan rekonsiliasi | 19 sampai 24 Nov 2026 | Enam butir demo wajib |
| Finalisasi | 25 Nov sampai 2 Des 2026 | Slide, video demo, dokumen final |

Roadmap sesudah prototipe (sandbox OJK, satu properti percontohan, pasar sekunder fase kedua) mengikuti proposal bagian 3.3 dan belum punya tanggal.

Calon KPI, targetnya ditetapkan di P4:

| Area | KPI |
|---|---|
| Properti | Jumlah properti aktif, okupansi rata-rata, nilai token diterbitkan |
| Penawaran | Dana dihimpun, jumlah investor, lama penawaran sampai penuh |
| Sewa | Persentase sewa lunas tepat waktu, persentase sewa lewat platform |
| Keterbukaan | Persentase pembayaran tercatat on-chain, jeda webhook sampai tercatat |
| Keuangan | Pendapatan fee, imbal hasil investor, selisih rekonsiliasi |

## Daftar pustaka dan lampiran

Daftar pustaka memakai format Harvard seperti proposal; sumber yang sudah terpakai ada di bagian Sumber tiap dokumen `docs/bisnis/` dan `docs/regulasi/`. Business case ikut mencantumkan penggunaan alat AI di lampirannya, seperti proposal.
