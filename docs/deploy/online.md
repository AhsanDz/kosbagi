# Panduan Deploy Online (opsional)

Demo KosBagi dijalankan di laptop presenter, dengan ngrok untuk notifikasi Midtrans (keputusan 20 November 2026; cara menjalankannya di [README root](../../README.md)). Panduan ini menyiapkan versi online supaya prototipe bisa dibuka dari mana saja bila dibutuhkan: frontend di **Vercel**, sedangkan backend API, worker blockchain, PostgreSQL, dan Redis di **Railway**. Deploy online tidak wajib, dan sampai panduan ini ditulis belum pernah dijalankan tim.

Berkas konfigurasinya sudah ada di repo:

| Berkas | Isi |
|---|---|
| [`backend/Dockerfile`](../../backend/Dockerfile) | Satu image untuk layanan API dan worker: Node.js 24, `npm ci`, build TypeScript, perintah start bawaan API |
| [`backend/.dockerignore`](../../backend/.dockerignore) | Memastikan `.env`, `node_modules`, dan file nota tidak ikut ke image |
| [`backend/.env.example`](../../backend/.env.example) | Daftar semua variabel backend beserta penjelasannya |
| [`frontend/.env.example`](../../frontend/.env.example) | Daftar variabel frontend |

Railway tidak memakai `railway.json` di sini: menurut dokumentasi Railway (dibaca 20 November 2026), *Config as Code* sudah usang, layanan baru tidak bisa memakainya, dan berkas yang ada berhenti dibaca 1 Desember 2026. Pengaturan layanan cukup diisi sekali lewat dashboard seperti di bagian 4.

## 1. Gambaran

```
Peramban ──────────────> Vercel: frontend Next.js
   │                          │ route handler /api/backend (server ke server)
   │ form /pemilik            ▼
   └───────────────────> Railway: api ──> PostgreSQL dan Redis (jaringan privat Railway)
Midtrans sandbox ──────> (webhook)                ▲
                                                  │ antrean job dan status transaksi
                         Railway: worker ─────────┘
                             │
                             └──> RPC Sepolia (Alchemy atau Infura) ──> KosToken, KosLedger
```

| Layanan | Tempat | Sumber | Perintah start | Alamat publik |
|---|---|---|---|---|
| frontend | Vercel | folder `frontend` | dikenali otomatis (Next.js) | `https://<proyek>.vercel.app` |
| api | Railway | `backend/Dockerfile` | bawaan image: `node --enable-source-maps dist/server.js`; pre-deploy `npm run db:deploy` | `https://<api>.up.railway.app` |
| worker | Railway | `backend/Dockerfile` | `node --enable-source-maps dist/worker.js` | tidak ada |
| Postgres | Railway | templat database PostgreSQL | dari templat | tidak ada (TCP proxy hanya dipakai sementara untuk seed) |
| Redis | Railway | templat database Redis | dari templat | tidak ada |

Perintah start sama dengan isi skrip `npm start` dan `npm run worker:start`, tetapi memanggil `node` langsung. Lewat `npm`, sinyal `SIGTERM` dari Railway berhenti di `sh` dan tidak sampai ke Node.js, sehingga penutupan rapi tidak berjalan dan worker bisa terputus saat mengirim transaksi. Perilaku ini sudah dicoba dengan `docker stop` pada image yang sama.

Hampir semua permintaan dari peramban lewat route handler Next.js di Vercel, yang menempelkan token dari cookie httpOnly. Yang memanggil api Railway langsung hanya dua:

- **Form pengajuan pemilik kos** (`/pemilik`, milik jalur 1) mengirim `POST /api/owner-applications` langsung dari peramban, tanpa login dan tanpa cookie. Karena permintaannya lintas origin, `CORS_ORIGIN` api **wajib** berisi domain Vercel (bagian 4.3 dan 5).
- **Midtrans** mengirim notifikasi pembayaran ke webhook.

## 2. Biaya dan batasan akun

Angka di bawah dibaca dari dokumentasi Railway dan Vercel pada 20 November 2026 dan bisa berubah. Periksa lagi halaman harga sebelum deploy. Panduan ini tidak menjamin deploy online gratis.

**Railway**

| Paket | Kredit | Batas yang relevan | Cocok untuk KosBagi? |
|---|---|---|---|
| Trial | Sekali US$5, berlaku 30 hari, tanpa kartu kredit | Maks. 5 layanan per proyek, RAM 1 GB, layanan tidak tidur | Ya, 4 layanan. Akun harus terverifikasi lewat GitHub (*Full Trial*); *Limited Trial* membatasi akses jaringan keluar, padahal API butuh Midtrans dan worker butuh RPC Sepolia |
| Free | US$1 per bulan | 1 proyek, maks. 3 layanan, RAM 0,5 GB per layanan, volume 0,5 GB, layanan tidur setelah 5 sampai 10 menit tanpa lalu lintas keluar, tanpa pilihan wilayah | Tidak, KosBagi butuh 4 layanan dan worker tidak boleh tidur |
| Hobby | US$5 per bulan, termasuk pemakaian US$5 | Volume maks. 5 GB | Ya, bila Trial habis |

Tarif pemakaian di atas kredit: RAM US$10 per GB per bulan, CPU US$20 per vCPU per bulan, volume US$0,15 per GB per bulan, lalu lintas keluar US$0,05 per GB. Sebagai perkiraan kasar (asumsi, belum diukur): api, worker, PostgreSQL, dan Redis yang menyala terus dengan total RAM sekitar 0,6 GB menghabiskan sekitar US$6 per bulan untuk RAM saja, jadi kredit Trial US$5 kira-kira cukup untuk dua sampai tiga minggu. Deploy dekat hari demo, pantau halaman **Usage** di Railway, dan hapus proyeknya setelah selesai (bagian 12). Setelah kredit habis, layanan berhenti; volume Trial dihapus 30 hari setelah kredit habis kecuali akun di-upgrade.

**Vercel**

Paket Hobby gratis untuk penggunaan pribadi non-komersial, cukup untuk prototipe tugas kuliah. Pada paket Hobby, fungsi server (route handler) hanya bisa berjalan di satu wilayah; bawaannya Washington D.C. (`iad1`).

## 3. Yang perlu disiapkan

1. **Akses repo.** Railway dan Vercel membaca repo lewat akun GitHub. Akun yang men-deploy harus bisa memasang aplikasi GitHub Railway dan Vercel di repo `AhsanDz/kosbagi` (koordinator sebagai pemilik repo), atau memakai fork milik sendiri. Deploy dari branch `main`.
2. **Kontrak Sepolia khusus deploy online.** Basis data online dimulai dari seed yang sama dengan laptop. Bila memakai kontrak yang sama dengan demo laptop, `recordRent` menolak referensi pembayaran yang pernah dicatat dan dompet kustodian bisa bertabrakan dengan yang sudah di-whitelist. Karena itu deploy pasangan kontrak sendiri untuk online dengan `DEPLOY_LABEL` (lihat [`docs/kontrak/deploy-sepolia.md`](../kontrak/deploy-sepolia.md) bagian 5.2). Misalnya, dari folder `contracts` di PowerShell: `$env:DEPLOY_LABEL="online"; npm run deploy:sepolia`, lalu `npm run verify:sepolia` di terminal yang sama. Alamat `KOS_TOKEN_ADDRESS` dan `KOS_LEDGER_ADDRESS` untuk online diambil dari `contracts/deployments/sepolia-online.json`. Jangan memakai alamat kontrak demo akhir di README bagian Kontrak di Sepolia; kontrak itu khusus demo di laptop presenter.
3. **Nilai rahasia** (jangan ditulis di repo, chat grup, atau dokumen):
   - server key dan client key Midtrans sandbox (dashboard sandbox, **Settings > Access Keys**);
   - URL RPC Sepolia dari Alchemy atau Infura (memuat API key), dan bila ada, URL RPC cadangan;
   - private key dompet operator (testnet, berisi ETH Sepolia);
   - mnemonic dompet kustodian baru khusus online, dibuat dengan perintah di `backend/.env.example`;
   - `JWT_SECRET` acak baru, dibuat dengan:
     ```
     node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
     ```
     Saat `NODE_ENV=production`, backend menolak start bila `JWT_SECRET` masih nilai contoh dari repo.
4. **Laptop** dengan clone repo dan `npm ci` di folder `backend`, untuk menjalankan seed dan skrip persiapan demo ke basis data online (bagian 4.6).

## 4. Railway: api, worker, PostgreSQL, Redis

Pilih wilayah yang sama untuk semua layanan, sebaiknya **Southeast Asia (Singapore)** bila pilihan wilayah tersedia di paketmu, supaya dekat dengan pengguna di Indonesia.

### 4.1 Proyek dan basis data

1. Di <https://railway.com>, **New Project → Deploy from GitHub repo**, pilih repo KosBagi. Railway membuat satu layanan dari repo itu; deploy pertamanya boleh gagal dulu karena variabelnya belum diisi.
2. Buka layanan itu, **Settings**:
   - **Service Name**: `api`;
   - **Source → Root Directory**: `/backend`. Railway lalu menemukan `backend/Dockerfile` dan membangun dengan Dockerfile;
   - **Watch Paths**: `/backend/**`, supaya perubahan di `frontend/` atau `contracts/` tidak memicu build ulang.
3. Di kanvas proyek, **Create → Database → PostgreSQL**, lalu **Create → Database → Redis**. Biarkan namanya `Postgres` dan `Redis`, karena nama itu dipakai di variabel rujukan di bawah.

### 4.2 Variabel bersama

Variabel yang sama untuk api dan worker diisi sekali di **Project Settings → Shared Variables** (environment `production`):

| Variabel | Nilai |
|---|---|
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |
| `JWT_SECRET` | nilai acak dari bagian 3. Worker tidak memakai JWT, tetapi validasi environment backend tetap mewajibkannya |
| `SEPOLIA_RPC_URL` | URL RPC Sepolia |
| `SEPOLIA_RPC_URL_FALLBACK` | URL RPC cadangan (opsional) |
| `CHAIN_ID` | `11155111` |
| `KOS_TOKEN_ADDRESS` | alamat KosToken dari `contracts/deployments/sepolia-online.json` (bagian 3) |
| `KOS_LEDGER_ADDRESS` | alamat KosLedger dari berkas yang sama |
| `CUSTODIAL_WALLET_MNEMONIC` | mnemonic kustodian khusus online |

Variabel berisi rahasia sebaiknya ditandai **Sealed**: nilainya tetap dipakai deploy, tetapi tidak bisa dilihat lagi di dashboard. Sealed tidak bisa dibatalkan, jadi simpan nilainya di pengelola kata sandi.

### 4.3 Layanan api

1. **Variables** layanan `api`:

   | Variabel | Nilai |
   |---|---|
   | `NODE_ENV`, `LOG_LEVEL`, `JWT_SECRET`, `SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL_FALLBACK`, `CHAIN_ID`, `KOS_TOKEN_ADDRESS`, `KOS_LEDGER_ADDRESS`, `CUSTODIAL_WALLET_MNEMONIC` | rujukan variabel bersama, mis. `${{shared.JWT_SECRET}}` (tombol **Shared Variable** di halaman Variables menambahkannya sekaligus) |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `PORT` | `4000` |
   | `TRUST_PROXY` | `1` (penjelasan di bagian 10) |
   | `CORS_ORIGIN` | domain Vercel, mis. `https://<proyek>.vercel.app`, persis seperti di bilah alamat (tanpa garis miring di akhir). Wajib, karena form `/pemilik` memanggil api langsung dari peramban. Bila memakai domain lain (preview deployment, domain sendiri), tambahkan dipisah koma. Tambahkan setelah bagian 5; sebelum itu jangan buat variabelnya sama sekali, karena nilai kosong ditolak saat start |
   | `MIDTRANS_SERVER_KEY` | server key sandbox, berawalan `SB-Mid-server-` |
   | `UPLOAD_DIR` | `/data/nota` (volume, bagian 4.4) |
   | `RAILWAY_RUN_UID` | `0` (bagian 4.4) |

   `OPERATOR_PRIVATE_KEY` **tidak** diisi di api. Server API hanya membaca kontrak; yang mengirim transaksi hanya worker.
2. **Settings → Deploy**:
   - **Pre-deploy Command**: `npm run db:deploy`. Perintah ini menerapkan migrasi Prisma sebelum versi baru menerima permintaan. Bila gagal, deploy berhenti dan versi lama tetap jalan. Isi **Pre-deploy Timeout** misalnya 300 detik;
   - **Custom Start Command**: kosongkan (memakai perintah bawaan image);
   - **Healthcheck Path**: `/api/health`;
   - **Replicas**: 1. Penghitung rate limit disimpan di memori proses dan file nota ada di satu volume, jadi jangan menambah replika.
3. **Settings → Networking → Public Networking → Generate Domain**. Railway mendeteksi port 4000. Catat alamatnya, mis. `https://kosbagi-api-production.up.railway.app`.
4. Tekan **Deploy** untuk menerapkan perubahan variabel (Railway menampungnya sebagai *staged changes* sampai di-deploy).

### 4.4 Volume nota

File nota biaya disimpan di disk. Tanpa volume, file hilang setiap kali api di-deploy ulang, sedangkan hash-nya tetap ada di basis data dan on-chain, sehingga tombol unduh nota gagal.

1. Di kanvas, **Create → Volume**, sambungkan ke layanan `api`, **Mount Path** `/data`.
2. `UPLOAD_DIR=/data/nota` (bagian 4.3). Folder `nota` dibuat otomatis saat nota pertama diunggah.
3. Image berjalan sebagai pengguna `node`, sedangkan Railway memasang volume milik `root`. Karena itu layanan api memakai `RAILWAY_RUN_UID=0`, sesuai petunjuk Railway untuk image non-root. Worker tidak memakai volume dan tetap berjalan sebagai `node`.

Volume tidak terpasang saat pre-deploy; migrasi tidak membutuhkannya.

### 4.5 Layanan worker

1. Di kanvas, **Create → GitHub Repo**, pilih repo yang sama.
2. **Settings**: **Service Name** `worker`, **Root Directory** `/backend`, **Watch Paths** `/backend/**`, **Custom Start Command** `node --enable-source-maps dist/worker.js`. Kosongkan Pre-deploy Command (migrasi sudah dijalankan api), jangan buat domain, jangan isi Healthcheck Path, **Replicas** 1.
3. **Variables**:

   | Variabel | Nilai |
   |---|---|
   | `NODE_ENV`, `LOG_LEVEL`, `JWT_SECRET`, `SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL_FALLBACK`, `CHAIN_ID`, `KOS_TOKEN_ADDRESS`, `KOS_LEDGER_ADDRESS`, `CUSTODIAL_WALLET_MNEMONIC` | rujukan variabel bersama |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
   | `REDIS_URL` | `${{Redis.REDIS_URL}}` |
   | `OPERATOR_PRIVATE_KEY` | private key dompet operator (Sealed) |

4. **Deploy**. Log worker yang sehat menampilkan saldo ETH dompet operator, lalu menunggu job. Worker menolak jalan dengan pesan jelas bila `CHAIN_ID` tidak cocok dengan RPC, alamat kontrak bukan KosToken dan KosLedger, operator belum memegang perannya, atau worker lain sudah jalan. Satu worker saja: nonce dompet operator aman karena job dikirim satu per satu.

### 4.6 Data awal (seed) dan persiapan demo

Image produksi hanya berisi hasil build `dist/`, jadi seed dijalankan dari laptop ke basis data Railway lewat alamat publiknya (TCP proxy Postgres).

1. Di layanan `Postgres`, tab **Variables**, salin nilai `DATABASE_PUBLIC_URL`. Bila belum ada, aktifkan TCP proxy di **Settings → Networking**.
2. Di PowerShell, dari folder `backend` laptop (variabel ini hanya berlaku di jendela PowerShell itu dan mengalahkan isi `backend/.env`):
   ```powershell
   $env:DATABASE_URL = "<DATABASE_PUBLIC_URL>"
   npm run db:seed
   ```
   Seed aman dijalankan ulang. Migrasi tidak perlu dijalankan dari laptop, karena pre-deploy api sudah menerapkannya.
3. Skrip persiapan demo memakai API online lewat `--url`, di jendela PowerShell yang sama (butuh `MIDTRANS_SERVER_KEY` sandbox yang sama di `backend/.env` laptop):
   ```powershell
   npm run demo:siapkan-investor -- --url https://<api>.up.railway.app --no-notify
   npm run demo:catat-biaya -- --period 2026-11 --url https://<api>.up.railway.app
   npm run demo:bayar-sewa -- --period 2026-11 --except K03 --url https://<api>.up.railway.app/api/webhooks/midtrans --no-notify
   ```
   Dengan `--no-notify`, skrip tidak mengirim notifikasi sendiri; Midtrans yang mengirimnya ke Railway (bagian 6). Pada `demo:bayar-sewa`, `--url` adalah alamat webhook lengkap, dipakai untuk memastikan API online bisa dihubungi.
4. Tutup jendela PowerShell itu setelah selesai, supaya perintah berikutnya kembali memakai basis data lokal. Bila tidak dibutuhkan lagi, matikan TCP proxy Postgres.

## 5. Vercel: frontend

1. Di <https://vercel.com>, **Add New → Project**, impor repo KosBagi.
2. **Root Directory**: `frontend`. Framework terdeteksi Next.js; perintah build dan folder output tidak perlu diubah.
3. **Environment Variables** (environment Production):

   | Variabel | Nilai |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | alamat api Railway tanpa `/api` dan tanpa garis miring di akhir, mis. `https://kosbagi-api-production.up.railway.app` |
   | `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | client key sandbox Midtrans. Satu-satunya kunci yang boleh sampai ke peramban |
   | `TRUST_PROXY_HEADERS` | `true`. Vercel menimpa sendiri header `X-Forwarded-Host` dan `X-Forwarded-For`, jadi frontend boleh memercayainya untuk pemeriksaan asal permintaan (CSRF) dan meneruskan IP pengunjung ke backend. Variabel server ini ditambahkan pengerasan frontend progress 5 (lihat `frontend/.env.example`); di laptop biarkan kosong |

   Jangan pernah menaruh server key Midtrans, private key, atau `JWT_SECRET` di Vercel: semua variabel berawalan `NEXT_PUBLIC_` ikut dikirim ke peramban.
4. **Deploy**. Perubahan variabel di Vercel baru berlaku untuk deployment berikutnya, dan nilai `NEXT_PUBLIC_` bahkan ditanam saat build. Jadi setiap kali variabel diubah, jalankan **Redeploy**.
5. **Settings → Functions → Function Regions**: pilih **Singapore (`sin1`)** supaya route handler dekat dengan Railway Singapura. Paket Hobby hanya boleh satu wilayah.
6. Kembali ke Railway: isi `CORS_ORIGIN` layanan api dengan domain Vercel (bagian 4.3), lalu Deploy. Tanpa ini, form `/pemilik` gagal karena peramban menolak jawaban api dari origin lain.

## 6. Midtrans: URL notifikasi

Di dashboard Midtrans **sandbox**, **Settings > Configuration**, isi **Payment Notification URL**:

```
https://<api>.up.railway.app/api/webhooks/midtrans
```

Satu akun sandbox hanya punya satu Payment Notification URL. Selama terisi alamat Railway, notifikasi untuk demo di laptop tidak sampai ke laptop. **Kembalikan ke alamat ngrok sebelum demo di laptop** (README root, langkah 9 Cara B), dan sebaliknya.

Webhook tetap memeriksa `signature_key`, mengecek ulang status ke API Midtrans, dan mencocokkan nominal sebelum mengubah data, sama seperti di laptop. Endpoint webhook dibatasi 120 permintaan per menit per IP pengirim.

## 7. Urutan deploy

1. Deploy kontrak Sepolia khusus online dengan `DEPLOY_LABEL` dan catat alamatnya (bagian 3 butir 2).
2. Railway: proyek, Postgres, Redis, variabel bersama (bagian 4.1 dan 4.2).
3. Layanan api dengan volume, lalu Generate Domain (bagian 4.3 dan 4.4). Tunggu deploy hijau; pre-deploy sudah menerapkan migrasi.
4. Layanan worker (bagian 4.5). Tunggu log saldo operator.
5. Seed dari laptop (bagian 4.6 butir 1 dan 2).
6. Vercel (bagian 5), lalu `CORS_ORIGIN` di api.
7. Payment Notification URL Midtrans ke Railway (bagian 6).
8. Skrip persiapan demo bila perlu (bagian 4.6 butir 3), lalu cek hasil (bagian 8).

## 8. Mengecek hasil deploy

1. Buka `https://<api>.up.railway.app/api/health`. Balasan `"status": "ok"` dan `"environment": "production"` berarti API hidup.
2. Buka alamat Vercel, masuk sebagai penghuni dummy, buka tagihan, tekan Bayar, dan bayar di simulator sandbox. Di log layanan api terlihat `POST /api/webhooks/midtrans` dengan status 200, lalu di log worker terlihat job `RECORD_RENT` tercatat. Kuitansi menampilkan tautan Etherscan.
3. Sebagai admin, buka antrean job dan halaman rekonsiliasi untuk memastikan Midtrans, basis data, dan Sepolia cocok.
4. Unggah satu nota sebagai pengelola, deploy ulang api (**Deployments → Redeploy**), lalu pastikan nota masih bisa diunduh. Ini membuktikan volume terpasang.
5. Buka `/pemilik` di alamat Vercel dan kirim form pengajuan. Nomor pengajuan yang tampil membuktikan `CORS_ORIGIN` benar.

## 9. Variabel produksi

| Variabel | api | worker | Catatan |
|---|---|---|---|
| `NODE_ENV` | `production` | `production` | Mengaktifkan penolakan `JWT_SECRET` contoh |
| `PORT` | `4000` | | Port yang dituju domain Railway |
| `LOG_LEVEL` | `info` | `info` | |
| `CORS_ORIGIN` | domain Vercel | | Wajib untuk form `/pemilik`; beberapa domain dipisah koma |
| `TRUST_PROXY` | `1` | | Bila kosong di production, server menulis peringatan saat start |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | sama | Jaringan privat Railway |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | sama | Jaringan privat Railway |
| `JWT_SECRET` | acak, rahasia | sama | Wajib di keduanya karena divalidasi bersama |
| `MIDTRANS_SERVER_KEY` | rahasia, `SB-Mid-server-` | | Hanya sandbox; kunci produksi ditolak |
| `SEPOLIA_RPC_URL`, `SEPOLIA_RPC_URL_FALLBACK` | rahasia | sama | API membaca kontrak, worker mengirim transaksi |
| `CHAIN_ID` | `11155111` | sama | |
| `KOS_TOKEN_ADDRESS`, `KOS_LEDGER_ADDRESS` | dari `contracts/deployments/sepolia-online.json` | sama | Kontrak khusus online, bukan kontrak demo akhir |
| `CUSTODIAL_WALLET_MNEMONIC` | rahasia | sama (opsional bagi worker) | Mnemonic baru khusus online |
| `OPERATOR_PRIVATE_KEY` | | rahasia | Hanya di worker |
| `UPLOAD_DIR` | `/data/nota` | | Di dalam volume |
| `RAILWAY_RUN_UID` | `0` | | Supaya bisa menulis ke volume milik root |
| `NEXT_PUBLIC_API_URL` | | | Di Vercel |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | | | Di Vercel, boleh sampai ke peramban |
| `TRUST_PROXY_HEADERS` | | | Di Vercel: `true`. Variabel server frontend, tidak sampai ke peramban |

Variabel yang tidak disebut memakai nilai bawaannya (lihat `backend/.env.example`).

## 10. Keamanan

- Semua rahasia hanya di **Variables** Railway (sebaiknya Sealed) dan tidak pernah di repo. Dockerfile tidak memakai `ARG`, jadi variabel layanan tidak ikut tertanam di image saat build, dan `.dockerignore` menahan `.env` dari laptop.
- PostgreSQL dan Redis tidak diberi domain publik. TCP proxy Postgres hanya dibuka sementara untuk seed.
- `TRUST_PROXY=1`: Railway menaruh proxy edge di depan api, dan templat Express milik Railway sendiri memakai nilai 1. Express membaca IP klien dari entri paling kanan `X-Forwarded-For` yang ditulis proxy itu, sehingga isian palsu dari klien di sebelah kiri tidak dipercaya. Nilai `true` ditolak backend karena memercayai seluruh header. Di laptop variabel ini dikosongkan: backend hanya memercayai proxy di mesin yang sama (ngrok dan Next.js lokal).
- Di production, `JWT_SECRET` contoh dari `.env.example` dan konfigurasi test ditolak saat start.
- Kunci Midtrans tetap sandbox: backend menolak server key yang tidak berawalan `SB-Mid-server-`.

## 11. Keterbatasan yang diketahui

- **Rate limit login per alamat server Vercel.** Permintaan login dari halaman datang ke api dari server Vercel (route handler), bukan dari peramban. Frontend memang meneruskan IP pengunjung di `X-Forwarded-For` (dengan `TRUST_PROXY_HEADERS=true`), tetapi backend tidak bisa membedakan header itu dari isian palsu orang yang memanggil api Railway langsung. Karena itu, dengan `TRUST_PROXY=1`, batas login (10 per menit) dihitung per alamat server Vercel, sehingga pengguna yang kebetulan dilayani server Vercel yang sama berbagi jatah. Form pemilik kos (10 per menit) tidak terpengaruh: peramban memanggil api langsung, jadi dihitung per IP peramban. Batas lain (pembayaran, pembelian, biaya, tutup periode, Coba lagi) dihitung per akun, dan webhook Midtrans dihitung per IP Midtrans. Membaca IP peramban asli untuk login butuh penanda rahasia bersama antara frontend dan backend; itu belum dibangun di prototipe. Untuk demo oleh tim, batas ini tidak mengganggu.
- **Nota di atas 4,5 MB ditolak Vercel.** Unggahan nota lewat route handler Vercel, yang membatasi body permintaan fungsi 4,5 MB, sedangkan backend menerima nota sampai 5 MB. Saat deploy online, nota 4,5 sampai 5 MB ditolak Vercel sebelum sampai ke api. Demo di laptop tidak terpengaruh, dan nota dummy di `backend/scripts/demo/nota/` jauh di bawah batas itu.
- **Advisory `npm audit` dari Prisma CLI.** `npm audit --omit=dev` di folder `backend` melaporkan 3 kerentanan high (GHSA-7589-6fvf-x4pw, ReDoS di paket `effect` yang dipakai `@prisma/config` dan CLI `prisma`). Hasil yang sama muncul di `main` progress 4, jadi bukan regresi progress 5. Kode yang terdampak hanya memproses konfigurasi Prisma CLI saat migrasi dan generate, tidak menerima input dari jaringan, tetapi CLI itu ikut di image Docker untuk pre-deploy migrasi. Diterima untuk prototipe sambil menunggu rilis Prisma 7 yang memperbaikinya; jangan menjalankan `npm audit fix --force`, karena perintah itu menurunkan Prisma ke versi 6.
- **Satu replika api dan satu worker.** Penghitung rate limit ada di memori proses dan file nota di satu volume. Worker dikunci tunggal lewat Redis.
- **Dokumentasi Railway tentang header proxy belum lengkap.** Halaman resminya menyebut `X-Real-IP`, `X-Forwarded-Proto`, dan `X-Forwarded-Host`, tetapi tidak menjelaskan `X-Forwarded-For`; templat Express milik Railway sendiri memakai `trust proxy` 1. Bila rate limit tampak keliru, periksa log permintaan dan coba daftar rentang alamat proxy Railway sebagai nilai `TRUST_PROXY`.
- **Notifikasi Midtrans hanya ke satu alamat** (bagian 6).

## 12. Menghentikan dan menghapus

- Railway: **Project Settings → Danger → Delete Project** menghentikan semua layanan dan pemakaian. Volume dan basis data ikut terhapus dan tidak bisa dikembalikan, jadi lakukan setelah penilaian selesai.
- Vercel: **Settings → Advanced → Delete Project**, atau biarkan; paket Hobby tidak menagih.
- Midtrans: kembalikan Payment Notification URL ke alamat ngrok atau kosongkan.

## 13. Pemecahan masalah

| Gejala | Penyebab dan solusi |
|---|---|
| Deploy api berhenti di pre-deploy | Lihat log pre-deploy. `DATABASE_URL` belum merujuk `${{Postgres.DATABASE_URL}}`, atau Postgres belum siap. Deploy ulang setelah Postgres hijau |
| Log berisi `Konfigurasi environment tidak valid` | Pesan menyebut nama variabelnya. `JWT_SECRET: nilai contoh dari repo ...` berarti `JWT_SECRET` masih nilai contoh; buat nilai acak (bagian 3) |
| Healthcheck api gagal | `PORT` bukan 4000 sedangkan domain menuju 4000, atau server gagal start; lihat log deploy |
| Peringatan `TRUST_PROXY belum diisi` di log api | Isi `TRUST_PROXY=1` di layanan api, lalu Deploy |
| Halaman frontend menampilkan "Server KosBagi tidak merespons" | `NEXT_PUBLIC_API_URL` di Vercel salah atau belum di-Redeploy setelah diubah |
| Sudah bayar di simulator, tagihan belum lunas | Payment Notification URL belum menunjuk Railway, atau log api menunjukkan notifikasi ditolak (signature atau nominal). Admin bisa memeriksa halaman rekonsiliasi |
| Worker berhenti dengan pesan peran atau jaringan | Ikuti pesannya: alamat kontrak, `CHAIN_ID`, atau peran operator dari dompet admin |
| Worker memberi peringatan *eviction policy* Redis | BullMQ butuh `maxmemory-policy noeviction`. Dari laptop, aktifkan TCP proxy Redis, salin `REDIS_PUBLIC_URL`, lalu jalankan `docker exec kosbagi-redis-1 redis-cli -u "<REDIS_PUBLIC_URL>" CONFIG SET maxmemory-policy noeviction` (memakai redis-cli di container Redis lokal) |
| Unduh nota gagal setelah deploy ulang | Volume belum terpasang di `/data` atau `UPLOAD_DIR` belum `/data/nota` |
| Login ditolak 429 | Batas 10 per menit per IP (lihat bagian 11). Tunggu satu menit |
| Form `/pemilik` gagal terkirim, konsol peramban menyebut CORS | `CORS_ORIGIN` api belum berisi domain Vercel persis seperti di bilah alamat (bagian 4.3), atau belum di-Deploy setelah diubah |
| Unggah nota besar gagal dengan 413 dari Vercel | Batas body fungsi Vercel 4,5 MB (bagian 11). Kecilkan file nota |

## Sumber

- Railway: [Config as Code (usang)](https://docs.railway.com/config-as-code), [Pre-deploy command](https://docs.railway.com/deployments/pre-deploy-command), [Start command](https://docs.railway.com/deployments/start-command), [Dockerfiles](https://docs.railway.com/builds/dockerfiles), [Volumes](https://docs.railway.com/volumes), [Variables](https://docs.railway.com/variables), [Public networking: specs and limits](https://docs.railway.com/networking/public-networking/specs-and-limits), [Free plan dan Trial](https://docs.railway.com/pricing/free-plan), [Plans](https://docs.railway.com/pricing/plans). Dibaca 20 November 2026.
- Vercel: [Configuring regions for Vercel Functions](https://vercel.com/docs/functions/configuring-functions/region). Dibaca 20 November 2026.
