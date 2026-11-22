# KosBagi

Platform tokenisasi hak manfaat ekonomi kos mahasiswa di sekitar Universitas Brawijaya, Malang. Investor membeli token mulai Rp100.000 per token dan menerima bagi hasil sewa bulanan. Setiap pembayaran sewa penghuni lewat Midtrans tercatat di smart contract Ethereum Sepolia, sehingga pendapatan yang menjadi dasar bagi hasil bisa diverifikasi per transaksi.

> Prototipe tugas akhir mata kuliah **Teknologi Blockchain dan Platform Keuangan Digital** (kelas B, FILKOM UB), Kelompok 9. Prototipe hanya berjalan di **Midtrans sandbox** dan **Ethereum Sepolia testnet** dengan **data dummy**: tidak ada uang nyata, token bernilai, KTP, atau nomor rekening asli.

## Studi kasus

**Kos Sumbersari 01**: 10 kamar eksklusif, sewa Rp1.500.000 per kamar per bulan, nilai properti Rp1,8 miliar.

| Item | Nilai |
|---|---|
| Token | KB-SMR01, 18.000 token @ Rp100.000 |
| Pemilik lama | 30% (5.400 token) |
| Dijual ke investor | 70% (12.600 token) |
| Batas kepemilikan | 10% per investor (1.800 token) |
| Kustodian sertifikat | PT KosBagi Properti |

## Arsitektur singkat

```
Penghuni / Investor ──▶ Frontend (Next.js) ──▶ Backend (Express) ──▶ Midtrans Snap (sandbox)
                                                   ▲                       │
                                                   └────── webhook ◀───────┘
Backend ──▶ PostgreSQL ──▶ antrean BullMQ (Redis) ──▶ worker ──▶ KosToken / KosLedger (Sepolia)
```

Webhook Midtrans adalah satu-satunya pintu perubahan status pembayaran. Setelah signature dan status terverifikasi, backend menaruh tugas pencatatan di antrean, lalu worker yang memegang dompet operator mengirim transaksi ke smart contract. Penjelasan lengkap ada di [`docs/desain/`](docs/desain/).

## Struktur repositori

| Folder | Isi |
|---|---|
| [`contracts/`](contracts/) | Smart contract Solidity (KosToken, KosLedger, KosVoting) dan test Hardhat |
| [`backend/`](backend/) | API Express + Prisma, integrasi Midtrans, antrean, worker blockchain |
| [`frontend/`](frontend/) | Aplikasi web Next.js untuk investor, penghuni, pengelola, dan admin |
| [`docs/`](docs/) | Dokumentasi bisnis, regulasi, API, kontrak, pengujian, dan desain |

## Menjalankan secara lokal

Semua langkah memasang, menjalankan, dan mengetes aplikasi ada di bagian ini. README di tiap folder hanya menjelaskan isi folder itu.

Perintah berlaku untuk PowerShell dan Command Prompt di Windows. Di macOS atau Linux, ganti `copy` dengan `cp`.

Mulai progress 3, aplikasi lengkap terdiri atas lima proses yang berjalan bersamaan: PostgreSQL dan Redis (Docker), jaringan blockchain lokal (Hardhat node), backend API, worker blockchain, dan frontend. Buka satu terminal untuk tiap proses yang terus berjalan, masing-masing mulai dari folder `kosbagi`. Tekan `Ctrl+C` untuk menghentikannya.

### Prasyarat

| Kebutuhan | Dipakai untuk | Dibutuhkan mulai |
|---|---|---|
| [Node.js 24 LTS](https://nodejs.org/) (sudah termasuk npm) | Frontend, backend, dan smart contract | Progress 1 |
| [Git](https://git-scm.com/) | Mengambil kode | Progress 1 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | PostgreSQL dan Redis lokal | Progress 2 |
| Akun Midtrans sandbox | Pembayaran (server key dan client key sandbox) | Progress 2 |
| [ngrok](https://ngrok.com/) (opsional) | Menerima notifikasi Midtrans di laptop | Progress 2 |
| RPC Sepolia (Alchemy atau Infura), dompet admin dan dompet operator berisi ETH Sepolia, API key Etherscan | Deploy dan transaksi di Sepolia. Untuk mencoba di laptop cukup Hardhat node lokal (langkah 4) | Progress 3 |

### 1. Ambil kode

```bash
git clone https://github.com/AhsanDz/kosbagi.git
cd kosbagi
```

**Sudah punya `.env` dari progress sebelumnya?** Progress 3 menambah variabel blockchain di `backend/.env` (`CHAIN_ID`, `CUSTODIAL_WALLET_MNEMONIC`, dan alamat kontrak) dan `ADMIN_PRIVATE_KEY` di `contracts/.env`. Progress 4 menambah `UPLOAD_DIR` (opsional, folder file nota, bawaan `./uploads`). Ulangi `copy .env.example .env` di folder `backend` (dan di `contracts` bila akan deploy ke Sepolia), lalu isi lagi nilai yang pernah kamu ubah, termasuk `MIDTRANS_SERVER_KEY`. Lakukan hal yang sama untuk `frontend/.env.local` (`copy .env.example .env.local`).

### 2. Basis data lokal

Nyalakan Docker Desktop dan tunggu sampai mesinnya berjalan, lalu:

```bash
cd backend
copy .env.example .env
npm ci
npm run db:up       # jalankan PostgreSQL + Redis dan tunggu sampai sehat
npm run db:deploy   # terapkan semua migrasi
npm run db:seed     # isi data dummy Kos Sumbersari 01
```

Hasil yang diharapkan dari perintah terakhir:

```
Seed selesai: 18 akun, 1 properti, 10 kamar, 12 tagihan baru, 0 tagihan lama dibiarkan.
KYC: 6 pengajuan baru, 0 investor dengan pengajuan lama dibiarkan. Penawaran KB-SMR01: dibuat.
```

Seed aman diulang. Akun, properti, dan kamar disamakan lagi, sedangkan tagihan, pengajuan KYC, dan penawaran yang sudah ada tidak disentuh, jadi hasil demo tidak tertimpa.

**Basis data dari progress 2?** Seed progress 2 membuat enam tagihan November yang langsung lunas tanpa pembayaran Midtrans, sehingga tagihan itu tidak pernah bisa tercatat di blockchain. Seed progress 3 memberi peringatan bila tagihan itu masih ada. Kosongkan basis data lokal lalu isi ulang:

```bash
npx prisma migrate reset --force
npm run db:seed
```

**Semua data di basis data lokal terhapus.** Perintah pertama juga menerapkan ulang semua migrasi, jadi `db:deploy` tidak perlu dijalankan lagi.

**Basis data dari progress 3?** Progress 4 menambah migrasi `skema_v4` (biaya dan nota, periode, distribusi, saldo bagi hasil). Jalankan `npm run db:deploy` sekali; data lama tetap ada dan seed tidak berubah. Untuk mengulang demo dari awal, pakai `npx prisma migrate reset --force` lalu `npm run db:seed` seperti di atas. Bila memakai Sepolia, mengulang demo juga berarti deploy kontrak baru (langkah 12).

Untuk melihat isi tabel lewat peramban, jalankan `npm run db:studio`. Untuk menghentikan layanan, jalankan `npm run db:down`; datanya tetap tersimpan di volume Docker.

### 3. Kunci Midtrans sandbox

1. Daftar di <https://dashboard.midtrans.com/register> bila belum punya akun; lingkungan sandbox dibuat otomatis dan gratis. Lalu buka <https://dashboard.sandbox.midtrans.com/settings/config_info> (menu **Settings > Access Keys**).
2. Salin **Server Key** (berawalan `SB-Mid-server-`) ke `MIDTRANS_SERVER_KEY` di `backend/.env`.
3. Di folder `frontend`, jalankan `copy .env.example .env.local`.
4. Salin **Client Key** (berawalan `SB-Mid-client-`) ke `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` di `frontend/.env.local`.

| Kunci | File | Sifat |
|---|---|---|
| `MIDTRANS_SERVER_KEY` | `backend/.env` | Rahasia. Jangan pernah di-commit atau ditaruh di frontend |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | `frontend/.env.local` | Boleh sampai ke peramban |

Tanpa kedua kunci ini aplikasi tetap berjalan, tetapi pembayaran tidak bisa dibuat: endpoint pembayaran membalas 503 `MIDTRANS_NOT_CONFIGURED` dan tombol bayar menampilkan pesan.

### 4. Blockchain lokal (Hardhat node)

Untuk mencoba di laptop tanpa ETH Sepolia, pakai jaringan Hardhat lokal. Di terminal tersendiri:

```bash
cd contracts
npm ci
npx hardhat node
```

Node berjalan di `http://127.0.0.1:8545` dengan chain ID 31337 dan mencetak 20 akun uji beserta private key-nya. Akun dan kunci itu bawaan Hardhat, sama di semua laptop, dan hanya boleh dipakai di jaringan lokal ini.

Di terminal lain, deploy KosToken dan KosLedger:

```bash
cd contracts
npx hardhat ignition deploy ignition/modules/LocalDeployment.ts --network localhost
```

Modul ini memakai Account #0 sebagai admin, Account #1 sebagai operator, Account #2 sebagai pemilik lama, dan Account #3 sebagai perbendaharaan. Alamat kontrak tercetak di akhir dan tersimpan di `contracts/ignition/deployments/chain-31337/deployed_addresses.json`.

Lalu isi bagian blockchain di `backend/.env`:

| Variabel | Isi untuk Hardhat lokal |
|---|---|
| `SEPOLIA_RPC_URL` | `http://127.0.0.1:8545` |
| `CHAIN_ID` | `31337` |
| `OPERATOR_PRIVATE_KEY` | Private key **Account #1** dari output `npx hardhat node` |
| `KOS_TOKEN_ADDRESS` | Alamat `KosBagiLocal#KosToken` |
| `KOS_LEDGER_ADDRESS` | Alamat `KosBagiLocal#KosLedger` |
| `CUSTODIAL_WALLET_MNEMONIC` | Mnemonic baru khusus uji. Buat dari folder `backend` dengan perintah di bawah. Jangan memakai mnemonic bawaan Hardhat |

```bash
node -e "import('ethers').then((e) => console.log(e.Wallet.createRandom().mnemonic.phrase))"
```

Hardhat node tidak menyimpan apa pun setelah dihentikan. Setiap kali node dijalankan ulang, deploy ulang dengan menambahkan `--reset` di akhir perintah deploy, perbarui alamat kontrak di `backend/.env`, lalu jalankan ulang backend dan worker. Catatan on-chain di node lama ikut hilang, jadi kosongkan juga basis data seperti di langkah 2 bila ingin mengulang demo dari awal.

### 5. Backend (API)

```bash
cd backend
npm run dev
```

Buka <http://localhost:4000/api/health>. Hasil yang diharapkan:

```json
{"data":{"status":"ok","service":"kosbagi-backend","version":"0.1.0","environment":"development","time":"...","uptimeSeconds":3}}
```

Persetujuan KYC butuh `CUSTODIAL_WALLET_MNEMONIC`. Tanpa variabel itu, tombol Setujui dibalas 503 `CUSTODIAL_WALLET_NOT_CONFIGURED`.

Mulai progress 4, server API juga membaca kontrak, yaitu saat menjalankan distribusi dan saat menyusun rekonsiliasi. Isi `SEPOLIA_RPC_URL`, `CHAIN_ID`, `KOS_TOKEN_ADDRESS`, dan `KOS_LEDGER_ADDRESS` di `backend/.env` yang sama dengan worker (langkah 4 untuk lokal, langkah 11 untuk Sepolia). Server API tidak membutuhkan kunci dompet. Tanpa variabel itu, halaman rekonsiliasi membalas 503 `CHAIN_NOT_CONFIGURED`.

### 6. Worker blockchain

Worker mengambil job dari antrean (pencatatan sewa, whitelist KYC, transfer token, pencatatan biaya, dan tutup periode), lalu mengirim transaksinya dari dompet operator. Di terminal tersendiri:

```bash
cd backend
npm run worker
```

Worker menolak jalan, dengan pesan yang menyebut penyebabnya, bila `KOS_TOKEN_ADDRESS` atau `KOS_LEDGER_ADDRESS` kosong, atau bila chain ID jaringan di `SEPOLIA_RPC_URL` berbeda dari `CHAIN_ID`. Tanpa worker, pembayaran tetap lunas tetapi berhenti di status **Menunggu pencatatan**. Begitu worker dinyalakan, job yang tertunda diproses.

### 7. Frontend (situs web)

```bash
cd frontend
npm ci
npm run dev
```

Buka <http://localhost:3000>. Saat pertama dijalankan butuh koneksi internet untuk mengunduh font.

### 8. Akun demo

Kata sandi semua akun: `demo-kosbagi`. Di halaman Masuk, kartu akun demo bisa langsung diklik.

| Peran | Nama | Email |
|---|---|---|
| Investor | Dimas Pratama | `investor.dummy@kosbagi.test` |
| Penghuni kamar K03 | Sari Wulandari | `penghuni.dummy@kosbagi.test` |
| Pengelola | Hadi Santoso | `pengelola.dummy@kosbagi.test` |
| Admin | Laras Kusuma | `admin.dummy@kosbagi.test` |

Delapan penghuni lain memakai pola `penghuni.k01.dummy@kosbagi.test` sampai `penghuni.k10.dummy@kosbagi.test`. Kamar K06 kosong, jadi tidak punya penghuni.

Enam investor lain mengisi daftar Verifikasi KYC admin. Mereka tidak punya kartu di halaman Masuk, tetapi bisa login dengan email dan kata sandi yang sama.

| Investor | Email | Pengajuan KYC dari seed |
|---|---|---|
| Rani Aulia | `rani.dummy@kosbagi.test` | Diajukan, `DUMMY-0051` |
| Fajar Nugroho | `fajar.dummy@kosbagi.test` | Diajukan, `DUMMY-0034` |
| Eko Saputra | `eko.dummy@kosbagi.test` | Diajukan, `DUMMY-0021` |
| Citra Lestari | `citra.dummy@kosbagi.test` | Diajukan, `DUMMY-0013` |
| Bagas Wicaksono | `bagas.dummy@kosbagi.test` | Diajukan, `DUMMY-0007` |
| Hendra Kusuma | `hendra.dummy@kosbagi.test` | Ditolak, karena nama di pengajuan berbeda dengan nama akun |

Dimas Pratama sengaja belum punya pengajuan, supaya demo dimulai dari mengajukan KYC. Seed tidak membuat pengajuan yang sudah disetujui, karena persetujuan harus membuat dompet kustodian dan job whitelist.

Semua tagihan November 2026 untuk sembilan kamar terisi belum dibayar. Tagihan K03 Agustus sampai Oktober 2026 lunas sebagai data lampau: tidak punya pembayaran Midtrans, jadi tampil tanpa tautan Etherscan.

Penawaran KB-SMR01: 12.600 token @ Rp100.000, belum ada yang terjual, ditutup 31 Desember 2026 pukul 23.59 WIB.

### 9. Menguji pembayaran sewa

1. Masuk sebagai Sari Wulandari, buka <http://localhost:3000/penghuni/tagihan>, lalu tekan **Bayar sewa**.
2. Pilih metode di jendela Midtrans, misalnya virtual account BCA, lalu salin nomor pembayarannya. Batas waktunya 5 menit.
3. Buka simulator <https://simulator.sandbox.midtrans.com/>, pilih metode yang sama, tempel nomornya, lalu bayar. Tidak ada uang nyata. Untuk QRIS, simulator meminta URL gambar QR dari halaman Midtrans.
4. Kembali ke jendela Midtrans lalu tekan **Check status**. Halaman tagihan berubah menjadi **Memeriksa pembayaran** sampai notifikasi diterima.
5. Midtrans tidak bisa menjangkau `localhost`, jadi notifikasinya perlu dibantu sampai ke laptop. Pilih Cara A atau Cara B di bawah.
6. Setelah notifikasi diterima, tagihan lunas dengan status **Menunggu pencatatan**. Worker lalu memanggil `recordRent`, dan statusnya menjadi **Tercatat** beserta hash transaksi.
7. Tekan **Lihat kuitansi**. Halaman kuitansi menampilkan kuitansi di kiri, dan di kanan argumen `recordRent` yang tercatat (kamar, periode, nominal, `keccak256(order_id)`) beserta hash transaksi dan nomor blok.

**Cara A, tanpa ngrok (paling mudah).** Dari folder `backend`, saat `npm run dev` masih berjalan di terminal lain:

```bash
npm run webhook:simulate -- <order_id>
```

Ganti `<order_id>` dengan Order ID yang tertulis di jendela Midtrans pada langkah 2, misalnya `RENT-SMR01-K03-2026-11`. Jangan menebak nomornya: bila ini bukan percobaan pertama, atau akun sandbox-mu pernah memakai nomor yang sama sebelum basis data di-reset, backend otomatis memakai sufiks berikutnya, misalnya `RENT-SMR01-K03-2026-11-2`. Skrip menandatangani notifikasi dengan server key lalu mengirimnya ke server lokal. Server tetap memverifikasi signature dan mengecek ulang status ke Midtrans, jadi tagihan hanya lunas kalau langkah 3 sudah dilakukan.

Untuk skenario uji penolakan, tambahkan opsi setelah `order_id`: `--bad-signature` (signature palsu, skenario 6) atau `--gross-amount 1000.00` (nominal tidak cocok, skenario 7).

**Cara B, dengan ngrok (notifikasi asli dari Midtrans).**

```bash
ngrok http 4000
```

Salin alamat `https://...` yang muncul. Di dashboard sandbox, buka **Settings > Configuration**, lalu isi **Payment Notification URL** dengan `https://<alamat-ngrok>/api/webhooks/midtrans`. Alamat ngrok gratis berubah setiap dijalankan ulang, jadi isian ini perlu diperbarui.

**Membayar semua tagihan satu periode sebelum demo.** Demo penutupan periode di progress 4 butuh sembilan kamar lunas, yaitu sewa kotor Rp13.500.000. Dari folder `backend`, dengan backend dan worker berjalan:

```bash
npm run demo:bayar-sewa -- --period 2026-11
```

Skrip membuat transaksi Midtrans sandbox untuk setiap tagihan `UNPAID` periode itu. Tambahkan `--except K03` bila kamar Sari ingin dibayar langsung saat demo (langkah 13). Langkah yang tidak bisa diotomatiskan di sandbox dicetak per kamar untuk dikerjakan di simulator. Semua pembayaran tetap melewati webhook, jadi setiap kamar tercatat lewat `recordRent` seperti pembayaran biasa. Nomor order yang sudah pernah dipakai di akun sandbox-mu, misalnya sebelum basis data di-reset, dilewati otomatis dan diganti sufiks berikutnya.

Tautan Etherscan hanya berfungsi untuk transaksi Sepolia. Di Hardhat lokal, cocokkan hash transaksinya dengan log terminal `npx hardhat node`.

### 10. Menguji KYC dan pembelian token

KYC dan whitelist:

1. Masuk sebagai Dimas Pratama, buka <http://localhost:3000/investor/kyc>, isi nama lengkap `Dimas Pratama` dan nomor identitas `DUMMY-0042`, centang pernyataan data dummy, lalu ajukan. Nomor tanpa awalan `DUMMY-` ditolak.
2. Masuk sebagai Laras Kusuma, buka <http://localhost:3000/admin/kyc>, lalu tinjau pengajuan Dimas. Kotak **Pemeriksaan otomatis** menampilkan tiga cek: awalan `DUMMY-`, nama sama dengan nama akun, dan tidak ada pengajuan aktif lain. Bandingkan dengan pengajuan Hendra Kusuma di tab Ditolak, yang cek namanya gagal.
3. Tekan **Setujui**. Backend membuat dompet kustodian untuk Dimas dan menaruh job whitelist di antrean. Worker memanggil `setKycStatus`, lalu tab Disetujui menampilkan status **Tercatat** beserta hash transaksinya. Untuk menguji penolakan, tolak pengajuan investor lain; alasan wajib diisi dan tampil di halaman KYC investor itu.

Pembelian token:

1. Masuk lagi sebagai Dimas, buka <http://localhost:3000/investor/penawaran>. Tombol bayar baru aktif setelah dompet kustodian tercatat lolos KYC.
2. Isi jumlah token, misalnya `100` (Rp10.000.000), centang pernyataan risiko, lalu bayar. Di atas 100 token, Midtrans hanya menawarkan virtual account.
3. Bayar di simulator seperti langkah 9, lalu kirim notifikasinya dengan nomor pesanan yang tampil di halaman penawaran, misalnya `npm run webhook:simulate -- BUY-SMR01-0001`.
4. Pesanan menjadi lunas, lalu worker memanggil `transferFromTreasury` dan token pindah dari dompet perbendaharaan ke dompet kustodian Dimas.

Skenario penolakan sebelum pembayaran dibuat. Keduanya tampil langsung di bawah isian jumlah, dan tidak ada transaksi Midtrans yang dibuat:

| Skenario | Cara mencoba | Hasil yang diharapkan |
|---|---|---|
| 8. Melebihi sisa penawaran | Isi jumlah lebih besar dari sisa penawaran | Ditolak dengan kode `OFFERING_EXCEEDED`, pesan menyebut sisa token |
| 9. Melebihi batas 10% | Investor yang sudah memegang 1.500 token memesan 500 | Ditolak dengan kode `HOLDING_CAP_EXCEEDED`, sisa kuota 300 token dan tombol **Pakai 300 token** |

### 11. Smart contract

Test kontrak tidak butuh Sepolia, Hardhat node, atau file `.env`:

```bash
cd contracts
npm ci
npx hardhat test
```

Hasil yang diharapkan: kompilasi tanpa warning dan semua test lulus, termasuk skenario 10 sampai 12. Pertama kali dijalankan, Hardhat mengunduh compiler solc 0.8.34. Test skenario 12 (`closePeriod`) membaca angka perhitungan manual dari `contracts/test/fixtures/distribusi-manual.json`, file yang sama dengan test kalkulator di `backend/src/finance/`.

**Deploy ke Sepolia** dijalankan koordinator setelah RPC, dompet admin, dompet operator, dan API key Etherscan siap. Langkah lengkap dan perkiraan ETH tiap dompet ada di [`docs/kontrak/deploy-sepolia.md`](docs/kontrak/deploy-sepolia.md). Ringkasnya:

1. Di folder `contracts`, jalankan `copy .env.example .env`, lalu isi `SEPOLIA_RPC_URL`, `ADMIN_PRIVATE_KEY`, `OPERATOR_PRIVATE_KEY`, dan `ETHERSCAN_API_KEY`.
2. Isi empat alamat dompet di `contracts/ignition/parameters/sepolia.json`: admin, operator, pemilik lama, dan perbendaharaan. Keempatnya harus berbeda.
3. Gladi dulu di jaringan lokal: `npm run node:local` di satu terminal, lalu `npm run deploy:local` dan `npm run verify:local` di terminal lain.
4. Jalankan `npm run deploy:sepolia`, periksa ringkasannya, lalu ketik `DEPLOY`. Dompet admin men-deploy KosToken dan KosLedger, lalu mencatat hash tiga [dokumen penerbitan dummy](docs/bisnis/dokumen-penerbitan/). Alamat hasil deploy tersimpan di `contracts/deployments/sepolia.json`.
5. Jalankan `npm run verify:sepolia` untuk memverifikasi kode kontrak di Etherscan.
6. Di `backend/.env`, isi `SEPOLIA_RPC_URL` dengan URL Alchemy atau Infura, isi `CHAIN_ID=11155111` seperti yang dicetak skrip deploy (boleh juga dikosongkan karena bawaannya sama), isi `OPERATOR_PRIVATE_KEY`, lalu salin `KOS_TOKEN_ADDRESS` dan `KOS_LEDGER_ADDRESS` dari `contracts/deployments/sepolia.json`. Jalankan ulang backend dan worker.

`ADMIN_PRIVATE_KEY` hanya ada di `contracts/.env` dan tidak pernah disalin ke `backend/.env`. Kedua dompet khusus testnet; jangan memakai dompet pribadi.

### 12. Menyiapkan data demo

Demo progress 4 dimulai dari kondisi siap: sewa November sudah lunas dan tercatat, empat investor sudah memegang token, dan sebagian biaya November sudah dicatat. Semua data itu dibuat lewat jalur sungguhan (Midtrans sandbox, webhook, worker, dan kontrak), bukan diisi langsung ke basis data, supaya halaman rekonsiliasi bisa membuktikannya. Siapkan sekitar satu jam sebelum demo karena setiap virtual account dibayar manual di simulator.

**Setiap gladi dimulai dari kontrak dan basis data baru.** Catatan di blockchain tidak ikut terhapus saat basis data di-reset: `closePeriod` untuk satu periode hanya bisa sekali, saldo token investor tetap ada (pembelian ulang ditolak batas 10%), dan nota yang sama sudah tercatat. Karena itu gladi di kontrak yang sama tidak bisa diulang. Urutan setiap gladi adalah deploy kontrak baru, reset basis data, lalu isi alamat kontrak baru di `backend/.env`. Demo akhir di depan dosen memakai deploy terakhir.

1. **Mulai dari basis data bersih** (semua data lokal terhapus), dari folder `backend`:

   ```bash
   npx prisma migrate reset --force
   npm run db:seed
   ```

2. **Deploy kontrak baru.**
   - **Hardhat lokal:** jalankan ulang `npx hardhat node`, lalu deploy ulang seperti langkah 4 dengan tambahan `--reset`. Gratis dan bisa diulang sesering perlu, jadi pakai ini untuk latihan.
   - **Sepolia:** dari folder `contracts`, beri setiap gladi label berbeda lewat variabel `DEPLOY_LABEL` (huruf kecil, angka, dan tanda hubung, misalnya `gladi1`, `gladi2`), lalu jalankan deploy seperti langkah 11. Di PowerShell: `$env:DEPLOY_LABEL="gladi1"; npm run deploy:sepolia`, lalu `npm run verify:sepolia` di terminal yang sama. Di Command Prompt: `set DEPLOY_LABEL=gladi1`, lalu kedua perintah itu. Setiap label men-deploy `KosToken` dan `KosLedger` baru, dan alamatnya tersimpan di `contracts/deployments/sepolia-<label>.json` (tidak di-commit). Untuk demo akhir, kosongkan labelnya (`$env:DEPLOY_LABEL=""` atau `set DEPLOY_LABEL=`), supaya hasilnya masuk `contracts/deployments/sepolia.json` yang di-commit. Isi label di terminal, jangan di `contracts/.env`, supaya tidak terbawa ke deploy demo akhir. Pakai Sepolia untuk gladi akhir dan demo, supaya semua transaksi bisa dibuka di Etherscan. Rinciannya di [`docs/kontrak/deploy-sepolia.md`](docs/kontrak/deploy-sepolia.md) bagian 5.

   Perkiraan biaya satu gladi di Sepolia, dihitung dari angka gas di [`docs/kontrak/deploy-sepolia.md`](docs/kontrak/deploy-sepolia.md): deploy oleh dompet admin sekitar 4,3 juta gas, dan transaksi operator selama gladi (lima whitelist KYC, lima pembelian pertama, sembilan `recordRent`, lima `recordExpense`, satu `closePeriod`) sekitar 2,5 juta gas. Jumlahnya sekitar 6,8 juta gas, atau sekitar 0,007, 0,02, dan 0,07 ETH pada harga gas 1, 3, dan 10 gwei. Pembelian Bagas yang dipecah menambah sekitar 137.000 gas per pesanan tambahan. Skrip deploy juga mensyaratkan saldo admin kira-kira dua kali biaya deploy saat itu. Untuk tiga gladi ditambah demo akhir, siapkan sekitar 0,15 ETH di dompet admin dan 0,15 ETH di dompet operator.

   Setelah deploy, isi `KOS_TOKEN_ADDRESS` dan `KOS_LEDGER_ADDRESS` di `backend/.env` dengan alamat kontrak baru, lalu jalankan backend (langkah 5), worker (langkah 6), dan frontend (langkah 7) di terminal masing-masing. Basis data dari langkah 1 harus sudah bersih sebelum backend dan worker dijalankan, karena catatan lama menunjuk kontrak lama.

3. **Bayar sewa November**, kecuali kamar K03 yang dibayar langsung saat demo:

   ```bash
   npm run demo:bayar-sewa -- --period 2026-11 --except K03
   ```

   Ikuti langkah simulator yang dicetak per kamar. Hasilnya delapan kamar lunas dan tercatat lewat `recordRent`.

4. **Siapkan saldo token investor:**

   ```bash
   npm run demo:siapkan-investor
   ```

   Skrip menyetujui KYC Bagas, Citra, Eko, dan Fajar lewat API, lalu membuat pesanan `BUY-` dengan virtual account: Bagas 1.800, Citra 1.200, Eko 800, dan Fajar 560 token. Bayar setiap virtual account di simulator sesuai langkah yang dicetak. Token pindah dari dompet perbendaharaan lewat webhook dan worker seperti pembelian biasa. Bila sandbox menolak virtual account Rp180.000.000, pesanan Bagas dipecah menjadi beberapa pesanan berurutan. Skrip aman diulang: pesanan yang sudah lunas tidak dibuat lagi.

5. **Catat biaya November yang sudah ada:**

   ```bash
   npm run demo:catat-biaya -- --period 2026-11
   ```

   Skrip mencatat biaya senilai Rp2.400.000 (listrik dan air, kebersihan, internet, keamanan) lewat API pengelola dengan nota dummy dari `backend/scripts/demo/nota/`. Hash setiap nota dicatat lewat `recordExpense`. Diulang pun tidak menggandakan biaya.

   Login dibatasi 10 kali per menit per alamat. Bila `demo:siapkan-investor` dan `demo:catat-biaya` dijalankan berulang dalam waktu singkat, beri jeda satu menit di antaranya. Skrip juga menunggu sendiri bila terkena batas itu.

6. **Periksa kesiapan** sebagai Laras Kusuma: <http://localhost:3000/admin> tidak menampilkan job yang gagal, dan <http://localhost:3000/admin/rekonsiliasi> menampilkan semua transaksi Cocok.

### 13. Alur demo lengkap

Urutan ini mengikuti enam butir demo wajib di proposal bagian 4.5. Kata sandi semua akun `demo-kosbagi`.

1. **Investor lolos KYC dan membeli token.** Masuk sebagai Dimas Pratama, ajukan KYC di `/investor/kyc` dengan nomor `DUMMY-0042`. Masuk sebagai Laras Kusuma, setujui di `/admin/kyc` dan tunggu status **Tercatat**. Masuk lagi sebagai Dimas, beli 100 token (Rp10.000.000) di `/investor/penawaran`, bayar virtual account-nya di simulator, lalu kirim notifikasinya (langkah 9 Cara A atau Cara B). Pesanan lunas dan token pindah lewat `transferFromTreasury`.
2. **Penghuni membayar sewa.** Masuk sebagai Sari Wulandari, bayar tagihan K03 di `/penghuni/tagihan`, lalu buka kuitansinya: argumen `recordRent` dan tautan Etherscan tampil setelah worker mencatatnya. Masuk sebagai Hadi Santoso; di `/pengelola` kesembilan kamar terisi kini lunas.
3. **Pengelola mencatat biaya dan mengunggah nota.** Masih sebagai Hadi, buka `/pengelola/biaya`, tekan **Catat biaya**, lalu isi kategori Perbaikan, nominal Rp300.000, tanggal nota 12 November 2026, keterangan "Ganti keran kamar mandi K07", dan unggah berkas `backend/scripts/demo/nota/perbaikan-k07.pdf`. Hash SHA-256 nota tampil sebelum disimpan. Setelah worker mencatat `recordExpense`, total biaya November menjadi Rp2.700.000. Untuk menunjukkan penolakan nota ganda, unggah berkas yang sama sekali lagi.
4. **Admin menutup periode dan menjalankan distribusi.** Masuk sebagai Laras Kusuma, buka `/admin/periode`. Struk penutupan menunjukkan sewa kotor Rp13.500.000, biaya Rp2.700.000, fee Rp675.000, PPh Rp2.227.500, sewa bersih Rp7.897.500, dan Rp438,75 per token. Tombol **Tutup periode** aktif setelah semua syarat terpenuhi. Setelah `closePeriod` tercatat, tekan **Jalankan distribusi** (hanya bisa sekali). Tabel bagian pemegang memuat pemilik lama Rp2.369.250, Bagas Rp789.750, Citra Rp526.500, Eko Rp351.000, Fajar Rp245.700, Dimas Rp43.875, dan bagian perbendaharaan (8.140 token belum terjual) Rp3.571.425 untuk pemilik lama, dengan sisa pembulatan Rp0. Rinciannya di [`docs/bisnis/perhitungan-distribusi.md`](docs/bisnis/perhitungan-distribusi.md) bagian 6.
5. **Portofolio investor bertambah.** Masuk sebagai Dimas: `/investor` menampilkan saldo bagi hasil Rp43.875, dan `/investor/portofolio` menampilkan bagi hasil November serta riwayat transaksi dengan tautan Etherscan.
6. **Rekonsiliasi.** Masuk sebagai Laras Kusuma, buka `/admin/rekonsiliasi`. Setiap order Midtrans November dicocokkan dengan basis data dan catatan Sepolia. Tekan **Hanya selisih** untuk menyaring, buka baris Selisih untuk melihat nilai ketiga sumber, dan tekan **Periksa ulang** untuk mengecek ulang ke Midtrans dan Sepolia. Percobaan yang kedaluwarsa atau dibatalkan tetap Cocok karena ketiga sumber sepakat tidak ada uang dan tidak ada catatan. Order yang punya anomali pembayaran selalu Selisih dengan alasan "Ada anomali <jenis>", misalnya setelah notifikasi bernominal palsu di skenario uji 7 (`npm run webhook:simulate -- <order_id> --gross-amount 1000.00`). Buka barisnya lalu tekan **Lihat anomali** untuk melihat jenis, catatan, dan waktunya.

Setelah periode ditutup, tagihan November yang belum dibayar tidak bisa dibayar lagi (`PERIOD_CLOSED`). Pembayaran yang dimulai sebelum penutupan lalu lunas sesudahnya tidak ikut dibagikan: penghuni melihat status bahwa dana akan dikembalikan, admin melihat butir "Dana perlu dikembalikan", dan rekonsiliasi menampilkannya sebagai Selisih.

### Yang bisa dicek pada progress 4

Data properti di halaman publik masih statis. Alamat kontrak dan hash dokumen di sana diperbarui setelah deploy Sepolia.

| Alamat | Yang tampil |
|---|---|
| <http://localhost:3000> | Beranda |
| <http://localhost:3000/kos/sumbersari-01> | Detail kos: tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko, dan panel penawaran |
| <http://localhost:3000/pemilik> | Halaman pemilik kos: simulasi dana, alur, syarat, FAQ, dan form pengajuan |
| <http://localhost:3000/masuk> | Login lewat kartu akun demo atau email dan kata sandi |
| <http://localhost:3000/penghuni/tagihan> | Slip tagihan, tombol bayar, jejak pembayaran, status on-chain, riwayat, dan kuitansi |
| <http://localhost:3000/investor> | Saldo bagi hasil, sewa masuk periode berjalan, dan kepemilikan token |
| <http://localhost:3000/investor/portofolio> | Dompet kustodian, bagi hasil per periode, dan riwayat transaksi |
| <http://localhost:3000/investor/kyc> dan `/investor/penawaran` | KYC dummy, whitelist dompet, dan pembelian token |
| <http://localhost:3000/pengelola> | Status sepuluh kamar dan daftar tindak lanjut |
| <http://localhost:3000/pengelola/biaya> | Daftar biaya, Catat biaya dengan unggah nota, dan hash nota |
| <http://localhost:3000/admin> | Ringkasan periode, Perlu perhatian, dan antrean job on-chain dengan Coba lagi |
| <http://localhost:3000/admin/kyc> | Daftar pengajuan per status, pemeriksaan otomatis, setujui, dan tolak |
| <http://localhost:3000/admin/periode> | Struk penutupan, syarat, tutup periode, dan distribusi |
| <http://localhost:3000/admin/rekonsiliasi> | Pencocokan Midtrans, basis data, dan Sepolia per order untuk periode tagihan terbaru; periode lain lewat `?periode=YYYY-MM` |

Skenario uji 1 sampai 11 bisa dicoba di aplikasi, dan skenario 12 lewat test kontrak.

### Perintah lain

| Folder | Perintah | Fungsi |
|---|---|---|
| `frontend` | `npm run build` | Build produksi, termasuk pemeriksaan TypeScript |
| `frontend` | `npm run start` | Menjalankan hasil build |
| `frontend` | `npm run lint` | Pemeriksaan ESLint |
| `backend` | `npm test` | Test tanpa basis data, termasuk kalkulator distribusi; tidak butuh Docker |
| `backend` | `npm run test:integration` | Test skenario pembayaran dengan PostgreSQL dan Redis; jalankan `npm run db:up` lebih dulu |
| `backend` | `RECONCILIATION_INTEGRATION=1 npx vitest run src/modules/reconciliation/reconciliation.integration.test.ts` | Test rekonsiliasi dengan PostgreSQL (basis data `kosbagi_j1`) dan Hardhat node port 8549 (`npx hardhat build`, lalu `npx hardhat node --port 8549` di `contracts`). Di PowerShell, jalankan `$env:RECONCILIATION_INTEGRATION=1` dulu, lalu perintah `npx vitest` yang sama |
| `backend` | `npm run test:watch` | Test berjalan terus saat file berubah |
| `backend` | `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `backend` | `npm run build`, lalu `npm start` dan `npm run worker:start` | Kompilasi ke `dist/`, lalu menjalankan server API dan worker dari hasilnya |
| `backend` | `npm run worker` | Worker blockchain dalam mode pengembangan |
| `backend` | `npm run prisma:validate` | Memeriksa sintaks skema Prisma |
| `backend` | `npm run db:status` | Melihat migrasi yang sudah dan belum diterapkan |
| `backend` | `npm run webhook:simulate -- <order_id>` | Mengirim notifikasi Midtrans bertanda tangan ke server lokal |
| `backend` | `npm run demo:bayar-sewa -- --period <YYYY-MM>` | Membayar semua tagihan yang belum lunas pada satu periode lewat Midtrans sandbox; `--except K03` melewati satu kamar |
| `backend` | `npm run demo:siapkan-investor` | Menyetujui KYC dan membeli token untuk empat investor demo lewat Midtrans sandbox (langkah 12) |
| `backend` | `npm run demo:catat-biaya -- --period <YYYY-MM>` | Mencatat biaya demo Rp2.400.000 dengan nota dummy lewat API pengelola (langkah 12) |
| `contracts` | `npx hardhat node` | Jaringan Hardhat lokal di port 8545 untuk backend dan worker |
| `contracts` | `npx hardhat build` | Mengompilasi kontrak |
| `contracts` | `npm run test:production` | Test yang sama pada bytecode teroptimasi (profil deploy) |
| `contracts` | `npm run coverage` | Test dan laporan cakupan (HTML di `coverage/html`) |
| `contracts` | `npm run typecheck` | Kompilasi lalu pemeriksaan tipe |
| `contracts` | `npm run export-abi` | Mengekspor ABI kontrak ke `backend/src/blockchain/abi/` |
| `contracts` | `npm run node:local`, lalu `npm run deploy:local` dan `npm run verify:local` | Gladi deploy dan verifikasi di Hardhat node port 8546, terpisah dari jaringan port 8545 |
| `contracts` | `npm run deploy:sepolia`, `npm run verify:sepolia` | Deploy dan verifikasi di Sepolia, lihat langkah 11 |
| `contracts` | `npx hardhat clean` | Menghapus hasil build |

`npm ci` memasang versi persis sesuai `package-lock.json`. Pakai `npm install <paket>` hanya saat memang menambah dependensi; bila `npm install` biasa ikut mengubah `package-lock.json`, jangan commit perubahan itu.

### Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| PowerShell menolak menjalankan `npm` atau `npx` (`running scripts is disabled`) | Jalankan perintah yang sama di Command Prompt. |
| `npm ci` melaporkan kerentanan (`vulnerabilities`) di frontend atau contracts | Semuanya berasal dari alat pengembangan (ESLint, CLI shadcn, Hardhat, mocha) dan tidak ikut ke aplikasi atau kontrak yang di-deploy; `npm audit --omit=dev` menunjukkan 0. Jumlahnya bisa berubah seiring waktu. Aman diabaikan. **Jangan** jalankan `npm audit fix --force` karena bisa merusak proyek. |
| `npm warn EBADENGINE` untuk `vitest` saat `npm ci` di backend | Muncul kalau memakai Node.js 25. Aman diabaikan; peringatan hilang di Node.js 24 LTS. |
| `npm error Cannot read properties of null (reading 'edgesOut')` | Versi npm terlalu lama. Pasang ulang Node.js 24 LTS terbaru. |
| `failed to connect to the docker API` saat `db:up` | Docker Desktop belum menyala. Buka Docker Desktop, tunggu sampai mesinnya berjalan, lalu ulangi. |
| `docker` tidak dikenali saat `db:up` | Terminal dibuka sebelum Docker Desktop terpasang. Tutup terminal, buka lagi. |
| `port is already allocated` saat `db:up` | Port 5432 atau 6379 sudah dipakai aplikasi lain. Di PowerShell: `$env:POSTGRES_PORT=5433; npm run db:up`, lalu ubah port di `DATABASE_URL` pada `backend/.env` menjadi 5433. |
| `Can't reach database server` saat `db:deploy` atau `db:seed` | PostgreSQL belum jalan. Jalankan `npm run db:up` dulu. |
| `db:seed` gagal karena tabel atau kolom tidak ada | Migrasi belum diterapkan. Jalankan `npm run db:deploy`, lalu ulangi. |
| `db:seed` mencetak `Perhatian: ... tagihan 2026-11 lunas tanpa pembayaran Midtrans` | Basis data masih berisi data seed progress 2. Ikuti petunjuk "Basis data dari progress 2?" di langkah 2. |
| `Konfigurasi environment tidak valid` saat backend atau worker start | `.env` belum dibuat, masih versi lama, atau ada nilai yang salah. Pesan menyebut variabelnya, misalnya `JWT_SECRET: wajib diisi`. Ulangi `copy .env.example .env` di folder `backend`, lalu isi lagi nilai yang pernah kamu ubah. `MIDTRANS_SERVER_KEY` juga ditolak bila bukan kunci sandbox berawalan `SB-Mid-server-`. |
| `Cannot find module '../generated/prisma/client.js'` | Klien Prisma belum dibuat. Jalankan `npm run prisma:generate` di folder `backend`. |
| `EADDRINUSE` saat `npm run dev` di backend | Port 4000 sedang dipakai. Tutup proses lain atau ganti `PORT` di `backend/.env`. |
| `Port 3000 is in use` saat `npm run dev` di frontend | Tutup proses lain, atau buka alamat port pengganti yang ditampilkan di terminal. Bila memakai port lain, tambahkan origin-nya ke `CORS_ORIGIN` di `backend/.env` supaya form `/pemilik` bisa menghubungi backend. |
| Tombol bayar menampilkan pesan client key belum diisi | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` kosong. Isi di `frontend/.env.local`, lalu hentikan dan jalankan ulang `npm run dev` karena nilainya dibaca saat start. |
| Pembayaran gagal dibuat dengan kode `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` kosong. Isi di `backend/.env`, lalu jalankan ulang backend. |
| Sudah bayar di simulator, tagihan atau pesanan belum lunas | Notifikasi belum sampai ke laptop. Jalankan Cara A di langkah 9, atau periksa Payment Notification URL pada Cara B. |
| `webhook:simulate` menyebut `Midtrans belum mengenal` order | Transaksinya belum dibuat di Snap, atau `order_id` salah. Tekan tombol bayar, pilih metode, lalu ulangi. |
| Pembayaran kedaluwarsa | Batas waktunya 5 menit. Tagihan tetap belum dibayar; tekan **Bayar ulang** untuk membuat transaksi baru. |
| Tagihan lunas tetapi tetap **Menunggu pencatatan** | Worker belum berjalan atau berhenti karena galat. Jalankan `npm run worker` di folder `backend` dan baca pesannya. |
| Worker berhenti dengan pesan chain ID tidak cocok | `CHAIN_ID` di `backend/.env` berbeda dari jaringan di `SEPOLIA_RPC_URL`. Isi `31337` untuk Hardhat lokal dan `11155111` (atau kosongkan) untuk Sepolia. |
| Worker berhenti karena alamat kontrak kosong | Isi `KOS_TOKEN_ADDRESS` dan `KOS_LEDGER_ADDRESS` dari hasil deploy (langkah 4 untuk lokal, langkah 11 untuk Sepolia). |
| Persetujuan KYC dibalas `CUSTODIAL_WALLET_NOT_CONFIGURED` | `CUSTODIAL_WALLET_MNEMONIC` kosong. Buat mnemonic baru seperti di langkah 4, isi di `backend/.env`, lalu jalankan ulang backend. |
| Deploy lokal gagal setelah Hardhat node dijalankan ulang | Catatan deploy lama masih tersimpan. Ulangi perintah deploy di langkah 4 dengan tambahan `--reset`. |
| Transaksi lokal gagal setelah Hardhat node dijalankan ulang | Kontrak lama hilang bersama node. Deploy ulang, perbarui alamat kontrak di `backend/.env`, lalu jalankan ulang backend dan worker. |
| Halaman rekonsiliasi membalas `CHAIN_NOT_CONFIGURED` | Server API belum punya `SEPOLIA_RPC_URL`, `KOS_TOKEN_ADDRESS`, atau `KOS_LEDGER_ADDRESS`. Isi di `backend/.env` seperti worker, lalu jalankan ulang backend. |
| Halaman rekonsiliasi membalas `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` kosong. Rekonsiliasi menanyakan status setiap order ke API status Midtrans. |
| Rekonsiliasi menampilkan Selisih "Gagal dicatat" | Job pencatatan on-chain gagal setelah semua percobaan otomatis. Buka `/admin`, tekan **Coba lagi** di antrean job, lalu tekan **Periksa ulang** di rekonsiliasi. |
| Rekonsiliasi menampilkan Selisih "masih menunggu dikirim worker" | Worker belum berjalan atau masih memproses. Jalankan `npm run worker`, tunggu, lalu tekan **Periksa ulang**. Hasil rekonsiliasi disimpan 30 detik, jadi memuat ulang halaman saja belum tentu mengecek ulang. |
| Tombol **Tutup periode** tetap nonaktif | Masih ada sewa lunas, nota, atau transfer token yang belum tercatat, atau ada job gagal yang memengaruhi periode itu. Kartu syarat di `/admin/periode` menyebut yang kurang. Job whitelist KYC tidak memblokir penutupan. |
| Job tetap gagal setiap kali **Coba lagi** ditekan | Kegagalan permanen, misalnya nota atau pembelian yang sama sudah tercatat di kontrak dengan isi berbeda setelah basis data di-reset tanpa deploy baru. Periksa galatnya di antrean `/admin`, lalu tekan **Tandai ditangani** pada job itu; tindakan ini tercatat atas nama admin dan job tidak lagi memblokir penutupan periode. Untuk gladi berikutnya, mulai dari deploy kontrak baru (langkah 12). |
| Pembayaran tagihan dibalas `PERIOD_CLOSED` | Periode tagihan itu sudah ditutup. Sesuai keputusan 16 November 2026, sewa periode tertutup tidak bisa dibayar lagi. |
| Penghuni sudah membayar, tetapi tagihan periode yang sudah ditutup tidak menjadi lunas | Pembayarannya lunas setelah periode ditutup. Tagihan sengaja tidak berubah; penghuni melihat status bahwa dana akan dikembalikan, admin melihat "Dana perlu dikembalikan", dan rekonsiliasi menampilkan Selisih dengan anomali `PAID_AFTER_PERIOD_CLOSED`. Kembalikan dananya di luar aplikasi (prototipe belum punya refund). |
| Rekonsiliasi menampilkan Selisih "Ada anomali ..." padahal ketiga sumber sama | Order itu pernah menerima notifikasi yang tidak wajar, misalnya nominal palsu di skenario uji 7. Order beranomali sengaja selalu Selisih supaya terlihat admin (keputusan 20 November 2026). Buka barisnya dan tekan **Lihat anomali**. |
| Skrip demo berhenti dengan `Terlalu banyak permintaan` saat login | Batas login 10 kali per menit. Tunggu satu menit, lalu jalankan ulang skripnya. |
| `listen EACCES: permission denied` saat menjalankan server di Windows | Port itu masuk rentang yang dicadangkan Windows (Hyper-V atau WSL). Lihat daftarnya dengan `netsh interface ipv4 show excludedportrange protocol=tcp`, lalu pakai port lain, mis. `npm run dev -- --port 3300` di frontend atau `PORT` lain di `backend/.env`. |
| Ingin mengulang demo dari tagihan belum dibayar | Seed sengaja tidak mengembalikan tagihan lunas. Jalankan `npx prisma migrate reset --force` di folder `backend`, lalu `npm run db:seed`. **Semua data di basis data lokal terhapus.** |

## Tim

| Jalur | Tanggung jawab | Anggota |
|---|---|---|
| 1 | Bisnis & keuangan: model bisnis, regulasi, proyeksi keuangan, rekonsiliasi, koordinasi | Alya Hamidah Izzatul Laili |
| 2 | Backend & pembayaran: API, basis data, Midtrans, webhook, antrean | Nofita Rahma Sabillah |
| 3 | Kontrak & blockchain: smart contract, test Hardhat, deploy Sepolia, layanan blockchain | Ahsan Faqih |
| 4 | Frontend & desain: antarmuka, ERD, arsitektur, user stories | Azzahra Callysta Putri Aditya |

Dosen pengampu: Hariz Farisi, S.Kom., M.T.

## Kontribusi

Alur kerja branch dan Pull Request ada di [`CONTRIBUTING.md`](CONTRIBUTING.md).
