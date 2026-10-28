# backend

API KosBagi: Node.js 24 + Express 5 + TypeScript, PostgreSQL lewat Prisma 7, antrean BullMQ di Redis, dan integrasi Midtrans sandbox. Dikelola jalur 2 (Backend & Pembayaran), dengan bagian milik jalur 1 dan jalur 3 seperti ditandai di bawah.

## Struktur

```
backend/
├── prisma/
│   ├── schema.prisma, migrations/
│   └── seed.ts, seed/         data dummy Kos Sumbersari 01 (jalur 1)
├── src/
│   ├── server.ts              entry server HTTP
│   ├── worker.ts              entry worker job blockchain (jalur 3)
│   ├── app.ts                 rakit Express; router modul dimuat otomatis
│   ├── config/                validasi environment variable
│   ├── lib/                   klien Prisma & Redis, logger, error, hash
│   ├── middleware/            auth JWT, RBAC, rate limit, error handler
│   ├── queue/                 definisi antrean, tipe job, dispatcher outbox
│   ├── modules/               health, auth, kyc, properties, bills, payments, webhooks,
│   │                          offerings, expenses, periods, portfolio,
│   │                          reconciliation (jalur 1)
│   ├── finance/               kalkulator fee, pajak, sewa bersih, nilai per token (jalur 1)
│   └── blockchain/            ethers.js, dompet operator & kustodian, processor job (jalur 3)
└── tests/                     test integrasi (unit test berada di samping kode)
```

## Alur pembayaran

1. Penghuni menekan Bayar; backend membuat tagihan Midtrans dengan `order_id` unik, mis. `RENT-SMR01-K03-2026-11`.
2. Midtrans mengirim notifikasi ke webhook.
3. Backend memverifikasi `signature_key`, mengecek ulang status dan nominal ke API Midtrans, lalu menandai lunas dalam satu transaksi DB dan menaruh job pencatatan di antrean.
4. Worker memanggil `recordRent` dengan `keccak256(order_id)` dan menyimpan tx hash untuk tautan Etherscan.

Perintah instalasi, migrasi, dan menjalankan server ditambahkan saat kerangka backend dibuat (progress 1).
