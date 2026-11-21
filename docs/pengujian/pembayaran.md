# Laporan Uji Pembayaran (S1 sampai S9)

Laporan skenario uji 1 sampai 9 dari Tabel 4.3 proposal. S1 sampai S7 (pembayaran sewa) dibangun di progress 2, S8 dan S9 (pembelian token) di progress 3. Skenario 10 sampai 12 ada di [`kontrak.md`](kontrak.md).

Tanggal uji: 2 November 2026 (S1 sampai S7, tiruan), 3 November 2026 (S1 sampai S7, Midtrans sandbox sungguhan), 4 sampai 15 November 2026 (S8, S9, dan alur pembelian token, tiruan), 15 November 2026 (pembelian token dan skrip demo ke Midtrans sandbox sungguhan, tanpa membayar di simulator).

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
| S8 | Beli token melebihi sisa penawaran | Lulus | Belum | Tidak perlu: ditolak sebelum Midtrans dipanggil |
| S9 | Beli melebihi batas 10% (pegang 1.500, pesan 500) | Lulus | Belum | Tidak perlu: ditolak sebelum Midtrans dipanggil |

Untuk S1 dan S2, catatan on-chain dan tautan Etherscan diuji jalur 3 di [`kontrak.md`](kontrak.md) dan laporan layanan blockchain. Yang dibuktikan di laporan ini: tagihan lunas, satu baris outbox `RECORD_RENT`, `chain` berstatus `PENDING` sampai worker mencatat, lalu `RECORDED` dengan tx hash. Kuitansi `GET /api/bills/:id` menampilkan argumen `recordRent` persis.

S8 dan S9 tidak butuh uji sandbox sungguhan, karena syaratnya justru Midtrans tidak dipanggil sama sekali. Test otomatis memastikan tiruan Snap tidak pernah terpanggil dan tidak ada baris pesanan atau pembayaran yang dibuat.

## Lingkungan uji

| Lapisan | Perintah atau cara | Yang nyata | Yang ditiru |
|---|---|---|---|
| Unit dan HTTP tanpa basis data | `npm test` | Kode aplikasi, Express | PostgreSQL tidak dipakai, Redis tidak dipakai, Midtrans |
| Integrasi | `npm run test:integration` | PostgreSQL 17 dan Redis 8 di Docker | Midtrans |
| Alur penuh | `server.ts` dijalankan sebagai proses terpisah, seed jalur 1, `npm run webhook:simulate` | Server, PostgreSQL, Redis, seed, skrip simulasi, `midtrans-client` | API Midtrans diganti server tiruan lokal lewat skrip di luar repo |

Hasil:

| Perintah | P2 | P3 (jalur 2) |
|---|---|---|
| `npm test` | 206 test lulus, 21 file | 279 test lulus, 27 file, tanpa Docker dan tanpa jaringan |
| `npm run test:integration` | 82 test lulus, 4 file | 169 test lulus, 7 file |
| Alur penuh | 36 langkah lulus | Belum diulang untuk pembelian token |
| `npm run typecheck`, `npm run build` | Lulus | Lulus |

Angka P3 hanya menghitung test milik jalur 2. Di folder kerja gabungan, `npm test` juga menjalankan test kalkulator jalur 1 dan layanan blockchain jalur 3.

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

### S8: beli token melebihi sisa penawaran

Berkas test: `backend/tests/integration/token-purchase.test.ts` dan `backend/src/modules/offerings/quota.test.ts`.

Langkah: penawaran 12.600 token sudah terjual 12.480 (sisa 120), lalu investor yang lolos KYC memesan 200 token.

Hasil yang terbukti:

- 422 `OFFERING_EXCEEDED` dengan `details: { tokensRemaining: 120 }` dan pesan "Jumlah token melebihi sisa penawaran. Sisa penawaran 120 token."
- Tidak ada baris pesanan maupun pembayaran, dan Snap tidak dipanggil.
- Varian sisihan: terjual 12.400, investor lain sedang menunggu bayar 150 token, investor memesan 100. Ditolak dengan `tokensRemaining: 50`, karena pesanan yang menunggu bayar ikut mengurangi sisa.
- Dua investor berebut 100 token terakhir bersamaan: tepat satu 201 dan satu 422, Snap hanya dipanggil sekali.

### S9: beli melebihi batas kepemilikan 10%

Langkah: investor sudah memegang 1.500 token (pesanan `PAID`), lalu memesan 500 token. Batas per investor 1.800 token.

Hasil yang terbukti:

- 422 `HOLDING_CAP_EXCEEDED` dengan `details: { remainingQuota: 300 }` dan pesan "Jumlah token melebihi batas kepemilikan 1.800 token per investor. Sisa kuota kamu 300 token."
- Tidak ada baris pesanan maupun pembayaran, dan Snap tidak dipanggil.
- Memesan tepat 300 token (tombol "Pakai 300 token") diterima.
- Pesanan sendiri yang masih menunggu bayar ikut mengurangi kuota: memegang 1.500 dan menunggu bayar 200 menyisakan kuota 100.

Batas yang sama ditegakkan lagi di `KosToken` (skenario 10, jalur 3), jadi bila backend salah, transfer on-chain tetap revert.

### Pembelian token lewat webhook `BUY-`

| Kasus | Hasil |
|---|---|
| `settlement` | Pesanan dan pembayaran `PAID`, `tokensSold` bertambah, satu outbox `TRANSFER_TOKENS` berisi hanya kode properti, alamat dompet, jumlah, dan `keccak256(order_id)` |
| Notifikasi ganda berurutan dan 5 bersamaan | Tepat satu `SETTLED`, sisanya `ALREADY_PAID`. Satu outbox, `tokensSold` bertambah sekali |
| Penawaran habis | Pelunasan terakhir membuat penawaran `CLOSED`, pesanan berikutnya 409 `OFFERING_CLOSED` |
| `expire` | Pesanan `EXPIRED`, sisihan lepas, sisa penawaran dan kuota kembali, investor boleh memesan lagi |
| `cancel`, `deny`, `failure` | Pesanan `FAILED`, sisihan lepas |
| Batas bayar lewat tanpa notifikasi | Pesanan terbaca `EXPIRED`, sisihan tidak lagi dihitung |
| Bayar ulang setelah kedaluwarsa | `BUY-SMR01-0001-2`, token disisihkan lagi. Ditolak 422 bila tokennya sudah diambil investor lain |
| `expire` untuk percobaan lama | Tidak melepas sisihan percobaan yang lebih baru |
| `settlement` setelah sisihan lepas, token masih ada | Tetap lunas |
| `settlement` setelah sisihan lepas, token sudah habis | 200 `PURCHASE_UNFULFILLABLE`: pembayaran `UNFULFILLED`, pesanan `EXPIRED`, anomali untuk pengembalian dana, tanpa outbox, `tokensSold` tidak berubah |
| Dua percobaan sama-sama terbayar | Satu `SETTLED`, satu `DUPLICATE_PURCHASE_PAYMENT`, satu outbox |
| Nominal tidak cocok | 400 `AMOUNT_MISMATCH`, anomali, pesanan tidak berubah |
| `pending` atau `expire` setelah lunas | `NO_CHANGE` |
| Outbox gagal ditulis | Transaksi batal: pesanan, pembayaran, dan `tokensSold` tidak berubah |
| Midtrans gagal saat membuat Snap | 502, pesanan dan percobaan `FAILED`, sisihan lepas |
| KYC belum disetujui, dompet belum tercatat, penawaran ditutup, pesanan aktif masih ada | 403 `KYC_REQUIRED`, 409 `WALLET_NOT_READY`, 409 `OFFERING_CLOSED`, 409 `PURCHASE_PENDING`, sesuai urutan kontrak, tanpa Snap |
| Di atas 100 token | Snap hanya menawarkan virtual account |
| Pesanan investor lain | 404, sama dengan pesanan yang tidak ada |

### Persetujuan KYC

Berkas test: `backend/tests/integration/kyc.test.ts`.

| Kasus | Hasil |
|---|---|
| Disetujui | Satu transaksi: `APPROVED`, dompet kustodian indeks 0 (alamat sama dengan akun Hardhat #0 untuk mnemonic uji), dan outbox `WHITELIST_KYC` tanpa data pribadi |
| Investor berikutnya, juga tiga persetujuan bersamaan | Indeks 1, 2, dan seterusnya, tidak pernah kembar |
| Job whitelist gagal ditulis, atau dompet gagal dibuat | Semuanya batal, pengajuan tetap `SUBMITTED` |
| `CUSTODIAL_WALLET_MNEMONIC` kosong | 503 `CUSTODIAL_WALLET_NOT_CONFIGURED`, tidak ada yang berubah |
| Pemeriksaan otomatis | Awalan `DUMMY-`, nama sama dengan akun (tanpa beda huruf besar kecil dan spasi tepi), dan nomor identitas yang sama dipakai akun lain terdeteksi |
| `GET /api/kyc/me` | Whitelist `PENDING` lalu `RECORDED` dengan tx hash setelah worker mencatat |
| Pesan galat worker | `lastError` hanya muncul di daftar admin, tidak di `GET /api/kyc/me` |

### Skrip demo:bayar-sewa

Berkas test: `backend/tests/integration/demo-bank-transfer.test.ts`. VA dibuat lewat Core API dengan aturan percobaan yang sama dengan tombol Bayar, VA aktif dipakai lagi saat skrip dijalankan ulang, tagihan yang sedang dibayar penghuni lewat Snap dilewati, dan pelunasannya tetap lewat webhook dengan satu outbox `RECORD_RENT`.

## Kasus tambahan

| Kasus | Hasil |
|---|---|
| `order_id` percobaan baru sudah punya transaksi di Midtrans | Dilewati otomatis: percobaan `FAILED` dengan penanda `ORDER_ID_TAKEN`, sufiks berikutnya dibuat di klik yang sama. Lima berturut-turut: 502, klik berikutnya melanjutkan dari `-6` |
| Notifikasi `settlement` untuk `order_id` yang ditandai | 200 `ORDER_ID_TAKEN`, anomali `UNKNOWN_ORDER`, tagihan tetap `UNPAID`; percobaan `-2` tetap bisa melunasi |
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

## Uji sandbox P3 (15 November 2026)

Lingkungan: server API lokal di port 4010 dengan basis data uji terpisah, PostgreSQL di Docker, kunci Midtrans sandbox di `backend/.env`, worker tidak dijalankan (status whitelist dompet diisi `RECORDED` langsung di basis data uji). Properti uji berkode `UJI03`, supaya `order_id` sandbox (`BUY-UJI03-...`, `RENT-UJI03-...`) tidak memakai nomor `SMR01` yang dibutuhkan demo.

| Langkah | Hasil di Midtrans | Hasil di KosBagi |
|---|---|---|
| Investor memesan 1.801 token | Tidak dipanggil | 422 `HOLDING_CAP_EXCEEDED`, `remainingQuota` 1.800 |
| Investor memesan 101 token | Snap menerima `enabled_payments` hanya VA, `quantity` 101 @ Rp100.000 | 201, `BUY-UJI03-0001`, Rp10.100.000, `reservedUntil` 5 menit |
| `GET /api/offerings/current` | | `tokensReserved` 101, `tokensRemaining` 12.499, `reservedTokens` 101, `remainingQuota` 1.699, `activePurchase` terisi |
| Memesan lagi selagi menunggu bayar | Tidak dipanggil | 409 `PURCHASE_PENDING` |
| Lanjutkan pembayaran | Tidak dipanggil | 200, token Snap sama |
| Memesan 12.600 token | Tidak dipanggil | 422 `OFFERING_EXCEEDED`, `tokensRemaining` 12.499 |
| `npm run demo:bayar-sewa -- --period 2026-11` | VA BCA dibuat lewat Core API, `pending` | Nomor VA dan tautan simulator tercetak, batas bayar 5 menit. Dijalankan ulang: VA yang sama dipakai lagi |
| `npm run webhook:simulate` untuk VA itu | `pending`, `bank_transfer` | 200 `ATTEMPT_UPDATED`, percobaan menyimpan metode `bank_transfer` dan bank `bca` tanpa nomor VA |
| Core API VA Permata (tanpa server) | `permata_va_number` terbaca | Bank `permata` |

Pembayaran di simulator tidak dilakukan pada uji ini, jadi pelunasan `BUY-` dan sembilan kamar seed lewat skrip baru terbukti dengan Midtrans tiruan.

## order_id yang sudah terpakai di sandbox (16 November 2026)

Temuan QA P3 (T1): akun Midtrans sandbox menyimpan semua `order_id` lama, sedangkan nomor percobaan di KosBagi mulai lagi dari 1 setiap basis data diisi ulang. `RENT-SMR01-K03-2026-11` misalnya sudah `settlement` sejak uji P2 tanggal 3 November.

Perilaku Midtrans yang diukur di sandbox, memakai `order_id` uji berawalan `UJI-T1-`:

| Percobaan | Hasil |
|---|---|
| Snap untuk `order_id` yang sudah punya transaksi (pending, cancel, atau expire) | **Diterima**: token Snap tetap terbentuk. Penolakan baru terjadi di popup saat metode dipilih, jadi backend tidak bisa mengandalkan galat Snap |
| Snap kedua untuk `order_id` yang baru punya token Snap tanpa metode | Diterima |
| Core API charge untuk `order_id` yang sudah pending | Ditolak `status_code` 406 (dokumen Midtrans "Code 4xx": *Duplicate order ID*) |
| Core API charge untuk `order_id` yang hanya punya token Snap | Diterima |
| API status untuk `order_id` yang hanya punya token Snap | 404, sama dengan `order_id` yang belum pernah dipakai |

Karena Snap tidak menolak di depan, backend bertanya ke API status Midtrans sebelum membuat Snap atau VA untuk setiap percobaan baru. Bila transaksinya sudah ada, atau Midtrans membalas 406, percobaan itu ditandai (`status` `FAILED`, `provider_status` `ORDER_ID_TAKEN`) dan percobaan berikutnya dengan sufiks baru dibuat di permintaan yang sama, paling banyak 5 kali. Penghuni dan investor tidak melihat galat. Notifikasi untuk `order_id` yang ditandai dibalas 200 dengan outcome `ORDER_ID_TAKEN`, dicatat sebagai anomali `UNKNOWN_ORDER` dengan catatan berawalan `ORDER_ID_TAKEN:`, dan tidak pernah melunasi apa pun.

Uji ke sandbox sungguhan dengan server lokal dan properti `UJI03`:

| Langkah | Hasil |
|---|---|
| Penghuni K01 menekan Bayar sewa; `RENT-UJI03-K01-2026-11` sudah `expire` di Midtrans | 201 `RENT-UJI03-K01-2026-11-2` dalam satu klik |
| Investor memesan; `BUY-UJI03-0001` hanya punya token Snap lama (404) | 201 `BUY-UJI03-0001`, tidak dilewati |
| Investor kedua memesan; `BUY-UJI03-0002` sudah punya VA lama | 201, nomor pesanan `BUY-UJI03-0002`, `order_id` pembayaran `BUY-UJI03-0002-2` |
| `npm run webhook:simulate -- RENT-UJI03-K01-2026-11` dan `-- BUY-UJI03-0002` | 200 `ORDER_ID_TAKEN`, anomali tercatat, tagihan tetap `UNPAID`, pesanan tidak lunas |
| `npm run demo:bayar-sewa -- --period 2026-11 --rooms K02`; `RENT-UJI03-K02-2026-11` sudah punya VA lama | Mencetak "sudah dipakai di Midtrans sebelumnya, dilewati", lalu VA `RENT-UJI03-K02-2026-11-2` |

Berkas test: `payment-scenarios.test.ts`, `token-purchase.test.ts`, dan `demo-bank-transfer.test.ts` (bagian "order_id sudah dipakai"), serta `midtrans.test.ts` untuk kode 406.

## VA bernominal besar (16 November 2026)

Untuk merencanakan persiapan demo skenario 9 (investor memegang 1.500 token), Core API sandbox diminta membuat VA Rp150.000.000 dengan `order_id` berawalan `BUY-UJI03-R11-`. VA BCA dan BNI sama-sama diterima (`status_code` 201, `pending`, `gross_amount` 150000000.00). Jadi tidak ada batas nominal VA di bawah Rp150 juta di akun sandbox ini. VA tersebut tidak dibayar.

## Menunggu uji sandbox

| Yang harus dibuktikan | Cara |
|---|---|
| Notifikasi asli dari Midtrans lewat ngrok | Pasang Payment Notification URL di dashboard |
| Tes notifikasi dari dashboard dibalas 200 | Tombol Test notification, tercatat `UNKNOWN_ORDER` |
| Pembayaran GoPay dan ShopeePay lewat deeplink | Simulator deeplink |
| Popup Snap yang dibiarkan terbuka sampai 5 menit habis | S4 dengan popup tetap terbuka |
| Pembelian token dibayar di simulator sampai `TRANSFER_TOKENS` tercatat | Bayar VA pesanan di simulator, jalankan `npm run webhook:simulate -- <order_id pesanan>` dan worker jalur 3 |
| Popup Snap pembelian di atas 100 token benar-benar hanya menampilkan VA | Buka Snap dari `/investor/penawaran` |
| `npm run demo:bayar-sewa -- --period 2026-11` untuk sembilan kamar seed | Butuh server, basis data seed P3, dan pembayaran di simulator |

Cara menguji dari simulator tanpa ngrok: bayar di simulator sandbox, lalu jalankan `webhook:simulate` dengan `order_id` yang tampil di halaman tagihan (atau di keluaran `demo:bayar-sewa`). Setelah basis data diisi ulang, nomor itu bisa bersufiks, mis. `RENT-SMR01-K03-2026-11-2`, karena nomor tanpa sufiks sudah terpakai di sandbox.

```bash
npm run webhook:simulate -- <order_id dari halaman tagihan>
```

Mengirim notifikasi untuk `order_id` lama yang sudah ditandai `ORDER_ID_TAKEN` aman: dibalas `ORDER_ID_TAKEN` dan tidak melunasi tagihan.

Skrip mengambil status asli dari Midtrans, menandatangani notifikasi, dan mengirimnya ke server lokal. Server tetap mengecek ulang ke Midtrans. Skrip yang sama berlaku untuk order `BUY-`.

Untuk membayar semua tagihan satu periode sekaligus, `npm run demo:bayar-sewa -- --period 2026-11` membuat VA per kamar lewat Core API, mencetak nomornya, menunggu kamu membayar di simulator, lalu mengirim notifikasi bertanda tangan yang sama. Sandbox Midtrans tidak punya API resmi untuk membayar VA atau QRIS (dokumen "Testing Payment on Sandbox"), jadi langkah di simulator tetap manual: tempel nomor VA, Inquire, Pay.

| Skenario | Perintah tambahan |
|---|---|
| S6 | `npm run webhook:simulate -- <order_id> --bad-signature` |
| S7 | `npm run webhook:simulate -- <order_id> --gross-amount 1000.00` |

## Keterbatasan yang diketahui

- `settlement` yang berbalik menjadi `deny`, yang jarang terjadi pada Permata, Mandiri Bill, dan Indomaret, tidak membatalkan status lunas. Status lunas tidak pernah mundur; kejadiannya hanya tercatat di log dan akan terlihat di rekonsiliasi.
- `refund` tidak diproses di prototipe.
- Dana percobaan `DUPLICATE_PAID` dan `UNFULFILLED` tidak dikembalikan otomatis. Anomalinya tercatat untuk ditangani manual.
- Pesanan token yang sisihannya lepas karena waktu, tanpa notifikasi `expire`, tetap berstatus `PENDING_PAYMENT` di basis data tetapi dibaca `EXPIRED` di API dan tidak dihitung di sisihan.
- Waktu blok di kuitansi belum tersedia, karena tabel `chain_transactions` belum menyimpan waktu blok.
- Rate limit disimpan di memori proses, jadi kosong lagi saat server restart dan tidak berlaku lintas proses.
- Bila pool benar-benar habis, permintaan gagal setelah menunggu 5 detik (`connectionTimeoutMillis`) dan dibalas 500. Pool masih berukuran bawaan, 10 koneksi.
