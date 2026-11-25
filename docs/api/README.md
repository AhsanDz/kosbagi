# Dokumentasi API KosBagi

API backend KosBagi (Express 5 + TypeScript). Dokumen ini memuat konvensi yang berlaku untuk semua endpoint dan daftar endpoint yang sudah tersedia. Endpoint baru ditambahkan ke sini setiap progress.

| Progress | Perubahan kontrak API |
|---|---|
| P1 | Konvensi umum (format JSON, format error, header) dan `GET /api/health` |
| P2 | Login akun dummy + JWT, peran, tagihan penghuni, pembayaran Midtrans Snap, webhook, properti dan kamar, KYC dummy, pengajuan pemilik kos, rate limit |
| P3 | Kuitansi sewa dan status `NOT_RECORDED`, alamat dan pengelola di kartu kamar, KYC dengan pemeriksaan otomatis dan dompet kustodian, penawaran dan pembelian token (`BUY-`), webhook pembelian, status on-chain whitelist dan transfer token |
| P4 | Biaya dan nota (unggahan multipart, hash SHA-256), status dan struk periode, tutup periode, distribusi bagi hasil, portofolio investor, status kamar pengelola, ringkasan dan antrean job admin dengan Coba lagi dan Tandai ditangani, rekonsiliasi (modul jalur 1), pembayaran sewa setelah periode ditutup (`periodClosed`, `refund`), status gagal tidak pernah terlihat investor maupun penghuni |
| P5 | Tidak ada endpoint atau bentuk respons baru. IP klien untuk rate limit per IP kini mengikuti `TRUST_PROXY` (bagian 5, Rate limit), dan alamat deploy online opsional di Railway (bagian 1) |

## 1. Alamat dasar

| Lingkungan | Alamat dasar |
|---|---|
| Lokal (`npm run dev` di `backend/`) | `http://localhost:4000/api` |
| Deploy online (opsional, belum di-deploy) | `https://<api>.up.railway.app/api`, lihat [`docs/deploy/online.md`](../deploy/online.md) |

- Semua endpoint berada di bawah awalan `/api`.
- Nama sumber daya berbahasa Inggris, huruf kecil, bentuk jamak, dipisah tanda hubung: `/api/bills`, `/api/owner-applications`.
- Setiap modul di `backend/src/modules/<nama>/routes.ts` otomatis dipasang di `/api/<nama>`. Contoh: modul `health` menjadi `/api/health`.

## 2. Format permintaan dan respons

- Permintaan dan respons memakai JSON (UTF-8). Permintaan yang membawa body wajib memakai header `Content-Type: application/json`.
- Ukuran body maksimal **100 KB**. Body yang lebih besar ditolak dengan `413 PAYLOAD_TOO_LARGE`.
- Satu-satunya pengecualian: `POST /api/expenses` (P4) memakai `multipart/form-data` dengan file nota maksimal 5 MB.
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
| 409 | `PERIOD_CLOSED` | P4: membayar tagihan atau mencatat biaya untuk periode yang sudah ditutup. `details: { period }` |
| 409 | `RECEIPT_ALREADY_RECORDED` | P4: nota dengan hash yang sama sudah tercatat. `details` berisi data biaya pertama |
| 409 | `PERIOD_NOT_READY` | P4: tutup periode saat syarat belum terpenuhi. `details: { requirements }` |
| 409 | `PERIOD_ALREADY_CLOSED` | P4: periode sudah ditutup atau sedang ditutup |
| 409 | `PERIOD_EMPTY` | P4: tutup periode tanpa sewa maupun biaya yang tercatat on-chain |
| 409 | `PERIOD_NOT_CLOSED` | P4: distribusi sebelum `closePeriod` tercatat |
| 409 | `ALREADY_DISTRIBUTED` | P4: distribusi periode itu sudah dijalankan |
| 409 | `HOLDERS_MISMATCH` | P4: jumlah saldo pemegang tidak sama dengan total suplai di blok snapshot. `details: { totalBalance, totalSupply }` |
| 409 | `JOB_NOT_FAILED` | P4: Coba lagi atau Tandai ditangani untuk job yang tidak berstatus gagal |
| 409 | `JOB_RESOLVED` | P4: Coba lagi untuk job yang sudah ditandai ditangani |
| 409 | `JOB_ALREADY_RESOLVED` | P4: Tandai ditangani untuk job yang sudah ditandai |
| 413 | `PAYLOAD_TOO_LARGE` | Body melebihi 100 KB |
| 413 | `FILE_TOO_LARGE` | P4: file nota lebih dari 5 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | P4: isi file nota bukan PDF, JPG, atau PNG |
| 422 | `OFFERING_EXCEEDED` | Skenario 8: jumlah token melebihi sisa penawaran. `details: { tokensRemaining }` |
| 422 | `HOLDING_CAP_EXCEEDED` | Skenario 9: kepemilikan melewati batas 10% per investor. `details: { remainingQuota }` |
| 429 | `RATE_LIMITED` | Terlalu banyak permintaan dari IP yang sama |
| 4xx | `BAD_REQUEST` | Permintaan tidak dapat diproses karena alasan lain di sisi klien |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga di server |
| 502 | `MIDTRANS_UNAVAILABLE` | Membuat pembayaran: Midtrans gagal dihubungi atau membalas error |
| 502 | `CHAIN_UNAVAILABLE` | P4: distribusi tidak bisa membaca kontrak (RPC mati, variabel blockchain belum diisi, atau kontrak milik properti lain) |
| 503 | `MIDTRANS_UNAVAILABLE` | Webhook: status transaksi belum bisa dicek. Midtrans diminta mengirim ulang |
| 503 | `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` belum diisi di server |
| 503 | `CUSTODIAL_WALLET_NOT_CONFIGURED` | Menyetujui KYC saat `CUSTODIAL_WALLET_MNEMONIC` belum diisi |
| 503 | `CHAIN_NOT_CONFIGURED` | P4, rekonsiliasi: `SEPOLIA_RPC_URL`, `KOS_TOKEN_ADDRESS`, atau `KOS_LEDGER_ADDRESS` belum diisi |

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

Untuk batas per IP, IP klien dibaca dari header `X-Forwarded-For` hanya sejauh proxy yang dipercaya variabel `TRUST_PROXY`. Bawaannya (variabel kosong) hanya proxy di mesin yang sama, yaitu ngrok dan server Next.js lokal; `X-Forwarded-For` yang dikirim perangkat lain langsung ke backend diabaikan. Pemanggil dari laptop itu sendiri tetap dianggap proxy lokal. Di Railway nilainya `1`. Halaman frontend memanggil backend lewat route handler Next.js, jadi saat frontend online di Vercel, login dihitung per alamat server Vercel (lihat [`docs/deploy/online.md`](../deploy/online.md) bagian 11). Pengecualiannya form `/pemilik`, yang memanggil `POST /api/owner-applications` langsung dari peramban (karena itu origin frontend harus ada di `CORS_ORIGIN`), sehingga dihitung per IP peramban. Batas per pengguna dihitung dari id akun di JWT dan tidak bergantung pada IP.

| Endpoint | Batas per menit | Dihitung per |
|---|---|---|
| `POST /api/auth/login` | 10 | IP |
| `POST /api/owner-applications` | 10 | IP |
| `POST /api/webhooks/midtrans` | 120 | IP |
| `POST /api/bills/:id/payments` | 30 | Pengguna |
| `POST /api/offerings/:id/purchases` | 30 | Pengguna |
| `POST /api/purchases/:id/payments` | 30 | Pengguna |
| `POST /api/expenses` | 20 | Pengguna |
| `POST /api/periods/:period/close`, `POST /api/periods/:period/distribute` | 10 | Pengguna |
| `POST /api/admin/jobs/:id/retry`, `POST /api/admin/jobs/:id/resolve` | 30, dihitung bersama | Pengguna |

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
| GET | `/api/expenses` | MANAGER, ADMIN | Biaya satu periode, total, dan kategori (P4) |
| POST | `/api/expenses` | MANAGER | Mencatat biaya dengan unggahan nota (P4) |
| GET | `/api/expenses/:id/receipt` | MANAGER, ADMIN | File nota (P4) |
| GET | `/api/periods/:period` | ADMIN | Status, struk, syarat penutupan, dan distribusi (P4) |
| POST | `/api/periods/:period/close` | ADMIN | Tutup periode, menulis job `CLOSE_PERIOD` (P4) |
| POST | `/api/periods/:period/distribute` | ADMIN | Distribusi bagi hasil, sekali per periode (P4) |
| GET | `/api/portfolio/summary` | INVESTOR | Saldo bagi hasil, kepemilikan, dan sewa masuk periode berjalan (P4) |
| GET | `/api/portfolio` | INVESTOR | Kepemilikan, dompet, bagi hasil per periode, dan riwayat transaksi (P4) |
| GET | `/api/manager/rooms` | MANAGER, ADMIN | Status kamar dan sewa masuk satu periode (P4) |
| GET | `/api/admin/summary` | ADMIN | Periode berjalan dan hal yang perlu perhatian (P4) |
| GET | `/api/admin/jobs` | ADMIN | Antrean job on-chain (P4) |
| POST | `/api/admin/jobs/:id/retry` | ADMIN | Coba lagi job yang gagal (P4) |
| POST | `/api/admin/jobs/:id/resolve` | ADMIN | Tandai job gagal sudah ditangani, dengan catatan (P4) |
| GET | `/api/reconciliation` | ADMIN | Rekonsiliasi Midtrans, basis data, dan Sepolia satu periode (P4, jalur 1) |
| GET | `/api/reconciliation/summary` | ADMIN | Ringkasan rekonsiliasi (P4, jalur 1) |

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
  "chain": { "status": "PENDING", "txHash": null, "blockNumber": null },
  "periodClosed": false,
  "refund": null
}
```

| Field | Keterangan |
|---|---|
| `status` | `UNPAID` atau `PAID` |
| `paymentState` | Lihat tabel di bawah. Menjadi dasar lencana di layar |
| `payment` | Percobaan yang melunasi tagihan, atau percobaan terakhir bila belum lunas. `null` bila belum ada percobaan, termasuk tagihan lunas dari data seed |
| `chain` | `null` selama belum `PAID`. Lihat tabel `chain.status` di bawah |
| `periodClosed` | P4: `true` sejak admin menutup periode tagihan ini. Tagihan yang belum lunas tidak bisa dibayar lagi (`POST /api/bills/:id/payments` 409 `PERIOD_CLOSED`), jadi tombol Bayar dinonaktifkan |
| `refund` | P4: `{ "status": "PENDING", "amountIdr", "paidAt", "orderId" }` bila ada pembayaran yang lunas setelah periode ditutup (dana akan dikembalikan). `null` selain itu |

| `chain.status` | Arti | Tautan Etherscan |
|---|---|---|
| `PENDING` | Lunas, menunggu worker mengirim atau mengonfirmasi `recordRent` | Belum ada; `txHash` terisi begitu transaksi terkirim |
| `RECORDED` | Tercatat di blok `blockNumber` | Ada, dari `txHash` |
| `FAILED` | Tidak pernah dikirim ke penghuni sejak P4: pencatatan yang gagal terbaca `PENDING` ("Menunggu pencatatan"), karena pengulangannya urusan admin di antrean job | |
| `NOT_RECORDED` | Lunas tanpa pembayaran Midtrans, yaitu data lampau seed (Agu sampai Okt 2026). Tidak pernah dicatat | Tidak ada |

| `paymentState` | Arti |
|---|---|
| `NONE` | Belum ada percobaan |
| `PENDING` | Percobaan terakhir belum lewat `expiresAt` |
| `EXPIRED` | Midtrans mengirim `expire`, atau `expiresAt` sudah lewat |
| `FAILED` | Midtrans mengirim `cancel`, `deny`, atau `failure`, atau transaksi gagal dibuat di Midtrans |
| `PAID` | Tagihan lunas |
| `PAID_AFTER_CLOSE` | P4: uang diterima setelah periode tagihan ditutup. Tagihan tetap `UNPAID` dan tidak bisa dibayar lagi; dana akan dikembalikan (lihat `refund`). `payment.status` percobaan itu `PAID` |

#### PaymentDto

| Field | Keterangan |
|---|---|
| `orderId` | `RENT-SMR01-K03-2026-11`, lalu `-2`, `-3` untuk percobaan ulang |
| `status` | `PENDING`, `PAID`, `EXPIRED`, atau `FAILED`. Percobaan yang menerima uang tanpa melunasi apa pun (`DUPLICATE_PAID`, `UNFULFILLED`, dan `PAID_AFTER_CLOSE` P4) tetap terbaca `PAID`; status tagihan atau pesanan yang menentukan lunas tidaknya |
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
| 409 | `PERIOD_CLOSED` | P4: periode tagihan sudah ditutup admin. Tidak ada percobaan yang dibuat |
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
6. Sewa: dalam satu transaksi DB, tagihan dan pembayaran lunas, lalu baris outbox `RECORD_RENT` ditulis. Sejak P4 transaksi ini memegang kunci periode yang sama dengan Tutup periode. Bila periodenya sudah ditutup (keputusan 16 Nov 2026), uang yang masuk tidak melunasi tagihan: percobaan menjadi `PAID_AFTER_CLOSE`, anomali `PAID_AFTER_PERIOD_CLOSED` dicatat untuk pengembalian dana, tanpa outbox, dan tagihan tetap `UNPAID`.
7. Token: dalam satu transaksi DB, pesanan dan pembayaran lunas, `tokensSold` bertambah, penawaran menjadi `CLOSED` bila habis, lalu baris outbox `TRANSFER_TOKENS` `{ propertyCode, walletAddress, tokenAmount, paymentRef }` ditulis.

**Balasan sukses** `{ "data": { "orderId": "RENT-SMR01-K03-2026-11", "outcome": "SETTLED" } }`:

| `outcome` | Arti | Perubahan data |
|---|---|---|
| `SETTLED` | Pembayaran sah | Tagihan atau pesanan lunas, satu baris outbox |
| `ALREADY_PAID` | Notifikasi ganda untuk order yang sudah terbayar | Tidak ada |
| `DUPLICATE_BILL_PAYMENT` | Tagihan sudah lunas lewat order lain | Percobaan ini `DUPLICATE_PAID`, anomali tercatat, tanpa outbox |
| `DUPLICATE_PURCHASE_PAYMENT` | Pesanan token sudah lunas lewat order lain | Percobaan ini `DUPLICATE_PAID`, anomali tercatat, tanpa outbox |
| `PURCHASE_UNFULFILLABLE` | Pesanan terbayar setelah sisihannya lepas, dan tokennya sudah dipesan orang lain atau melewati batas 10% | Percobaan `UNFULFILLED`, pesanan `EXPIRED`, anomali tercatat untuk pengembalian dana, tanpa outbox |
| `PAID_AFTER_PERIOD_CLOSED` | P4: sewa terbayar setelah periodenya ditutup (pembayaran dimulai sebelum penutupan) | Percobaan `PAID_AFTER_CLOSE`, anomali tercatat untuk pengembalian dana, tanpa outbox. Tagihan tetap `UNPAID` |
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
| `PAID_AFTER_PERIOD_CLOSED` | P4: sewa terbayar setelah periodenya ditutup. Tidak dicatat on-chain; dana perlu dikembalikan |

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

`whitelist.status` berisi `PENDING` (menunggu worker), `RECORDED` (tercatat), atau `FAILED` (percobaan otomatis habis). Sejak P4, `GET /api/kyc/me` (investor) membaca `FAILED` sebagai `PENDING`: investor tidak pernah melihat status gagal. Khusus `GET /api/kyc` (admin), `whitelist` juga membawa `lastError`: pesan galat percobaan terakhir dari worker (`chain_transactions.last_error`), atau `null`. Investor tidak pernah menerima field ini.

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
| `transfer` | `null` selama belum `PAID`. Setelah lunas, status `KosToken.transferFromTreasury` ke dompet kustodian: `PENDING` atau `RECORDED`. Sejak P4, pencatatan yang gagal tetap terbaca `PENDING` untuk investor; admin mengulangnya dari antrean job |

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

### Status pencatatan on-chain per peran (P4)

Satu job blockchain bisa punya beberapa baris `chain_transactions`; yang dibaca selalu baris dengan `createdAt` terbaru. Setelah admin menekan Coba lagi, job dibaca "menunggu" sampai worker menulis hasil baru. Baris `RECORDED` boleh tanpa `txHash` (efek on-chain sudah ada dari transaksi lain): tampilkan Tercatat tanpa tautan Etherscan.

| Peran | Nilai yang mungkin | Keterangan |
|---|---|---|
| ADMIN (antrean job, penutupan periode) | `QUEUED`, `PENDING`, `RECORDED`, `FAILED` | `QUEUED`: belum dikerjakan worker, termasuk setelah Coba lagi. `lastError` ikut dikirim |
| MANAGER dan ADMIN (biaya, status kamar) | `PENDING`, `RECORDED`, `FAILED` | `QUEUED` dibaca `PENDING` |
| INVESTOR (`/kyc/me`, pesanan, portofolio) | `PENDING`, `RECORDED` | `FAILED` dibaca `PENDING`. Investor tidak pernah melihat kata gagal |
| TENANT (tagihan, kuitansi) | `PENDING`, `RECORDED`, `NOT_RECORDED` | `FAILED` dibaca `PENDING`. Penghuni tidak pernah melihat kata gagal |

### Biaya dan nota (P4)

Pengelola (`MANAGER`) mencatat dan membaca biaya properti yang dikelolanya. Admin (`ADMIN`) hanya membaca, bawaannya properti pertama atau `?property=SMR01`. Pengelola tanpa properti dibalas 404.

Kategori (kode `uint8`, sama dengan argumen `category` di `KosLedger.recordExpense`):

| `code` | `label` |
|---|---|
| 1 | Listrik dan air |
| 2 | Kebersihan |
| 3 | Internet |
| 4 | Perbaikan |
| 5 | Keamanan |

#### GET /api/expenses?period=YYYY-MM

`period` opsional; bawaannya periode tagihan terbaru properti.

```json
{
  "data": {
    "period": "2026-11",
    "closed": false,
    "totals": { "recordedIdr": 2400000, "pendingIdr": 300000, "totalIdr": 2700000, "count": 5 },
    "categories": [{ "code": 1, "label": "Listrik dan air" }, { "code": 2, "label": "Kebersihan" }],
    "expenses": [ExpenseDto]
  }
}
```

`closed` bernilai `true` sejak admin menekan Tutup periode; biaya periode itu hanya bisa dibaca. `expenses` urut tanggal nota terbaru lebih dulu. `pendingIdr` adalah biaya yang belum tercatat on-chain (menunggu atau gagal).

#### ExpenseDto

```json
{
  "id": "01a18897-...",
  "period": "2026-11",
  "category": { "code": 4, "label": "Perbaikan" },
  "description": "Ganti keran kamar mandi K07",
  "amountIdr": 300000,
  "receiptDate": "2026-11-12",
  "receiptHash": "0xd39212c6ffb82f6fc934fc72b48031b4c37832a88bda1230da3b6b0621286530",
  "fileName": "perbaikan-k07.pdf",
  "createdAt": "2026-11-12T09:40:00.000Z",
  "createdBy": { "name": "Hadi Santoso" },
  "chain": { "status": "PENDING", "txHash": null, "blockNumber": null, "lastError": null }
}
```

`receiptHash` = SHA-256 isi file nota, `0x` + 64 heksadesimal huruf kecil. Hanya hash ini yang dicatat on-chain; file nota tetap di server (`UPLOAD_DIR`).

#### POST /api/expenses

Hanya `MANAGER`. Body `multipart/form-data` (bukan JSON):

| Field | Aturan |
|---|---|
| `period` | `YYYY-MM` |
| `categoryCode` | 1 sampai 5 |
| `description` | Teks 3 sampai 120 karakter |
| `amountIdr` | Rupiah bulat, 1 sampai 100.000.000. Pesan galat: "Nominal harus angka.", "Nominal harus rupiah bulat, tanpa koma.", "Nominal minimal Rp1.", "Nominal maksimal Rp100.000.000 per nota." |
| `receiptDate` | Tanggal nota `YYYY-MM-DD`, di bulan `period` atau satu bulan sebelum atau sesudahnya. Untuk periode 2026-11: 2026-10-01 sampai 2026-12-31 |
| `file` | Satu file PDF, JPG, atau PNG, maksimal 5 MB. Jenisnya dibaca dari isi file (magic bytes), bukan dari nama atau `Content-Type` |

Aturan periode: `period` harus periode yang sudah punya tagihan untuk properti itu dan belum ditutup. Periode tanpa tagihan (mis. salah ketik 2027-01) ditolak 400 `VALIDATION_ERROR` di field `period`, dan tanggal nota yang lebih dari satu bulan dari periode ditolak 400 di field `receiptDate`.

Hash dihitung server dari isi file. Dalam satu transaksi DB berkunci periode: periode diperiksa belum ditutup dan sudah punya tagihan, hash diperiksa belum pernah dicatat, file disimpan, lalu baris biaya dan baris outbox `RECORD_EXPENSE` `{ propertyCode, period, category, amountIdr, receiptHash }` ditulis bersama. Worker jalur 3 memanggil `KosLedger.recordExpense(period, category, amount, receiptHash)`.

Balasan 201 `{ "data": { "expense": ExpenseDto } }`.

| Status | `code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field tidak valid, file tidak dilampirkan, periode belum punya tagihan, atau tanggal nota terlalu jauh dari periode. `details` per field |
| 404 | `NOT_FOUND` | Akun pengelola belum mengelola properti |
| 409 | `RECEIPT_ALREADY_RECORDED` | Nota dengan hash yang sama sudah tercatat. `details: { expenseId, categoryLabel, description, receiptDate, amountIdr, createdAt }` biaya pertama |
| 409 | `PERIOD_CLOSED` | Periode sudah ditutup. `details: { period }` |
| 413 | `FILE_TOO_LARGE` | File lebih dari 5 MB |
| 415 | `UNSUPPORTED_FILE_TYPE` | Isi file bukan PDF, JPG, atau PNG |
| 429 | `RATE_LIMITED` | Lebih dari 20 permintaan per menit dari pengguna yang sama |

Contoh nota ganda:

```json
{
  "error": {
    "code": "RECEIPT_ALREADY_RECORDED",
    "message": "Nota ini sudah tercatat untuk biaya Listrik dan air tanggal 5 November 2026. Pilih file nota lain.",
    "details": {
      "expenseId": "01a18897-...",
      "categoryLabel": "Listrik dan air",
      "description": "Token listrik dan tagihan PDAM",
      "receiptDate": "2026-11-05",
      "amountIdr": 1150000,
      "createdAt": "2026-11-05T10:12:00.000Z"
    },
    "requestId": "..."
  }
}
```

#### GET /api/expenses/:id/receipt

`MANAGER` (properti sendiri) dan `ADMIN`. Membalas file nota apa adanya dengan `Content-Type` sesuai isinya dan `Content-Disposition: inline; filename="<nama file>"`. Biaya properti lain, id yang tidak ada, dan id bukan UUID dibalas 404.

### Periode: struk, tutup periode, dan distribusi (P4)

Semua endpoint hanya `ADMIN`. Properti bawaan properti pertama; `?property=SMR01` memilih properti lain. Parameter `:period` wajib `YYYY-MM` (400 `VALIDATION_ERROR` bila tidak).

#### GET /api/periods/:period

```json
{
  "data": {
    "period": "2026-11",
    "status": "CLOSED",
    "receipt": {
      "provisional": false,
      "grossRentIdr": 13500000,
      "roomsRecorded": 9,
      "roomsTotal": 9,
      "expensesIdr": 2700000,
      "expensesRecorded": 5,
      "platformFeeIdr": 675000,
      "taxableProfitIdr": 10125000,
      "taxIdr": 2227500,
      "netRentIdr": 7897500,
      "totalSupply": 18000,
      "valuePerTokenSen": 43875
    },
    "requirements": [
      { "key": "RENT_UNRECORDED", "ok": true, "count": 0 },
      { "key": "EXPENSE_UNRECORDED", "ok": true, "count": 0 },
      { "key": "TRANSFER_UNRECORDED", "ok": true, "count": 0 },
      { "key": "JOB_FAILED", "ok": true, "count": 0 }
    ],
    "unpaidBills": 0,
    "close": {
      "job": { "id": "01a18897-...", "status": "RECORDED", "attempts": 1, "lastError": null },
      "txHash": "0x5e21...7c0a",
      "blockNumber": 7312885,
      "snapshotBlock": 7312884,
      "closedAt": "2026-12-01T02:00:12.000Z"
    },
    "preview": { "...": "DistributionDto tanpa distributedAt dan distributedBy" },
    "distribution": null
  }
}
```

| `status` | Arti |
|---|---|
| `OPEN` | Belum ditutup |
| `CLOSING` | Admin sudah menekan Tutup periode; `closePeriod` menunggu atau sedang dikirim worker |
| `CLOSE_FAILED` | Job `CLOSE_PERIOD` gagal. Admin menekan Coba lagi lewat `POST /api/admin/jobs/:id/retry` dengan `close.job.id` |
| `CLOSED` | `closePeriod` tercatat |
| `DISTRIBUTED` | Distribusi sudah dijalankan |

`receipt`:

- Sebelum `closePeriod` tercatat (`provisional: true`): angka dari sewa dan biaya yang **sudah tercatat on-chain** saja, dihitung dengan kalkulator jalur 1 (`calculatePeriod`) yang rumusnya sama dengan `KosLedger.closePeriod`, dan `totalSupply` = total token properti. Contoh: Rp12.000.000 dan Rp2.400.000 menghasilkan `valuePerTokenSen` 39000 (Rp390). Belum ada yang tercatat: semua angka 0.
- Setelah tercatat (`provisional: false`): angka dari `KosLedger.periods(202611)`, disalin sekali ke basis data (periode tertutup tidak bisa berubah). `taxableProfitIdr` = `netRentIdr` + `taxIdr`. Bila kontrak belum bisa dibaca, struk sementara dipakai dan status tetap `CLOSED`.
- `roomsRecorded` dan `expensesRecorded` dari basis data; `roomsTotal` adalah jumlah tagihan periode itu (kamar terisi). `valuePerTokenSen` 43875 berarti Rp438,75.

`requirements` (Tutup periode hanya boleh bila semuanya `ok`):

| `key` | `count` |
|---|---|
| `RENT_UNRECORDED` | Tagihan lunas lewat Midtrans yang `recordRent`-nya belum tercatat. Tagihan lampau seed tanpa pembayaran Midtrans tidak dihitung |
| `EXPENSE_UNRECORDED` | Biaya periode itu yang `recordExpense`-nya belum tercatat |
| `TRANSFER_UNRECORDED` | Pesanan token lunas yang tokennya belum pindah (`transferFromTreasury`), supaya saldo di blok snapshot benar |
| `JOB_FAILED` | Job gagal yang belum ditangani dan memengaruhi periode itu: `RECORD_RENT` dan `RECORD_EXPENSE` periode itu, `CLOSE_PERIOD` periode itu, dan semua `TRANSFER_TOKENS` (saldo snapshot). `WHITELIST_KYC` dan job periode lain tidak menghalangi |

Job gagal yang sudah ditandai "sudah ditangani" (`POST /api/admin/jobs/:id/resolve`) tidak dihitung di syarat mana pun, termasuk `RENT_UNRECORDED`, `EXPENSE_UNRECORDED`, dan `TRANSFER_UNRECORDED`. Dengan begitu job yang gagal permanen (mis. kamar sudah tercatat lewat referensi lain) tidak mengunci penutupan selamanya; admin bertanggung jawab atas catatannya.

`unpaidBills` hanya informasi; tagihan yang belum dibayar tidak menghalangi penutupan, tetapi setelah ditutup tidak bisa dibayar lagi.

`close` bernilai `null` selama belum ditutup. `snapshotBlock` (= blok `closePeriod` − 1) terisi setelah angka periode dibaca dari kontrak. `closedAt` adalah waktu transaksi `closePeriod` tercatat menurut worker (`null` selama belum tercatat); tambahan di luar kontrak P4 untuk baris "Ditutup".

`preview` (tambahan di luar kontrak P4, permintaan jalur 4) hanya terisi saat `status` `CLOSED`: bentuknya sama dengan DistributionDto tanpa `distributedAt` dan `distributedBy`, dihitung dengan cara yang sama seperti distribusi (saldo `getPastVotes` di blok snapshot dan `distribute()`), tetapi tidak menulis apa pun ke basis data. Bernilai `null` di status lain, atau bila saldo pemegang belum bisa dibaca dari kontrak atau jumlahnya tidak sama dengan total suplai.

#### DistributionDto

`distribution` bernilai `null` sampai distribusi dijalankan.

```json
{
  "distributedAt": "2026-12-01T02:05:00.000Z",
  "distributedBy": { "name": "Laras Kusuma" },
  "netRentIdr": 7897500,
  "valuePerTokenSen": 43875,
  "snapshotBlock": 7312884,
  "holders": [
    { "holderType": "ORIGINAL_OWNER", "label": "Pemilik lama", "walletAddress": "0x2c90...a417", "tokenBalance": 5400, "shareIdr": 2369250 },
    { "holderType": "INVESTOR", "label": "Bagas Wicaksono", "walletAddress": "0x51af...c03d", "tokenBalance": 1800, "shareIdr": 789750 },
    { "holderType": "INVESTOR", "label": "Citra Lestari", "walletAddress": "0xa2d9...7741", "tokenBalance": 1200, "shareIdr": 526500 },
    { "holderType": "INVESTOR", "label": "Eko Saputra", "walletAddress": "0x3f08...de52", "tokenBalance": 800, "shareIdr": 351000 },
    { "holderType": "INVESTOR", "label": "Fajar Nugroho", "walletAddress": "0xe6b3...1a8f", "tokenBalance": 560, "shareIdr": 245700 },
    { "holderType": "INVESTOR", "label": "Dimas Pratama", "walletAddress": "0x7c4e...19b2", "tokenBalance": 100, "shareIdr": 43875 }
  ],
  "treasury": { "walletAddress": "0x...", "tokenBalance": 8140, "shareIdr": 3571425, "creditedTo": "ORIGINAL_OWNER" },
  "roundingRemainderIdr": 0
}
```

- `holders`: pemilik lama lebih dulu, lalu investor urut saldo terbesar. Investor yang saldonya 0 di blok snapshot tidak tercantum. `label` nama investor hanya untuk admin; tidak pernah dicatat on-chain.
- `treasury`: bagian token yang belum terjual, dikreditkan ke pemilik lama (keputusan 16 Nov 2026) sebagai baris tersendiri "Bagian perbendaharaan (8.140 token belum terjual)".
- Setiap `shareIdr` = floor(sewa bersih × saldo ÷ total suplai), sama dengan `KosLedger.shareOf(periode, saldo)`. `roundingRemainderIdr` = sewa bersih − jumlah semua bagian, masuk cadangan periode itu.
- `netRentIdr`, `valuePerTokenSen`, dan `snapshotBlock` adalah tambahan di luar kontrak P4, untuk tampilan.

#### POST /api/periods/:period/close

Tanpa body. Dalam satu transaksi DB berkunci periode (kunci yang sama dengan pelunasan sewa dan pencatatan biaya): syarat diperiksa ulang, lalu baris `period_closings` dan baris outbox `CLOSE_PERIOD` `{ propertyCode, period }` ditulis bersama. Worker jalur 3 memanggil `KosLedger.closePeriod(202611)`.

Balasan 202 dengan isi sama seperti `GET /api/periods/:period` (`status` `CLOSING`).

| Status | `code` | Kapan |
|---|---|---|
| 409 | `PERIOD_NOT_READY` | Ada syarat yang belum terpenuhi. `details: { requirements }` |
| 409 | `PERIOD_ALREADY_CLOSED` | Periode sudah ditutup atau sedang ditutup |
| 409 | `PERIOD_EMPTY` | Belum ada sewa maupun biaya yang tercatat on-chain. Tambahan di luar kontrak P4: kontrak pasti menolak periode kosong (`EmptyPeriod`) secara permanen |
| 429 | `RATE_LIMITED` | Lebih dari 10 permintaan per menit |

Sejak penutupan diminta, tagihan periode itu tidak bisa dibayar (409 `PERIOD_CLOSED`) dan biaya baru ditolak.

#### POST /api/periods/:period/distribute

Tanpa body. Hanya setelah `closePeriod` tercatat. Server membaca `KosLedger.periods(period)` dan `KosToken.getPastVotes(alamat, snapshotBlock)` untuk dompet pemilik lama, dompet perbendaharaan, dan semua dompet kustodian, lalu membagi sewa bersih dengan `distribute()` jalur 1 (jumlah saldo wajib sama dengan total suplai). Hasilnya disimpan dalam satu transaksi DB; constraint unik per properti dan periode mencegah distribusi kedua, termasuk dua klik bersamaan. Bagian investor menambah saldo bagi hasilnya (`GET /api/portfolio/summary`).

Balasan 200 `{ "data": { "distribution": DistributionDto } }`.

| Status | `code` | Kapan |
|---|---|---|
| 409 | `PERIOD_NOT_CLOSED` | `closePeriod` belum tercatat, atau kontrak belum menutup periode |
| 409 | `ALREADY_DISTRIBUTED` | Distribusi sudah dijalankan |
| 409 | `HOLDERS_MISMATCH` | Jumlah saldo pemegang yang dikenal backend tidak sama dengan total suplai. `details: { totalBalance, totalSupply }`. Tambahan di luar kontrak P4 |
| 502 | `CHAIN_UNAVAILABLE` | Kontrak tidak bisa dibaca: RPC mati, variabel `SEPOLIA_RPC_URL`/`KOS_TOKEN_ADDRESS`/`KOS_LEDGER_ADDRESS` belum diisi, atau `KOS_TOKEN_ADDRESS` milik properti lain |
| 429 | `RATE_LIMITED` | Lebih dari 10 permintaan per menit |

### Portofolio investor (P4)

Hanya `INVESTOR`, data milik sendiri. Tanpa nama penghuni; status pencatatan hanya `PENDING` atau `RECORDED`.

#### GET /api/portfolio/summary

```json
{
  "data": {
    "balanceIdr": 43875,
    "lastDistribution": { "period": "2026-11", "amountIdr": 43875, "distributedAt": "2026-12-01T02:05:00.000Z" },
    "holding": { "tokenSymbol": "KB-SMR01", "tokenBalance": 100, "percentOfSupply": 0.56, "walletAddress": "0x7c4E...19B2" },
    "currentPeriod": {
      "period": "2026-11",
      "status": "DISTRIBUTED",
      "recordedRentIdr": 13500000,
      "roomsRecorded": 9,
      "roomsTotal": 9,
      "chart": [{ "date": "2026-11-03", "amountIdr": 1500000 }, { "date": "2026-11-05", "amountIdr": 1500000 }],
      "rentFeed": [
        { "roomNumber": "K01", "amountIdr": 1500000, "recordedAt": "2026-11-03T03:00:00.000Z", "dueDate": null, "paymentRef": "0x1a7c...e204", "txHash": "0x...", "status": "RECORDED" },
        { "roomNumber": "K04", "amountIdr": 1500000, "recordedAt": null, "dueDate": "2026-11-10", "paymentRef": null, "txHash": null, "status": "UNPAID" },
        { "roomNumber": "K06", "amountIdr": null, "recordedAt": null, "dueDate": null, "paymentRef": null, "txHash": null, "status": "VACANT" }
      ]
    },
    "withdraw": { "enabled": false, "reason": "Penarikan dibuka setelah disbursement sandbox tersedia." }
  }
}
```

| Field | Keterangan |
|---|---|
| `balanceIdr` | Jumlah semua bagian bagi hasil investor. Penarikan belum tersedia, jadi belum ada pengurang |
| `lastDistribution` | Distribusi terakhir, atau `null` |
| `holding` | Token dari pesanan `PAID`. `percentOfSupply` persen dua desimal (0.56 = 0,56%). `null` bila belum punya token |
| `currentPeriod` | Periode tagihan terbaru properti, atau `null` bila belum ada tagihan. `status` sama dengan status periode admin |
| `chart` | Sewa yang sudah tercatat on-chain, dijumlah per tanggal bayar (WIB), urut tanggal. Frontend membentuk grafik kumulatif |
| `rentFeed` | Satu baris per kamar, urut nomor. `status`: `RECORDED` (tercatat, ada `txHash`), `PENDING` (lunas, menunggu pencatatan; termasuk yang gagal dicatat), `UNPAID` (dengan `dueDate`), `VACANT` (kamar tanpa tagihan). `recordedAt` adalah waktu sewa itu lunas, terisi untuk `RECORDED` dan `PENDING`. `dueDate` tambahan di luar kontrak P4 |
| `withdraw` | Selalu `enabled: false` dengan alasannya |

#### GET /api/portfolio

```json
{
  "data": {
    "holding": { "tokenSymbol": "KB-SMR01", "tokenBalance": 100, "percentOfSupply": 0.56, "walletAddress": "0x7c4E...19B2" },
    "wallet": { "address": "0x7c4E...19B2" },
    "distributions": [
      { "period": "2026-11", "tokenBalance": 100, "valuePerTokenSen": 43875, "amountIdr": 43875, "distributedAt": "2026-12-01T02:05:00.000Z", "snapshotBlock": 7312884, "closeTxHash": "0x5e21...7c0a" }
    ],
    "transactions": [
      { "type": "DISTRIBUTION", "occurredAt": "2026-12-01T02:05:00.000Z", "description": "Distribusi November 2026, 100 token × Rp438,75", "tokenAmount": 100, "amountIdr": 43875, "chain": { "status": "RECORDED", "txHash": "0x5e21...7c0a" } },
      { "type": "PURCHASE", "occurredAt": "2026-11-09T03:00:00.000Z", "description": "BUY-SMR01-0003, 100 token ke dompet kustodian", "tokenAmount": 100, "amountIdr": 10000000, "chain": { "status": "RECORDED", "txHash": "0x6a20...9d3e" } },
      { "type": "KYC_APPROVED", "occurredAt": "2026-11-03T03:00:00.000Z", "description": "Dompet 0x7c4E…19B2 dicatat lolos KYC di KosToken", "tokenAmount": 0, "amountIdr": 0, "chain": { "status": "RECORDED", "txHash": "0x3d9a...f0e4" } }
    ]
  }
}
```

`distributions` urut periode terbaru lebih dulu; `tokenBalance` adalah saldo di blok `snapshotBlock` dan `closeTxHash` transaksi `closePeriod`. `snapshotBlock` tambahan di luar kontrak P4.

`transactions` urut waktu terbaru lebih dulu. `description` dibentuk backend dalam Bahasa Indonesia.

| `type` | Isi | `chain` |
|---|---|---|
| `PURCHASE` | Pembelian token: `order_id`, jumlah token, nominal | Bukti `transferFromTreasury` |
| `DISTRIBUTION` | Bagi hasil satu periode: saldo × nilai per token | Bukti `closePeriod` |
| `KYC_APPROVED` | Tambahan di luar kontrak P4 (baris "Lolos KYC" di Figma): "Dompet 0x7c4E…19B2 dicatat lolos KYC di KosToken", `tokenAmount` dan `amountIdr` 0 (tanpa biaya), waktu persetujuan admin | Bukti `setKycStatus` |

### Status kamar pengelola (P4)

#### GET /api/manager/rooms?period=YYYY-MM

`MANAGER` (properti yang dikelolanya) dan `ADMIN` (properti pertama atau `?property=`). `period` opsional, bawaannya periode tagihan terbaru.

```json
{
  "data": {
    "period": "2026-11",
    "summary": { "expectedIdr": 13500000, "paidIdr": 10500000, "recordedIdr": 9000000, "pendingIdr": 1500000, "roomsPaid": 7, "roomsRecorded": 6, "roomsOccupied": 9 },
    "rooms": [
      { "roomNumber": "K04", "status": "OCCUPIED", "tenantName": "Eko Wicaksono", "bill": { "id": "01a1...", "status": "UNPAID", "dueDate": "2026-11-10", "paidAt": null, "amountIdr": 1500000 }, "chain": null, "daysOverdue": 8 },
      { "roomNumber": "K06", "status": "VACANT", "tenantName": null, "bill": null, "chain": null, "daysOverdue": 0 },
      { "roomNumber": "K08", "status": "OCCUPIED", "tenantName": "Intan Permatasari", "bill": { "id": "01a1...", "status": "PAID", "dueDate": "2026-11-10", "paidAt": "2026-11-14T03:00:00.000Z", "amountIdr": 1500000 }, "chain": { "status": "FAILED", "txHash": null }, "daysOverdue": 0 }
    ],
    "followUps": [
      { "kind": "OVERDUE", "roomNumber": "K04", "expenseId": null },
      { "kind": "OVERDUE", "roomNumber": "K09", "expenseId": null },
      { "kind": "CHAIN_FAILED", "roomNumber": "K08", "expenseId": null },
      { "kind": "EXPENSE_PENDING", "roomNumber": null, "expenseId": "01a1..." }
    ]
  }
}
```

| Field | Keterangan |
|---|---|
| `summary.expectedIdr` | Jumlah semua tagihan periode itu |
| `summary.pendingIdr` | Lunas tetapi belum tercatat di Sepolia (`paidIdr` − `recordedIdr`) |
| `summary.roomsOccupied` | Kamar berstatus `OCCUPIED` |
| `rooms` | Semua kamar properti, urut nomor. `status` kamar `OCCUPIED`, `VACANT`, atau `MAINTENANCE` |
| `rooms[].chain` | Pencatatan `recordRent`: `PENDING`, `RECORDED`, atau `FAILED`. `null` selama belum lunas lewat Midtrans |
| `rooms[].daysOverdue` | Hari kalender WIB sejak jatuh tempo untuk tagihan belum dibayar; 0 bila belum lewat atau sudah lunas. Teks "Lewat 8 hari" dibentuk frontend |
| `followUps` | `OVERDUE` (tagihan lewat jatuh tempo), `CHAIN_FAILED` (sewa lunas gagal dicatat), `EXPENSE_PENDING` (biaya belum tercatat, dengan `expenseId`). Job yang sudah ditandai ditangani admin tidak masuk. Pengelola tidak punya tombol mengulang; pengulangan ada di antrean admin |

### Ringkasan dan antrean job admin (P4)

Semua hanya `ADMIN`.

#### GET /api/admin/summary

```json
{
  "data": {
    "currentPeriod": { "period": "2026-11", "status": "OPEN", "roomsRecorded": 8, "roomsTotal": 9, "expensesIdr": 2400000 },
    "attention": { "kycSubmitted": 1, "jobsFailed": 1, "jobsPending": 1, "anomaliesOpen": 1, "refundsPending": 0 }
  }
}
```

`currentPeriod` adalah periode tagihan terbaru (`null` bila belum ada tagihan); `expensesIdr` biaya yang sudah tercatat on-chain. `jobsFailed` hanya menghitung job gagal yang belum ditandai ditangani. `jobsPending` menghitung job `QUEUED` dan `PENDING`. `refundsPending` (P4, keputusan pasca-QA) menghitung pembayaran `PAID_AFTER_CLOSE`: sewa yang lunas setelah periodenya ditutup dan dananya perlu dikembalikan. `anomaliesOpen` menghitung semua baris `payment_anomalies` (prototipe belum punya status selesai untuk anomali). Jumlah selisih rekonsiliasi dibaca dari `GET /api/reconciliation/summary`.

#### GET /api/admin/jobs?view=open|all

`view` bawaan `open` (tab "Menunggu atau gagal": `QUEUED`, `PENDING`, dan `FAILED` yang belum ditandai ditangani); `all` untuk tab Semua.

```json
{
  "data": {
    "jobs": [
      { "id": "01a1...", "type": "RECORD_RENT", "reference": "RENT-SMR01-K08-2026-11", "createdAt": "2026-11-14T03:05:00.000Z", "attempts": 5, "status": "FAILED", "txHash": null, "lastError": "RPC tidak menjawab.", "resolution": null },
      { "id": "01a1...", "type": "RECORD_EXPENSE", "reference": "0x19c8...d046", "createdAt": "2026-11-12T09:40:00.000Z", "attempts": 2, "status": "PENDING", "txHash": "0x...", "lastError": "...", "resolution": null }
    ],
    "counts": { "open": 2, "all": 31 }
  }
}
```

| Field | Keterangan |
|---|---|
| `reference` | `order_id` untuk `RECORD_RENT` dan `TRANSFER_TOKENS`, hash nota untuk `RECORD_EXPENSE`, periode untuk `CLOSE_PERIOD`, alamat dompet untuk `WHITELIST_KYC` |
| `attempts` | Percobaan worker pada hasil terakhir; 0 selama `QUEUED`. Worker mengulang otomatis sampai 5 kali |
| `status` | `QUEUED`, `PENDING`, `RECORDED`, atau `FAILED` |
| `resolution` | P4 pasca-QA: `{ "resolvedAt", "resolvedBy": { "name" }, "note" }` bila admin menandai job gagal ini sudah ditangani, `null` selain itu. `status` tetap `FAILED` |
| `counts` | Jumlah untuk angka di tab. Tambahan di luar kontrak P4 |

Urutan terbaru lebih dulu, paling banyak 500 job.

#### POST /api/admin/jobs/:id/retry

Tanpa body. Hanya untuk job `FAILED`. Dalam satu transaksi: satu baris `outbox_job_retries` ditulis dan baris outbox dikembalikan ke `PENDING`. Dispatcher memasukkannya lagi ke antrean BullMQ dengan id job `<id outbox>-retry-<n>` (job lama yang gagal masih tersimpan dengan id aslinya). Processor jalur 3 memeriksa status on-chain lebih dulu, jadi transaksi yang ternyata sudah masuk blok diakui `RECORDED`, bukan dikirim ulang.

Balasan 202 `{ "data": { "job": AdminJobDto } }` dengan `status` `QUEUED`.

| Status | `code` | Kapan |
|---|---|---|
| 404 | `NOT_FOUND` | Job tidak ada atau id bukan UUID |
| 409 | `JOB_NOT_FAILED` | Job tidak berstatus `FAILED`, termasuk yang baru saja dicoba lagi. `details: { status }` |
| 409 | `JOB_RESOLVED` | Job sudah ditandai ditangani, jadi tidak dicoba lagi |
| 429 | `RATE_LIMITED` | Lebih dari 30 permintaan per menit |

#### POST /api/admin/jobs/:id/resolve

Body `{ "note": "Kamar K08 sudah tercatat lewat order lain." }`, catatan 5 sampai 300 karakter (spasi di tepi dibuang). Hanya untuk job `FAILED` yang belum ditandai. Dipakai untuk job yang akan gagal lagi setiap dicoba, mis. data di kontrak sudah ada lewat referensi lain (`RentAlreadyRecorded`), `EmptyPeriod`, atau `BalanceCapExceeded`. Siapa, kapan, dan catatannya disimpan di tabel `outbox_job_resolutions`; model `OutboxJob` tidak berubah.

Sesudah ditandai: `status` job tetap `FAILED` dengan `resolution` terisi, job tidak tampil di tab "Menunggu atau gagal", tidak dihitung di `attention.jobsFailed`, tidak menghalangi Tutup periode, tidak lagi menjadi tindak lanjut `CHAIN_FAILED` atau `EXPENSE_PENDING` pengelola, dan tidak bisa dicoba lagi (409 `JOB_RESOLVED`). Tanda ini tidak bisa dibatalkan lewat API.

Balasan 200 `{ "data": { "job": AdminJobDto } }`.

| Status | `code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `note` kurang dari 5 atau lebih dari 300 karakter |
| 404 | `NOT_FOUND` | Job tidak ada atau id bukan UUID |
| 409 | `JOB_NOT_FAILED` | Job tidak berstatus `FAILED` |
| 409 | `JOB_ALREADY_RESOLVED` | Job sudah ditandai ditangani, termasuk dua klik bersamaan |
| 429 | `RATE_LIMITED` | Lebih dari 30 permintaan per menit, dihitung bersama Coba lagi |

### Rekonsiliasi (P4, modul jalur 1)

Modul `backend/src/modules/reconciliation/` milik jalur 1; bagian ini mendokumentasikan kontraknya. Hanya `ADMIN`. Semua sumber hanya dibaca: modul ini tidak pernah mengubah tagihan, pesanan, maupun job.

#### GET /api/reconciliation?period=YYYY-MM&only=mismatch&refresh=1

| Query | Keterangan |
|---|---|
| `period` | Opsional, bawaannya bulan berjalan menurut WIB |
| `only` | `mismatch`: hanya baris Selisih. Ringkasan tetap menghitung semua order |
| `refresh` | `1` atau `true`: lewati cache 30 detik (tombol Periksa ulang) |

```json
{
  "data": {
    "period": "2026-11",
    "summary": { "total": 14, "matched": 12, "mismatched": 2, "checkedAt": "2026-11-18T03:00:00.000Z" },
    "rows": [
      {
        "orderId": "BUY-SMR01-0004",
        "kind": "BUY",
        "amountIdr": 10000000,
        "midtrans": { "status": "settlement", "grossAmountIdr": 1000000 },
        "database": { "status": "PENDING", "amountIdr": 10000000 },
        "chain": { "status": "NONE", "amountIdr": null, "txHash": null, "blockNumber": null, "explorerUrl": null, "jobStatus": null, "lastError": null },
        "result": "MISMATCH",
        "reasons": ["..."],
        "flagged": ["MIDTRANS"],
        "subject": { "roomNumber": null, "period": null, "tokenAmount": 100 },
        "anomalies": [{ "type": "AMOUNT_MISMATCH", "note": "...", "expectedAmountIdr": 10000000, "receivedAmountIdr": 1000000, "occurrences": 1, "createdAt": "..." }]
      }
    ]
  }
}
```

| Field | Keterangan |
|---|---|
| `kind` | `RENT` atau `BUY` |
| `midtrans.status` | `transaction_status` Midtrans apa adanya (`settlement`, `expire`, `cancel`, ...), `not_found` bila API status menjawab 404, atau `error` bila gagal dicek |
| `database.status` | Status percobaan pembayaran apa adanya, termasuk `PAID_AFTER_CLOSE` (P4), atau `NOT_FOUND` untuk `order_id` yang hanya dikenal lewat anomali `UNKNOWN_ORDER` |
| `chain.status` | `RECORDED`, `PENDING` (ada job yang belum selesai), `NONE`, atau `ERROR` (kontrak tidak terbaca) |
| `chain.jobStatus`, `chain.lastError`, `chain.blockNumber`, `chain.explorerUrl` | Status job menurut basis data, galat terakhir, blok, dan tautan Etherscan (`null` di Hardhat lokal) |
| `result` | `MATCH` atau `MISMATCH`. Percobaan kedaluwarsa atau dibatalkan Cocok bila ketiga sumber sepakat tidak ada uang dan tidak ada catatan. Anomali `AMOUNT_MISMATCH` dan pembayaran telat (`PAID_AFTER_CLOSE`) muncul sebagai Selisih |
| `reasons` | Penjelasan selisih, urut dari yang paling penting. Kosong bila Cocok |
| `flagged` | Sumber yang menyimpang: `MIDTRANS`, `DATABASE`, `CHAIN` |
| `subject` | Kamar dan periode untuk sewa, jumlah token untuk pembelian. Tanpa nama |
| `anomalies` | Baris `payment_anomalies` order ini |

Field `period`, `flagged`, `subject`, `anomalies`, dan `chain.jobStatus`/`lastError`/`blockNumber`/`explorerUrl` adalah tambahan jalur 1 di luar kontrak P4.

#### GET /api/reconciliation/summary?period=YYYY-MM

Query sama (`period`, `refresh`). Membalas `{ "data": { "total", "matched", "mismatched", "checkedAt" } }`, untuk kartu Perlu perhatian di `/admin`.

Error kedua endpoint:

| Status | `code` | Kapan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `period` bukan `YYYY-MM`, atau `only`/`refresh` tidak dikenal |
| 503 | `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` belum diisi |
| 503 | `CHAIN_NOT_CONFIGURED` | `SEPOLIA_RPC_URL`, `KOS_TOKEN_ADDRESS`, atau `KOS_LEDGER_ADDRESS` belum diisi |
