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

### Prasyarat

| Kebutuhan | Dipakai untuk | Dibutuhkan mulai |
|---|---|---|
| [Node.js 24 LTS](https://nodejs.org/) (sudah termasuk npm) | Frontend, backend, dan smart contract | Progress 1 |
| [Git](https://git-scm.com/) | Mengambil kode | Progress 1 |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | PostgreSQL dan Redis lokal | Progress 2 |
| Akun Midtrans sandbox | Pembayaran (server key dan client key sandbox) | Progress 2 |
| [ngrok](https://ngrok.com/) (opsional) | Menerima notifikasi Midtrans di laptop | Progress 2 |
| RPC Sepolia (Alchemy atau Infura) dan dompet operator berisi ETH Sepolia | Transaksi on-chain | Progress 3 |

### 1. Ambil kode

```bash
git clone https://github.com/AhsanDz/kosbagi.git
cd kosbagi
```

Backend dan frontend sama-sama terus berjalan selama dipakai, jadi buka satu terminal untuk tiap bagian di bawah, masing-masing mulai dari folder `kosbagi`. Tekan `Ctrl+C` untuk menghentikannya.

**Sudah punya `backend/.env` dari progress 1?** Progress 2 menambah `JWT_SECRET` yang wajib ada, jadi ulangi `copy .env.example .env` di folder `backend`, lalu isi lagi nilai yang pernah kamu ubah. Lakukan hal yang sama untuk `frontend/.env.local` (`copy .env.example .env.local`).

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
Seed selesai: 12 akun, 1 properti, 10 kamar, 12 tagihan baru, 0 tagihan lama dibiarkan.
```

Seed aman diulang. Akun, properti, dan kamar disamakan lagi, sedangkan tagihan yang sudah ada tidak disentuh, jadi pembayaran saat demo tidak kembali menjadi belum dibayar.

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

### 4. Backend (API)

```bash
cd backend
npm run dev
```

Buka <http://localhost:4000/api/health>. Hasil yang diharapkan:

```json
{"data":{"status":"ok","service":"kosbagi-backend","version":"0.1.0","environment":"development","time":"...","uptimeSeconds":3}}
```

### 5. Frontend (situs web)

```bash
cd frontend
npm ci
npm run dev
```

Buka <http://localhost:3000>. Saat pertama dijalankan butuh koneksi internet untuk mengunduh font.

### 6. Akun demo

Kata sandi semua akun: `demo-kosbagi`. Di halaman Masuk, kartu akun demo bisa langsung diklik.

| Peran | Nama | Email |
|---|---|---|
| Investor | Dimas Pratama | `investor.dummy@kosbagi.test` |
| Penghuni kamar K03 | Sari Wulandari | `penghuni.dummy@kosbagi.test` |
| Pengelola | Hadi Santoso | `pengelola.dummy@kosbagi.test` |
| Admin | Laras Kusuma | `admin.dummy@kosbagi.test` |

Delapan penghuni lain memakai pola `penghuni.k01.dummy@kosbagi.test` sampai `penghuni.k10.dummy@kosbagi.test`. Kamar K06 kosong, jadi tidak punya penghuni.

Tagihan November 2026 yang belum dibayar: K03, K04, dan K07. Tagihan kamar terisi lainnya sudah lunas.

### 7. Menguji pembayaran sewa

1. Masuk sebagai Sari Wulandari, buka <http://localhost:3000/penghuni/tagihan>, lalu tekan **Bayar sewa**.
2. Pilih metode di jendela Midtrans, misalnya virtual account BCA, lalu salin nomor pembayarannya. Batas waktunya 5 menit.
3. Buka simulator <https://simulator.sandbox.midtrans.com/>, pilih metode yang sama, tempel nomornya, lalu bayar. Tidak ada uang nyata. Untuk QRIS, simulator meminta URL gambar QR dari halaman Midtrans.
4. Kembali ke jendela Midtrans lalu tekan **Check status**. Halaman tagihan berubah menjadi **Memeriksa pembayaran** sampai notifikasi diterima.
5. Midtrans tidak bisa menjangkau `localhost`, jadi notifikasinya perlu dibantu sampai ke laptop. Pilih salah satu cara di bawah.

**Cara A, tanpa ngrok (paling mudah).** Dari folder `backend`, saat `npm run dev` masih berjalan di terminal lain:

```bash
npm run webhook:simulate -- RENT-SMR01-K03-2026-11
```

Skrip ini menandatangani notifikasi dengan server key lalu mengirimnya ke server lokal. Server tetap memverifikasi signature dan mengecek ulang status ke Midtrans, jadi tagihan hanya lunas kalau langkah 3 sudah dilakukan. Bila ini bukan percobaan pertama, `order_id` memakai sufiks, misalnya `RENT-SMR01-K03-2026-11-2`.

Untuk skenario uji penolakan, tambahkan opsi setelah `order_id`: `--bad-signature` (signature palsu, skenario 6) atau `--gross-amount 1000.00` (nominal tidak cocok, skenario 7).

**Cara B, dengan ngrok (notifikasi asli dari Midtrans).**

```bash
ngrok http 4000
```

Salin alamat `https://...` yang muncul. Di dashboard sandbox, buka **Settings > Configuration**, lalu isi **Payment Notification URL** dengan `https://<alamat-ngrok>/api/webhooks/midtrans`. Alamat ngrok gratis berubah setiap dijalankan ulang, jadi isian ini perlu diperbarui.

Setelah notifikasi diterima, tagihan menjadi lunas dengan status **Menunggu pencatatan**. Di progress 2 status berhenti di sana karena worker yang mencatat ke blockchain baru ada di progress 3.

### 8. Smart contract (test)

```bash
cd contracts
npm ci
npx hardhat test
```

Hasil yang diharapkan: kompilasi tanpa warning dan `132 passing`. Pertama kali dijalankan, Hardhat mengunduh compiler solc 0.8.34. Test memakai jaringan Hardhat lokal, jadi tidak butuh Sepolia atau file `.env`.

### Yang bisa dicek pada progress 2

Data properti di halaman publik masih statis, dan hash transaksi di sana masih contoh. Tagihan penghuni dan login sudah memakai backend sungguhan.

| Alamat | Yang tampil |
|---|---|
| <http://localhost:3000> | Beranda |
| <http://localhost:3000/kos> | Daftar kos |
| <http://localhost:3000/kos/sumbersari-01> | Detail kos: tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko, dan panel penawaran |
| <http://localhost:3000/pemilik> | Halaman pemilik kos: simulasi dana, alur, syarat, FAQ, dan form pengajuan |
| <http://localhost:3000/masuk> | Login sungguhan lewat kartu akun demo atau email dan kata sandi |
| <http://localhost:3000/penghuni> | Ringkasan tagihan penghuni, setelah masuk sebagai penghuni |
| <http://localhost:3000/penghuni/tagihan> | Slip tagihan, tombol bayar, jejak pembayaran, dan riwayat Agustus sampai Oktober 2026 |

Halaman investor, pengelola, dan admin masih kerangka memuat. Skenario uji 1 sampai 7 (pembayaran dan webhook) serta 10 sampai 12 (kontrak) sudah bisa dicoba. Laporan uji kontrak ada di [`docs/pengujian/kontrak.md`](docs/pengujian/kontrak.md).

### Perintah lain

| Folder | Perintah | Fungsi |
|---|---|---|
| `frontend` | `npm run build` | Build produksi, termasuk pemeriksaan TypeScript |
| `frontend` | `npm run start` | Menjalankan hasil build |
| `frontend` | `npm run lint` | Pemeriksaan ESLint |
| `backend` | `npm test` | Test tanpa basis data; tidak butuh Docker |
| `backend` | `npm run test:integration` | Test skenario pembayaran dengan PostgreSQL dan Redis; jalankan `npm run db:up` lebih dulu |
| `backend` | `npm run test:watch` | Test berjalan terus saat file berubah |
| `backend` | `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `backend` | `npm run build`, lalu `npm start` | Kompilasi ke `dist/`, lalu menjalankan hasilnya |
| `backend` | `npm run prisma:validate` | Memeriksa sintaks skema Prisma |
| `backend` | `npm run db:status` | Melihat migrasi yang sudah dan belum diterapkan |
| `backend` | `npm run webhook:simulate -- <order_id>` | Mengirim notifikasi Midtrans bertanda tangan ke server lokal |
| `contracts` | `npx hardhat build` | Mengompilasi kontrak |
| `contracts` | `npm run test:production` | Test yang sama pada bytecode teroptimasi (profil deploy) |
| `contracts` | `npm run coverage` | Test dan laporan cakupan (HTML di `coverage/html`) |
| `contracts` | `npm run typecheck` | Kompilasi lalu pemeriksaan tipe |
| `contracts` | `npm run export-abi` | Mengekspor ABI kontrak ke `backend/src/blockchain/abi/` |
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
| `db:seed` gagal karena tabel tidak ada | Migrasi belum diterapkan. Jalankan `npm run db:deploy`, lalu ulangi. |
| `Konfigurasi environment tidak valid` saat backend start | `.env` belum dibuat, masih versi lama, atau ada nilai yang salah. Pesan menyebut variabelnya, misalnya `JWT_SECRET: wajib diisi`. Ulangi `copy .env.example .env` di folder `backend`, lalu isi lagi nilai yang pernah kamu ubah. `MIDTRANS_SERVER_KEY` juga ditolak bila bukan kunci sandbox berawalan `SB-Mid-server-`. |
| `Cannot find module '../generated/prisma/client.js'` | Klien Prisma belum dibuat. Jalankan `npm run prisma:generate` di folder `backend`. |
| `EADDRINUSE` saat `npm run dev` di backend | Port 4000 sedang dipakai. Tutup proses lain atau ganti `PORT` di `backend/.env`. |
| `Port 3000 is in use` saat `npm run dev` di frontend | Tutup proses lain, atau buka alamat port pengganti yang ditampilkan di terminal. Bila memakai port lain, tambahkan origin-nya ke `CORS_ORIGIN` di `backend/.env` supaya form `/pemilik` bisa menghubungi backend. |
| Tombol bayar menampilkan pesan client key belum diisi | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` kosong. Isi di `frontend/.env.local`, lalu hentikan dan jalankan ulang `npm run dev` karena nilainya dibaca saat start. |
| Pembayaran gagal dibuat dengan kode `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` kosong. Isi di `backend/.env`, lalu jalankan ulang backend. |
| Sudah bayar di simulator, tagihan belum lunas | Notifikasi belum sampai ke laptop. Jalankan Cara A di langkah 7, atau periksa Payment Notification URL pada Cara B. |
| `webhook:simulate` menyebut `Midtrans belum mengenal` order | Transaksinya belum dibuat di Snap, atau `order_id` salah. Tekan **Bayar sewa**, pilih metode, lalu ulangi. |
| Pembayaran kedaluwarsa | Batas waktunya 5 menit. Tagihan tetap belum dibayar; tekan **Bayar ulang** untuk membuat transaksi baru. |
| Ingin mengulang demo dari tagihan belum dibayar | Seed sengaja tidak mengembalikan tagihan lunas. Untuk mengosongkan basis data lokal, jalankan `npx prisma migrate reset` di folder `backend`, lalu `npm run db:seed`. **Semua data di basis data lokal terhapus.** |

## Tim

| Jalur | Tanggung jawab | Anggota |
|---|---|---|
| 1 | Bisnis & keuangan: model bisnis, regulasi, proyeksi keuangan, rekonsiliasi, koordinasi | Nofita Rahma Sabillah |
| 2 | Backend & pembayaran: API, basis data, Midtrans, webhook, antrean | Alya Hamidah Izzatul Laili |
| 3 | Kontrak & blockchain: smart contract, test Hardhat, deploy Sepolia, layanan blockchain | Ahsan Faqih |
| 4 | Frontend & desain: antarmuka, ERD, arsitektur, user stories | Azzahra Callysta Putri Aditya |

Dosen pengampu: Hariz Farisi, S.Kom., M.T.

## Kontribusi

Alur kerja branch dan Pull Request ada di [`CONTRIBUTING.md`](CONTRIBUTING.md).
