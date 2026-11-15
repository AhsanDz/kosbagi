# Dokumentasi API KosBagi

API backend KosBagi (Express 5 + TypeScript). Dokumen ini memuat konvensi yang berlaku untuk semua endpoint dan daftar endpoint yang sudah tersedia. Endpoint baru ditambahkan ke sini setiap progress.

| Progress | Perubahan kontrak API |
|---|---|
| P1 | Konvensi umum (format JSON, format error, header) dan `GET /api/health` |
| P2 | Login akun dummy + JWT, peran, tagihan penghuni, pembayaran Midtrans Snap, webhook, properti dan kamar, KYC dummy, pengajuan pemilik kos, rate limit |

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
| Order Midtrans | `RENT-<properti>-<kamar>-<periode>`, percobaan ulang bersufiks `-2`, `-3`; pembelian token berawalan `BUY-` | `RENT-SMR01-K03-2026-11` |

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
| 400 | `AMOUNT_MISMATCH` | Webhook: nominal tidak cocok dengan tagihan |
| 400 | `BAD_REQUEST` | Alamat dengan percent-encoding rusak, mis. `/api/bills/%E0%A4%A` |
| 401 | `INVALID_CREDENTIALS` | Login: email atau kata sandi salah |
| 401 | `UNAUTHENTICATED` | Token tidak ada, tidak sah, atau kedaluwarsa |
| 403 | `FORBIDDEN` | Sudah masuk, tetapi peran akun tidak boleh memakai endpoint ini |
| 403 | `INVALID_SIGNATURE` | Webhook: `signature_key` tidak cocok |
| 404 | `NOT_FOUND` | Rute tidak ada, atau data tidak ditemukan. Tagihan milik orang lain juga dibalas kode ini |
| 409 | `BILL_ALREADY_PAID` | Tagihan sudah lunas |
| 409 | `KYC_ALREADY_SUBMITTED` | Investor sudah punya pengajuan KYC yang diajukan atau disetujui |
| 409 | `KYC_ALREADY_REVIEWED` | Pengajuan KYC sudah ditinjau |
| 413 | `PAYLOAD_TOO_LARGE` | Body melebihi 100 KB |
| 429 | `RATE_LIMITED` | Terlalu banyak permintaan dari IP yang sama |
| 4xx | `BAD_REQUEST` | Permintaan tidak dapat diproses karena alasan lain di sisi klien |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga di server |
| 502 | `MIDTRANS_UNAVAILABLE` | Membuat pembayaran: Midtrans gagal dihubungi atau membalas error |
| 503 | `MIDTRANS_UNAVAILABLE` | Webhook: status transaksi belum bisa dicek. Midtrans diminta mengirim ulang |
| 503 | `MIDTRANS_NOT_CONFIGURED` | `MIDTRANS_SERVER_KEY` belum diisi di server |

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

**GET /api/bills/:id** membalas `{ "data": { "bill": BillDto } }`. Tagihan milik orang lain, tagihan yang tidak ada, dan id yang bukan UUID semuanya dibalas 404.

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
| `chain` | `null` selama belum `PAID`. `status` berisi `PENDING`, `RECORDED`, atau `FAILED`. Selalu `PENDING` di P2 karena worker baru ada di P3 |

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

#### TenantRoomDto

```json
{
  "number": "K03",
  "propertyName": "Kos Sumbersari 01",
  "propertyCode": "SMR01",
  "monthlyRentIdr": 1500000,
  "leaseStart": "2026-08",
  "leaseEnd": "2027-07",
  "dueDay": 10
}
```

Masa sewa tidak disimpan di basis data. `leaseStart` adalah periode tagihan paling awal, `leaseEnd` 12 bulan sesudahnya, dan `dueDay` tanggal jatuh tempo tagihan terbaru. Ketiganya `null` bila kamar belum punya tagihan.

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

### POST /api/webhooks/midtrans

Tujuan notifikasi HTTP Midtrans, dan satu-satunya pintu perubahan status lunas. Di dashboard sandbox, alamat ini dipasang sebagai Payment Notification URL. Tanpa login: keaslian dibuktikan lewat `signature_key`.

Urutan pemeriksaan:

1. Rate limit, lalu `signature_key` = SHA-512(`order_id` + `status_code` + `gross_amount` + server key), memakai `gross_amount` mentah dari notifikasi dan perbandingan waktu-konstan.
2. Cek ulang ke API status Midtrans. Keputusan memakai jawaban API itu, bukan isi notifikasi.
3. `order_id` tidak dikenal: dicatat anomali `UNKNOWN_ORDER`.
4. Nominal notifikasi atau nominal API status berbeda dari tagihan: dicatat anomali `AMOUNT_MISMATCH` dan ditolak.
5. Status lunas: `settlement` atau `capture`, `status_code` 200, dan `fraud_status` `accept` bila field itu ada.
6. Dalam satu transaksi DB: tagihan dan pembayaran lunas, lalu baris outbox `RECORD_RENT` ditulis.

**Balasan sukses** `{ "data": { "orderId": "RENT-SMR01-K03-2026-11", "outcome": "SETTLED" } }`:

| `outcome` | Arti | Perubahan data |
|---|---|---|
| `SETTLED` | Pembayaran sah | Tagihan dan pembayaran lunas, satu baris outbox |
| `ALREADY_PAID` | Notifikasi ganda untuk order yang sudah terbayar | Tidak ada |
| `DUPLICATE_BILL_PAYMENT` | Tagihan sudah lunas lewat order lain | Percobaan ini `DUPLICATE_PAID`, anomali tercatat, tanpa outbox |
| `ATTEMPT_UPDATED` | `pending`, `expire`, `cancel`, `deny`, atau `failure` | Status percobaan saja; tagihan tidak berubah |
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

Di P2 hanya awalan `RENT-` yang diproses. Order `BUY-` diperlakukan sebagai `UNKNOWN_ORDER` sampai pembelian token dibangun di P3.

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

Data dummy, tanpa UI di P2. Whitelist on-chain setelah disetujui menyusul di P3.

#### KycDto

```json
{
  "id": "01a18897-fb42-70b8-abc0-43d131ddbe3c",
  "fullName": "Dimas Pratama",
  "dummyIdNumber": "DUMMY-3507-0001",
  "status": "SUBMITTED",
  "rejectionReason": null,
  "submittedAt": "2026-11-05T03:00:00.000Z",
  "reviewedAt": null
}
```

`status` berisi `SUBMITTED`, `APPROVED`, atau `REJECTED`.

| Endpoint | Akses | Body atau query | Balasan | Error khusus |
|---|---|---|---|---|
| `POST /api/kyc` | INVESTOR | `{ "fullName", "dummyIdNumber" }`; `dummyIdNumber` wajib berawalan `DUMMY-` | 201 `{ "data": { "kyc": KycDto } }` | 409 `KYC_ALREADY_SUBMITTED` bila masih ada pengajuan yang diajukan atau disetujui. Yang ditolak boleh mengajukan lagi |
| `GET /api/kyc/me` | INVESTOR | | 200 `{ "data": { "kyc": KycDto } }`; `null` berarti belum mengajukan | |
| `GET /api/kyc` | ADMIN | Opsional `?status=SUBMITTED` | 200 `{ "data": { "submissions": [KycDto + user] } }`, dengan `user` = `{ id, name, email }` | |
| `POST /api/kyc/:id/approve` | ADMIN | | 200 `{ "data": { "kyc": KycDto } }` | 404, 409 `KYC_ALREADY_REVIEWED` |
| `POST /api/kyc/:id/reject` | ADMIN | `{ "reason" }` minimal 3 karakter | 200 `{ "data": { "kyc": KycDto } }` | 404, 409 `KYC_ALREADY_REVIEWED` |

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
