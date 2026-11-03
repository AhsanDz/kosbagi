# backend

API KosBagi: Node.js 24 + Express 5 + TypeScript, PostgreSQL lewat Prisma 7, antrean BullMQ di Redis, dan integrasi Midtrans sandbox. Dikelola jalur 2 (Backend & Pembayaran), dengan bagian milik jalur 1 dan jalur 3 seperti ditandai di bawah.

Status progress 1: kerangka server, validasi konfigurasi, logger, format error, pemuat router otomatis, `GET /api/health`, skema basis data v1 (pengguna, properti, kamar, tagihan) beserta migrasi awal. Dokumentasi endpoint ada di [`docs/api/`](../docs/api/).

Cara memasang, menjalankan, dan mengetes backend ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan: `npm ci` otomatis menjalankan `prisma generate` untuk membuat klien Prisma di `src/generated/prisma/` (folder ini tidak di-commit). File `.env` berisi konfigurasi lokal dan tidak boleh di-commit; nilai contoh di `.env.example` sudah cocok dengan [`docker-compose.yml`](../docker-compose.yml).

## Mengubah skema basis data

1. Edit `prisma/schema.prisma`.
2. `npm run db:migrate -- --name <nama_perubahan>` untuk membuat file migrasi baru dan menerapkannya ke basis data lokal.
3. `npm run prisma:generate` untuk memperbarui klien Prisma.
4. Commit `schema.prisma` bersama folder migrasi barunya.

## Variabel environment

Didefinisikan dan divalidasi di `src/config/env.ts`. Aplikasi menolak start bila ada yang salah, dengan pesan yang menyebut nama variabelnya.

| Variabel | Wajib | Bawaan | Keterangan |
|---|---|---|---|
| `NODE_ENV` | tidak | `development` | `development`, `test`, atau `production` |
| `PORT` | tidak | `4000` | Port server HTTP |
| `LOG_LEVEL` | tidak | `info` | Tingkat log pino: `fatal` sampai `trace`, atau `silent` |
| `CORS_ORIGIN` | tidak | `http://localhost:3000` | Origin frontend yang boleh memanggil API, pisahkan dengan koma |
| `DATABASE_URL` | ya | | Alamat PostgreSQL, format `postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public` |
| `REDIS_URL` | ya | | Alamat Redis untuk antrean BullMQ (dipakai mulai progress 2) |

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma          skema basis data (model User, Property, Room, Bill)
│   ├── migrations/            riwayat perubahan skema dalam SQL
│   └── seed.ts, seed/         data dummy Kos Sumbersari 01 (jalur 1)
├── src/
│   ├── server.ts              entry server HTTP + penutupan rapi
│   ├── worker.ts              entry worker job blockchain (jalur 3)
│   ├── app.ts                 rakit Express; router modul dimuat otomatis
│   ├── config/env.ts          validasi environment variable (zod)
│   ├── lib/                   prisma, logger, errors, zod, json, password, module-loader
│   ├── middleware/            error handler (P1); auth JWT, RBAC, rate limit menyusul
│   ├── queue/                 definisi antrean, tipe job, dispatcher outbox (menyusul)
│   ├── modules/               health (P1); auth, kyc, properties, bills, payments, webhooks,
│   │                          offerings, expenses, periods, portfolio menyusul;
│   │                          reconciliation (jalur 1)
│   ├── finance/               kalkulator fee, pajak, sewa bersih, nilai per token (jalur 1)
│   ├── blockchain/            ethers.js, dompet operator & kustodian, processor job (jalur 3)
│   └── generated/prisma/      klien Prisma hasil generate (tidak di-commit)
├── tests/                     test integrasi + fixture (unit test berada di samping kode)
├── prisma.config.ts           konfigurasi Prisma CLI
├── vitest.config.ts           konfigurasi test
└── tsconfig.json, tsconfig.build.json
```

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

## Alur pembayaran

1. Penghuni menekan Bayar; backend membuat tagihan Midtrans dengan `order_id` unik, mis. `RENT-SMR01-K03-2026-11`.
2. Midtrans mengirim notifikasi ke webhook.
3. Backend memverifikasi `signature_key`, mengecek ulang status dan nominal ke API Midtrans, lalu menandai lunas dalam satu transaksi DB dan menaruh job pencatatan di antrean.
4. Worker memanggil `recordRent` dengan `keccak256(order_id)` dan menyimpan tx hash untuk tautan Etherscan.
