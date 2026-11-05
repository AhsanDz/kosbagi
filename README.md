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
| RPC Sepolia (Alchemy atau Infura) dan dompet operator berisi ETH Sepolia | Transaksi on-chain | Progress 3 |

### 1. Ambil kode

```bash
git clone https://github.com/AhsanDz/kosbagi.git
cd kosbagi
```

Frontend dan backend sama-sama terus berjalan selama dipakai, jadi buka satu terminal untuk tiap bagian di bawah, masing-masing mulai dari folder `kosbagi`. Tekan `Ctrl+C` untuk menghentikannya.

### 2. Frontend (situs web)

```bash
cd frontend
copy .env.example .env.local
npm ci
npm run dev
```

Buka <http://localhost:3000>. Saat pertama dijalankan butuh koneksi internet untuk mengunduh font.

### 3. Backend (API)

```bash
cd backend
copy .env.example .env
npm ci
npm run dev
```

Buka <http://localhost:4000/api/health>. Hasil yang diharapkan:

```json
{"data":{"status":"ok","service":"kosbagi-backend","version":"0.1.0","environment":"development","time":"...","uptimeSeconds":3}}
```

Pada progress 1 langkah ini belum membutuhkan Docker, karena endpoint health tidak menyentuh PostgreSQL atau Redis.

### 4. Smart contract (test)

```bash
cd contracts
npm ci
npx hardhat test
```

Hasil yang diharapkan: kompilasi tanpa warning dan `63 passing`. Pertama kali dijalankan, Hardhat mengunduh compiler solc 0.8.34. Test memakai jaringan Hardhat lokal, jadi tidak butuh Sepolia atau file `.env`.

### 5. Basis data lokal (mulai progress 2)

Nyalakan Docker Desktop, lalu jalankan dari folder `backend`:

```bash
npm run db:up       # jalankan PostgreSQL + Redis dan tunggu sampai sehat
npm run db:deploy   # terapkan semua migrasi
npm run db:seed     # isi data dummy Kos Sumbersari 01 (tersedia mulai progress 2)
npm run db:studio   # lihat isi tabel lewat peramban
npm run db:down     # hentikan layanan; data tetap tersimpan di volume Docker
```

### Yang bisa dicek pada progress 1

Frontend belum terhubung ke backend: data halaman masih statis dan hash transaksi masih contoh.

| Alamat | Yang tampil |
|---|---|
| <http://localhost:3000> | Beranda |
| <http://localhost:3000/kos> | Daftar kos |
| <http://localhost:3000/kos/sumbersari-01> | Detail kos: tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko, dan panel penawaran |
| <http://localhost:3000/masuk> | Kartu akun demo; tiap kartu membuka app shell satu peran (isi halamannya masih kerangka memuat) |

### Perintah lain

| Folder | Perintah | Fungsi |
|---|---|---|
| `frontend` | `npm run build` | Build produksi, termasuk pemeriksaan TypeScript |
| `frontend` | `npm run start` | Menjalankan hasil build |
| `frontend` | `npm run lint` | Pemeriksaan ESLint |
| `backend` | `npm test` | Unit test dan test integrasi; tidak butuh PostgreSQL atau Redis |
| `backend` | `npm run test:watch` | Test berjalan terus saat file berubah |
| `backend` | `npm run typecheck` | Pemeriksaan tipe TypeScript |
| `backend` | `npm run build`, lalu `npm start` | Kompilasi ke `dist/`, lalu menjalankan hasilnya |
| `backend` | `npm run prisma:validate` | Memeriksa sintaks skema Prisma |
| `backend` | `npm run db:status` | Melihat migrasi yang sudah dan belum diterapkan |
| `contracts` | `npx hardhat build` | Mengompilasi kontrak |
| `contracts` | `npm run test:production` | Test yang sama pada bytecode teroptimasi (profil deploy) |
| `contracts` | `npm run coverage` | Test dan laporan cakupan (HTML di `coverage/html`) |
| `contracts` | `npm run typecheck` | Kompilasi lalu pemeriksaan tipe |
| `contracts` | `npx hardhat clean` | Menghapus hasil build |

`npm ci` memasang versi persis sesuai `package-lock.json`. Pakai `npm install <paket>` hanya saat memang menambah dependensi; bila `npm install` biasa ikut mengubah `package-lock.json`, jangan commit perubahan itu.

### Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| PowerShell menolak menjalankan `npm` atau `npx` (`running scripts is disabled`) | Jalankan perintah yang sama di Command Prompt. |
| `npm ci` melaporkan kerentanan (`vulnerabilities`) di frontend atau contracts | Semuanya berasal dari alat pengembangan (ESLint, CLI shadcn, Hardhat, mocha) dan tidak ikut ke aplikasi atau kontrak yang di-deploy; `npm audit --omit=dev` menunjukkan 0. Jumlahnya bisa berubah seiring waktu. Aman diabaikan. **Jangan** jalankan `npm audit fix --force` karena bisa merusak proyek. |
| `npm warn EBADENGINE` untuk `vitest` saat `npm ci` di backend | Muncul kalau memakai Node.js 25. Aman diabaikan; peringatan hilang di Node.js 24 LTS. |
| `npm error Cannot read properties of null (reading 'edgesOut')` | Versi npm terlalu lama. Pasang ulang Node.js 24 LTS terbaru. |
| `Konfigurasi environment tidak valid` saat backend start | `.env` belum dibuat atau ada nilai yang salah. Ulangi `copy .env.example .env` di folder `backend`, lalu cek variabel yang disebut di pesan. |
| `Cannot find module '../generated/prisma/client.js'` | Klien Prisma belum dibuat. Jalankan `npm run prisma:generate` di folder `backend`. |
| `EADDRINUSE` saat `npm run dev` di backend | Port 4000 sedang dipakai. Tutup proses lain atau ganti `PORT` di `backend/.env`. |
| `Port 3000 is in use` saat `npm run dev` di frontend | Tutup proses lain, atau buka alamat port pengganti yang ditampilkan di terminal. |
| `port is already allocated` saat `db:up` | Port 5432 atau 6379 sudah dipakai aplikasi lain. Di PowerShell: `$env:POSTGRES_PORT=5433; npm run db:up`, lalu ubah port di `DATABASE_URL` pada `backend/.env` menjadi 5433. |

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
