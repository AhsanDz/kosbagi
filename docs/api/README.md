# Dokumentasi API KosBagi

API backend KosBagi (Express 5 + TypeScript). Dokumen ini memuat konvensi yang berlaku untuk semua endpoint dan daftar endpoint yang sudah tersedia. Endpoint baru ditambahkan ke sini setiap progress.

| Progress | Perubahan kontrak API |
|---|---|
| P1 | Konvensi umum (format JSON, format error, header) dan `GET /api/health` |
| P2 | Login akun dummy + JWT, peran, tagihan penghuni, pembayaran Midtrans Snap, webhook, properti dan kamar, KYC dummy, pengajuan pemilik kos, rate limit |
| P3 | Kuitansi sewa dan status `NOT_RECORDED`, alamat dan pengelola di kartu kamar, KYC dengan pemeriksaan otomatis dan dompet kustodian, penawaran dan pembelian token (`BUY-`), webhook pembelian, status on-chain whitelist dan transfer token |

## 1. Alamat dasar

| Lingkungan | Alamat dasar |
|---|---|
| Lokal (`npm run dev` di `backend/`) | `http://localhost:4000/api` |
| Deploy | menyusul (progress 5) |

- Semua endpoint berada di bawah awalan `/api`.
- Nama sumber daya berbahasa Inggris, huruf kecil, bentuk jamak, dipisah tanda hubung: `/api/bills`, `/api/owner-applications`.
- Setiap modul di `backend/src/modules/<nama>/routes.ts` otomatis dipasang di `/api/<nama>`. Contoh: modul `health` menjadi `/api/health`.

## 2. Format permintaan dan respons

- Permintaan dan respons memakai JSON (UTF-8). Permintaan yang membawa body wajib memakai header `Content-Type: application/json`.
- Ukuran body maksimal **100 KB**. Body yang lebih besar ditolak dengan `413 PAYLOAD_TOO_LARGE`.
- Respons sukses selalu dibungkus `data`:

```json
{ "data": { "status": "ok" } }
```

- Respons gagal selalu dibungkus `error` (lihat bagian 3).
- Klien cukup memeriksa status HTTP: 2xx berarti baca `data`, selain itu baca `error`.

### Konvensi nilai

| Jenis nilai | Format | Contoh |
|---|---|---|
| Nominal rupiah | bilangan bulat JSON (number), tanpa desimal; nama field berakhiran `Idr` | `"amountIdr": 1500000` |
| Jumlah token | bilangan bulat (token utuh) | `"totalTokens": 18000` |
| Waktu | ISO 8601 dalam UTC | `"paidAt": "2026-11-05T03:15:00.000Z"` |
| Tanggal tanpa jam | `YYYY-MM-DD` | `"dueDate": "2026-11-10"` |
| Periode sewa | `YYYY-MM` | `"period": "2026-11"` |
| ID data | UUID v7 (string) | `"id": "01a18897-fb42-70b8-abc0-43d131ddbe3c"` |
| Status dan peran | huruf kapital bahasa Inggris | `"status": "UNPAID"`, `"role": "TENANT"` |
| Order Midtrans | Sewa `RENT-<properti>-<kamar>-<periode>`; pembelian token `BUY-<properti>-<4 digit urut>`. Percobaan ulang bersufiks `-2`, `-3` | `RENT-SMR01-K03-2026-11`, `BUY-SMR01-0003` |

Nilai on-chain yang bisa melebihi batas aman number JavaScript (mis. satuan wei) dikirim sebagai string.

## 3. Format error

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [{ "path": "period", "message": "Periode harus berformat YYYY-MM." }],
    "requestId": "9c5c46a4-7a62-4ee5-a37f-513ad65675a1"
  }
}
```

| Field | Keterangan |
|---|---|
| `code` | Kode mesin berhuruf kapital (bahasa Inggris). Frontend bercabang berdasarkan field ini, bukan berdasarkan `message`. |
| `message` | Pesan untuk pengguna dalam Bahasa Indonesia, aman ditampilkan apa adanya. |
| `details` | Opsional. Untuk `VALIDATION_ERROR` berisi daftar `{ path, message }` per field yang salah. |
| `requestId` | Sama dengan header `X-Request-Id`. Sebutkan nilai ini saat melaporkan masalah supaya log server mudah ditelusuri. |

Detail teknis (stack trace, pesan error internal) tidak pernah dikirim ke klien; semuanya hanya dicatat di log server.

### Kode error

| Status | `code` | Kapan muncul |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Isi body, parameter, atau query tidak lolos validasi. Khusus `POST /api/owner-applications` memakai status 422 |
| 400 | `INVALID_JSON` | Body bukan JSON yang valid |
| 400 | `AMOUNT_MISMATCH` | Webhook: nominal tidak cocok dengan tagihan atau pesanan token |
| 400 | `BAD_REQUEST` | Alamat dengan percent-encoding rusak, mis. `/api/bills/%E0%A4%A` |
| 401 | `INVALID_CREDENTIALS` | Login: email atau kata sandi salah |
| 401 | `UNAUTHENTICATED` | Token tidak ada, tidak sah, atau kedaluwarsa |
| 403 | `FORBIDDEN` | Sudah masuk, tetapi peran akun tidak boleh memakai endpoint ini |
| 403 | `INVALID_SIGNATURE` | Webhook: `signature_key` tidak cocok |
| 403 | `KYC_REQUIRED` | Membeli token tanpa KYC yang disetujui |
| 404 | `NOT_FOUND` | Rute tidak ada, atau data tidak ditemukan. Tagihan milik orang lain juga dibalas kode ini |
| 409 | `BILL_ALREADY_PAID` | Tagihan sudah lunas |
| 409 | `KYC_ALREADY_SUBMITTED` | Investor sudah punya pengajuan KYC yang diajukan atau disetujui |
| 409 | `KYC_ALREADY_REVIEWED` | Pengajuan KYC sudah ditinjau |
| 409 | `WALLET_NOT_READY` | Membeli token sebelum dompet kustodian tercatat lolos KYC di KosToken |
| 409 | `OFFERING_CLOSED` | Penawaran tidak berstatus `OPEN` atau sudah melewati `closesAt` |
| 409 | `PURCHASE_PENDING` | Investor masih punya pesanan yang menunggu bayar. `details.purchaseId` berisi pesanan itu |
| 409 | `PURCHASE_ALREADY_PAID` | Pesanan token sudah lunas |
| 413 | `PAYLOAD_TOO_LARGE` | Body melebihi 100 KB |
| 422 | `OFFERING_EXCEEDED` | Skenario 8: jumlah token melebihi sisa penawaran. `details: { tokensRemaining }` |
| 422 | `HOLDING_CAP_EXCEEDED` | Skenario 9: kepemilikan melewati batas 10% per investor. `details: { remainingQuota }` |
| 429 | `RATE_LIMITED` | Terlalu banyak permintaan dari IP yang sama |
| 4xx | `BAD_REQUEST` | Permintaan tidak dapat diproses karena alasan lain di sisi klien |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga di server |
| 502 | `MIDTRANS_UNAVAILABLE` | Membuat pembayaran: Midtrans gagal dihubungi atau membalas error |
| 503 | `MIDTRANS_UNAVAILABLE` | Webhook: status transaksi belum bisa dicek. Midtrans diminta mengirim ulang |
| 503 | `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` belum diisi di server |
| 503 | `CUSTODIAL_WALLET_NOT_CONFIGURED` | Menyetujui KYC saat `CUSTODIAL_WALLET_MNEMONIC` belum diisi |

## 4. Header

| Header | Arah | Keterangan |
|---|---|---|
| `Content-Type: application/json` | permintaan & respons | Wajib untuk permintaan yang membawa body |
| `X-Request-Id` | respons (opsional di permintaan) | ID unik tiap permintaan. Bila klien mengirim nilai aman (huruf, angka, `.`, `_`, `-`, maks. 64 karakter), nilai itu dipakai ulang; selain itu server membuat UUID baru. |
| `Access-Control-Allow-Origin` | respons | Hanya untuk origin yang terdaftar di `CORS_ORIGIN` (lokal: `http://localhost:3000`) |
| `Authorization: Bearer <token>` | permintaan | Wajib untuk endpoint yang butuh login |
| `RateLimit`, `RateLimit-Policy` | respons | Sisa kuota di endpoint yang diberi rate limit |

Server juga memasang header keamanan standar lewat `helmet` (mis. `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) dan tidak mengirim `X-Powered-By`.

## 5. Autentikasi dan peran

Login menghasilkan JWT HS256 yang berlaku 8 jam, dengan klaim `sub` (id pengguna) dan `role`. Token dikirim di header `Authorization: Bearer <token>`.

Di frontend, token tidak boleh sampai ke JavaScript peramban: route handler Next.js menyimpannya di cookie httpOnly dan meneruskan permintaan ke backend.

| Keadaan | Balasan |
|---|---|
| Token tidak ada, palsu, atau kedaluwarsa | 401 `UNAUTHENTICATED` |
| Peran tidak diizinkan | 403 `FORBIDDEN` |
| Data milik pengguna lain | 404 `NOT_FOUND`, supaya keberadaan datanya tidak terbaca |

Peran: `INVESTOR`, `TENANT`, `MANAGER`, `ADMIN`.

### Rate limit

Lewat dari batas dibalas 429 `RATE_LIMITED`.

| Endpoint | Batas per menit | Dihitung per |
|---|---|---|
| `POST /api/auth/login` | 10 | IP |
| `POST /api/owner-applications` | 10 | IP |
| `POST /api/webhooks/midtrans` | 120 | IP |
| `POST /api/bills/:id/payments` | 30 | Pengguna |
| `POST /api/offerings/:id/purchases` | 30 | Pengguna |
| `POST /api/purchases/:id/payments` | 30 | Pengguna |

## 6. Daftar endpoint

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | publik | Status layanan, versi, dan waktu server |
| POST | `/api/auth/login` | publik | Masuk dengan akun dummy |
| GET | `/api/auth/me` | login | Pengguna yang sedang masuk |
| GET | `/api/bills/current` | TENANT | Tagihan terbaru dan data kamar |
| GET | `/api/bills` | TENANT | Semua tagihan milik sendiri |
| GET | `/api/bills/:id` | TENANT | Satu tagihan milik sendiri |
| POST | `/api/bills/:id/payments` | TENANT | Melanjutkan atau membuat pembayaran Snap |
| POST | `/api/webhooks/midtrans` | Midtrans (signature) | Notifikasi HTTP Midtrans |
| GET | `/api/properties` | publik | Daftar properti |
| GET | `/api/properties/:slug` | publik | Detail properti |
| GET | `/api/properties/:slug/rooms` | publik | Kamar properti, tanpa data penghuni |
| POST | `/api/kyc` | INVESTOR | Mengajukan KYC dummy |
| GET | `/api/kyc/me` | INVESTOR | Pengajuan KYC terakhir milik sendiri |
| GET | `/api/kyc` | ADMIN | Daftar pengajuan KYC |
| POST | `/api/kyc/:id/approve` | ADMIN | Menyetujui pengajuan |
| POST | `/api/kyc/:id/reject` | ADMIN | Menolak pengajuan dengan alasan |
| GET | `/api/offerings/current` | INVESTOR | Penawaran yang dibuka, kuota investor, dan pesanan aktif |
| POST | `/api/offerings/:id/purchases` | INVESTOR | Membuat pesanan token dan pembayaran Snap |
| GET | `/api/purchases` | INVESTOR | Semua pesanan milik sendiri |
| GET | `/api/purchases/:id` | INVESTOR | Satu pesanan milik sendiri |
| POST | `/api/purchases/:id/payments` | INVESTOR | Melanjutkan atau membayar ulang pesanan |
| POST | `/api/owner-applications` | publik | Pengajuan kos dari halaman `/pemilik` |

### GET /api/health

Mengecek bahwa server hidup. Endpoint ini sengaja tidak menyentuh PostgreSQL maupun Redis, sehingga tetap menjawab walau keduanya mati. Cocok untuk health check hosting dan untuk memastikan frontend bisa menjangkau backend.

**Permintaan:** tanpa parameter dan tanpa body.

```bash
curl http://localhost:4000/api/health
```

**Respons 200:**

```json
{
  "data": {
    "status": "ok",
    "service": "kosbagi-backend",
    "version": "0.1.0",
    "environment": "development",
    "time": "2026-10-29T16:53:08.522Z",
    "uptimeSeconds": 42
  }
}
```

| Field | Tipe | Keterangan |
|---|---|---|
| `status` | string | Selalu `ok` bila server menjawab |
| `service` | string | Nama layanan, `kosbagi-backend` |
| `version` | string | Versi dari `backend/package.json` |
| `environment` | string | `development`, `test`, atau `production` |
| `time` | string | Waktu server saat menjawab (ISO 8601, UTC) |
| `uptimeSeconds` | number | Lama proses server berjalan, dalam detik |

Header respons: `Cache-Control: no-store` (hasil tidak boleh disimpan cache) dan `X-Request-Id`.

**Contoh error (rute tidak ada atau metode salah), 404:**

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Rute POST /api/health tidak ditemukan.",
    "requestId": "a51868bb-8c73-465d-8cf9-9f176f0e1581"
  }
}
```

### POST /api/auth/login

Publik, 10 permintaan per menit per IP.

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"penghuni.dummy@kosbagi.test","password":"demo-kosbagi"}'
```

**Respons 200:**

```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "expiresAt": "2026-11-05T11:00:00.000Z",
    "user": {
      "id": "01a18897-fb42-70b8-abc0-43d131ddbe3c",
      "name": "Sari Wulandari",
      "email": "penghuni.dummy@kosbagi.test",
      "role": "TENANT"
    }
  }
}
```

| Status | `code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Email tidak berformat email, atau field kosong |
| 401 | `INVALID_CREDENTIALS` | Email tidak terdaftar atau kata sandi salah. Balasannya sama, supaya tidak membocorkan email mana yang terdaftar |
| 429 | `RATE_LIMITED` | Lebih dari 10 percobaan per menit |

### GET /api/auth/me

Butuh login. Balasan `{ "data": { "user": { "id", "name", "email", "role" } } }`. Dibalas 401 `UNAUTHENTICATED` bila token sah tetapi akunnya sudah tidak ada.

### Tagihan penghuni

Semua endpoint `/api/bills` hanya untuk peran `TENANT` dan hanya melihat tagihan milik sendiri.

**GET /api/bills/current** membalas tagihan terbaru menurut periode, beserta data kamar. `bill` dan `room` bernilai `null` bila belum ada.

```json
{ "data": { "bill": { "...": "BillDto" }, "room": { "...": "TenantRoomDto" } } }
```

**GET /api/bills** membalas `{ "data": { "bills": [BillDto] } }`, terbaru lebih dulu.

**GET /api/bills/:id** membalas `{ "data": { "bill": BillDto + receipt } }`, yaitu BillDto ditambah field `receipt` (lihat [Kuitansi](#kuitansi)). Tagihan milik orang lain, tagihan yang tidak ada, dan id yang bukan UUID semuanya dibalas 404.

#### BillDto

```json
{
  "id": "01a18897-fb42-70b8-abc0-43d131ddbe3c",
  "period": "2026-11",
  "amountIdr": 1500000,
  "status": "PAID",
  "dueDate": "2026-11-10",
  "paidAt": "2026-11-05T03:02:11.000Z",
  "paymentState": "PAID",
  "payment": {
    "id": "01a18897-fb42-70b8-abc0-43d131ddbe3d",
    "orderId": "RENT-SMR01-K03-2026-11",
    "amountIdr": 1500000,
    "status": "PAID",
    "method": "bank_transfer",
    "expiresAt": "2026-11-05T03:05:00.000Z",
    "paidAt": "2026-11-05T03:02:11.000Z",
    "snapToken": null
  },
  "chain": { "status": "PENDING", "txHash": null, "blockNumber": null }
}
```

| Field | Keterangan |
|---|---|
| `status` | `UNPAID` atau `PAID` |
| `paymentState` | Lihat tabel di bawah. Menjadi dasar lencana di layar |
| `payment` | Percobaan yang melunasi tagihan, atau percobaan terakhir bila belum lunas. `null` bila belum ada percobaan, termasuk tagihan lunas dari data seed |
| `chain` | `null` selama belum `PAID`. Lihat tabel `chain.status` di bawah |

| `chain.status` | Arti | Tautan Etherscan |
|---|---|---|
| `PENDING` | Lunas, menunggu worker mengirim atau mengonfirmasi `recordRent` | Belum ada; `txHash` terisi begitu transaksi terkirim |
| `RECORDED` | Tercatat di blok `blockNumber` | Ada, dari `txHash` |
| `FAILED` | Percobaan otomatis worker habis. Diulang dari antrean admin (P4) | Bila `txHash` terisi |
| `NOT_RECORDED` | Lunas tanpa pembayaran Midtrans, yaitu data lampau seed (Agu sampai Okt 2026). Tidak pernah dicatat | Tidak ada |

| `paymentState` | Arti |
|---|---|
| `NONE` | Belum ada percobaan |
| `PENDING` | Percobaan terakhir belum lewat `expiresAt` |
| `EXPIRED` | Midtrans mengirim `expire`, atau `expiresAt` sudah lewat |
| `FAILED` | Midtrans mengirim `cancel`, `deny`, atau `failure`, atau transaksi gagal dibuat di Midtrans |
| `PAID` | Tagihan lunas |

#### PaymentDto

| Field | Keterangan |
|---|---|
| `orderId` | `RENT-SMR01-K03-2026-11`, lalu `-2`, `-3` untuk percobaan ulang |
| `status` | `PENDING`, `PAID`, `EXPIRED`, atau `FAILED` |
| `method` | `payment_type` dari Midtrans apa adanya, mis. `bank_transfer`, `qris`, `gopay`, `shopeepay`. `null` sampai metode dipilih |
| `expiresAt` | Batas bayar, 5 menit sejak percobaan dibuat. Dipakai untuk hitung mundur |
| `snapToken` | Hanya terisi selama `status` `PENDING`. Selain itu `null` |

#### Kuitansi

`receipt` hanya ada di `GET /api/bills/:id`, dan bernilai `null` selama tagihan belum lunas.

```json
{
  "orderId": "RENT-SMR01-K03-2026-11",
  "transactionId": "7c1d0e5a-6b3e-4f2a-9a51-0d8c3e21b2f4",
  "method": "bank_transfer",
  "bank": "bca",
  "paidAt": "2026-11-09T03:42:00.000Z",
  "tenantName": "Sari Wulandari",
  "propertyCode": "SMR01",
  "propertyName": "Kos Sumbersari 01",
  "roomNumber": "K03",
  "onChain": {
    "room": 3,
    "period": 202611,
    "amountIdr": 1500000,
    "paymentRef": "0x5b1e...a90c",
    "contractAddress": "0x2b9c...7e10",
    "txHash": "0x8f3a...c21d",
    "blockNumber": 7148220
  }
}
```

| Field | Keterangan |
|---|---|
| `orderId` | `order_id` yang melunasi tagihan. `null` untuk data lampau tanpa pembayaran Midtrans |
| `transactionId` | `transaction_id` Midtrans |
| `method`, `bank` | `payment_type` Midtrans apa adanya, dan bank virtual account (`bca`, `bni`, `bri`, `permata`) bila metodenya VA. Nomor VA tidak pernah disimpan |
| `paidAt` | Waktu lunas |
| `onChain` | Argumen `KosLedger.recordRent` persis seperti yang dikirim worker: `room` (3 untuk K03), `period` (202611), `amountIdr`, `paymentRef` = `keccak256(order_id)`. Ditambah `contractAddress` dari `KOS_LEDGER_ADDRESS` (`null` bila belum diisi), `txHash`, dan `blockNumber` (keduanya `null` sampai worker mengirim dan mengonfirmasi). `onChain` bernilai `null` untuk data lampau seed |

Argumen di `onChain` dibaca dari isi job outbox yang dikirim ke worker, bukan dihitung ulang, supaya sama persis dengan yang tercatat di kontrak. Waktu blok belum tersedia karena skema `chain_transactions` belum menyimpannya.

#### TenantRoomDto

```json
{
  "number": "K03",
  "propertyName": "Kos Sumbersari 01",
  "propertyCode": "SMR01",
  "propertyAddress": "Jl. Sumbersari, Malang (dummy)",
  "managerName": "Hadi Santoso",
  "monthlyRentIdr": 1500000,
  "leaseStart": "2026-08",
  "leaseEnd": "2027-07",
  "dueDay": 10
}
```

Masa sewa tidak disimpan di basis data. `leaseStart` adalah periode tagihan paling awal, `leaseEnd` 12 bulan sesudahnya, dan `dueDay` tanggal jatuh tempo tagihan terbaru. Ketiganya `null` bila kamar belum punya tagihan. `propertyAddress` adalah alamat properti, dan `managerName` nama pengelola kos (`null` bila properti belum punya pengelola).

### POST /api/bills/:id/payments

Tanpa body. Dipanggil saat penghuni menekan Bayar. Klik berulang dan klik bersamaan aman: selama percobaan masih aktif, semuanya mendapat percobaan dan token yang sama. Klik yang datang saat percobaan masih dibuat di Midtrans menunggu tokennya, paling lama 10 detik.

| Status | Arti |
|---|---|
| 201 | Percobaan baru dibuat |
| 200 | Percobaan aktif yang belum kedaluwarsa dikembalikan dengan token yang sama |

Keduanya membalas `{ "data": { "payment": PaymentDto } }`. Frontend membuka popup dengan `snap.pay(payment.snapToken)`.

| Status | `code` | Kapan |
|---|---|---|
| 404 | `NOT_FOUND` | Tagihan tidak ada atau milik orang lain |
| 409 | `BILL_ALREADY_PAID` | Tagihan sudah lunas |
| 429 | `RATE_LIMITED` | Lebih dari 30 permintaan per menit dari pengguna yang sama |
| 502 | `MIDTRANS_UNAVAILABLE` | Midtrans gagal. Percobaan tercatat `FAILED`, semua klik yang menunggu ikut dibalas 502, dan klik berikutnya membuat percobaan baru |
| 503 | `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` belum diisi |

Endpoint ini tidak pernah mengubah tagihan menjadi lunas. Callback Snap di peramban juga tidak. Setelah `onSuccess`, frontend cukup memuat ulang `GET /api/bills/current`.

**order_id yang sudah terpakai.** Akun Midtrans sandbox menyimpan semua `order_id` lama, sedangkan nomor percobaan mulai lagi dari 1 setiap basis data diisi ulang. Sebelum membuat Snap untuk percobaan baru, backend bertanya ke API status Midtrans. Bila `order_id` itu sudah punya transaksi, atau Midtrans membalas kode 406 (*Duplicate order ID*), percobaan itu ditandai `FAILED` dengan `provider_status` `ORDER_ID_TAKEN` dan percobaan berikutnya (`-2`, `-3`, ...) dibuat di permintaan yang sama. Klien tetap menerima 201 dengan `order_id` bersufiks. Bila lima `order_id` berturut-turut terpakai, dibalas 502 `MIDTRANS_UNAVAILABLE`, dan klik berikutnya melanjutkan dari sufiks berikutnya. Aturan yang sama berlaku untuk pesanan token dan skrip `demo:bayar-sewa`. Karena itu `order_id` yang tampil di layar tidak selalu tanpa sufiks; pakai nilai `payment.orderId` dari API.

### POST /api/webhooks/midtrans

Tujuan notifikasi HTTP Midtrans, dan satu-satunya pintu perubahan status lunas, baik untuk tagihan sewa (`RENT-`) maupun pesanan token (`BUY-`). Di dashboard sandbox, alamat ini dipasang sebagai Payment Notification URL. Tanpa login: keaslian dibuktikan lewat `signature_key`.

Urutan pemeriksaan:

1. Rate limit, lalu `signature_key` = SHA-512(`order_id` + `status_code` + `gross_amount` + server key), memakai `gross_amount` mentah dari notifikasi dan perbandingan waktu-konstan.
2. Cek ulang ke API status Midtrans. Keputusan memakai jawaban API itu, bukan isi notifikasi.
3. `order_id` tidak dikenal: dicatat anomali `UNKNOWN_ORDER`.
4. Nominal notifikasi atau nominal API status berbeda dari tagihan atau pesanan: dicatat anomali `AMOUNT_MISMATCH` dan ditolak.
5. Status lunas: `settlement` atau `capture`, `status_code` 200, dan `fraud_status` `accept` bila field itu ada.
6. Sewa: dalam satu transaksi DB, tagihan dan pembayaran lunas, lalu baris outbox `RECORD_RENT` ditulis.
7. Token: dalam satu transaksi DB, pesanan dan pembayaran lunas, `tokensSold` bertambah, penawaran menjadi `CLOSED` bila habis, lalu baris outbox `TRANSFER_TOKENS` `{ propertyCode, walletAddress, tokenAmount, paymentRef }` ditulis.

**Balasan sukses** `{ "data": { "orderId": "RENT-SMR01-K03-2026-11", "outcome": "SETTLED" } }`:

| `outcome` | Arti | Perubahan data |
|---|---|---|
| `SETTLED` | Pembayaran sah | Tagihan atau pesanan lunas, satu baris outbox |
| `ALREADY_PAID` | Notifikasi ganda untuk order yang sudah terbayar | Tidak ada |
| `DUPLICATE_BILL_PAYMENT` | Tagihan sudah lunas lewat order lain | Percobaan ini `DUPLICATE_PAID`, anomali tercatat, tanpa outbox |
| `DUPLICATE_PURCHASE_PAYMENT` | Pesanan token sudah lunas lewat order lain | Percobaan ini `DUPLICATE_PAID`, anomali tercatat, tanpa outbox |
| `PURCHASE_UNFULFILLABLE` | Pesanan terbayar setelah sisihannya lepas, dan tokennya sudah dipesan orang lain atau melewati batas 10% | Percobaan `UNFULFILLED`, pesanan `EXPIRED`, anomali tercatat untuk pengembalian dana, tanpa outbox |
| `ORDER_ID_TAKEN` | `order_id` ini sudah dipakai di Midtrans sebelum percobaan KosBagi dibuat (mis. basis data diisi ulang), dan percobaannya sudah ditandai | Anomali `UNKNOWN_ORDER` dengan catatan berawalan `ORDER_ID_TAKEN:`. Tagihan dan pesanan tidak berubah |
| `ATTEMPT_UPDATED` | `pending`, `expire`, `cancel`, `deny`, atau `failure` | Status percobaan. Untuk pesanan token, `expire` membuat pesanan `EXPIRED` dan `cancel`, `deny`, `failure` membuat pesanan `FAILED`, sehingga sisihan tokennya lepas. Tagihan sewa tidak berubah |
| `UNKNOWN_ORDER` | `order_id` tidak dikenal | Anomali tercatat |
| `NO_CHANGE` | Status terlambat atau tidak diproses, mis. `pending` setelah lunas, `refund` | Tidak ada |

**Balasan gagal dan akibatnya.** Midtrans mengirim ulang notifikasi yang tidak dibalas 2xx. Menurut dokumen Midtrans: 400 dan 404 dua kali, 500 sekali, 503 empat kali, status lain lima kali, dengan jeda 2, 10, 30, 90, dan 210 menit.

| Status | `code` | Kapan | Data berubah? |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Field wajib tidak ada | Tidak |
| 403 | `INVALID_SIGNATURE` | Signature tidak cocok | Tidak, dan Midtrans tidak ditanya |
| 400 | `AMOUNT_MISMATCH` | Nominal tidak cocok | Hanya anomali. Pengiriman ulang menaikkan `occurrences`, bukan menambah baris |
| 429 | `RATE_LIMITED` | Melewati 120 permintaan per menit | Tidak |
| 503 | `MIDTRANS_UNAVAILABLE` | API status gagal, atau belum mengenal order yang kita kenal | Tidak |
| 503 | `MIDTRANS_NOT_CONFIGURED` | Server key kosong | Tidak |

Status tidak pernah mundur: `pending`, `expire`, `cancel`, `deny`, dan `failure` yang terlambat tidak menimpa status lunas. Sebaliknya `settlement` tetap diterima walau percobaan sudah `EXPIRED` atau `FAILED`, karena satu sesi Snap bisa menghasilkan `deny` lalu pembayaran dengan metode lain.

Status pesanan hanya dilepas oleh notifikasi untuk percobaan terakhirnya, jadi `expire` untuk percobaan lama tidak melepas sisihan percobaan yang lebih baru.

Jenis anomali yang dicatat di tabel `payment_anomalies`:

| `type` | Arti |
|---|---|
| `AMOUNT_MISMATCH` | Nominal notifikasi atau API status berbeda |
| `UNKNOWN_ORDER` | Signature sah, `order_id` tidak dikenal. Juga dipakai untuk notifikasi `order_id` yang ditandai `ORDER_ID_TAKEN` (kolom `paymentId` terisi, catatan berawalan `ORDER_ID_TAKEN:`) |
| `DUPLICATE_BILL_PAYMENT` | Dua order untuk satu tagihan sama-sama terbayar |
| `DUPLICATE_PURCHASE_PAYMENT` | Dua order untuk satu pesanan token sama-sama terbayar |
| `PURCHASE_UNFULFILLABLE` | Pesanan terbayar setelah sisihannya lepas dan tokennya tidak lagi tersedia |

### Properti

Publik, tanpa data penghuni.

**GET /api/properties** membalas `{ "data": { "properties": [PropertyDto] } }`. **GET /api/properties/:slug** membalas `{ "data": { "property": PropertyDto } }`, atau 404. Slug yang bukan huruf kecil, angka, dan tanda hubung juga dibalas 404.

```json
{
  "code": "SMR01",
  "slug": "sumbersari-01",
  "name": "Kos Sumbersari 01",
  "address": "Jl. Sumbersari, Malang",
  "valuationIdr": 1800000000,
  "tokenSymbol": "KB-SMR01",
  "totalTokens": 18000,
  "tokenPriceIdr": 100000,
  "ownerTokens": 5400,
  "maxTokensPerInvestor": 1800,
  "roomCount": 10,
  "occupiedRoomCount": 9
}
```

**GET /api/properties/:slug/rooms** membalas daftar kamar urut nomor, atau 404:

```json
{ "data": { "rooms": [{ "number": "K01", "status": "OCCUPIED", "monthlyRentIdr": 1500000 }] } }
```

`status` berisi `OCCUPIED`, `VACANT`, atau `MAINTENANCE`.

### KYC dummy

Data identitas dummy, tanpa nomor KTP asli. Persetujuan admin membuat dompet kustodian dan job whitelist on-chain.

#### KycDto

```json
{
  "id": "01a18897-fb42-70b8-abc0-43d131ddbe3c",
  "fullName": "Dimas Pratama",
  "dummyIdNumber": "DUMMY-0042",
  "status": "SUBMITTED",
  "rejectionReason": null,
  "submittedAt": "2026-11-05T03:00:00.000Z",
  "reviewedAt": null
}
```

`status` berisi `SUBMITTED`, `APPROVED`, atau `REJECTED`. Investor yang belum pernah mengajukan tidak punya baris pengajuan.

#### WalletDto

Dompet kustodian investor dan pencatatan lolos KYC-nya di KosToken (`setKycStatus`). Alamat diturunkan dari `CUSTODIAL_WALLET_MNEMONIC` dengan path `m/44'/60'/0'/0/<indeks>`; investor tidak memegang kunci.

```json
{ "address": "0x7c4e...19b2", "whitelist": { "status": "RECORDED", "txHash": "0x3d9a...f0e4", "blockNumber": 7140552 } }
```

`whitelist.status` berisi `PENDING` (menunggu worker), `RECORDED` (tercatat), atau `FAILED` (percobaan otomatis habis). Khusus `GET /api/kyc` (admin), `whitelist` juga membawa `lastError`: pesan galat percobaan terakhir dari worker (`chain_transactions.last_error`), atau `null`. Investor tidak pernah menerima field ini.

| Endpoint | Akses | Body atau query | Balasan | Error khusus |
|---|---|---|---|---|
| `POST /api/kyc` | INVESTOR | `{ "fullName", "dummyIdNumber" }`; `dummyIdNumber` wajib berawalan `DUMMY-` | 201 `{ "data": { "kyc": KycDto } }` | 409 `KYC_ALREADY_SUBMITTED` bila masih ada pengajuan yang diajukan atau disetujui. Yang ditolak boleh mengajukan lagi |
| `GET /api/kyc/me` | INVESTOR | | 200 `{ "data": { "kyc": KycDto, "wallet": WalletDto } }`. `kyc` `null` berarti belum mengajukan; `wallet` `null` selama belum disetujui | |
| `GET /api/kyc` | ADMIN | Opsional `?status=SUBMITTED`, `APPROVED`, atau `REJECTED` | 200 `{ "data": { "submissions": [...], "counts": { "SUBMITTED": 2, "APPROVED": 1, "REJECTED": 1 } } }` | 400 bila status tidak dikenal |
| `POST /api/kyc/:id/approve` | ADMIN | | 200 `{ "data": { "kyc": KycDto, "wallet": WalletDto } }` | 404, 409 `KYC_ALREADY_REVIEWED`, 503 `CUSTODIAL_WALLET_NOT_CONFIGURED` |
| `POST /api/kyc/:id/reject` | ADMIN | `{ "reason" }` 3 sampai 300 karakter | 200 `{ "data": { "kyc": KycDto, "wallet": null } }` | 404, 409 `KYC_ALREADY_REVIEWED` |

Contoh `GET /api/kyc/me` setelah disetujui:

```json
{
  "data": {
    "kyc": { "id": "01a18897-...", "fullName": "Dimas Pratama", "dummyIdNumber": "DUMMY-0042", "status": "APPROVED", "rejectionReason": null, "submittedAt": "2026-11-05T03:00:00.000Z", "reviewedAt": "2026-11-05T03:10:00.000Z" },
    "wallet": { "address": "0x7c4e...19b2", "whitelist": { "status": "PENDING", "txHash": null, "blockNumber": null } }
  }
}
```

Contoh satu baris `GET /api/kyc?status=APPROVED`:

```json
{
  "id": "01a18897-...",
  "fullName": "Dimas Pratama",
  "dummyIdNumber": "DUMMY-0042",
  "status": "APPROVED",
  "rejectionReason": null,
  "submittedAt": "2026-11-05T03:00:00.000Z",
  "reviewedAt": "2026-11-05T03:10:00.000Z",
  "user": { "id": "01a18897-...", "name": "Dimas Pratama", "email": "investor.dummy@kosbagi.test" },
  "checks": { "dummyPrefix": true, "nameMatchesAccount": true, "noOtherActive": true },
  "wallet": {
    "address": "0x7c4e...19b2",
    "whitelist": { "status": "RECORDED", "txHash": "0x3d9a...f0e4", "blockNumber": 7140552, "lastError": null }
  },
  "attempt": 1
}
```

Setiap baris `submissions` berisi KycDto ditambah:

| Field | Keterangan |
|---|---|
| `user` | `{ id, name, email }` akun investor |
| `checks` | Pemeriksaan otomatis, semuanya boolean: `dummyPrefix` (nomor berawalan `DUMMY-`), `nameMatchesAccount` (nama sama dengan nama akun, tanpa membedakan huruf besar kecil dan spasi di tepi), `noOtherActive` (tidak ada pengajuan lain yang masih `SUBMITTED` atau `APPROVED`, dari akun yang sama maupun dengan nomor identitas dummy yang sama) |
| `wallet` | WalletDto untuk pengajuan `APPROVED`, termasuk status whitelist on-chain dan `whitelist.lastError`. `null` untuk status lain |
| `attempt` | Urutan pengajuan investor itu: 1 untuk yang pertama, 2 untuk "Ajukan lagi", dan seterusnya |

`counts` selalu berisi jumlah ketiga status, apa pun filter `status`-nya, untuk angka di tab admin.

**Persetujuan** adalah satu transaksi DB: pengajuan menjadi `APPROVED`, dompet kustodian dibuat dengan indeks berikutnya bila investor belum punya, dan baris outbox `WHITELIST_KYC` `{ walletAddress, approved: true }` ditulis. Bila salah satunya gagal, ketiganya batal dan pengajuan tetap `SUBMITTED`. Tanpa `CUSTODIAL_WALLET_MNEMONIC` permintaan ditolak 503 sebelum apa pun berubah. Worker jalur 3 lalu memanggil `KosToken.setKycStatus(alamat, true)`; selama itu `wallet.whitelist.status` bernilai `PENDING`.

### Penawaran dan pembelian token

Semua endpoint hanya untuk peran `INVESTOR`. Pesanan investor lain dibalas 404.

#### GET /api/offerings/current

Penawaran berstatus `OPEN` yang terbaru. Bila tidak ada, penawaran terakhir apa pun statusnya (untuk state "Penawaran penuh"). 404 `NOT_FOUND` bila belum ada penawaran sama sekali.

```json
{
  "data": {
    "offering": {
      "id": "01a18897-...",
      "propertyCode": "SMR01",
      "tokenSymbol": "KB-SMR01",
      "pricePerTokenIdr": 100000,
      "tokensOffered": 12600,
      "tokensSold": 4360,
      "tokensReserved": 100,
      "tokensRemaining": 8140,
      "closesAt": "2026-12-31T16:59:00.000Z",
      "status": "OPEN"
    },
    "investor": {
      "kycStatus": "APPROVED",
      "walletReady": true,
      "walletAddress": "0x7c4e...19b2",
      "holdingTokens": 100,
      "reservedTokens": 0,
      "remainingQuota": 1700,
      "maxPerInvestor": 1800
    },
    "activePurchase": null
  }
}
```

| Field | Keterangan |
|---|---|
| `offering.tokensReserved` | Token yang disisihkan pesanan `PENDING_PAYMENT` yang belum lewat `reservedUntil`, dari semua investor |
| `offering.tokensRemaining` | `tokensOffered - tokensSold - tokensReserved` |
| `offering.status` | `OPEN`, `CLOSED` (habis terjual), atau `CANCELLED` |
| `investor.kycStatus` | Status pengajuan KYC terakhir, atau `NONE` bila belum pernah mengajukan |
| `investor.walletReady` | `true` bila dompet kustodian sudah tercatat lolos KYC di KosToken (`whitelist.status` `RECORDED`). Tombol Bayar aktif hanya bila `true` |
| `investor.holdingTokens` | Jumlah token dari pesanan `PAID` di properti ini |
| `investor.reservedTokens` | Token yang disisihkan pesanan investor ini yang masih menunggu bayar |
| `investor.remainingQuota` | `maxPerInvestor - holdingTokens - reservedTokens` |
| `activePurchase` | PurchaseDto pesanan investor ini yang masih menunggu bayar dan belum lewat `reservedUntil`, atau `null`. Hasil pesanan yang sudah selesai dibaca lewat `GET /api/purchases/:id` |

#### POST /api/offerings/:id/purchases

Body `{ "tokenAmount": 100 }`, bilangan bulat minimal 1. Semua pemeriksaan terjadi **sebelum** transaksi Midtrans dibuat, berurutan:

| Urutan | Status | `code` | Kapan |
|---|---|---|---|
| | 400 | `VALIDATION_ERROR` | `tokenAmount` bukan bilangan bulat positif |
| | 404 | `NOT_FOUND` | Penawaran tidak ada |
| 1 | 403 | `KYC_REQUIRED` | Belum ada pengajuan KYC yang disetujui |
| 2 | 409 | `WALLET_NOT_READY` | Dompet belum tercatat lolos KYC di KosToken |
| 3 | 409 | `OFFERING_CLOSED` | Penawaran tidak `OPEN` atau sudah lewat `closesAt` |
| 4 | 422 | `OFFERING_EXCEEDED` | Skenario 8: `tokenAmount` melebihi sisa penawaran. `details: { "tokensRemaining": 120 }` |
| 5 | 422 | `HOLDING_CAP_EXCEEDED` | Skenario 9: kepemilikan melewati batas. Memegang 1.500 dan memesan 500 menghasilkan `details: { "remainingQuota": 300 }` |
| 6 | 409 | `PURCHASE_PENDING` | Masih ada pesanan yang menunggu bayar. `details: { "purchaseId" }` |
| | 503 | `MIDTRANS_NOT_CONFIGURED` | Server key belum diisi. Tidak ada pesanan yang dibuat |
| | 502 | `MIDTRANS_UNAVAILABLE` | Snap gagal dibuat. Pesanan dan percobaan tercatat `FAILED`, sisihan lepas |
| | 429 | `RATE_LIMITED` | Lebih dari 30 permintaan per menit |

Pesan error menyebut angkanya, mis. "Jumlah token melebihi batas kepemilikan 1.800 token per investor. Sisa kuota kamu 300 token."

Contoh skenario 9:

```json
{
  "error": {
    "code": "HOLDING_CAP_EXCEEDED",
    "message": "Jumlah token melebihi batas kepemilikan 1.800 token per investor. Sisa kuota kamu 300 token.",
    "details": { "remainingQuota": 300 },
    "requestId": "8fe7d4fb-b653-4d22-add1-bdc7bcc0acfd"
  }
}
```

Bila lolos, dibalas 201 `{ "data": { "purchase": PurchaseDto } }`. Pesanan berstatus `PENDING_PAYMENT`, `reservedUntil` sama dengan batas bayar 5 menit, dan `purchase.payment.snapToken` dipakai untuk `snap.pay`. Pemeriksaan dan pembuatan pesanan berjalan di bawah satu kunci per properti, jadi dua investor yang berebut token terakhir tidak bisa sama-sama lolos.

- `order_id` percobaan pertama sama dengan `orderNumber`, mis. `BUY-SMR01-0003`, berurutan per properti. Percobaan ulang bersufiks `-2`, `-3`.
- Nominal = `tokenAmount` × harga token. Di Snap, barangnya `Token KB-SMR01` dengan `quantity` = jumlah token.
- Di atas Rp10.000.000 (100 token) Snap hanya menawarkan virtual account (`bca_va`, `bni_va`, `bri_va`, `permata_va`), karena batas QRIS Rp10 juta per transaksi. Sampai 100 token semua metode sewa ditawarkan.

#### PurchaseDto

```json
{
  "id": "01a18897-...",
  "orderNumber": "BUY-SMR01-0003",
  "tokenAmount": 100,
  "amountIdr": 10000000,
  "status": "PAID",
  "reservedUntil": "2026-11-09T07:30:00.000Z",
  "createdAt": "2026-11-09T07:25:00.000Z",
  "payment": { "...": "PaymentDto" },
  "transfer": { "status": "RECORDED", "txHash": "0x6a20...9d3e", "blockNumber": 7149031 }
}
```

| Field | Keterangan |
|---|---|
| `orderNumber` | Nomor pesanan, sama dengan `order_id` percobaan pertama. `null` hanya untuk baris yang dibuat langsung di basis data |
| `status` | `PENDING_PAYMENT`, `PAID`, `EXPIRED`, atau `FAILED`. `PENDING_PAYMENT` yang sudah lewat `reservedUntil` dibaca `EXPIRED` walau notifikasi belum tiba |
| `reservedUntil` | Batas bayar dan batas sisihan. Selalu terisi untuk pesanan dari API; `null` hanya untuk baris yang dibuat langsung di basis data |
| `payment` | Percobaan yang melunasi pesanan, atau percobaan terakhir |
| `transfer` | `null` selama belum `PAID`. Setelah lunas, status `KosToken.transferFromTreasury` ke dompet kustodian: `PENDING`, `RECORDED`, atau `FAILED` |

Pemetaan ke state Tiket beli: Menunggu pembayaran = `PENDING_PAYMENT`; Lunas, mengirim token = `PAID` dengan `transfer.status` `PENDING`; Lunas, tercatat = `transfer.status` `RECORDED`; Kedaluwarsa = `EXPIRED`; Gagal = `FAILED`; Penawaran penuh = `offering.status` `CLOSED`. Perlu KYC, Mendaftarkan dompet, Melebihi sisa, dan Melebihi batas dibaca dari `investor` dan kode error di atas.

#### Pesanan milik sendiri

| Endpoint | Balasan | Error |
|---|---|---|
| `GET /api/purchases` | `{ "data": { "purchases": [PurchaseDto] } }`, terbaru lebih dulu | |
| `GET /api/purchases/:id` | `{ "data": { "purchase": PurchaseDto } }` | 404 |
| `POST /api/purchases/:id/payments` | 201 (percobaan baru) atau 200 (percobaan aktif dipakai lagi) `{ "data": { "payment": PaymentDto, "purchase": PurchaseDto } }` | 404, 409 `PURCHASE_ALREADY_PAID`, 409 `OFFERING_CLOSED`, 422 `OFFERING_EXCEEDED`, 422 `HOLDING_CAP_EXCEEDED`, 409 `PURCHASE_PENDING`, 502, 503 |

`POST /api/purchases/:id/payments` mengikuti aturan tagihan: selama percobaan masih aktif, token Snap yang sama dikembalikan. Setelah kedaluwarsa atau gagal, sisihan lama sudah lepas, jadi bayar ulang memeriksa kuota lagi seperti pesanan baru, lalu menyisihkan token sampai batas bayar yang baru.

#### Sisihan token

- Selama menunggu bayar, token pesanan disisihkan untuk investor itu sampai `reservedUntil`, jadi sisa penawaran dan kuota investor sudah dikurangi pesanan aktif.
- Sisihan lepas saat Midtrans mengirim `expire`, `cancel`, `deny`, atau `failure` untuk percobaan terakhir, saat Snap gagal dibuat, atau saat `reservedUntil` lewat.
- Notifikasi `settlement` yang tiba setelah sisihan lepas tetap diterima bila tokennya masih tersedia. Bila sudah habis atau melewati batas 10%, pesanan tidak dipenuhi dan dicatat anomali `PURCHASE_UNFULFILLABLE` untuk pengembalian dana.
- Kepemilikan investor dihitung dari pesanan `PAID`. Batas 10% di `KosToken` tetap menjadi pengaman terakhir di blockchain.

### POST /api/owner-applications

Publik, 10 permintaan per menit per IP. Dipanggil form di halaman `/pemilik`.

| Field | Aturan |
|---|---|
| `ownerName` | Teks 2 sampai 120 karakter |
| `contact` | Email valid, atau nomor WhatsApp 9 sampai 15 digit. Awalan `+`, spasi, dan tanda hubung diabaikan |
| `propertyAddress` | Teks 5 sampai 300 karakter |
| `roomCount` | Bilangan bulat minimal 1 |
| `monthlyRentIdr` | Bilangan bulat minimal 1 |
| `occupancyPercent` | Angka 0 sampai 100, boleh pecahan |
| `consent` | Harus `true` |

**Respons 201:**

```json
{ "data": { "applicationNumber": "AJU-SMR-2026-0007", "status": "SUBMITTED", "submittedAt": "2026-11-05T03:00:00.000Z" } }
```

Nomor berurutan per tahun menurut WIB, mulai dari `0001`. Dua pengajuan bersamaan tidak pernah mendapat nomor yang sama.

**Error validasi** memakai status **422**, berbeda dari endpoint lain, dengan `details` per field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dikirim tidak valid.",
    "details": [
      { "path": "contact", "message": "Isi dengan email yang valid, atau nomor WhatsApp 9 sampai 15 digit." },
      { "path": "consent", "message": "Persetujuan wajib dicentang." }
    ],
    "requestId": "9c5c46a4-7a62-4ee5-a37f-513ad65675a1"
  }
}
```
