# Business Case KosBagi: Kerangka

Status: kerangka P2, 2 November 2026. Dikumpulkan sebagai PDF di forum Brone paling lambat 24 November 2026. Bobot penilaian 25%, dengan indikator pasar, proyeksi keuangan, risiko, dan kepatuhan.

Urutan bab mengikuti bagian "Isi Business Case" di ketentuan tugas. Setiap bab mencantumkan bahan yang sudah ada dan yang masih harus dikerjakan. Teks di bawah judul "Bahan yang sudah ada" berupa ringkasan, bukan naskah akhir.

| No | Bab | Status | Dilengkapi di |
|---|---|---|---|
| 1 | Ringkasan eksekutif | Belum, ditulis paling akhir | P4 |
| 2 | Masalah dan segmen pengguna | Bahan siap | P3 |
| 3 | Pasar (TAM, SAM, SOM) dan pesaing | Metode siap, data belum lengkap | P3 |
| 4 | Proposisi nilai dan Business Model Canvas | Bahan siap | P3 |
| 5 | Peta regulasi dan perizinan | Bahan siap, butir verifikasi terbuka | P3 |
| 6 | Model pendapatan | Bahan siap | P3 |
| 7 | Proyeksi 3 tahun: unit economics, BEP, NPV | Unit economics siap, proyeksi belum | P3 |
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
| SOM | Properti yang realistis dikelola dalam 3 tahun | target properti × dana per properti | Mengikuti asumsi proyeksi bab 7 |

Angka pendukung yang sudah bersumber: lebih dari 330 ribu mahasiswa di Malang dan sekitar 90 ribu di UB (TIMES Indonesia, 2022); nilai pembanding Rp196 juta per kamar (Brighton Real Estate, 2026); 30,30 juta SID per 7 Agustus 2026 (Bisnis.com, 2026b); 20,7 juta konsumen aset kripto pada awal 2026 (Investortrust, 2026).

Pesaing: tabel proposal 2.2 dan 2.4 (GORO, Mamikos dan sejenisnya sebagai calon mitra, Bizhare dan urun dana, Blocktogo atau GIDR, investasi properti konvensional).

Yang masih dikerjakan: data jumlah kos, perbarui fakta GORO karena sumbernya dari 2023 **[perlu verifikasi]**, dan peta posisi pesaing.

## 4. Proposisi nilai dan Business Model Canvas

Bahan yang sudah ada: [model bisnis bagian 1, 2, 3, dan 6](model-bisnis.md). Saat menyalin, pakai frasa "ikut menerima bagi hasil", bukan "memiliki bagian kos", karena yang dijual adalah hak manfaat ekonomi.

Yang masih dikerjakan: alasan bisnis memakai blockchain, yang juga diminta di syarat prototipe blockchain (proposal bagian 2.5), diringkas di bab ini beserta batasnya.

## 5. Peta regulasi dan perizinan

Bahan yang sudah ada: [peta regulasi](../regulasi/peta-regulasi.md).

Yang masih dikerjakan: menyelesaikan daftar cek bagian 6 dokumen itu sebelum 24 November, lalu menambahkan skenario Pasal 31E UU PPh **[perlu verifikasi]**.

## 6. Model pendapatan

Bahan yang sudah ada: [model bisnis bagian 7](model-bisnis.md) dan [asumsi bagian 5](asumsi-unit-ekonomi.md).

| Sumber | Besaran | Kos Sumbersari 01 |
|---|---|---|
| Fee penawaran | 3% dari dana dihimpun, dibayar pemilik, sekali | Rp37.800.000 |
| Fee pengelolaan | 5% dari sewa kotor per bulan | Rp8.100.000 per tahun |
| Fee pasar sekunder | 0,5% per transaksi, fase kedua | Tidak dihitung |

Yang masih dikerjakan: menegaskan siapa menanggung biaya transaksi payment gateway.

## 7. Proyeksi 3 tahun

Bahan yang sudah ada: [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md), termasuk sensitivitas pajak, okupansi, dan biaya.

Struktur yang akan diisi di P3:

| Bagian | Isi | Masukan yang dibutuhkan |
|---|---|---|
| Asumsi pertumbuhan | Jumlah properti baru per tahun | Skala SOM dari bab 3 |
| Pendapatan | Fee penawaran × properti baru + fee pengelolaan × properti aktif | Asumsi bagian 5 |
| Biaya | Tim, infrastruktur, kepatuhan, kurasi, pemasaran | Daftar biaya di asumsi bagian 5 **[perlu verifikasi]** |
| Unit economics | Kontribusi per properti setelah biaya per properti | Pendapatan dan biaya per properti |
| BEP | Biaya tetap per tahun ÷ kontribusi per properti per tahun | Baris di atas |
| NPV | Jumlah arus kas tahun ke-t ÷ (1 + r)^t | Tingkat diskonto r, dasar pemilihannya ditulis di bab ini |

Catatan awal dari unit ekonomi: fee pengelolaan satu properti hanya Rp8.100.000 per tahun, sehingga kelayakan bisnis bergantung pada jumlah properti dan fee penawaran. Proyeksi perlu memperlihatkan kondisi ini dengan jujur.

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
