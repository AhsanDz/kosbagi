# Laporan Uji Smart Contract

Laporan akhir uji `KosToken`, `KosLedger`, perangkat deploy, dan worker backend yang memanggil kedua kontrak, saat progress 4 selesai (18 Nov 2026, ditambah opsi gladi berlabel 20 Nov 2026). Semua uji berjalan di jaringan Hardhat lokal. Deploy ke Sepolia belum dijalankan karena kunci Sepolia belum tersedia; langkahnya ada di [`docs/kontrak/deploy-sepolia.md`](../kontrak/deploy-sepolia.md).

Kode Solidity, ABI, dan modul Ignition tidak berubah sejak P3 (kontrak sendiri tidak berubah sejak P2). Yang baru di P4: worker kini memanggil `recordExpense` dan `closePeriod`, test alur penuh menutup periode November dengan angka bisnis (bagian 11), dan skrip deploy mendapat opsi `DEPLOY_LABEL` supaya setiap gladi demo di Sepolia memakai kontrak baru (bagian 8.3). `KosVoting` tidak dibangun (keputusan 16 Nov 2026).

## 1. Ringkasan

| Butir | Hasil |
|---|---|
| Test kontrak | 169 lulus, 0 gagal (`KosToken` 63, `KosLedger` 65, deploy lokal dan ABI 4, fixture jalur 1 13, deploy Sepolia 24) |
| Profil `default` dan `production` | Keduanya 169 lulus |
| Cakupan baris dan pernyataan | `KosLedger.sol` 100%, `KosToken.sol` 100% |
| Pemeriksaan tipe dan kompilasi | Lulus, tanpa warning |
| Skenario proposal | 10, 11, dan 12 lulus di test kontrak; skenario 12 juga dibuktikan lewat worker (bagian 11) |
| Setiap fungsi tulis | Diuji sukses dan ditolak untuk pemanggil tanpa peran (bagian 5) |
| Worker backend, unit test | 129 lulus (tiruan jaringan dan basis data) |
| Worker backend, alur penuh di Hardhat node | 25 dari 25 lulus, diulang dua kali di node yang sama |
| Angka November lewat worker | Sewa kotor Rp13.500.000, biaya Rp2.700.000, sewa bersih Rp7.897.500, 43875 sen per token, sisa pembulatan Rp0; sama dengan angka bisnis yang disepakati 16 Nov 2026 dan kalkulator jalur 1 |
| Gladi deploy penuh di Hardhat node lokal port 8546 (P3) | Berhasil, 50 dari 50 pemeriksaan pasca-deploy sesuai, bytecode sama dengan artifact `production` |
| Deploy gladi berlabel `DEPLOY_LABEL` (P4) | Dua gladi berturut-turut menghasilkan kontrak berbeda; deploy tanpa label melanjutkan jejak lama tanpa transaksi baru (bagian 8.3) |
| Hash dokumen penerbitan jalur 1 | Ketiganya sama dengan nilai yang diberikan jalur 1 (bagian 9) |
| Uji mutasi `KosLedger.sol` (P2) | 68 dari 68 mutasi tertangkap; kontrak tidak berubah sesudahnya |

## 2. Lingkungan

| Komponen | Versi |
|---|---|
| Node.js | 25.1.0 di laptop pengembang (P4); P3 juga diulang di 24.22.2, versi proyek |
| Hardhat | 3.21.1 (Ignition 3.1.9, hardhat-verify 3.1.4) |
| Solidity | 0.8.34, target EVM `osaka` |
| OpenZeppelin Contracts | 5.6.1 |
| ethers.js (kontrak dan backend) | 6.17.0 |
| Jaringan test kontrak | Hardhat lokal (EDR) di dalam proses, tanpa file `.env` |
| Jaringan alur penuh worker | `npx hardhat node` port 8545, PostgreSQL basis data `kosbagi_j3`, Redis db 5 (Docker) |
| Jaringan gladi deploy | `npx hardhat node --port 8546`, akun bawaan Hardhat |

## 3. Hasil perintah kontrak

Dijalankan dari folder `contracts/` pada 20 Nov 2026, setelah opsi `DEPLOY_LABEL` ditambahkan.

| Perintah | Hasil |
|---|---|
| `npx hardhat test` | `169 passing`, kode keluar 0 |
| `npm run test:production` | `169 passing`, kode keluar 0 |
| `npm run coverage` | `169 passing`, cakupan 100% (bagian 7) |
| `npm run typecheck` | Kompilasi tanpa warning, `tsc` lulus tanpa error |

`npm run deploy:local` dan `npm run verify:local` diulang 20 Nov 2026 karena skrip deploy berubah: 50 dari 50 pemeriksaan sesuai, gas total 4.307.383, pemeriksaan bytecode lulus; dengan `DEPLOY_LABEL=gladi1` hasilnya `deployments/lokal-gladi1.json` dengan kontrak di alamat lain. Hasil P3 untuk perintah yang tidak diulang (kode yang diuji tidak berubah): `npm run export-abi` menulis `KosToken` 104 entri dan `KosLedger` 53 entri tanpa mengubah isi file backend. Di P3 semua perintah di atas juga lulus di Node 24.22.2.

## 4. Skenario uji proposal

| No | Skenario | Test | Hasil |
|---|---|---|---|
| 10 | Transfer membuat saldo penerima lebih dari 1.800 token gagal | `KosToken`, "Skenario 10" (3 test: lewat perbendaharaan, antarpemegang, dan batas tepat 1.800), ditambah jalur `permit` dan `approve` + `transferFrom` | Lulus |
| 11 | Pemanggil tidak berwenang memanggil `recordRent` gagal | `KosLedger`, "Skenario 11" (2 test: pihak luar dan admin) | Lulus |
| 12 | `closePeriod`: nilai per token sesuai hitungan manual | `KosLedger`, "Skenario 12" (2 test), `ManualDistribution` (13 test, fixture jalur 1), dan alur penuh worker kelompok "periode November" (bagian 11) | Lulus |

Skenario 12 versi fixture menjalankan keempat kasus `contracts/test/fixtures/distribusi-manual.json` di kontrak hasil modul deploy Sepolia. Untuk setiap kasus: saldo tiap pemegang dibentuk lewat `transferFromTreasury`, sewa per kamar dan biaya dicatat operator, periode ditutup, lalu semua field periode, saldo snapshot, bagian tiap pemegang, jumlah bagian, dan cadangan dibandingkan dengan fixture.

| Kasus | Periode | Sewa bersih | Nilai per token | Sisa pembulatan | Hasil |
|---|---|---|---|---|---|
| Dasar November 2026 | 202611 | 7.897.500 | 43875 sen | 0 | Lulus |
| Sisa pembulatan dua belas pemegang | 202612 | 7.062.372 | 39235 sen | 3 | Lulus |
| Biaya melebihi sewa (defisit 1.650.000) | 202701 | 0 | 0 | 0 | Lulus |
| Pembulatan di setiap langkah | 202702 | 818.519 | 4547 sen | 7 | Lulus |

Fixture juga diperiksa konsistensinya sendiri (sewa kotor = jumlah sewa per kamar, saldo pemegang = 18.000, bagian + cadangan = sewa bersih), supaya salah ketik di fixture tidak lolos diam-diam. Fixture yang sama dipakai kalkulator `backend/src/finance/` milik jalur 1.

Skenario 12 versi worker (P4) melewati jalur yang dipakai saat demo: job outbox, worker, dompet operator, lalu kontrak. Hasilnya di bagian 11.2.

## 5. Setiap fungsi tulis

Fungsi tulis = fungsi yang mengubah keadaan kontrak. Setiap fungsi diuji berhasil untuk pemanggil yang sah dan ditolak untuk pemanggil lain. Kolom "Worker" menunjukkan jenis job yang memanggilnya di backend.

### 5.1 `KosToken`

| Fungsi | Pemanggil sah | Uji berhasil | Uji ditolak | Worker |
|---|---|---|---|---|
| `setKycStatus` | `KYC_ROLE` (operator) | Meloloskan dan mencabut KYC; aman dipanggil ulang dengan status sama | Tanpa `KYC_ROLE` termasuk admin; alamat nol | `WHITELIST_KYC` |
| `transferFromTreasury` | `OPERATOR_ROLE` | Token pindah tanpa tanda tangan dompet perbendaharaan; event `TreasuryTransfer` | Tanpa peran termasuk admin dan dompet perbendaharaan; referensi ganda; referensi atau jumlah nol; stok kurang; alamat nol; penerima tanpa KYC; lewat 1.800 token (skenario 10); saat dijeda. Referensi tetap belum terpakai bila gagal | `TRANSFER_TOKENS` |
| `anchorDocument` | `DEFAULT_ADMIN_ROLE` | Versi 1 perjanjian pengelolaan, versi 2 laporan penilaian dengan riwayat utuh, jenis dokumen baru | Operator dan pihak lain; hash sama dengan versi berlaku; jenis atau hash nol | Tidak; dipanggil skrip deploy dengan dompet admin |
| `pause`, `unpause` | `PAUSER_ROLE` (admin dan operator) | Menjeda dan melanjutkan; prosedur darurat | Tanpa peran termasuk dompet perbendaharaan; jeda ganda; unpause saat tidak dijeda | Tidak |
| `transfer`, `transferFrom`, `approve`, `permit` | Pemegang token | `permit` dompet kustodian lalu operator mengembalikan token ke perbendaharaan | Penerima tanpa KYC; lewat 1.800 token; saat dijeda | Tidak |
| `delegate`, `delegateBySig` | Tidak ada | Tidak berlaku | Selalu gagal (`DelegationDisabled`); delegasi otomatis ke diri sendiri | Tidak |
| `grantRole`, `revokeRole`, `renounceRole` | Admin; `renounceRole` untuk peran milik sendiri | Admin menambah lalu mencabut operator | Operator tidak bisa memberi peran; `renounceRole` atas nama dompet lain | Tidak |

Test "setiap fungsi tulis berperan menolak pemanggil tanpa peran" di `KosToken.test.ts` memeriksa semua fungsi berperan dalam satu tabel.

### 5.2 `KosLedger`

| Fungsi | Pemanggil sah | Uji berhasil | Uji ditolak | Worker |
|---|---|---|---|---|
| `recordRent` | `OPERATOR_ROLE` | Sewa tercatat, event, sewa kotor bertambah; kamar sama di periode lain | Skenario 11 (pihak luar dan admin); referensi ganda; kamar + periode ganda; periode ditutup; kamar, nominal, atau referensi nol; sembilan format periode salah; overflow total; saat dijeda | `RECORD_RENT` |
| `recordExpense` | `OPERATOR_ROLE` | Biaya tercatat, event, total biaya bertambah; kategori 0 dan 255 | Tanpa peran termasuk admin; nota ganda; periode ditutup; periode, nominal, atau hash tidak valid; saat dijeda | `RECORD_EXPENSE` (P4) |
| `closePeriod` | `OPERATOR_ROLE` | Skenario 12; biaya melebihi sewa; laba Rp1; tanpa sewa; tanpa biaya; pembulatan ke bawah; nominal terbesar | Tanpa peran termasuk admin; tutup ganda; periode kosong (`EmptyPeriod`); suplai nol di blok snapshot (`NoSupplyAtSnapshot`); format salah; saat dijeda | `CLOSE_PERIOD` (P4) |
| `pause`, `unpause` | `PAUSER_ROLE` (admin dan operator) | Semua fungsi tulis terblokir lalu berjalan lagi; fungsi baca tetap jalan; prosedur darurat | Pihak luar; jeda ganda | Tidak |
| `grantRole`, `revokeRole`, `renounceRole` | Admin | Admin menambah operator baru yang langsung bisa mencatat | Operator tidak bisa memberi peran ke siapa pun | Tidak |

## 6. Rincian test kontrak

| File dan kelompok | Jumlah | Isi |
|---|---|---|
| `KosToken` | 63 | Tidak berubah dari progress 1 |
| `KosLedger` | 65 | Tidak berubah dari progress 2 |
| `Deployment`: Modul deploy lokal | 2 | Deploy lewat Ignition, satu periode penuh dari hasil deploy |
| `Deployment`: Ekspor ABI | 2 | ABI di backend sama dengan hasil kompilasi |
| `ManualDistribution` | 13 | Parameter fixture = parameter deploy; per kasus: konsistensi fixture, angka `closePeriod`, saldo snapshot dan `shareOf` tiap pemegang |
| `SepoliaDeployment`: Modul deploy Sepolia | 7 | Tiga dokumen versi 1, 50 pemeriksaan pasca-deploy lulus, pembagian peran admin dan operator, tabel peran, pemeriksaan menangkap hash dan dompet yang salah, deploy oleh selain admin gagal di `anchorDocument` (`AccessControlUnauthorizedAccount`), hash dokumen ketiga wajib |
| `SepoliaDeployment`: Pemeriksaan bytecode | 3 | Bytecode hasil deploy sama dengan artifact di luar immutable, kontrak lain dan bytecode yang diubah satu byte ditolak, masker immutable |
| `SepoliaDeployment`: Target dan parameter | 8 | Hanya Sepolia dan Hardhat lokal, normalisasi checksum, tolak alamat nol, tidak valid, dan kembar, tolak hash dokumen dan kunci lain di file parameter, file parameter lokal = akun Hardhat, file parameter Sepolia valid atau masih placeholder; id deployment dan berkas hasil gladi berlabel, validasi `DEPLOY_LABEL` (P4) |
| `SepoliaDeployment`: Dokumen penerbitan | 6 | Tiga nama file eksplisit dan `README.md` diabaikan, jenis dokumen ada di `KosToken`, vektor uji SHA-256, file hilang, tolak file kosong, CRLF, dan BOM, path relatif repo |

Test dokumen penerbitan memakai file contoh di folder sementara sistem, bukan file jalur 1. Dengan begitu test kontrak tetap lulus walaupun paket jalur 3 di-merge lebih dulu daripada paket jalur 1. Hal ini dibuktikan 15 Nov 2026 di salinan yang hanya berisi `main` setelah P2 ditambah file jalur 3 P3, tanpa folder `docs/bisnis/dokumen-penerbitan/` dan tanpa file `.env`: `hardhat test`, profil `production`, dan coverage `167 passing`; `deploy:local` berhenti sebelum transaksi apa pun dengan pesan dokumen tidak ditemukan.

## 7. Cakupan

| File | Baris | Pernyataan | Baris belum tercakup |
|---|---|---|---|
| `contracts/KosLedger.sol` | 100% | 100% | Tidak ada |
| `contracts/KosToken.sol` | 100% | 100% | Tidak ada |

Alat cakupan Hardhat hanya melaporkan baris dan pernyataan Solidity, tidak melaporkan cabang dan tidak mengukur skrip TypeScript. Skrip deploy diuji lewat test fungsi `scripts/lib/` (bagian 6) dan gladi deploy (bagian 8). Kode worker diuji di backend (bagian 11).

## 8. Gladi deploy di Hardhat node lokal

### 8.1 Gladi lokal (P3)

Dijalankan 3 sampai 4 Nov 2026 dengan `npm run node:local` (port 8546) dan dokumen penerbitan asli jalur 1. Modul deploy tidak berubah sesudahnya.

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

### 8.2 Jalur khusus Sepolia (P3)

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

### 8.3 Deploy gladi berlabel (P4)

Catatan on-chain tidak ikut terhapus saat basis data di-reset, jadi setiap gladi demo di Sepolia memakai kontrak baru (keputusan 20 Nov 2026). Opsi `DEPLOY_LABEL` diuji 20 Nov 2026 dengan cara yang sama seperti 8.2: Hardhat node port 8545 dengan `--chain-id 11155111`, akun bawaan Hardhat, `npm run deploy:sepolia` di salinan `main` ditambah file jalur 3, dan file parameter Sepolia berisi empat akun pertama Hardhat. Nonce dompet admin dibaca sebelum dan sesudah setiap uji.

| Uji | Hasil |
|---|---|
| `DEPLOY_LABEL=gladi1` | Id `sepolia-smr01-gladi1`, berkas `deployments/sepolia-gladi1.json`, 50 dari 50 sesuai, tiga transaksi (nonce 0 ke 3) |
| `DEPLOY_LABEL=gladi2` | Id `sepolia-smr01-gladi2`, KosToken di alamat lain dari gladi1, 50 dari 50 sesuai (nonce 3 ke 6) |
| Tanpa label | Id `sepolia-smr01`, berkas `deployments/sepolia.json` dengan `deployLabel: null`, kontrak ketiga yang berbeda (nonce 6 ke 9) |
| Tanpa label, dijalankan lagi | "melanjutkan jejak yang sudah ada", alamat sama, tidak ada transaksi (nonce tetap 9) |
| `DEPLOY_LABEL=gladi1` lagi | Melanjutkan gladi1, alamat sama, tidak ada transaksi |
| Konfirmasi selain `DEPLOY` | Dibatalkan, tidak ada transaksi dan tidak ada jejak Ignition |
| `DEPLOY_LABEL="Gladi 1"` | Berhenti sebelum transaksi apa pun: label tidak valid |
| `DEPLOY_LABEL` + `ISSUANCE_DOCS_DIR` | Berhenti: `ISSUANCE_DOCS_DIR` hanya untuk gladi lokal |
| Berkas `sepolia-gladi2.json` ada, jejak Ignition-nya dihapus, label sama dipakai lagi | Berhenti sebelum transaksi apa pun: pakai label lain |
| `DEPLOY_LABEL=gladi1 npm run verify:sepolia` | Membaca `deployments/sepolia-gladi1.json`, pemeriksaan bytecode lulus, lalu berhenti di `ETHERSCAN_API_KEY` yang sengaja tidak diisi |

`git check-ignore` memastikan `deployments/sepolia-<label>.json`, `deployments/lokal-<label>.json`, dan `ignition/deployments/sepolia-smr01-<label>/` diabaikan Git, sedangkan `deployments/sepolia.json` dan `ignition/parameters/sepolia.json` tetap ikut repo.

## 9. Hash dokumen penerbitan

SHA-256 dihitung skrip deploy dari byte file apa adanya, lalu dicocokkan dengan nilai yang diberikan jalur 1 dan dengan `sha256sum`. Ketiganya sama, dan ketiga file berakhiran baris LF tanpa BOM.

| Jenis | File | SHA-256 |
|---|---|---|
| `DOCUMENT_CERTIFICATE` | `docs/bisnis/dokumen-penerbitan/sertifikat-hak-milik.md` | `ec8c1044639cfdf4a8d6fba8c477df0dbe2f09b757f58c918d0676ddda581ef3` |
| `DOCUMENT_APPRAISAL_REPORT` | `docs/bisnis/dokumen-penerbitan/laporan-penilaian.md` | `49ce16e79ed47d0c21793650545a406c32108d8ba5a5a58a0ec1041d40eed732` |
| `DOCUMENT_MANAGEMENT_AGREEMENT` | `docs/bisnis/dokumen-penerbitan/perjanjian-pengelolaan.md` | `1839d3cf229ad401b50299dd9fdca617691bef295d720a88ec3ed7f806946741` |

Setelah gladi, `currentDocumentHash` ketiga jenis di kontrak lokal sama dengan tabel ini, dan `documentHistory` masing-masing berisi satu versi. Nilai ini dicatat sebagai hasil uji, bukan ditulis di kode: skrip selalu menghitung ulang dari file.

## 10. Uji mutasi (P2)

Dijalankan di progress 2 pada `KosLedger.sol`: 68 mutasi ditulis tangan (pengecekan dihapus, penanda tidak disimpan, urutan pengecekan ditukar, kontrol akses dan jeda dilepas, rumus diubah, blok snapshot diubah), 68 tertangkap. Kode kontrak tidak berubah sesudahnya, jadi hasil ini masih berlaku. `KosToken.sol` belum diuji mutasi.

## 11. Uji worker terhadap kontrak

Worker backend (`backend/src/blockchain/`) adalah satu-satunya pengirim transaksi harian. Bagian ini mencatat bukti bahwa worker memakai kontrak sesuai rancangan bagian 7.

### 11.1 Unit test (tanpa jaringan)

Dijalankan dengan `npm test` di folder `backend/`. Jaringan Ethereum dan basis data ditiru; revert dibentuk dari ABI asli.

| File | Jumlah | Yang diuji terkait kontrak |
|---|---|---|
| `processors.test.ts` | 39 | Argumen kelima fungsi tulis (`recordRent`, `setKycStatus`, `transferFromTreasury`, `recordExpense(202611, 4, 300000, hash)`, `closePeriod(202611)`); nota sudah tercatat dengan isi sama (selesai) dan isi berbeda (gagal permanen); `ReceiptAlreadyRecorded` dan `PeriodAlreadyClosed` hanya selesai bila status on-chain cocok; `EmptyPeriod`, `NoSupplyAtSnapshot`, periode ditutup gagal permanen; Coba lagi admin |
| `chain-executor.test.ts` | 33 | Urutan pemeriksaan sebelum mengirim, hash disimpan sebelum disiarkan, transaksi lama ditunggu, baris `FAILED` yang transaksinya masuk blok belakangan atau masih di mempool, revert di blok, gangguan RPC |
| `contracts.test.ts`, `chain-params.test.ts`, lainnya | 57 | Fungsi dan event yang dipakai worker ada di ABI, tipe argumen `recordExpense` dan isi `periods`, konversi kamar, periode, dan kategori |

### 11.2 Alur penuh di Hardhat node

`backend/src/blockchain/local-chain.e2e.test.ts`, dijalankan dengan `BLOCKCHAIN_E2E=1` terhadap `npx hardhat node` port 8545, PostgreSQL `kosbagi_j3`, dan Redis db 5. Worker sungguhan (BullMQ, dispatcher outbox, kunci tunggal) mengirim transaksi dari dompet operator akun #1 Hardhat. Hasil 18 Nov 2026: **25 dari 25 lulus**, diulang dua kali berturut-turut di node yang sama dengan hasil sama (±32 detik per putaran).

Kelompok "periode November" men-deploy `KosToken` dan `KosLedger` baru di setiap putaran (parameter sama dengan modul lokal), sehingga saldo pemegang selalu persis angka yang disepakati 16 Nov 2026 (sama dengan Figma dan `docs/bisnis/perhitungan-distribusi.md`). Lima investor menerima token lewat job `WHITELIST_KYC` dan `TRANSFER_TOKENS`, sembilan sewa lewat `RECORD_RENT`, lima nota lewat `RECORD_EXPENSE` (persiapan Rp2.400.000 dan perbaikan K07 Rp300.000), lalu periode ditutup lewat `CLOSE_PERIOD`. Isi `periods(202611)` dan bagian tiap pemegang di blok snapshot:

| Butir | On-chain | Kalkulator jalur 1 | Angka bisnis |
|---|---|---|---|
| Sewa kotor | 13.500.000 | 13.500.000 | Rp13.500.000 |
| Biaya | 2.700.000 | 2.700.000 | Rp2.700.000 |
| Fee platform 5% | 675.000 | 675.000 | Rp675.000 |
| Laba kena pajak | 10.125.000 (sewa kotor − fee − biaya) | 10.125.000 | Rp10.125.000 |
| PPh 22% | 2.227.500 | 2.227.500 | Rp2.227.500 |
| Sewa bersih | 7.897.500 | 7.897.500 | Rp7.897.500 |
| Total suplai | 18.000 | 18.000 | 18.000 |
| Nilai per token | 43875 sen | 43875 sen | Rp438,75 |
| Blok snapshot | Blok transaksi `closePeriod` − 1 | | |

| Pemegang | `getPastVotes` di blok snapshot | `shareOf` | Angka bisnis |
|---|---|---|---|
| Pemilik lama | 5.400 | 2.369.250 | Rp2.369.250 |
| Bagas | 1.800 | 789.750 | Rp789.750 |
| Citra | 1.200 | 526.500 | Rp526.500 |
| Eko | 800 | 351.000 | Rp351.000 |
| Fajar | 560 | 245.700 | Rp245.700 |
| Dimas | 100 | 43.875 | Rp43.875 |
| Perbendaharaan (8.140 token belum terjual, dikreditkan ke pemilik lama) | 8.140 | 3.571.425 | Rp3.571.425 |
| Jumlah | 18.000 | 7.897.500 | Sisa pembulatan Rp0 |

`distribute()` jalur 1 dengan saldo snapshot yang sama menghasilkan bagian yang persis sama. Daftar test alur penuh:

| Kelompok | Test |
|---|---|
| P3 (kontrak modul lokal) | Sewa lunas tercatat; KYC whitelist; pembelian 100 token; job diulang tanpa transaksi kedua; riwayat DB hilang tanpa kirim ulang; isi Redis dipalsukan; sewa kamar ganda gagal permanen; dompet perbendaharaan ditolak sebagai tujuan; kontrak dijeda lalu tercatat; worker kedua ditolak; `CHAIN_ID` dan alamat salah ditolak; berhenti rapi |
| P4 biaya (kontrak modul lokal) | `recordExpense` tercatat, event `ExpenseRecorded` dan total biaya; nota sama di baris outbox lain: isi sama selesai tanpa transaksi, isi berbeda gagal permanen tanpa transaksi |
| P4 Coba lagi admin | Baris `FAILED` yang transaksinya ternyata sudah masuk blok diakui `RECORDED` tanpa transaksi baru; baris `FAILED` yang transaksinya masih di mempool (penambangan otomatis dimatikan) ditunggu sampai masuk blok, nonce operator hanya bertambah satu |
| P4 periode November (kontrak baru) | Lima investor menerima token; sembilan sewa Rp13.500.000; biaya Rp2.700.000; `closePeriod` dengan angka di atas; `shareOf` tiap pemegang; transfer setelah penutupan tidak mengubah saldo snapshot (Dimas 200 token, `getPastVotes` tetap 100); tutup periode diminta lagi selesai tanpa transaksi; biaya dan sewa setelah penutupan gagal permanen tanpa transaksi; periode kosong (`EmptyPeriod`) gagal permanen tanpa transaksi |

Setiap test yang menyatakan "tanpa transaksi" memeriksa nonce dompet operator sebelum dan sesudahnya.

## 12. Yang belum diuji

- Deploy, verifikasi Etherscan, dan perilaku kontrak di Sepolia (menunggu kunci Sepolia; langkahnya di `docs/kontrak/deploy-sepolia.md`). Worker belum pernah mengirim transaksi ke Sepolia.
- Harga gas Sepolia sebenarnya; perkiraan ETH memakai gas terukur di jaringan lokal.
- Batas `eth_getLogs` RPC gratis di Sepolia. Pencarian event hanya pelengkap: bila RPC menolak, nota yang sudah tercatat tetap dianggap selesai tanpa pencocokan isi dan tanpa tautan Etherscan.
- Tombol Coba lagi lewat API admin jalur 2; alur penuh di atas meniru caranya dengan mengembalikan baris outbox ke `PENDING`.
- Audit keamanan oleh pihak ketiga. Checklist keamanan di rancangan bagian 3.12, 4.12, dan 8.7 dikerjakan sendiri oleh tim.
