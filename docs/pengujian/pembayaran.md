# Laporan Uji Pembayaran (S1 sampai S7)

Laporan skenario uji 1 sampai 7 dari Tabel 4.3 proposal, progress 2. Skenario 8 dan 9 (pembelian token) menyusul di P3; skenario 10 sampai 12 ada di [`kontrak.md`](kontrak.md).

Tanggal uji: 2 November 2026 (tiruan) dan 3 November 2026 (Midtrans sandbox sungguhan).

> [!IMPORTANT]
> S1 sampai S7 sudah diuji terhadap Midtrans sandbox sungguhan pada 3 November 2026, lihat [Uji sandbox sungguhan](#uji-sandbox-sungguhan-3-november-2026). Notifikasi dikirim ke laptop dengan `npm run webhook:simulate`, bukan langsung oleh Midtrans, karena belum memakai ngrok. Server tetap memverifikasi signature dan mengecek ulang status ke API Midtrans asli. Yang belum terbukti tercantum di [Menunggu uji sandbox](#menunggu-uji-sandbox).

## Ringkasan

| No | Skenario | Otomatis, PostgreSQL + Midtrans tiruan | Alur penuh, server + PostgreSQL + Redis + Midtrans tiruan | Sandbox sungguhan |
|---|---|---|---|---|
| S1 | Bayar via VA berhasil | Lulus | Lulus | Lulus |
| S2 | Bayar via QRIS berhasil | Lulus | Lulus | Lulus |
| S3 | Pembayaran dibatalkan | Lulus | Lulus | Lulus |
| S4 | Kedaluwarsa, bisa dibuat ulang | Lulus | Lulus | Lulus |
| S5 | Webhook dikirim dua kali | Lulus, berurutan dan bersamaan | Lulus, berurutan | Lulus, berurutan |
| S6 | Signature palsu | Lulus | Lulus | Lulus |
| S7 | `gross_amount` tidak cocok | Lulus | Lulus | Lulus |

Untuk S1 dan S2, catatan on-chain dan tautan Etherscan belum bisa diuji karena worker baru ada di P3. Yang terbukti di P2: tagihan lunas, satu baris outbox `RECORD_RENT`, satu job masuk Redis, dan `chain` berstatus `PENDING`.

## Lingkungan uji

| Lapisan | Perintah atau cara | Yang nyata | Yang ditiru |
|---|---|---|---|
| Unit dan HTTP tanpa basis data | `npm test` | Kode aplikasi, Express | PostgreSQL tidak dipakai, Redis tidak dipakai, Midtrans |
| Integrasi | `npm run test:integration` | PostgreSQL 17 dan Redis 8 di Docker | Midtrans |
| Alur penuh | `server.ts` dijalankan sebagai proses terpisah, seed jalur 1, `npm run webhook:simulate` | Server, PostgreSQL, Redis, seed, skrip simulasi, `midtrans-client` | API Midtrans diganti server tiruan lokal lewat skrip di luar repo |

Hasil:

| Perintah | Hasil |
|---|---|
| `npm test` | 206 test lulus, 21 file, tanpa Docker dan tanpa jaringan |
| `npm run test:integration` | 82 test lulus, 4 file |
| Alur penuh | 36 langkah lulus |
| `npm run typecheck`, `npm run build` | Lulus |

### Menjalankan test integrasi

```bash
cd backend
npm run db:up             # PostgreSQL dan Redis lewat Docker
npm run test:integration
```

Test integrasi memakai basis data `kosbagi_test`, yang dibuat dan dimigrasi otomatis, jadi data pengembangan di `kosbagi` tidak tersentuh. Isinya dikosongkan di awal setiap test. Alamat bisa diganti lewat `TEST_DATABASE_URL` dan `TEST_REDIS_URL`. `npm test` biasa tidak menjalankan folder `tests/integration`, jadi tetap lulus tanpa Docker.

## Rincian per skenario

Berkas test: `backend/tests/integration/payment-scenarios.test.ts`, kecuali disebut lain.

### S1 dan S2: pembayaran berhasil

Langkah: penghuni membuat pembayaran, lalu notifikasi `settlement` dengan `payment_type` `bank_transfer` (S1) atau `qris` (S2) masuk ke webhook.

Hasil yang terbukti:

- Balasan 200 dengan `outcome` `SETTLED`, dan API status Midtrans ditanya.
- Tagihan `PAID`, pembayaran `PAID` dengan metode yang benar, `snapToken` tidak lagi dikirim.
- Tepat satu baris outbox `RECORD_RENT`.
- Isi job hanya kode properti, nomor kamar, periode, nominal, dan `keccak256(order_id)`.
- `chain` berstatus `PENDING`.

### S3: pembayaran dibatalkan

Langkah: notifikasi `cancel`, `deny`, dan `failure`, masing-masing diuji.

Hasil: tagihan tetap `UNPAID`, `paidAt` kosong, `paymentState` `FAILED`, tidak ada outbox, dan pembayaran baru mendapat `order_id` bersufiks `-2`.

Kasus tambahan: `deny` lalu `settlement` pada order yang sama tetap melunasi, karena satu sesi Snap bisa berisi beberapa percobaan.

### S4: kedaluwarsa

Dua jalur diuji:

- Notifikasi `expire` dari Midtrans: tagihan tetap `UNPAID`, `paymentState` `EXPIRED`, tanpa outbox.
- Batas waktu lewat tanpa notifikasi: `paymentState` langsung terbaca `EXPIRED`, token berhenti dikirim, dan percobaan baru menutup yang lama.

Bayar ulang memakai `-2`, lalu `-3`. Batas 5 menit diperiksa pada `expiresAt` dan isi permintaan Snap (`expiry` dan `page_expiry`). Test menggeser `expiresAt`, bukan menunggu 5 menit sungguhan.

### S5: webhook dikirim dua kali

- Berurutan: notifikasi kedua dibalas 200 `ALREADY_PAID`, `paidAt` tidak berubah, tetap satu pembayaran dan satu outbox.
- Bersamaan: lima notifikasi identik dikirim serentak. Tepat satu `SETTLED`, empat `ALREADY_PAID`, satu outbox.

### S6: signature palsu

Hasil: 403 `INVALID_SIGNATURE`. Isi tagihan, pembayaran, anomali, dan outbox dibandingkan sebelum dan sesudah, dan semuanya sama. API status Midtrans tidak ditanya.

Test tanpa basis data di `tests/webhook-rejection.test.ts` membuktikan penolakan terjadi sebelum query apa pun dijalankan. `src/modules/webhooks/signature.test.ts` menguji rumusnya, termasuk perubahan tiap field dan signature dengan panjang berbeda.

### S7: nominal tidak cocok

Dua jalur diuji:

- API status melaporkan nominal lain.
- Nominal notifikasi berbeda walau API status benar.

Hasil keduanya: 400 `AMOUNT_MISMATCH`, tagihan dan pembayaran tidak berubah, tanpa outbox, anomali `AMOUNT_MISMATCH` tercatat dengan nominal yang diharapkan dan yang diterima. Pengiriman ulang menaikkan `occurrences`, bukan menambah baris.

## Kasus tambahan

| Kasus | Hasil |
|---|---|
| Dua percobaan sama-sama terbayar, berurutan dan bersamaan | Satu `SETTLED`, satu `DUPLICATE_BILL_PAYMENT`. Satu outbox, satu anomali, percobaan kedua `DUPLICATE_PAID` |
| Status monotonik | `pending`, `expire`, `cancel`, `deny`, `failure`, dan `refund` setelah lunas: 200 `NO_CHANGE`, data sama persis |
| Notifikasi `pending` tiba setelah `settlement` | Keputusan memakai API status, jadi tetap lunas |
| Tagihan orang lain | 404, sama dengan tagihan yang tidak ada, tanpa percobaan dibuat |
| Peran salah | 403 untuk setiap kombinasi route dan peran, di `tests/access-control.test.ts` |
| Klik Bayar bersamaan | Diuji sampai 20 klik pada satu tagihan dan 40 klik pada dua tagihan, melewati pool 10 koneksi: satu percobaan dan satu transaksi Snap per tagihan, semua klik mendapat token yang sama. Batas pakai 30 permintaan per menit per pengguna, lebih dari itu dibalas 429 `RATE_LIMITED`. Di atas angka itu belum diukur |
| Endpoint lain selama klik berjalan | Properti, health, login, daftar tagihan, dan webhook sah tetap dijawab selama transaksi Midtrans ditahan. Lihat bagian Pengukuran konkurensi |
| Midtrans gagal saat membuat pembayaran | 502, percobaan tercatat `FAILED`, semua klik yang menunggu ikut 502, dan klik berikutnya memakai sufiks baru |
| Proses mati setelah percobaan disimpan | Percobaan tanpa token berumur 10 detik atau lebih ditutup `FAILED` oleh permintaan berikutnya. Yang lebih muda dianggap masih diproses: klik menunggu, dan dibalas 502 bila token tidak muncul sebelum umur 10 detik |
| URL dengan percent-encoding rusak | 400 `BAD_REQUEST`, bukan 500 |
| Karakter NUL di slug, id, dan teks bebas | 404 di alamat, 400 atau 422 di body, tanpa sampai ke PostgreSQL |
| Midtrans gagal saat cek ulang | 503, tidak ada perubahan, Midtrans mengirim ulang |
| Outbox gagal ditulis | Transaksi batal: tagihan dan pembayaran tidak ikut lunas |
| Dua pembayaran `PAID` untuk satu tagihan | Ditolak basis data lewat index unik parsial |
| `order_id` tidak dikenal | 200 `UNKNOWN_ORDER`, anomali tercatat |
| Redis tidak bisa dihubungi | Dispatcher gagal dalam batas 3 detik, baris tetap `PENDING`, dan terkirim di putaran berikutnya |
| Job terkirim dua kali | BullMQ mengabaikan id job yang sama, antrean tetap berisi satu job |
| Server key kosong | Server tetap jalan, endpoint pembayaran dan webhook membalas 503 `MIDTRANS_NOT_CONFIGURED`. Dibuktikan dari hasil build |

## Pengukuran konkurensi

Temuan QA: 10 permintaan bersamaan menghabiskan pool 10 koneksi, karena setiap permintaan memegang satu koneksi transaksi sambil butuh koneksi kedua. Semuanya gagal setelah 30,1 detik, dan API lain ikut tertahan sekitar 29 detik. Test lama hanya 2 klik, jadi bug ini lolos. Perbaikannya memindahkan panggilan Midtrans ke luar transaksi.

Pengukuran ulang: `server.ts` sebagai proses sungguhan dengan PostgreSQL Docker, data seed, dan Midtrans tiruan berlatensi 300 ms. Klik dikirim serentak, lalu 40 ms kemudian endpoint lain dan webhook sah dipanggil.

| | 10 klik, satu tagihan | 20 klik, satu tagihan |
|---|---|---|
| Waktu seluruh klik | 412 ms | 434 ms |
| Status | 1 × 201, 9 × 200 | 1 × 201, 19 × 200 |
| Token berbeda | 1 | 1 |
| Percobaan tersimpan | 1 | 1 |
| `GET /api/properties` | 200, 18 ms | 200, 57 ms |
| `POST /api/auth/login` | 200, 212 ms | 200, 237 ms |
| `GET /api/health` | 200, 7 ms | 200, 4 ms |
| Webhook sah, order lain | 200 `SETTLED`, 346 ms | 200 `SETTLED`, 326 ms |

Angka login sebagian besar berasal dari scrypt yang memang sengaja lambat. Angka webhook sudah termasuk latensi tiruan 300 ms untuk cek ulang status. Log server tidak mencatat error apa pun. Pengukuran dilakukan sekali di laptop pengembang, jadi anggap sebagai gambaran, bukan angka kapasitas.

## Uji sandbox sungguhan (3 November 2026)

Lingkungan: backend dan frontend lokal, PostgreSQL dan Redis di Docker, data seed, kunci Midtrans sandbox milik koordinator, simulator `https://simulator.sandbox.midtrans.com`. Status dicek langsung ke API status Midtrans untuk setiap langkah. Semua nama dan nominal dummy.

| No | Langkah | Hasil di Midtrans | Hasil di KosBagi |
|---|---|---|---|
| S1 | Penghuni K03 menekan Bayar sewa di `/penghuni/tagihan`, memilih BCA VA, membayar di simulator, lalu menekan Check status di jendela Snap | `RENT-SMR01-K03-2026-11`: `pending` (201) lalu `settlement`, `bank_transfer` | Halaman masuk ke state Memeriksa pembayaran. Setelah notifikasi, outcome `SETTLED`, tagihan lunas "lewat virtual account", satu baris outbox `RECORD_RENT` |
| S2 | Penghuni K04 memilih QRIS, QR dibayar di simulator QRIS (issuer GoPay) | `RENT-SMR01-K04-2026-11-2`: `settlement`, `qris` | Outcome `SETTLED`, tagihan lunas, metode `qris`, outbox kedua |
| S3 | Penghuni K07 memilih BCA VA, lalu transaksi dibatalkan lewat API cancel Midtrans | `RENT-SMR01-K07-2026-11-2`: `cancel` (200) | Outcome `ATTEMPT_UPDATED`, percobaan `FAILED`, tagihan tetap belum dibayar, tanpa outbox. Halaman menampilkan Gagal dan tombol Bayar ulang |
| S4 | VA K07 dibiarkan lewat 5 menit | `RENT-SMR01-K07-2026-11`: `expire` (407), `expiry_time` sama dengan `expiresAt` KosBagi | Outcome `ATTEMPT_UPDATED`, percobaan `EXPIRED`, tagihan tetap belum dibayar. Bayar ulang membuat sufiks `-2` dan `-3` |
| S4 | Token K04 dibuat tanpa memilih metode, dibiarkan lewat 5 menit | API status 404 (transaksi belum ada) | Tagihan terbaca `EXPIRED` dari `expiresAt`, Bayar ulang membuat `RENT-SMR01-K04-2026-11-2` |
| S5 | Notifikasi K03 dikirim dua kali lagi setelah lunas | Tetap `settlement` | Dua kali `ALREADY_PAID`, tetap satu pembayaran lunas dan satu outbox |
| S6 | Notifikasi K03 dengan signature palsu | Tidak dipanggil | 403 `INVALID_SIGNATURE`, tanpa perubahan |
| S7 | Setelah QRIS K04 dibayar, notifikasi dikirim dengan `gross_amount` 1000.00 sebelum notifikasi yang sah | Tetap `settlement` Rp1.500.000 | 400 `AMOUNT_MISMATCH`, anomali tercatat (diharapkan 1.500.000, diterima 1.000), tagihan tetap belum dibayar sampai notifikasi sah masuk |

Hal lain yang terbukti:

- Snap menerima permintaan KosBagi, termasuk `expiry` 5 menit dan `customer_details` berdomain `.test`. Popup sandbox berlabel TEST.
- Metode yang tampil: BCA VA, virtual account BCA, BNI, BRI, dan Permata, GoPay QRIS, ShopeePay QRIS, dan QRIS.
- Menutup jendela Snap tidak membuat percobaan baru. Lanjutkan pembayaran membuka token yang sama, dan percobaan berikutnya baru dibuat lewat Bayar ulang.
- Login lewat kartu akun demo dan lewat form email berjalan dengan basis data seed.
- Jendela Snap tidak mendeteksi sendiri pembayaran VA dari simulator. Penghuni perlu menekan Check status, baru `onSuccess` terpanggil dan halaman masuk ke Memeriksa pembayaran.

## Menunggu uji sandbox

| Yang harus dibuktikan | Cara |
|---|---|
| Notifikasi asli dari Midtrans lewat ngrok | Pasang Payment Notification URL di dashboard |
| Tes notifikasi dari dashboard dibalas 200 | Tombol Test notification, tercatat `UNKNOWN_ORDER` |
| Pembayaran GoPay dan ShopeePay lewat deeplink | Simulator deeplink |
| Popup Snap yang dibiarkan terbuka sampai 5 menit habis | S4 dengan popup tetap terbuka |

Cara menguji dari simulator tanpa ngrok: bayar di simulator sandbox, lalu jalankan

```bash
npm run webhook:simulate -- RENT-SMR01-K03-2026-11
```

Skrip mengambil status asli dari Midtrans, menandatangani notifikasi, dan mengirimnya ke server lokal. Server tetap mengecek ulang ke Midtrans.

| Skenario | Perintah tambahan |
|---|---|
| S6 | `npm run webhook:simulate -- <order_id> --bad-signature` |
| S7 | `npm run webhook:simulate -- <order_id> --gross-amount 1000.00` |

## Keterbatasan yang diketahui

- `settlement` yang berbalik menjadi `deny`, yang jarang terjadi pada Permata, Mandiri Bill, dan Indomaret, tidak membatalkan status lunas. Status lunas tidak pernah mundur; kejadiannya hanya tercatat di log dan akan terlihat di rekonsiliasi.
- `refund` tidak diproses di prototipe.
- Dana percobaan `DUPLICATE_PAID` tidak dikembalikan otomatis. Anomalinya tercatat untuk ditangani manual.
- Rate limit disimpan di memori proses, jadi kosong lagi saat server restart dan tidak berlaku lintas proses.
- Bila pool benar-benar habis, permintaan gagal setelah menunggu 5 detik (`connectionTimeoutMillis`) dan dibalas 500. Pool masih berukuran bawaan, 10 koneksi.
