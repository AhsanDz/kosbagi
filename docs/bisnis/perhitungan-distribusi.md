# Perhitungan Manual Distribusi Bagi Hasil

Status: ditetapkan 2 November 2026 (P2). Keputusan pembulatan dicatat di [log ide](../log-ide/2026-11-02-keputusan-progress-2.md).

Dokumen ini menjelaskan cara menghitung bagi hasil satu periode sewa, dari sewa yang masuk sampai bagian tiap pemegang token. Angka di sini sama dengan fixture [`contracts/test/fixtures/distribusi-manual.json`](../../contracts/test/fixtures/distribusi-manual.json), yang menjadi acuan skenario uji 12. Kontrak `KosLedger`, kalkulator `backend/src/finance/`, dan dokumen ini harus menghasilkan angka yang sama.

## 1. Aturan

Semua nominal adalah rupiah bilangan bulat. Setiap pembagian dibulatkan ke bawah (floor), sekali, di langkah itu.

| No | Besaran | Rumus | Nama di `KosLedger` |
|---|---|---|---|
| 1 | Sewa kotor | jumlah sewa yang tercatat pada periode itu | `grossRent` |
| 2 | Biaya | jumlah biaya yang tercatat pada periode itu | `totalExpenses` |
| 3 | Fee pengelolaan | `floor(sewa kotor × 500 ÷ 10.000)` | `platformFee` |
| 4 | Laba kena pajak | `sewa kotor − fee − biaya`, bernilai 0 bila negatif | tidak disimpan, ikut menghitung `tax` |
| 5 | Pajak | `floor(laba kena pajak × 2.200 ÷ 10.000)` | `tax` |
| 6 | Sewa bersih | `laba kena pajak − pajak` | `netRent` |
| 7 | Nilai per token, dalam sen | `floor(sewa bersih × 100 ÷ total suplai)` | `valuePerTokenSen` |
| 8 | Bagian satu pemegang | `floor(sewa bersih × saldo ÷ total suplai)` | `shareOf(period, balance)` |
| 9 | Sisa pembulatan | `sewa bersih − jumlah bagian semua pemegang` | dihitung backend saat distribusi |

Penjelasan tiap keputusan:

- **Pro-rata per pemegang.** Bagian seseorang dihitung langsung dari sewa bersih dan saldonya (langkah 8), bukan dari nilai per token yang sudah dibulatkan. Dengan begitu pembulatan terjadi sekali per pemegang.
- **Nilai per token dalam sen.** `43875` berarti Rp438,75. Nilai ini hanya untuk ditampilkan dan dibandingkan antarperiode, dan bukan dasar pembayaran.
- **Sisa masuk cadangan.** Sisa pembulatan dicatat per periode sebagai cadangan dan tidak dibawa ke periode berikutnya, sehingga setiap periode berdiri sendiri. Sisa ini selalu lebih kecil dari jumlah pemegang, karena satu pemegang kehilangan kurang dari Rp1.
- **Dasar pajak.** PPh badan 22% atas laba, sesuai asumsi proposal. Pajak ini sebenarnya dihitung per tahun; pemotongan bulanan di sini adalah pendekatan. Skenario PPh final 0,5% hanya masuk analisis sensitivitas di [asumsi dan unit ekonomi](asumsi-unit-ekonomi.md).
- **Saldo pemegang** dibaca di blok snapshot `closePeriod`, jadi transfer sesudahnya tidak mengubah bagian periode itu.
- **Total suplai** selalu seluruh 18.000 token, termasuk 5.400 token pemilik lama.

## 2. Kasus 1: skenario dasar November 2026

Sembilan kamar lunas @ Rp1.500.000 dan biaya tepat 20% dari sewa kotor. Ini angka proposal bagian 2.10 dalam bentuk bulanan.

| Langkah | Hitungan | Hasil |
|---|---|---|
| Sewa kotor | 9 × Rp1.500.000 | Rp13.500.000 |
| Biaya | dari nota; di skenario ini 20% × Rp13.500.000 | Rp2.700.000 |
| Fee pengelolaan | Rp13.500.000 × 500 ÷ 10.000 | Rp675.000 |
| Laba kena pajak | Rp13.500.000 − Rp675.000 − Rp2.700.000 | Rp10.125.000 |
| Pajak | Rp10.125.000 × 2.200 ÷ 10.000 | Rp2.227.500 |
| Sewa bersih | Rp10.125.000 − Rp2.227.500 | Rp7.897.500 |
| Nilai per token | Rp7.897.500 × 100 ÷ 18.000 = 43.875 sen | Rp438,75 |

Bagian tiap pemegang adalah Rp7.897.500 × saldo ÷ 18.000.

| Pemegang | Saldo | Bagian per bulan | Catatan |
|---|---|---|---|
| Pemilik lama | 5.400 | Rp2.369.250 | |
| Investor di batas 10% (6 orang) | 1.800 | Rp789.750 per orang | |
| Investor 07 | 1.500 | Rp658.125 | |
| Investor 08 | 200 | Rp87.750 | |
| Investor 09 | 100 | Rp43.875 | Contoh 100 token |
| **Jumlah** | **18.000** | **Rp7.897.500** | Sisa pembulatan Rp0 |

Sisanya nol karena Rp7.897.500 ÷ 18.000 = 438,75 dan semua saldo di atas adalah kelipatan 4.

### Rp438,75, ±Rp439, dan Rp438

| Angka | Asalnya | Dipakai untuk |
|---|---|---|
| Rp438,75 | Nilai eksak Rp7.897.500 ÷ 18.000 | Dasar dokumen dan kode. Disimpan sebagai `43875` sen |
| ±Rp439 | Rp438,75 dibulatkan ke rupiah terdekat | Proposal dan teks pemasaran; selalu ditulis dengan tanda ± |
| Rp438 | Rp438,75 dibulatkan ke bawah | Rancangan awal, tidak dipakai. Aturan ini menyisakan Rp13.500 per bulan |

Proposal menulis 100 token ±Rp43.900 per bulan. Nilai eksaknya Rp43.875. Bagian pemilik lama Rp2.369.250, bukan 5.400 × Rp439 = Rp2.370.600 yang lebih besar Rp1.350.

## 3. Kasus 2: sisa pembulatan dua belas pemegang

Delapan kamar lunas @ Rp1.500.000 dan biaya mengikuti nota sebesar Rp2.345.678, sehingga pembagiannya tidak habis.

| Langkah | Hitungan | Hasil |
|---|---|---|
| Sewa kotor | 8 × Rp1.500.000 | Rp12.000.000 |
| Biaya | dari nota | Rp2.345.678 |
| Fee pengelolaan | 5% × Rp12.000.000 | Rp600.000 |
| Laba kena pajak | Rp12.000.000 − Rp600.000 − Rp2.345.678 | Rp9.054.322 |
| Pajak | floor(Rp1.991.950,84) | Rp1.991.950 |
| Sewa bersih | Rp9.054.322 − Rp1.991.950 | Rp7.062.372 |
| Nilai per token | floor(39.235,4) sen | Rp392,35 |

| Pemegang | Saldo | Sebelum dibulatkan | Bagian |
|---|---|---|---|
| Pemilik lama | 5.400 | 2.118.711,6 | Rp2.118.711 |
| Investor 01 sampai 06 | 1.800 × 6 | 706.237,2 per orang | Rp706.237 per orang, Rp4.237.422 semuanya |
| Investor 07 | 777 | 304.859,058 | Rp304.859 |
| Investor 08 | 523 | 205.201,142 | Rp205.201 |
| Investor 09 | 300 | 117.706,2 | Rp117.706 |
| Investor 10 dan 11 | 100 × 2 | 39.235,4 per orang | Rp39.235 per orang, Rp78.470 semuanya |
| **Jumlah** | **18.000** | **7.062.372** | **Rp7.062.369** |

Sisa pembulatan = Rp7.062.372 − Rp7.062.369 = **Rp3**, masuk cadangan periode ini.

Kasus ini juga menunjukkan alasan bagian tidak dihitung dari nilai per token. Bila pemilik lama dihitung dari nilai yang sudah dibulatkan, hasilnya 5.400 × Rp392,35 = Rp2.118.690, lebih kecil Rp21 dari haknya.

## 4. Kasus 3: biaya melebihi sewa

Hanya dua kamar lunas pada bulan yang sama dengan perbaikan besar, biaya Rp4.500.000.

| Langkah | Hitungan | Hasil |
|---|---|---|
| Sewa kotor | 2 × Rp1.500.000 | Rp3.000.000 |
| Biaya | dari nota | Rp4.500.000 |
| Fee pengelolaan | 5% × Rp3.000.000 | Rp150.000 |
| Laba kena pajak | Rp3.000.000 − Rp150.000 − Rp4.500.000 = −Rp1.650.000 | Rp0 |
| Pajak | 22% × Rp0 | Rp0 |
| Sewa bersih | | Rp0 |
| Nilai per token | | Rp0,00 |

Semua pemegang, termasuk 100 token dan 5.400 token, mendapat Rp0 dan sisa pembulatan Rp0. Tidak ada angka negatif yang disimpan.

Defisit Rp1.650.000 tidak dibawa ke periode berikutnya, sesuai keputusan 3 November 2026: setiap periode dihitung mandiri. Fee tetap dihitung karena fee adalah 5% dari sewa kotor. Aturan ini sama dengan `closePeriod` di `KosLedger`. Siapa yang menalangi kekurangan kas dalam operasi nyata belum diputuskan; kandidatnya dana cadangan setara satu bulan sewa (proposal Tabel 5.1) dan dibahas di business case.

## 5. Kasus 4: pembulatan di setiap langkah

Nominal buatan untuk menguji pembulatan. Di kasus lain fee selalu habis dibagi, jadi perbedaan pembulatan fee hanya tampak di sini.

| Langkah | Hitungan | Hasil |
|---|---|---|
| Sewa kotor | satu pembayaran | Rp1.234.567 |
| Biaya | | Rp123.456 |
| Fee pengelolaan | floor(61.728,35) | Rp61.728 |
| Laba kena pajak | Rp1.234.567 − Rp61.728 − Rp123.456 | Rp1.049.383 |
| Pajak | floor(230.864,26) | Rp230.864 |
| Sewa bersih | Rp1.049.383 − Rp230.864 | Rp818.519 |
| Nilai per token | floor(4.547,327...) sen | Rp45,47 |

| Pemegang | Saldo | Sebelum dibulatkan | Bagian |
|---|---|---|---|
| Pemilik lama | 5.400 | 245.555,7 | Rp245.555 |
| Investor 01 sampai 07 | 1.800 × 7 | 81.851,9 per orang | Rp81.851 per orang, Rp572.957 semuanya |
| **Jumlah** | **18.000** | **818.519** | **Rp818.512** |

Sisa pembulatan = **Rp7**, tetap lebih kecil dari jumlah pemegang (8).

## 6. Yang belum diputuskan

| Hal | Status |
|---|---|
| Bagian token yang masih di dompet perbendaharaan | Diputuskan di P4. Karena itu semua kasus di atas memakai saldo yang seluruhnya sudah dipegang pemilik lama dan investor |
| Pemakaian saldo cadangan dari sisa pembulatan | Belum diputuskan; di prototipe cukup dicatat per periode |
| Penalangan kas saat biaya melebihi sewa | Dibahas di bab risiko business case |

## 7. Cara memeriksa

1. Hitung ulang satu kasus dengan kalkulator mengikuti tabel aturan di bagian 1.
2. Cocokkan hasilnya dengan kasus yang sama di fixture. Nama field fixture mengikuti kolom terakhir bagian 1.
3. Di P2, test `closePeriod` memakai angka kasus 1 yang ditulis langsung di file test. Mulai P3, test membaca fixture ini.
