# Laporan Uji Smart Contract

Laporan ini mencatat hasil uji `KosToken`, `KosLedger`, dan perangkat deploy saat progress 3 selesai (4 Nov 2026). Semua uji berjalan di jaringan Hardhat lokal. Deploy ke Sepolia belum dijalankan karena kunci Sepolia belum tersedia; langkahnya ada di [`docs/kontrak/deploy-sepolia.md`](../kontrak/deploy-sepolia.md).

## 1. Ringkasan

| Butir | Hasil |
|---|---|
| Test otomatis | 167 lulus, 0 gagal (`KosToken` 63, `KosLedger` 65, deploy lokal dan ABI 4, fixture jalur 1 13, deploy Sepolia 22) |
| Profil `default` dan `production` | Keduanya 167 lulus |
| Cakupan baris dan pernyataan | `KosLedger.sol` 100%, `KosToken.sol` 100% |
| Pemeriksaan tipe | Lulus tanpa error |
| Kompilasi | Tanpa warning |
| Skenario proposal | 10, 11, dan 12 lulus; skenario 12 kini juga membaca fixture jalur 1 |
| Gladi deploy penuh di Hardhat node lokal port 8546 | Berhasil, 50 dari 50 pemeriksaan pasca-deploy sesuai, bytecode sama dengan artifact `production` |
| Hash dokumen penerbitan jalur 1 | Ketiganya sama dengan nilai yang diberikan jalur 1 (bagian 8) |
| Uji mutasi `KosLedger.sol` (P2) | 68 dari 68 mutasi tertangkap; kontrak tidak berubah di P3 |

## 2. Lingkungan

| Komponen | Versi |
|---|---|
| Node.js | 24.22.2 (versi proyek), diulang di 25.1.0 |
| Hardhat | 3.21.1 (Ignition 3.1.9, hardhat-verify 3.1.4) |
| Solidity | 0.8.34, target EVM `osaka` |
| OpenZeppelin Contracts | 5.6.1 |
| Jaringan test | Hardhat lokal (EDR), tanpa file `.env` |
| Jaringan gladi deploy | `npx hardhat node --port 8546`, akun bawaan Hardhat |

## 3. Hasil perintah

Semua perintah dijalankan dari folder `contracts/`, setelah `npx hardhat clean`.

| Perintah | Hasil Node 25.1.0 (npm) | Hasil Node 24.22.2 |
|---|---|---|
| `npx hardhat build` | `Compiled 2 Solidity files with solc 0.8.34 (evm target: osaka)`, tanpa warning | Sama |
| `npx hardhat test` | `167 passing`, kode keluar 0 | `167 passing`, kode keluar 0 |
| `npm run test:production` | `167 passing`, kode keluar 0 | `167 passing`, kode keluar 0 |
| `npm run coverage` | `167 passing`, cakupan 100% (bagian 6) | Sama |
| `npm run typecheck` | Lulus tanpa error | Lulus tanpa error |
| `npm run export-abi` | `KosToken` 104 entri, `KosLedger` 53 entri; isi file backend tidak berubah | Tidak dijalankan terpisah |
| `npm run deploy:local` | Berhasil (bagian 7) | Tidak dijalankan terpisah |
| `npm run verify:local` | `Pemeriksaan bytecode lulus.` | Tidak dijalankan terpisah |

Di kolom Node 24, CLI Hardhat dan `tsc` dipanggil langsung dengan binari Node 24, karena `npm` di laptop pengembang memakai Node 25.1.0. Perintah setaranya: `hardhat test`, `hardhat test --build-profile production`, `hardhat test --coverage`, serta `hardhat build` dilanjutkan `tsc --noEmit`.

## 4. Skenario uji proposal

| No | Skenario | Test | Hasil |
|---|---|---|---|
| 10 | Transfer membuat saldo penerima lebih dari 1.800 token gagal | `KosToken`, "Skenario 10" (3 test) | Lulus |
| 11 | Pemanggil tidak berwenang memanggil `recordRent` gagal | `KosLedger`, "Skenario 11" (2 test: pihak luar dan admin) | Lulus |
| 12 | `closePeriod`: nilai per token sesuai hitungan manual | `KosLedger`, "Skenario 12" (2 test, angka ditulis di test) dan `ManualDistribution`, "Skenario 12: fixture perhitungan manual jalur 1" (13 test) | Lulus |

Skenario 12 versi fixture menjalankan keempat kasus `contracts/test/fixtures/distribusi-manual.json` di kontrak hasil modul deploy Sepolia. Untuk setiap kasus: saldo tiap pemegang dibentuk lewat `transferFromTreasury`, sewa per kamar dan biaya dicatat operator, periode ditutup, lalu semua field periode, saldo snapshot, bagian tiap pemegang, jumlah bagian, dan cadangan dibandingkan dengan fixture.

| Kasus | Periode | Sewa bersih | Nilai per token | Sisa pembulatan | Hasil |
|---|---|---|---|---|---|
| Dasar November 2026 | 202611 | 7.897.500 | 43875 sen | 0 | Lulus |
| Sisa pembulatan dua belas pemegang | 202612 | 7.062.372 | 39235 sen | 3 | Lulus |
| Biaya melebihi sewa (defisit 1.650.000) | 202701 | 0 | 0 | 0 | Lulus |
| Pembulatan di setiap langkah | 202702 | 818.519 | 4547 sen | 7 | Lulus |

Fixture juga diperiksa konsistensinya sendiri (sewa kotor = jumlah sewa per kamar, saldo pemegang = 18.000, bagian + cadangan = sewa bersih), supaya salah ketik di fixture tidak lolos diam-diam. Fixture yang sama dipakai kalkulator `backend/src/finance/` milik jalur 1.

## 5. Rincian test

| File dan kelompok | Jumlah | Isi |
|---|---|---|
| `KosToken` | 63 | Tidak berubah dari progress 1 |
| `KosLedger` | 65 | Tidak berubah dari progress 2 |
| `Deployment`: Modul deploy lokal | 2 | Deploy lewat Ignition, satu periode penuh dari hasil deploy |
| `Deployment`: Ekspor ABI | 2 | ABI di backend sama dengan hasil kompilasi |
| `ManualDistribution` | 13 | Parameter fixture = parameter deploy; per kasus: konsistensi fixture, angka `closePeriod`, saldo snapshot dan `shareOf` tiap pemegang |
| `SepoliaDeployment`: Modul deploy Sepolia | 7 | Tiga dokumen versi 1, 50 pemeriksaan pasca-deploy lulus, pembagian peran admin dan operator, tabel peran, pemeriksaan menangkap hash dan dompet yang salah, deploy oleh selain admin gagal di `anchorDocument` (`AccessControlUnauthorizedAccount`), hash dokumen ketiga wajib |
| `SepoliaDeployment`: Pemeriksaan bytecode | 3 | Bytecode hasil deploy sama dengan artifact di luar immutable, kontrak lain dan bytecode yang diubah satu byte ditolak, masker immutable |
| `SepoliaDeployment`: Target dan parameter | 6 | Hanya Sepolia dan Hardhat lokal, normalisasi checksum, tolak alamat nol, tidak valid, dan kembar, tolak hash dokumen dan kunci lain di file parameter, file parameter lokal = akun Hardhat, file parameter Sepolia valid atau masih placeholder |
| `SepoliaDeployment`: Dokumen penerbitan | 6 | Tiga nama file eksplisit dan `README.md` diabaikan, jenis dokumen ada di `KosToken`, vektor uji SHA-256, file hilang, tolak file kosong, CRLF, dan BOM, path relatif repo |

Test dokumen penerbitan memakai file contoh di folder sementara sistem, bukan file jalur 1. Dengan begitu test kontrak tetap lulus walaupun paket jalur 3 di-merge lebih dulu daripada paket jalur 1.

Hal ini dibuktikan 15 Nov 2026 di salinan terpisah yang hanya berisi `main` setelah P2 ditambah file jalur 3 P3, tanpa folder `docs/bisnis/dokumen-penerbitan/` dan tanpa file `.env`, setelah `npm ci` di Node 24.22.2:

| Perintah | Hasil |
|---|---|
| `hardhat test` | `167 passing`, kode keluar 0 |
| `hardhat test --build-profile production` | `167 passing`, kode keluar 0 |
| `hardhat test --coverage` | `167 passing`, `KosLedger.sol` dan `KosToken.sol` 100% baris dan pernyataan |
| `hardhat build` + `tsc --noEmit` | Lulus tanpa error |
| `deploy:local` (Hardhat node port 8546) | Berhenti sebelum transaksi apa pun: `Dokumen penerbitan tidak ditemukan: ...sertifikat-hak-milik.md`, kode keluar 1, tidak ada berkas hasil yang ditulis |

## 6. Cakupan

| File | Baris | Pernyataan | Baris belum tercakup |
|---|---|---|---|
| `contracts/KosLedger.sol` | 100% | 100% | Tidak ada |
| `contracts/KosToken.sol` | 100% | 100% | Tidak ada |

Alat cakupan Hardhat hanya melaporkan baris dan pernyataan Solidity, tidak melaporkan cabang dan tidak mengukur skrip TypeScript. Skrip deploy diuji lewat test fungsi `scripts/lib/` (bagian 5) dan gladi deploy (bagian 7).

## 7. Gladi deploy di Hardhat node lokal

Dijalankan 3 sampai 4 Nov 2026 dengan `npm run node:local` (port 8546) dan dokumen penerbitan asli jalur 1.

| Uji | Cara | Hasil |
|---|---|---|
| Deploy penuh | `npm run deploy:local` | Tiga transaksi dari akun admin; 50 dari 50 pemeriksaan sesuai; `deployments/lokal.json` tertulis |
| Gas | Receipt tiga transaksi | KosToken 3.073.916, KosLedger 1.162.028, `anchorDocument` 71.439, total 4.307.383 |
| Pemeriksaan bytecode | `npm run verify:local` | KosToken dan KosLedger sama dengan artifact `production` |
| Alur harian operator | Skrip uji di luar repo memakai ABI `backend/src/blockchain/abi/` | `setKycStatus` dan `transferFromTreasury` 100 token berhasil (bobot suara 100), `recordRent` K03 202611 tercatat |
| Kontrol akses hasil deploy | Skrip uji yang sama | `recordRent` oleh admin dan pihak luar, `anchorDocument` oleh operator, dan `transferFromTreasury` oleh admin ditolak `AccessControlUnauthorizedAccount` |
| Tanpa profil `production` | `npx hardhat run --network local8546 scripts/deploy.ts` | Berhenti dengan pesan, kode keluar 1 |
| Folder dokumen lain | `ISSUANCE_DOCS_DIR` ke folder contoh | Hash dari folder contoh dipakai, deploy berhasil |
| Dokumen CRLF | `ISSUANCE_DOCS_DIR` ke folder berisi file CRLF | Berhenti sebelum transaksi apa pun |
| Alamat operator salah | Ubah sementara `ignition/parameters/lokal.json` | Berhenti: alamat tidak sama dengan kunci operator |
| Alamat admin salah | Ubah sementara `ignition/parameters/lokal.json` | Berhenti: akun penanda tangan bukan admin |

Jalur khusus Sepolia diuji dengan Hardhat node lokal yang dinyalakan dengan `--chain-id 11155111`, sehingga skrip memperlakukannya sebagai Sepolia. Semua berkas hasil uji ini dihapus sesudahnya.

| Uji | Hasil |
|---|---|
| `ignition/parameters/sepolia.json` masih alamat nol | Berhenti: `"admin" masih alamat nol` |
| Konfirmasi dijawab selain `DEPLOY` | Dibatalkan, tidak ada transaksi |
| `ISSUANCE_DOCS_DIR` terisi | Berhenti: hanya untuk gladi lokal |
| Konfirmasi `DEPLOY` | Deploy berhasil, tautan Etherscan dicetak, 50 dari 50 sesuai |
| Skrip dijalankan ulang | Melanjutkan jejak Ignition `sepolia-smr01`, alamat sama, tidak ada transaksi baru |
| Saldo admin diturunkan ke 0,001 ETH | Berhenti sebelum transaksi apa pun: saldo kurang dari perkiraan |
| Verifikasi tanpa `ETHERSCAN_API_KEY` | Pemeriksaan bytecode lulus, lalu berhenti di variabel yang belum diisi sebelum permintaan ke Etherscan |

## 8. Hash dokumen penerbitan

SHA-256 dihitung skrip deploy dari byte file apa adanya, lalu dicocokkan dengan nilai yang diberikan jalur 1 dan dengan `sha256sum`. Ketiganya sama, dan ketiga file berakhiran baris LF tanpa BOM.

| Jenis | File | SHA-256 |
|---|---|---|
| `DOCUMENT_CERTIFICATE` | `docs/bisnis/dokumen-penerbitan/sertifikat-hak-milik.md` | `ec8c1044639cfdf4a8d6fba8c477df0dbe2f09b757f58c918d0676ddda581ef3` |
| `DOCUMENT_APPRAISAL_REPORT` | `docs/bisnis/dokumen-penerbitan/laporan-penilaian.md` | `49ce16e79ed47d0c21793650545a406c32108d8ba5a5a58a0ec1041d40eed732` |
| `DOCUMENT_MANAGEMENT_AGREEMENT` | `docs/bisnis/dokumen-penerbitan/perjanjian-pengelolaan.md` | `1839d3cf229ad401b50299dd9fdca617691bef295d720a88ec3ed7f806946741` |

Setelah gladi, `currentDocumentHash` ketiga jenis di kontrak lokal sama dengan tabel ini, dan `documentHistory` masing-masing berisi satu versi. Nilai ini dicatat sebagai hasil uji, bukan ditulis di kode: skrip selalu menghitung ulang dari file.

## 9. Uji mutasi (P2)

Dijalankan di progress 2 pada `KosLedger.sol`: 68 mutasi ditulis tangan (pengecekan dihapus, penanda tidak disimpan, urutan pengecekan ditukar, kontrol akses dan jeda dilepas, rumus diubah, blok snapshot diubah), 68 tertangkap. Kode kontrak tidak berubah di P3, jadi hasil ini masih berlaku. `KosToken.sol` belum diuji mutasi.

## 10. Yang belum diuji

- Deploy, verifikasi Etherscan, dan perilaku kontrak di Sepolia (menunggu kunci Sepolia; langkahnya di `docs/kontrak/deploy-sepolia.md`).
- Harga gas Sepolia sebenarnya; perkiraan ETH memakai gas terukur di jaringan lokal.
- Pemanggilan kontrak dari worker backend terhadap kontrak hasil modul deploy Sepolia (diuji layanan blockchain jalur 3 dengan modul lokal).
- Pencatatan cadangan sisa pembulatan dan perlakuan token di perbendaharaan (progress 4).
- Audit keamanan oleh pihak ketiga. Checklist keamanan di rancangan bagian 3.12, 4.12, dan 8.7 dikerjakan sendiri oleh tim.
