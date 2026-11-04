# Dokumentasi API KosBagi

API backend KosBagi (Express 5 + TypeScript). Dokumen ini memuat konvensi yang berlaku untuk semua endpoint dan daftar endpoint yang sudah tersedia. Endpoint baru ditambahkan ke sini setiap progress.

| Progress | Perubahan kontrak API |
|---|---|
| P1 | Konvensi umum (format JSON, format error, header) dan `GET /api/health` |
| P2 | Direncanakan: login akun dummy + JWT, peran, KYC dummy, properti & kamar, tagihan, pembayaran Midtrans, webhook |

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

### Kode error yang sudah berlaku (P1)

| Status | `code` | Kapan muncul |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Isi body, parameter, atau query tidak lolos validasi |
| 400 | `INVALID_JSON` | Body bukan JSON yang valid |
| 404 | `NOT_FOUND` | Rute tidak ada, atau data yang diminta tidak ditemukan |
| 413 | `PAYLOAD_TOO_LARGE` | Body melebihi 100 KB |
| 4xx | `BAD_REQUEST` | Permintaan tidak dapat diproses karena alasan lain di sisi klien |
| 500 | `INTERNAL_ERROR` | Kesalahan tak terduga di server |

Kode untuk autentikasi dan aturan bisnis (mis. `UNAUTHORIZED`, `FORBIDDEN`, `CONFLICT`) ditambahkan bersama endpoint yang memakainya mulai P2.

## 4. Header

| Header | Arah | Keterangan |
|---|---|---|
| `Content-Type: application/json` | permintaan & respons | Wajib untuk permintaan yang membawa body |
| `X-Request-Id` | respons (opsional di permintaan) | ID unik tiap permintaan. Bila klien mengirim nilai aman (huruf, angka, `.`, `_`, `-`, maks. 64 karakter), nilai itu dipakai ulang; selain itu server membuat UUID baru. |
| `Access-Control-Allow-Origin` | respons | Hanya untuk origin yang terdaftar di `CORS_ORIGIN` (lokal: `http://localhost:3000`) |

Server juga memasang header keamanan standar lewat `helmet` (mis. `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`) dan tidak mengirim `X-Powered-By`.

## 5. Autentikasi dan peran

Belum ada di P1: semua endpoint yang tersedia bersifat publik. Mulai P2 ditambahkan login akun dummy (email + kata sandi dummy) yang menghasilkan JWT, serta pembatasan akses per peran `INVESTOR`, `TENANT`, `MANAGER`, dan `ADMIN`. Detail header dan alurnya didokumentasikan di sini bersama endpoint login.

## 6. Daftar endpoint

| Metode | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/api/health` | publik | Status layanan, versi, dan waktu server |

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
