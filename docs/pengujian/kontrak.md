# Laporan Uji Smart Contract

Laporan ini mencatat hasil uji `KosToken` dan `KosLedger` saat progress 2 selesai (2 Nov 2026). Semua uji berjalan di jaringan Hardhat lokal. Belum ada uji di Sepolia.

## 1. Ringkasan

| Butir | Hasil |
|---|---|
| Test otomatis | 132 lulus, 0 gagal (`KosLedger` 65, `KosToken` 63, deploy dan ABI 4) |
| Profil `default` dan `production` | Keduanya 132 lulus |
| Cakupan baris dan pernyataan | `KosLedger.sol` 100%, `KosToken.sol` 100% |
| Pemeriksaan tipe | Lulus tanpa error |
| Kompilasi | Tanpa warning |
| Uji mutasi `KosLedger.sol` | 68 dari 68 mutasi tertangkap |
| Skenario proposal | 10, 11, dan 12 lulus |

## 2. Lingkungan

| Komponen | Versi |
|---|---|
| Node.js | 24.22.2 (versi proyek), diulang di 25.1.0 |
| Hardhat | 3.21.1 |
| Solidity | 0.8.34, target EVM `osaka` |
| OpenZeppelin Contracts | 5.6.1 |
| Jaringan | Hardhat lokal (EDR), tanpa file `.env` |

## 3. Hasil perintah

Semua perintah dijalankan dari folder `contracts/`, setelah `npx hardhat clean`.

| Perintah | Hasil Node 24.22.2 | Hasil Node 25.1.0 |
|---|---|---|
| `npx hardhat build` | `Compiled 2 Solidity files with solc 0.8.34`, tanpa warning | Sama |
| `npx hardhat test` | `132 passing` | `132 passing` |
| `npm run test:production` | `132 passing` | `132 passing` |
| `npm run coverage` | `132 passing`, cakupan 100% (bagian 6) | Sama |
| `npm run typecheck` | Lulus tanpa error | Lulus tanpa error |
| `npx hardhat test mocha --grep "Skenario 11"` | Tidak dijalankan terpisah | `2 passing` |
| `npx hardhat test mocha --grep "Skenario 12"` | Tidak dijalankan terpisah | `2 passing` |
| `npm run export-abi` | Tidak dijalankan terpisah | `KosToken` 104 entri, `KosLedger` 53 entri |
| `npx hardhat ignition deploy ignition/modules/LocalDeployment.ts` | Tidak dijalankan terpisah | Berhasil, dua alamat kontrak (di salinan proyek) |

Di kolom Node 24, CLI Hardhat dan `tsc` dipanggil langsung dengan binari Node 24, karena `npm` di laptop pengembang memakai Node 25.1.0. Perintah setaranya: `hardhat test`, `hardhat test --build-profile production`, `hardhat test --coverage`, serta `hardhat build` dilanjutkan `tsc --noEmit`.

## 4. Skenario uji proposal

| No | Skenario | Test | Hasil |
|---|---|---|---|
| 10 | Transfer membuat saldo penerima lebih dari 1.800 token gagal | `KosToken`, "Skenario 10" (3 test) | Lulus |
| 11 | Pemanggil tidak berwenang memanggil `recordRent` gagal | `KosLedger`, "Skenario 11" (2 test: pihak luar dan admin) | Lulus |
| 12 | `closePeriod`: nilai per token sesuai hitungan manual | `KosLedger`, "Skenario 12" (2 test) | Lulus |

Angka skenario 12 ditulis manual di file test, beserta langkah hitungnya:

| Besaran | Nilai |
|---|---|
| Sewa kotor | 13.500.000 |
| Biaya | 2.700.000 |
| Fee platform | 675.000 |
| Pajak | 2.227.500 |
| Sewa bersih | 7.897.500 |
| Nilai per token | `43875` sen (Rp438,75) |
| `shareOf` 100 token | 43.875 |
| `shareOf` 5.400 token | 2.369.250 |

## 5. Rincian test

| File dan kelompok | Jumlah | Isi |
|---|---|---|
| `KosLedger`: Deploy | 4 | Parameter dan peran, alamat nol, token bukan kontrak, batas tarif |
| `KosLedger`: `recordRent` | 22 | Sukses, skenario 11, referensi ganda, kamar + periode ganda, periode tertutup, job yang diulang, input nol, batas `uint16`, 9 format periode salah, batas periode, overflow total |
| `KosLedger`: `recordExpense` | 8 | Sukses, batas kategori, pemanggil tanpa peran, nota ganda, periode tertutup, job yang diulang, input tidak valid |
| `KosLedger`: `closePeriod` | 15 | Skenario 12, biaya melebihi sewa, biaya + fee tepat sama dengan sewa, laba Rp1, tanpa sewa, tanpa biaya, pembulatan, nominal terbesar, tutup ganda, periode lain tetap terbuka, periode kosong, format salah, pemanggil tanpa peran, suplai nol |
| `KosLedger`: Blok snapshot | 4 | Blok sebelum penutupan, transfer di blok yang sama, transfer sesudahnya, blok saat ini ditolak |
| `KosLedger`: `shareOf` | 4 | Periode belum ditutup, saldo 0 dan seluruh suplai, pembulatan per pemegang, jumlah bagian + sisa = sewa bersih |
| `KosLedger`: Jeda darurat | 5 | Pause dan unpause, semua fungsi tulis terblokir, fungsi baca tetap jalan, jeda ganda, prosedur darurat |
| `KosLedger`: Kontrol akses | 3 | Pihak luar di pause, operator tidak bisa memberi peran, admin menambah operator |
| `Deployment`: Modul deploy lokal | 2 | Deploy lewat Ignition, satu periode penuh dari hasil deploy |
| `Deployment`: Ekspor ABI | 2 | ABI di backend sama dengan hasil kompilasi |
| `KosToken` | 63 | Tidak berubah dari progress 1, semuanya tetap lulus |

## 6. Cakupan

| File | Baris | Pernyataan | Baris belum tercakup |
|---|---|---|---|
| `contracts/KosLedger.sol` | 100% | 100% | Tidak ada |
| `contracts/KosToken.sol` | 100% | 100% | Tidak ada |

Alat cakupan Hardhat hanya melaporkan baris dan pernyataan, tidak melaporkan cabang. Karena itu `KosLedger.sol` juga diuji dengan mutasi.

## 7. Uji mutasi

Cakupan 100% hanya berarti setiap baris pernah dijalankan. Uji mutasi memeriksa apakah test benar-benar memperhatikan hasilnya: satu perubahan kecil dimasukkan ke kontrak, lalu test dijalankan. Kalau tidak ada test yang gagal, aturan itu sebenarnya belum teruji.

| Butir | Hasil |
|---|---|
| Objek | `contracts/KosLedger.sol`, di salinan proyek |
| Jumlah mutasi | 68, ditulis tangan |
| Tertangkap | 68 |
| Lolos | 0 |
| Pembanding tanpa mutasi | 65 lulus, 0 gagal |

Jenis mutasi yang dicoba:

| Jenis | Contoh |
|---|---|
| Pengecekan dihapus | Referensi ganda, nota ganda, periode tertutup, periode kosong, format periode, tarif, alamat |
| Penanda tidak disimpan | Referensi, kamar + periode, nota, `closed`, `snapshotBlock`, `totalSupply` |
| Urutan pengecekan ditukar | Periode tertutup sebelum referensi ganda, kamar ganda sebelum referensi ganda, periode tertutup sebelum nota ganda |
| Kontrol akses dan jeda dilepas | `onlyRole` dan `whenNotPaused` di tiap fungsi tulis, peran tambahan untuk admin atau operator |
| Rumus diubah | Pembulatan ke atas di fee, pajak, nilai per token, dan `shareOf`; laba tanpa dikurangi fee atau biaya; sewa bersih tanpa dikurangi pajak; `mulDiv` diganti perkalian biasa |
| Blok snapshot diubah | `block.number` (24 test gagal) dan `block.number - 2` (4 test gagal) |

Mutasi ditulis tangan, jadi hasil ini menunjukkan aturan yang dipilih sudah teruji, bukan bukti bahwa tidak ada celah lain. `KosToken.sol` tidak ikut diuji mutasi di progress ini.

## 8. Cek silang dengan perhitungan manual jalur 1

Kontrak dijalankan dengan keempat kasus di `contracts/test/fixtures/distribusi-manual.json`, di salinan proyek. Semua field periode, bagian tiap pemegang, jumlah bagian, dan sisa pembulatan cocok:

| Kasus | Periode | Sewa bersih | Sisa pembulatan | Hasil |
|---|---|---|---|---|
| Dasar November 2026 | 202611 | 7.897.500 | 0 | Cocok |
| Sisa pembulatan dua belas pemegang | 202612 | 7.062.372 | 3 | Cocok |
| Biaya melebihi sewa | 202701 | 0 | 0 | Cocok |
| Pembulatan di setiap langkah | 202702 | 818.519 | 7 | Cocok |

Cek ini belum menjadi test di repo. Test yang membaca fixture dijadwalkan di progress 3, sesuai rencana. Sampai saat itu, perubahan fixture tidak otomatis terdeteksi.

## 9. Yang belum diuji

- Deploy dan verifikasi di Sepolia, serta perilaku kontrak di jaringan publik (progress 3).
- Pemanggilan kontrak dari worker backend, termasuk perlakuan revert di bagian 7 rancangan (progress 3).
- Kecocokan langsung dengan kalkulator `backend/src/finance/` (progress 3, lewat fixture yang sama).
- Pencatatan cadangan sisa pembulatan dan perlakuan token di perbendaharaan (progress 4).
- Audit keamanan oleh pihak ketiga. Checklist keamanan di rancangan bagian 4.12 dikerjakan sendiri oleh tim.
