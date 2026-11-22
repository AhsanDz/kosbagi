# backend

API KosBagi: Node.js 24 + Express 5 + TypeScript, PostgreSQL lewat Prisma 7, antrean BullMQ di Redis, dan integrasi Midtrans sandbox. Dikelola jalur 2 (Backend & Pembayaran), dengan bagian milik jalur 1 dan jalur 3 seperti ditandai di bawah.

Status progress 4 (prototipe lengkap): semua fitur progress 2 dan 3 (login akun dummy + JWT, peran, tagihan penghuni, pembayaran Midtrans Snap, webhook, kuitansi sewa, KYC dengan dompet kustodian, penawaran dan pembelian token `BUY-` dengan skenario 8 dan 9, pengajuan pemilik kos, rate limit), ditambah biaya dengan unggahan nota (hash SHA-256 dicatat on-chain), penutupan periode, distribusi bagi hasil yang membaca kontrak, portofolio investor, status kamar pengelola, ringkasan dan antrean job admin dengan Coba lagi, aturan pembayaran sewa setelah periode ditutup, skrip persiapan demo, dan skema basis data v4. Dispatcher outbox dan pemanggilan kontrak dijalankan proses worker jalur 3 (`src/worker.ts`). Dokumentasi endpoint ada di [`docs/api/`](../docs/api/), laporan uji ada di [`docs/pengujian/pembayaran.md`](../docs/pengujian/pembayaran.md).

Cara memasang, menjalankan, dan mengetes backend ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan: `npm ci` otomatis menjalankan `prisma generate` untuk membuat klien Prisma di `src/generated/prisma/` (folder ini tidak di-commit). File `.env` berisi konfigurasi lokal dan tidak boleh di-commit; nilai contoh di `.env.example` sudah cocok dengan [`docker-compose.yml`](../docker-compose.yml).

## Mengubah skema basis data

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name <nama_perubahan>` untuk membuat file migrasi baru dan menerapkannya ke basis data lokal.
3. `npm run prisma:generate` untuk memperbarui klien Prisma.
4. Commit `schema.prisma` bersama folder migrasi barunya.

Aturan yang tidak bisa ditulis di `schema.prisma` ada di SQL migrasi `20261102120000_skema_v2`, `20261103120000_skema_v3`, dan `20261116120000_skema_v4`, dan dijelaskan di komentar model terkait:

| Aturan | Isi |
|---|---|
| `payments_bill_id_paid_key`, `payments_token_purchase_id_paid_key` | Satu tagihan atau pesanan paling banyak punya satu pembayaran `PAID` |
| `payments_exactly_one_target_check` | Pembayaran milik tepat satu sasaran: tagihan atau pesanan token |
| `kyc_submissions_user_id_active_key` | Satu investor paling banyak punya satu pengajuan `SUBMITTED` atau `APPROVED` |
| `offerings_tokens_sold_check` | Token terjual tidak pernah negatif dan tidak melebihi jumlah yang ditawarkan |
| `token_purchases_token_amount_check` | Pesanan berisi minimal satu token |
| `expenses_*_check` | Kode kategori 1 sampai 255 (muat di `uint8`), nominal biaya positif, hash nota `0x` + 64 heksadesimal huruf kecil |
| `distribution_shares_*_check` | `user_id` terisi tepat untuk pemegang `INVESTOR`, saldo dan bagian tidak negatif |
| `distributions_rounding_remainder_idr_check` | Sisa pembulatan tidak negatif |
| `outbox_job_resolutions_note_check` | Catatan tanda "sudah ditangani" 5 sampai 300 karakter |

Skema v3 hanya menambah nilai enum (`UNFULFILLED`, `DUPLICATE_PURCHASE_PAYMENT`, `PURCHASE_UNFULFILLABLE`), kolom opsional (`payments.bank`, `token_purchases.order_number`), dan dua CHECK di atas, jadi kode yang memakai model v2 tetap jalan.

Skema v4 menambah tabel `expenses`, `period_closings`, `distributions`, `distribution_shares`, `outbox_job_retries`, dan `outbox_job_resolutions`, enum `DistributionHolderType`, serta nilai enum `PAID_AFTER_CLOSE` dan `PAID_AFTER_PERIOD_CLOSED`. Kolom tabel v3 tidak berubah; khususnya model `OutboxJob` dan `ChainTransaction` tetap berbentuk v3 karena worker jalur 3 membangun objek model itu. Riwayat Coba lagi dan tanda "sudah ditangani" sengaja disimpan di tabel sendiri (`outbox_job_retries`, `outbox_job_resolutions`), bukan kolom baru di `outbox_jobs`.

## Variabel environment

Didefinisikan dan divalidasi di `src/config/env.ts`. Aplikasi menolak start bila ada yang salah, dengan pesan yang menyebut nama variabelnya.

| Variabel | Wajib | Bawaan | Keterangan |
|---|---|---|---|
| `NODE_ENV` | tidak | `development` | `development`, `test`, atau `production` |
| `PORT` | tidak | `4000` | Port server HTTP |
| `LOG_LEVEL` | tidak | `info` | Tingkat log pino: `fatal` sampai `trace`, atau `silent` |
| `CORS_ORIGIN` | tidak | `http://localhost:3000` | Origin frontend yang boleh memanggil API, pisahkan dengan koma |
| `DATABASE_URL` | ya | | Alamat PostgreSQL, format `postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public` |
| `REDIS_URL` | ya | | Alamat Redis untuk antrean BullMQ |
| `JWT_SECRET` | ya | | Kunci penandatangan JWT, minimal 32 karakter |
| `MIDTRANS_SERVER_KEY` | tidak | | Server key sandbox, wajib berawalan `SB-Mid-server-`. Bila kosong, server tetap jalan dan endpoint pembayaran membalas 503 `MIDTRANS_NOT_CONFIGURED` |
| `SEPOLIA_RPC_URL` | tidak | | URL RPC Sepolia, dipakai worker. Untuk Hardhat lokal `http://127.0.0.1:8545` |
| `SEPOLIA_RPC_URL_FALLBACK` | tidak | | URL RPC cadangan |
| `CHAIN_ID` | tidak | `11155111` | Jaringan yang diharapkan worker; `31337` untuk Hardhat lokal |
| `OPERATOR_PRIVATE_KEY` | tidak | | Private key dompet operator, khusus testnet. Kunci dompet admin tidak pernah ada di backend |
| `CUSTODIAL_WALLET_MNEMONIC` | tidak | | Mnemonic BIP-39 sumber alamat dompet kustodian, khusus testnet. Dipakai server API saat admin menyetujui KYC; bila kosong, persetujuan dibalas 503 `CUSTODIAL_WALLET_NOT_CONFIGURED`. Jangan memakai mnemonic bawaan Hardhat |
| `KOS_TOKEN_ADDRESS`, `KOS_LEDGER_ADDRESS` | tidak | | Alamat kontrak hasil deploy. `KOS_LEDGER_ADDRESS` juga tampil di kuitansi sewa. Mulai P4 server API ikut membaca kontrak (struk periode tertutup dan distribusi) lewat `SEPOLIA_RPC_URL` dan `CHAIN_ID`, tanpa kunci operator |
| `UPLOAD_DIR` | tidak | `uploads` | Folder file nota biaya (P4). Path relatif dibaca dari folder `backend/`. Folder bawaan diabaikan git |

Tidak ada variabel untuk memilih produksi: prototipe hanya sandbox, jadi `isProduction` ditulis tetap `false` di `src/modules/payments/midtrans.ts`.

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma          skema basis data v4
│   ├── migrations/            riwayat perubahan skema dalam SQL
│   └── seed.ts, seed/         data dummy Kos Sumbersari 01 (jalur 1)
├── scripts/
│   ├── webhook-simulate.ts    mengirim notifikasi bertanda tangan ke server lokal, tanpa ngrok
│   ├── demo-bayar-sewa.ts     membayar semua tagihan satu periode lewat VA sandbox untuk data demo
│   ├── demo-siapkan-investor.ts  KYC lewat API admin + pesanan BUY- dengan VA untuk saldo token demo (P4)
│   ├── demo-catat-biaya.ts    mencatat biaya persiapan November lewat API pengelola (P4)
│   ├── demo/                  data persiapan demo dan nota dummy PDF (isi tetap, hash tetap)
│   └── lib/                   penanda tangan notifikasi dan klien HTTP kecil untuk skrip
├── src/
│   ├── server.ts              entry server HTTP + penutupan rapi
│   ├── worker.ts              entry worker job blockchain (jalur 3)
│   ├── app.ts                 rakit Express; router modul dimuat otomatis
│   ├── config/env.ts          validasi environment variable (zod)
│   ├── lib/                   prisma, logger, errors, zod, json, password, jwt, module-loader,
│   │                          advisory-lock, prisma-errors, uuid, wib, chain-status, job-status,
│   │                          format-id
│   ├── middleware/            error handler, auth JWT + RBAC, rate limit
│   ├── queue/                 definisi antrean, tipe job, penulisan outbox, dispatcher
│   ├── modules/
│   │   ├── health/            GET /api/health
│   │   ├── auth/              login, data pengguna
│   │   ├── bills/             tagihan penghuni dan kuitansi
│   │   ├── payments/          klien Midtrans, status, order_id, pembuatan percobaan, VA demo (tanpa routes)
│   │   ├── webhooks/          notifikasi Midtrans, signature, pelunasan sewa dan pesanan token
│   │   ├── properties/        data publik kos
│   │   ├── kyc/               KYC dummy, pemeriksaan otomatis, dompet kustodian
│   │   ├── offerings/         penawaran token dan aturan kuota (skenario 8 dan 9)
│   │   ├── purchases/         pesanan token milik investor
│   │   ├── owner-applications/  pengajuan pemilik kos
│   │   ├── expenses/          biaya dan nota: unggahan, hash SHA-256, kategori (P4)
│   │   ├── periods/           struk, syarat dan tutup periode, distribusi, pembaca kontrak (P4)
│   │   ├── portfolio/         saldo bagi hasil, kepemilikan, dan riwayat investor (P4)
│   │   ├── manager/           status kamar pengelola (P4)
│   │   ├── admin/             ringkasan admin, antrean job, Coba lagi (P4)
│   │   └── reconciliation/    rekonsiliasi Midtrans, basis data, dan Sepolia (jalur 1)
│   ├── finance/               kalkulator fee, pajak, sewa bersih, nilai per token (jalur 1)
│   ├── blockchain/            ethers.js, dompet operator & kustodian, processor job (jalur 3)
│   ├── types/                 tipe untuk paket tanpa tipe bawaan (midtrans-client)
│   └── generated/prisma/      klien Prisma hasil generate (tidak di-commit)
├── tests/                     test HTTP tanpa basis data + fixture (unit test berada di samping kode)
│   └── integration/           test dengan PostgreSQL dan Redis sungguhan
├── prisma.config.ts           konfigurasi Prisma CLI
├── vitest.config.ts           konfigurasi npm test, tanpa basis data
├── vitest.integration.config.ts  konfigurasi npm run test:integration
└── tsconfig.json, tsconfig.build.json
```

Folder modul tanpa `routes.ts`, seperti `payments/`, dilewati pemuat router: isinya dipakai modul lain.

## Menambah modul API

1. Buat folder `src/modules/<nama>/`. Nama folder menjadi URL, jadi pakai huruf kecil, angka, dan tanda hubung, mis. `owner-applications`.
2. Buat `routes.ts` di dalamnya yang mengekspor default sebuah Router Express.
3. Router otomatis terpasang di `/api/<nama>` saat server start. `app.ts` tidak perlu diubah.

```ts
// src/modules/contoh/routes.ts  ->  GET /api/contoh
import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ data: { pesan: 'halo' } });
});

export default router;
```

Pegangan saat menulis modul: lempar `AppError` (`src/lib/errors.ts`) untuk error yang disengaja, validasi input dengan `z` dari `src/lib/zod.ts` (pesan berbahasa Indonesia), dan akses basis data lewat `prisma` dari `src/lib/prisma.ts`. Error handler mengubah semuanya menjadi format JSON yang sama.

Di dalam `withAdvisoryLock` (`src/lib/advisory-lock.ts`), semua query wajib lewat `tx`, dan jangan memanggil layanan luar. Query lewat `prisma` biasa butuh koneksi kedua, dan bila semua koneksi pool sedang memegang kunci, seluruh API macet.

Route yang butuh login memakai `requireAuth` dan `requireRole(...)` dari `src/middleware/auth.ts`:

```ts
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { id } = currentUser(req);
  // ...
});
```

## Alur pembayaran

1. Penghuni menekan Bayar. Backend menyimpan percobaan dengan `order_id` unik, mis. `RENT-SMR01-K03-2026-11`, lalu membuat transaksi Snap. Percobaan ulang bersufiks `-2`, `-3`.
2. Midtrans mengirim notifikasi ke `POST /api/webhooks/midtrans`.
3. Backend memverifikasi `signature_key`, mengecek ulang status dan nominal ke API Midtrans, lalu menandai lunas dan menulis baris outbox dalam satu transaksi DB (`src/modules/webhooks/service.ts`). Inilah satu-satunya tempat tagihan menjadi lunas.
4. Dispatcher memindahkan baris outbox ke antrean BullMQ (`src/queue/outbox-dispatcher.ts`).
5. Worker memanggil `recordRent` dengan `keccak256(order_id)` dan menyimpan tx hash di `chain_transactions`. Kuitansi menampilkan argumen itu dan tautan Etherscan.

Pembuatan percobaan memakai satu mesin untuk tagihan dan pesanan token (`src/modules/payments/service.ts`): bedanya hanya kunci, format `order_id`, isi Snap, dan pemeriksaan sebelum percobaan baru dibuat.

## Pembelian token

1. Admin menyetujui KYC. Dalam satu transaksi DB, pengajuan menjadi `APPROVED`, dompet kustodian dibuat dengan alamat turunan `CUSTODIAL_WALLET_MNEMONIC`, dan outbox `WHITELIST_KYC` ditulis (`src/modules/kyc/`).
2. Worker mencatat dompet lolos KYC di KosToken. Setelah itu `walletReady` bernilai `true`.
3. Investor memesan. Di bawah kunci per properti, backend memeriksa penawaran, sisa penawaran (skenario 8), batas 10% (skenario 9), dan pesanan aktif, sebelum menyimpan pesanan `BUY-SMR01-0001` dan membuat Snap (`src/modules/purchases/service.ts`). Pesanan menyisihkan tokennya sampai batas bayar.
4. Webhook `settlement` melunasi pesanan, menambah `tokensSold`, dan menulis outbox `TRANSFER_TOKENS` dalam satu transaksi (`src/modules/webhooks/purchase.ts`). `expire`, `cancel`, `deny`, dan `failure` melepas sisihan.
5. Worker memanggil `transferFromTreasury` ke dompet kustodian investor.

## Biaya, tutup periode, dan distribusi (P4)

1. Pengelola mencatat biaya dengan nota (`POST /api/expenses`, multipart). Hash SHA-256 dihitung server dari isi file. Dalam satu transaksi DB berkunci periode, baris biaya dan outbox `RECORD_EXPENSE` ditulis bersama; nota yang sama ditolak 409.
2. Admin membuka `GET /api/periods/2026-11`: struk sementara dihitung dari sewa dan biaya yang sudah tercatat on-chain, beserta syarat penutupan.
3. Tutup periode (`POST /api/periods/2026-11/close`) memeriksa syarat di bawah kunci periode yang sama dengan pelunasan sewa dan pencatatan biaya, lalu menulis `period_closings` dan outbox `CLOSE_PERIOD` bersama. Sejak itu tagihan periode itu tidak bisa dibayar (409 `PERIOD_CLOSED`), dan pembayaran yang lunas belakangan dicatat anomali `PAID_AFTER_PERIOD_CLOSED` tanpa job on-chain.
4. Worker memanggil `closePeriod`. Struk lalu memakai angka `KosLedger.periods(periode)`.
   Job gagal yang memengaruhi periode itu (sewa dan nota periode itu, tutup periode, dan transfer token) menghalangi penutupan; admin bisa mencoba lagi atau menandainya "sudah ditangani" dengan catatan (`POST /api/admin/jobs/:id/resolve`) bila job itu memang tidak akan pernah berhasil.
5. Distribusi (`POST /api/periods/2026-11/distribute`) membaca `getPastVotes` di blok snapshot untuk pemilik lama, perbendaharaan, dan semua dompet kustodian, membagi sewa bersih dengan `distribute()` jalur 1, dan menyimpan bagian tiap pemegang dalam satu transaksi. Bagian perbendaharaan dikreditkan ke pemilik lama. Constraint unik mencegah distribusi kedua.

Angka November yang dibuktikan test (termasuk test Hardhat lokal `tests/integration/distribution-chain.test.ts`): sewa Rp13.500.000, biaya Rp2.700.000, sewa bersih Rp7.897.500, 43875 sen per token; Dimas 100 token mendapat Rp43.875.

## Skrip persiapan demo (P4)

| File | Isi |
|---|---|
| `scripts/demo-siapkan-investor.ts` | Menyetujui KYC Bagas, Citra, Eko, dan Fajar lewat API admin, menunggu worker mencatat dompetnya, lalu membuat pesanan `BUY-` dengan VA sandbox (1.800, 1.200, 800, 560 token). Pemeriksaan pesanannya sama dengan endpoint pembelian; pelunasannya tetap lewat webhook |
| `scripts/demo-catat-biaya.ts` | Mencatat empat biaya November (Rp2.400.000) lewat API pengelola dengan nota dari `scripts/demo/nota/`. Nota `perbaikan-k07.pdf` (Rp300.000) disimpan untuk diunggah lewat UI saat demo |
| `scripts/demo/data.ts` | Target token investor dan daftar biaya November, dipakai kedua skrip dan test-nya |
| `scripts/lib/api-client.ts` | Login akun dummy dan pemanggilan API sungguhan; menunggu `Retry-After` sekali bila login kena batas |

Keduanya aman dijalankan ulang. Perintah, urutan demo, dan cara menjalankan test distribusi di Hardhat lokal (`tests/integration/distribution-chain.test.ts`) ada di [README root](../README.md).

## Antrean untuk jalur 3

`src/queue/jobs.ts` adalah kontrak backend dengan worker: nama antrean, jenis job (`RECORD_RENT`, `WHITELIST_KYC`, `TRANSFER_TOKENS`, `RECORD_EXPENSE`, `CLOSE_PERIOD`), dan skema isi tiap job.

| Job | Ditulis saat | `dedupeKey` | Isi |
|---|---|---|---|
| `RECORD_RENT` | Tagihan lunas | `record-rent:<id tagihan>` | `propertyCode`, `roomNumber`, `period`, `amountIdr`, `paymentRef` |
| `WHITELIST_KYC` | Admin menyetujui KYC | `whitelist-kyc:<alamat dompet>` | `walletAddress`, `approved` |
| `TRANSFER_TOKENS` | Pesanan token lunas | `transfer-tokens:<id pesanan>` | `propertyCode`, `walletAddress`, `tokenAmount`, `paymentRef` |
| `RECORD_EXPENSE` | Pengelola mencatat biaya (P4) | `record-expense:<hash nota>` | `propertyCode`, `period`, `category`, `amountIdr`, `receiptHash` |
| `CLOSE_PERIOD` | Admin menutup periode (P4) | `close-period:<kode properti>:<periode>` | `propertyCode`, `period` |

- Job BullMQ bernama sama dengan `type`, dengan id job sama dengan id baris outbox. Isinya `{ outboxJobId, type, payload }`. Setelah admin menekan Coba lagi ke-n, id job menjadi `<id outbox>-retry-<n>`, karena job lama yang gagal masih tersimpan di BullMQ dengan id aslinya.
- Status job yang ditampilkan selalu dari baris `chain_transactions` dengan `createdAt` terbaru. Job yang dicoba lagi terbaca `QUEUED` (admin) atau `PENDING` (pengelola, investor) sampai worker menulis hasil baru.
- Worker memakai `workerConnection` dan `BLOCKCHAIN_QUEUE_NAME`, dan menyimpan hasilnya di `ChainTransaction` dengan `outboxJobId`. `chain` di `BillDto` otomatis ikut terisi.
- `startOutboxDispatcher(createBlockchainQueue())` dijalankan oleh proses worker. Worker tetap harus siap menerima job yang sama lebih dari sekali.
