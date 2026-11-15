# backend

API KosBagi: Node.js 24 + Express 5 + TypeScript, PostgreSQL lewat Prisma 7, antrean BullMQ di Redis, dan integrasi Midtrans sandbox. Dikelola jalur 2 (Backend & Pembayaran), dengan bagian milik jalur 1 dan jalur 3 seperti ditandai di bawah.

Status progress 2: login akun dummy + JWT, peran, tagihan penghuni, pembayaran Midtrans Snap, webhook, properti dan kamar, KYC dummy, pengajuan pemilik kos, rate limit, skema basis data v2, serta definisi antrean dan dispatcher outbox. Dispatcher belum dijalankan server karena worker baru ada di progress 3. Dokumentasi endpoint ada di [`docs/api/`](../docs/api/), laporan uji ada di [`docs/pengujian/pembayaran.md`](../docs/pengujian/pembayaran.md).

Cara memasang, menjalankan, dan mengetes backend ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan: `npm ci` otomatis menjalankan `prisma generate` untuk membuat klien Prisma di `src/generated/prisma/` (folder ini tidak di-commit). File `.env` berisi konfigurasi lokal dan tidak boleh di-commit; nilai contoh di `.env.example` sudah cocok dengan [`docker-compose.yml`](../docker-compose.yml).

## Mengubah skema basis data

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name <nama_perubahan>` untuk membuat file migrasi baru dan menerapkannya ke basis data lokal.
3. `npm run prisma:generate` untuk memperbarui klien Prisma.
4. Commit `schema.prisma` bersama folder migrasi barunya.

Aturan yang tidak bisa ditulis di `schema.prisma` ada di SQL migrasi `20261102120000_skema_v2`, dan dijelaskan di komentar model terkait:

| Aturan | Isi |
|---|---|
| `payments_bill_id_paid_key`, `payments_token_purchase_id_paid_key` | Satu tagihan atau pesanan paling banyak punya satu pembayaran `PAID` |
| `payments_exactly_one_target_check` | Pembayaran milik tepat satu sasaran: tagihan atau pesanan token |
| `kyc_submissions_user_id_active_key` | Satu investor paling banyak punya satu pengajuan `SUBMITTED` atau `APPROVED` |

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
| `SEPOLIA_RPC_URL` | tidak | | URL RPC Sepolia, dipakai worker mulai progress 3 |
| `SEPOLIA_RPC_URL_FALLBACK` | tidak | | URL RPC cadangan |
| `OPERATOR_PRIVATE_KEY` | tidak | | Private key dompet operator, khusus testnet |
| `CUSTODIAL_WALLET_MNEMONIC` | tidak | | Seed dompet kustodian investor, khusus testnet |
| `KOS_TOKEN_ADDRESS`, `KOS_LEDGER_ADDRESS` | tidak | | Alamat kontrak hasil deploy |

Tidak ada variabel untuk memilih produksi: prototipe hanya sandbox, jadi `isProduction` ditulis tetap `false` di `src/modules/payments/midtrans.ts`.

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma          skema basis data v2
│   ├── migrations/            riwayat perubahan skema dalam SQL
│   └── seed.ts, seed/         data dummy Kos Sumbersari 01 (jalur 1)
├── scripts/
│   └── webhook-simulate.ts    mengirim notifikasi bertanda tangan ke server lokal, tanpa ngrok
├── src/
│   ├── server.ts              entry server HTTP + penutupan rapi
│   ├── worker.ts              entry worker job blockchain (jalur 3)
│   ├── app.ts                 rakit Express; router modul dimuat otomatis
│   ├── config/env.ts          validasi environment variable (zod)
│   ├── lib/                   prisma, logger, errors, zod, json, password, jwt, module-loader,
│   │                          advisory-lock, prisma-errors, uuid, wib
│   ├── middleware/            error handler, auth JWT + RBAC, rate limit
│   ├── queue/                 definisi antrean, tipe job, penulisan outbox, dispatcher
│   ├── modules/
│   │   ├── health/            GET /api/health
│   │   ├── auth/              login, data pengguna
│   │   ├── bills/             tagihan penghuni
│   │   ├── payments/          klien Midtrans, status, order_id, pembuatan percobaan (tanpa routes)
│   │   ├── webhooks/          notifikasi Midtrans, signature, pelunasan
│   │   ├── properties/        data publik kos
│   │   ├── kyc/               KYC dummy
│   │   ├── owner-applications/  pengajuan pemilik kos
│   │   └── reconciliation/    rekonsiliasi (jalur 1); offerings, expenses, periods, portfolio menyusul
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
5. Worker memanggil `recordRent` dengan `keccak256(order_id)` dan menyimpan tx hash untuk tautan Etherscan (progress 3).

## Antrean untuk jalur 3

`src/queue/jobs.ts` adalah kontrak backend dengan worker: nama antrean, jenis job (`RECORD_RENT`, `WHITELIST_KYC`, `TRANSFER_TOKENS`, `RECORD_EXPENSE`, `CLOSE_PERIOD`), dan skema isi tiap job.

- Job BullMQ bernama sama dengan `type`, dengan id job sama dengan id baris outbox. Isinya `{ outboxJobId, type, payload }`.
- Worker memakai `workerConnection` dan `BLOCKCHAIN_QUEUE_NAME`, dan menyimpan hasilnya di `ChainTransaction` dengan `outboxJobId`. `chain` di `BillDto` otomatis ikut terisi.
- `startOutboxDispatcher(createBlockchainQueue())` dijalankan oleh proses worker. Worker tetap harus siap menerima job yang sama lebih dari sekali.
