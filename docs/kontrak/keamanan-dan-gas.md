# Keamanan dan Gas Smart Contract KosBagi

Ringkasan keamanan `KosToken` dan `KosLedger` beserta layanan blockchain backend yang memanggilnya, ditambah gas terukur setiap fungsi tulis. Ditulis saat finalisasi (progress 5, 20 Nov 2026). Kode kedua kontrak tidak berubah sejak progress 2, jadi isi dokumen ini berlaku untuk kontrak yang di-deploy ke Sepolia.

Dokumen ini merangkum; rinciannya ada di tempat lain:

| Topik | Dokumen |
|---|---|
| Rancangan, keputusan desain, checklist keamanan per kontrak, prosedur darurat | [`rancangan-kontrak.md`](rancangan-kontrak.md) bagian 3.12, 3.13, 4.12, 4.13, 8.7 |
| Deploy, verifikasi Etherscan, tautan demo | [`deploy-sepolia.md`](deploy-sepolia.md) |
| Bukti uji (skenario 10 sampai 12, setiap fungsi tulis, worker) | [`docs/pengujian/kontrak.md`](../pengujian/kontrak.md) |

## 1. Yang dilindungi

| Aset | Di mana | Kenapa penting |
|---|---|---|
| Saldo token investor (hak manfaat ekonomi) | `KosToken`, dompet kustodian per investor | Dasar bagi hasil dan bobot suara; saldo di blok snapshot menentukan bagian tiap pemegang |
| Stok perbendaharaan (12.600 token saat penerbitan) | `KosToken`, dompet perbendaharaan | Satu-satunya sumber token yang dijual ke investor |
| Catatan sewa, biaya, dan periode yang sudah ditutup | `KosLedger` | Angka distribusi final; tidak bisa dikoreksi, jadi catatan palsu atau ganda merugikan investor secara permanen |
| Registri dokumen (hash sertifikat, laporan penilaian, perjanjian pengelolaan) | `KosToken` | Bukti penerbitan yang bisa dicocokkan siapa pun |
| Kunci dompet admin dan operator | `contracts/.env` (admin), `backend/.env` (operator) | Siapa pun yang memegang kunci memegang perannya |
| Data pribadi investor dan penghuni | Basis data backend saja | Tidak boleh pernah sampai ke chain (UU PDP); chain bersifat publik dan permanen |

Kontrak tidak memegang uang maupun ETH. Uang sewa dan pembelian ada di Midtrans sandbox, saldo bagi hasil ada di basis data. Karena itu serangan yang biasa mengincar kontrak DeFi (menguras ETH lewat reentrancy, manipulasi harga) tidak punya sasaran di sini; risiko utamanya kontrol akses, pencatatan ganda, dan kebocoran data.

## 2. Model ancaman singkat

| No | Ancaman | Contoh | Pengaman | Sisa risiko |
|---|---|---|---|---|
| A1 | Pihak tanpa peran memanggil fungsi tulis | Siapa pun bisa mengirim transaksi ke alamat kontrak publik, mis. `recordRent` palsu | `onlyRole` di setiap fungsi tulis berperan; diuji untuk setiap fungsi, termasuk admin yang memanggil fungsi operator (skenario 11) | Tidak ada selama kunci aman |
| A2 | Pencatatan ganda | Webhook Midtrans terkirim dua kali, job diulang setelah RPC putus padahal transaksinya sudah masuk blok | Tiga lapis: constraint unik `order_id` di DB, deduplikasi webhook, dan penolakan referensi ganda di kontrak (bagian 5). Worker membaca status on-chain dulu sebelum mengirim | Tidak ada; lapis kontrak tetap berlaku walaupun dua lapis lain gagal |
| A3 | Dua pembayaran berbeda untuk tagihan yang sama | Percobaan bayar kedua (`-2`) ikut lunas | `RentAlreadyRecorded` per kamar + periode; backend mencatatnya sebagai anomali `DUPLICATE_BILL_PAYMENT` tanpa job | Uangnya dikembalikan di luar chain |
| A4 | Konsentrasi kepemilikan | Investor menumpuk lebih dari 10% suplai | Batas 1.800 token di `_update` untuk semua jalur perpindahan (bagian 6, skenario 10); backend menolak sebelum pembayaran dibuat (skenario 9) | Batas per alamat, bukan per orang (bagian 8) |
| A5 | Token sampai ke alamat yang belum lolos KYC | Transfer antarpemegang ke dompet sembarang | `RecipientNotKycApproved` di `_update`, termasuk `transferFrom` setelah `permit` | Tidak ada |
| A6 | Kunci operator bocor | Penyerang mencatat sewa palsu, menutup periode, menyalurkan stok perbendaharaan | Peran operator dibatasi: tidak bisa mengambil token dari dompet investor, mencetak token, mengganti dokumen, atau memberi peran. Admin terpisah menjalankan prosedur darurat (bagian 4) | Catatan palsu di `KosLedger` permanen; perbaikannya deploy kontrak baru. Rekonsiliasi tiga sumber mendeteksinya |
| A7 | Kunci admin bocor | Penyerang memberi dirinya semua peran | Kunci admin hanya di `contracts/.env` atau keystore terenkripsi Hardhat, tidak pernah di backend atau server; dipakai hanya untuk deploy, dokumen, dan darurat | Diterima untuk prototipe. Produksi: multisig dan timelock (bagian 8) |
| A8 | Manipulasi snapshot bagi hasil | Membeli token di blok penutupan periode supaya ikut dibagi | Snapshot = `block.number - 1` lewat `getPastVotes`; delegasi manual dimatikan sehingga bobot selalu sama dengan saldo | Tidak ada; aturan sama untuk semua pemegang |
| A9 | Replay tanda tangan | Tanda tangan `permit` dipakai ulang atau di chain lain | EIP-712 dengan `chainId`, alamat kontrak, nonce, dan tenggat (OpenZeppelin); `delegateBySig` dimatikan | Tidak ada |
| A10 | `permit` didahului pihak lain | Tanda tangan di mempool dikirim duluan | Akibatnya hanya transaksi `permit` operator yang gagal; allowance tetap terpasang | Tidak merugikan |
| A11 | Data pribadi bocor ke chain | Nama penghuni ikut di referensi pembayaran | Kontrak hanya menerima angka dan hash (bagian 7); `order_id` dibentuk tanpa data pribadi | Tidak ada |
| A12 | Rahasia bocor lewat log atau layar | URL RPC berisi API key tercetak di pesan error | `safeErrorMessage` di worker; sejak P5 error yang dibungkus memakai `RedactedCauseError` sehingga penyebabnya juga tersaring; skrip tautan demo menyaring pesan error sebelum dicetak | Tidak ada di jalur yang diuji |
| A13 | Salah jaringan atau salah kontrak | `SEPOLIA_RPC_URL` menunjuk mainnet, alamat kontrak tertukar | Skrip deploy hanya menerima chain 11155111 dan 31337; worker memeriksa chain id, bahwa kedua alamat KosToken dan KosLedger yang saling terikat, dan bahwa operator memegang perannya | Tidak ada |
| A14 | Dua worker berebut nonce | Worker kedua dinyalakan tidak sengaja | Kunci tunggal di Redis per dompet operator, konkurensi 1 | Tidak ada; worker kedua menolak jalan |
| A15 | Reentrancy, overflow, perulangan tak terbatas | Pola serangan umum Solidity | Tidak ada pengiriman ETH; satu-satunya panggilan keluar adalah `getPastTotalSupply` (`STATICCALL`) ke token `immutable`; Solidity 0.8 + `Math.mulDiv`; tidak ada perulangan | Tidak ada |

## 3. Matriks peran

Peran diberikan konstruktor dan diperiksa 50 pemeriksaan pasca-deploy. Tanda centang berarti boleh memanggil.

### 3.1 `KosToken`

| Fungsi | Peran | Admin | Operator | Pemegang token | Pihak lain |
|---|---|---|---|---|---|
| `setKycStatus` | `KYC_ROLE` | Tidak | Ya | Tidak | Tidak |
| `transferFromTreasury` | `OPERATOR_ROLE` | Tidak | Ya | Tidak | Tidak |
| `anchorDocument` | `DEFAULT_ADMIN_ROLE` | Ya | Tidak | Tidak | Tidak |
| `pause`, `unpause` | `PAUSER_ROLE` | Ya | Ya | Tidak | Tidak |
| `grantRole`, `revokeRole` | `DEFAULT_ADMIN_ROLE` | Ya | Tidak | Tidak | Tidak |
| `renounceRole` | Pemegang peran itu sendiri | Untuk perannya sendiri | Untuk perannya sendiri | Tidak | Tidak |
| `transfer`, `approve`, `transferFrom`, `permit` | Tanpa peran, tunduk KYC, batas 10%, dan jeda | Bila memegang token | Sebagai spender setelah `permit` | Ya | Tidak punya token |
| `delegate`, `delegateBySig` | Dimatikan | Tidak | Tidak | Tidak | Tidak |

### 3.2 `KosLedger`

| Fungsi | Peran | Admin | Operator | Pihak lain |
|---|---|---|---|---|
| `recordRent`, `recordExpense`, `closePeriod` | `OPERATOR_ROLE` | Tidak | Ya | Tidak |
| `pause`, `unpause` | `PAUSER_ROLE` | Ya | Ya | Tidak |
| `grantRole`, `revokeRole` | `DEFAULT_ADMIN_ROLE` | Ya | Tidak | Tidak |

Admin sengaja tidak memegang `OPERATOR_ROLE` maupun `KYC_ROLE`: kunci yang jarang dipakai tidak perlu bisa mencatat transaksi harian, dan kunci yang dipakai tiap hari tidak bisa memberi peran.

### 3.3 Dompet dan kuncinya

| Dompet | Kunci disimpan di | Mengirim transaksi | ETH Sepolia |
|---|---|---|---|
| Admin | `contracts/.env` atau keystore Hardhat; tidak pernah di backend | Deploy, `anchorDocument`, prosedur darurat | Ya |
| Operator | `backend/.env` (juga `contracts/.env` untuk mencocokkan alamat saat deploy) | Semua transaksi harian worker | Ya |
| Pemilik lama, perbendaharaan | MetaMask koordinator, tidak dipakai prototipe | Tidak pernah | 0 |
| Kustodian per investor | Diturunkan backend dari `CUSTODIAL_WALLET_MNEMONIC` | Tidak pernah; hanya menandatangani `permit` di luar chain bila token perlu dikembalikan | 0 |

## 4. Jeda darurat

Kedua kontrak mewarisi jeda dari OpenZeppelin (`ERC20Pausable` di `KosToken`, `Pausable` di `KosLedger`). `PAUSER_ROLE` dipegang admin dan operator.

| Saat dijeda | `KosToken` | `KosLedger` |
|---|---|---|
| Berhenti | Semua perpindahan token: `transferFromTreasury`, `transfer`, `transferFrom` (revert `EnforcedPause`) | `recordRent`, `recordExpense`, `closePeriod` |
| Tetap jalan | `setKycStatus`, `anchorDocument`, `permit`, pengaturan peran, semua fungsi baca | Pengaturan peran, semua fungsi baca termasuk `periods` dan `shareOf` |

Worker memperlakukan `EnforcedPause` sebagai kegagalan sementara: job diulang dengan jeda makin panjang dan tercatat setelah `unpause` (diuji di alur penuh "kontrak dijeda lalu tercatat").

Prosedur bila kunci operator dicurigai bocor, semuanya dari dompet admin (rinciannya di rancangan bagian 3.13 dan 4.13, diuji di kelompok test "prosedur darurat"):

1. `pause()` di `KosToken` dan `KosLedger`.
2. `revokeRole` untuk `OPERATOR_ROLE`, `KYC_ROLE`, dan `PAUSER_ROLE` operator lama di `KosToken`, serta `OPERATOR_ROLE` dan `PAUSER_ROLE` di `KosLedger`. Langkah ini harus mendahului apa pun supaya operator lama tidak sempat `unpause`.
3. Periksa event sejak kunci dicurigai bocor (`npm run links:sepolia` mencetak semuanya, bagian "Jeda darurat" dan "Perubahan peran" ikut muncul) dan cocokkan dengan rekonsiliasi.
4. `grantRole` kelima peran itu ke dompet operator baru, ganti `OPERATOR_PRIVATE_KEY` di backend.
5. `unpause()` di kedua kontrak.

Biaya prosedur ini dihitung dari gas terukur per transaksi (bagian 9): 2 `pause` (94.135) + 5 `revokeRole` (±148.000) + 5 `grantRole` (±258.000) + 2 `unpause` (50.270), sekitar **0,55 juta gas**, atau sekitar 0,0055 ETH pada 10 gwei. Simpan cadangan sebesar itu di dompet admin setelah deploy.

## 5. Penolakan referensi ganda

| Yang dicegah | Kunci keunikan | Fungsi | Revert | Perlakuan worker |
|---|---|---|---|---|
| Satu pembayaran sewa tercatat dua kali | `paymentRef = keccak256(order_id)`, mis. `RENT-SMR01-K03-2026-11` | `recordRent` | `PaymentRefAlreadyRecorded` | Selesai bila `isPaymentRefRecorded` true |
| Dua pembayaran berbeda untuk kamar dan periode yang sama | `(periode, kamar)` | `recordRent` | `RentAlreadyRecorded` | Gagal permanen, ditandai anomali |
| Token terkirim dua kali untuk satu pembelian | `purchaseRef = keccak256(order_id)`, mis. `BUY-SMR01-0001` | `transferFromTreasury` | `PurchaseRefAlreadyUsed` | Selesai bila `isPurchaseRefUsed` true |
| Biaya tercatat dua kali | `receiptHash` = SHA-256 isi file nota | `recordExpense` | `ReceiptAlreadyRecorded` | Selesai hanya bila event `ExpenseRecorded` berisi periode, kategori, dan nominal yang sama; isi berbeda gagal permanen |
| Periode ditutup dua kali, atau catatan masuk setelah ditutup | `periods(p).closed` | `closePeriod`, `recordRent`, `recordExpense` | `PeriodAlreadyClosed` | `closePeriod`: selesai bila sudah tertutup. Sewa atau biaya: gagal permanen tanpa transaksi |

Tiga hal membuat penolakan ini aman dipakai untuk idempotensi:

1. **Referensi dicek sebelum status periode.** Job yang diulang setelah transaksinya ternyata berhasil selalu menerima "sudah tercatat", walaupun periodenya sudah ditutup sesudahnya.
2. **Referensi tidak tersimpan bila transaksi gagal.** Revert membatalkan seluruh perubahan, jadi job yang gagal (mis. saat jeda) bisa diulang dengan referensi yang sama.
3. **Worker membaca dulu, baru mengirim.** Urutannya: riwayat transaksi di DB (tx hash disimpan sebelum disiarkan), lalu status on-chain, baru transaksi baru. Revert "sudah tercatat" baru diterima bila status on-chain-nya cocok. Tombol Coba lagi admin mengakui transaksi lama yang ternyata masuk blok belakangan, tanpa transaksi kedua (diuji dengan memeriksa nonce operator).

## 6. Batas kepemilikan 10%

- `maxBalance = floor(suplai x 1.000 / 10.000)` = **1.800 token**, dihitung dan disimpan `immutable` di konstruktor. Konstruktor menolak suplai yang membuat batas bernilai nol.
- Ditegakkan di `_update`, satu-satunya jalur perubahan saldo: `transferFromTreasury`, `transfer`, `transferFrom` (termasuk setelah `permit`), dan mint. Tidak ada jalan pintas.
- Yang dibandingkan saldo penerima **setelah** perpindahan, jadi transfer ke diri sendiri tidak terhitung ganda. Tepat 1.800 diterima; 1.801 ditolak dengan `BalanceCapExceeded(penerima, saldoBaru, 1800)`.
- Hanya dua alamat yang dikecualikan, keduanya `immutable` dari konstruktor: pemilik lama dan perbendaharaan. Admin maupun operator tidak bisa menambah pengecualian.
- Backend memeriksa batas yang sama sebelum membuat pembayaran (skenario 9: investor yang memegang 1.500 token memesan 500 ditolak, sisa kuota 300). Kontrak adalah lapis terakhir (skenario 10: tiga test, lewat perbendaharaan, antarpemegang, dan tepat 1.800).

## 7. Data on-chain tanpa data pribadi

| Event atau fungsi | Data yang tercatat |
|---|---|
| `TokenIssued`, `DocumentAnchored` | Kode properti, alamat pemilik lama dan perbendaharaan, suplai, jenis dan hash dokumen, nomor versi |
| `KycStatusUpdated` | Alamat dompet kustodian, status lolos atau dicabut |
| `TreasuryTransfer`, `Transfer` | `keccak256(order_id)`, alamat dompet kustodian, jumlah token |
| `RentRecorded` | Periode (`202611`), nomor kamar (`3`), `keccak256(order_id)`, nominal Rupiah |
| `ExpenseRecorded` | Periode, kode kategori (`uint8`), SHA-256 file nota, nominal Rupiah |
| `PeriodClosed` | Angka distribusi periode dan blok snapshot |

Yang tidak pernah on-chain: nama, nomor identitas, email, nomor HP, nomor rekening, `order_id` mentah, isi nota, dan isi dokumen. Hubungan dompet kustodian dengan identitas investor hanya ada di basis data backend.

Catatan: `keccak256` dari `order_id` yang polanya bisa ditebak (`RENT-SMR01-K03-2026-11`) bisa dihitung ulang siapa pun. Itu disengaja, supaya pembayaran bisa dicocokkan secara publik, dan aman karena `order_id` tidak memuat data pribadi. Aturan untuk backend: jangan pernah memasukkan nama atau data pribadi ke `order_id`.

## 8. Keterbatasan yang diketahui

| Keterbatasan | Dampak | Penanganan di prototipe | Bila dikembangkan |
|---|---|---|---|
| **`eth_getLogs` di RPC gratis.** Paket gratis Alchemy hanya mengizinkan rentang 10 blok per `eth_getLogs` (dokumentasi Alchemy, dicek 20 Nov 2026; terbukti 24 Nov 2026). Infura mengizinkan 10.000 blok (diuji 24 Nov 2026: rentang 20.000 ditolak "range 20000 exceeds limit of 10000") | Status on-chain tidak terpengaruh karena dibaca lewat fungsi view (`isPaymentRefRecorded`, `periods`, dan lainnya). Pencarian event di worker hanya mundur 10.000 blok (±33 jam), sama dengan batas Infura. Di Alchemy gratis pencarian itu gagal diam-diam: tx hash dari event bisa kosong, dan nota yang sudah tercatat dianggap selesai tanpa pencocokan isi. Catatan yang lebih tua dari 10.000 blok juga tidak ditemukan | `SEPOLIA_RPC_URL` backend memakai Infura, Alchemy sebagai cadangan. Worker menyimpan tx hash dari transaksinya sendiri, dan rekonsiliasi membaca log di blok yang dicatat worker (satu blok, lolos batas). Skrip tautan demo membaca event lewat API Etherscan | Paket RPC berbayar atau pengindeks event (mis. subgraph) |
| **Satu worker per dompet operator** | Transaksi dikirim satu per satu, sekitar satu transaksi per blok Sepolia (±12 detik); satu putaran demo (26 transaksi operator) butuh beberapa menit. Bila worker mati, antrean menunggu (outbox tersimpan di DB, tidak hilang) | Kunci tunggal Redis, konkurensi 1, berhenti rapi, `npm run worker` dijalankan ulang | Beberapa dompet operator dengan pembagian nonce, pemantauan dan restart otomatis |
| **Kunci di environment variable** | Kunci operator ada di server backend dalam bentuk teks | Dompet khusus testnet, admin terpisah, prosedur darurat | KMS atau HSM untuk operator, multisig untuk admin, `AccessControlDefaultAdminRules` atau timelock |
| **Operator dipercaya untuk nominal biaya** | Kontrak tidak bisa memverifikasi bahwa nota benar; hanya menjamin satu nota sekali | Validasi di backend sebelum job dibuat, hash nota tercatat sehingga bisa diaudit, rekonsiliasi | Persetujuan biaya oleh lebih dari satu pihak, oracle atau auditor |
| **Catatan tidak bisa dikoreksi dan kontrak tidak upgradeable** | Salah catat atau periode yang rusak hanya bisa diperbaiki dengan deploy kontrak baru | Disengaja: buku besar hanya-tambah adalah alasan pencatatan on-chain | Event koreksi terpisah, tetap tanpa menghapus catatan lama |
| **Batas 10% per alamat, bukan per orang** | Satu orang dengan dua akun (dua dompet kustodian) bisa melewati batas | Backend membuat satu dompet kustodian per akun investor yang lolos KYC, dan satu akun hanya boleh punya satu pengajuan aktif. KYC dummy tidak bisa mengenali orang yang sama di dua akun | KYC sungguhan dengan identitas unik per orang |
| **Sepolia testnet** | Tidak ada nilai ekonomi; faucet terbatas; harga gas naik turun | Perkiraan ETH dan cadangan di `deploy-sepolia.md` bagian 2 | Jaringan produksi setelah izin regulator |
| **Satu RPC utama** | RPC putus menghentikan pencatatan sementara | `SEPOLIA_RPC_URL_FALLBACK` opsional (FallbackProvider), job diulang otomatis | Beberapa penyedia RPC |
| **Belum diaudit pihak ketiga** | Checklist dikerjakan sendiri oleh tim | Cakupan 100% baris kedua kontrak, 68 dari 68 uji mutasi `KosLedger` tertangkap, test di profil `production` | Audit independen; uji mutasi `KosToken` |
| **Distribusi di luar chain** | Kontrak menyimpan angka, bukan uang; saldo investor ada di basis data | Rekonsiliasi Midtrans, DB, dan chain | Stablecoin rupiah teregulasi bila diizinkan |

## 9. Gas per fungsi tulis (terukur)

Diukur 20 Nov 2026 dengan `npm run gas:report` (`contracts/scripts/gas-report.ts`): jaringan Hardhat dalam proses, hard fork Osaka, bytecode profil `production` (solc 0.8.34, optimizer 200 runs, sama dengan yang di-deploy), hash dokumen penerbitan asli. Skenarionya satu putaran demo November, lalu fungsi tulis lain di luar demo.

| Kontrak | Fungsi | Kasus | Dompet | Transaksi diukur | Gas per transaksi |
|---|---|---|---|---|---|
| KosToken | deploy | Termasuk dua dokumen versi 1 dan mint 18.000 token | Admin | 1 | 3.073.916 |
| KosLedger | deploy | | Admin | 1 | 1.162.028 |
| KosToken | `anchorDocument` | Jenis dokumen baru, versi 1 (perjanjian pengelolaan) | Admin | 1 | 71.439 |
| KosToken | `anchorDocument` | Versi pengganti (laporan penilaian versi 2) | Admin | 1 | 56.809 |
| KosToken | `setKycStatus` | Meloloskan alamat baru | Operator | 6 | 48.143 |
| KosToken | `setKycStatus` | Mencabut KYC | Operator | 1 | 26.231 |
| KosToken | `transferFromTreasury` | Penerima pertama kali, termasuk delegasi otomatis | Operator | 5 | 191.003 sampai 191.015 |
| KosToken | `transferFromTreasury` | Penerima yang sudah memegang token | Operator | 1 | 136.929 |
| KosToken | `transfer` | Antarpemegang, penerima baru | Pemegang token | 1 | 163.910 |
| KosToken | `transfer` | Antarpemegang, penerima yang sudah memegang token | Pemegang token | 1 | 109.824 |
| KosToken | `approve` | Allowance baru | Pemegang token | 1 | 46.359 |
| KosToken | `permit` | Dikirim operator atas tanda tangan dompet kustodian | Operator | 1 | 74.821 |
| KosToken | `transferFrom` | Mengembalikan seluruh saldo ke perbendaharaan | Operator | 1 | 106.000 |
| KosToken | `pause` / `unpause` | | Admin | 1 / 1 | 47.071 / 25.148 |
| KosToken | `revokeRole` | Mencabut peran operator lama | Admin | 1 | 29.615 |
| KosToken | `grantRole` | Memberi peran ke operator baru | Admin | 1 | 51.523 |
| KosLedger | `recordRent` | Pertama di satu periode | Operator | 1 | 99.039 |
| KosLedger | `recordRent` | Berikutnya di periode yang sama | Operator | 8 | 81.927 sampai 81.939 |
| KosLedger | `recordExpense` | Pertama di satu periode | Operator | 1 | 76.339 |
| KosLedger | `recordExpense` | Berikutnya di periode yang sama | Operator | 4 | 59.227 sampai 59.239 |
| KosLedger | `closePeriod` | Periode November (sembilan sewa, lima biaya) | Operator | 1 | 199.431 |
| KosLedger | `pause` / `unpause` | | Admin | 1 / 1 | 47.064 / 25.122 |

Kenapa angkanya berbeda per kasus:

- **Pertama vs berikutnya.** Menulis slot storage yang masih nol (mis. total sewa periode yang belum pernah diisi) memakan 20.000 gas lebih banyak daripada menambah slot yang sudah terisi, sehingga `recordRent` pertama di suatu periode sekitar 17.000 gas lebih mahal.
- **Delegasi otomatis.** Penerima pertama kali di `KosToken` didelegasikan ke dirinya sendiri dan mendapat checkpoint suara pertama; itu sebabnya `transferFromTreasury` ke investor baru sekitar 54.000 gas lebih mahal daripada pembelian lanjutan.
- **Selisih belasan gas** dalam satu kasus berasal dari isi calldata (jumlah byte nol pada hash referensi dan nominal).

### 9.1 Satu putaran demo

| Dompet | Fungsi | Transaksi | Gas |
|---|---|---|---|
| Admin | Deploy KosToken, deploy KosLedger, `anchorDocument` | 3 | 4.307.383 |
| Operator | `setKycStatus` | 5 | 240.715 |
| Operator | `transferFromTreasury` (5 pertama, 1 lanjutan) | 6 | 1.091.992 |
| Operator | `recordRent` | 9 | 754.539 |
| Operator | `recordExpense` | 5 | 313.283 |
| Operator | `closePeriod` | 1 | 199.431 |

| Dompet | Transaksi | Gas | 1 gwei | 3 gwei | 10 gwei |
|---|---|---|---|---|---|
| Admin (deploy KosToken, KosLedger, `anchorDocument`) | 3 | 4.307.383 | 0,0043 ETH | 0,0129 ETH | 0,0431 ETH |
| Operator (5 KYC, 6 pembelian, 9 sewa, 5 biaya, 1 tutup periode) | 26 | 2.599.960 | 0,0026 ETH | 0,0078 ETH | 0,0260 ETH |
| Jumlah | 29 | 6.907.343 | 0,0069 ETH | 0,0207 ETH | 0,0691 ETH |

Biaya = gas x harga gas. Pembelian Bagas dihitung dipecah dua (900 + 900 token), seperti cadangan bila VA Rp180 juta ditolak sandbox; tanpa pemecahan jumlah operator berkurang 136.929 gas. Saran saldo dompet untuk tiga gladi dan demo akhir ada di [`deploy-sepolia.md`](deploy-sepolia.md) bagian 2.

### 9.2 Pemeriksaan silang

| Sumber | Hasil |
|---|---|
| Gladi deploy di Hardhat node lokal (`npm run deploy:local`, 20 Nov 2026) | KosToken dan KosLedger di alamat yang sama, gas total 4.307.383, sama persis dengan baris admin di atas |
| `npx hardhat test --build-profile production --gas-stats` (181 test) | Median `recordRent` 81.939, `recordExpense` 76.339, `closePeriod` 199.431, `transferFromTreasury` 191.015, `setKycStatus` 48.143; deploy KosToken median 3.073.916 dan KosLedger 1.162.028. Nilai minimum dan maksimum lebih lebar (mis. `closePeriod` 119.945 sampai 200.316) karena test juga memuat kasus tepi: field periode yang tetap nol lebih murah ditulis, nominal yang sangat besar sedikit lebih mahal |
| Ukuran bytecode (profil `production`) | KosToken 10.805 byte, KosLedger 4.607 byte; batas EIP-170 24.576 byte |

Angka di atas diukur di hard fork Osaka. Sepolia sudah tidak memakai aturan gas itu: sejak upgrade jaringan 6 Oktober 2026, biaya gas penyimpanan data lebih mahal. Deploy demo akhir 24 November 2026 di Sepolia memakai 27.839.967 gas (KosToken 19.801.206, KosLedger 7.797.382, `anchorDocument` 241.379), sekitar 6,5 kali angka Hardhat, dengan harga gas efektif 19 wei (biaya 0,000000000537 ETH). Gas fungsi tulis operator di Sepolia belum diukur; worker menghitung batas gas dari `estimateGas` ditambah 20%, jadi tidak bergantung pada tabel ini.

## 10. Checklist sebelum deploy dan demo

Butir kode sudah diperiksa di rancangan bagian 3.12, 4.12, dan 8.7 (skill `solidity-security`): versi Solidity dan OpenZeppelin dipin, custom error, `onlyRole` di semua fungsi tulis, tanpa `tx.origin`, `delegatecall`, `selfdestruct`, maupun alamat hardcode, event untuk setiap perubahan state, tidak upgradeable. Butir operasional untuk koordinator:

- [ ] Dompet admin dan operator berbeda dan khusus testnet; skrip deploy menolak bila sama.
- [ ] `contracts/.env` dan `backend/.env` tidak ikut commit (`git status` bersih dari `.env`); `ADMIN_PRIVATE_KEY` tidak ada di `backend/.env`.
- [ ] Gladi lokal lulus: `npm run deploy:local`, `npm run verify:local`, `npm run links:local`.
- [ ] Ringkasan `npm run deploy:sepolia` diperiksa (alamat operator, hash dokumen) sebelum mengetik `DEPLOY`.
- [ ] `npm run verify:sepolia` selesai; tab Contract kedua kontrak bertanda centang.
- [ ] Worker jalan tanpa peringatan pemeriksaan awal; saldo operator di atas 0,01 ETH.
- [ ] Setelah demo: `npm run links:sepolia` mencetak semua transaksi, dan halaman rekonsiliasi tanpa Selisih yang tidak dijelaskan.
- [ ] Cadangan ETH admin cukup untuk prosedur darurat (bagian 4).

## 11. Cara mengulang pengukuran

Dari folder `contracts/`, tanpa jaringan luar dan tanpa file `.env`:

```bash
npm run gas:report
npx hardhat test --build-profile production --gas-stats
```

`gas:report` mencetak tabel bagian 9 dalam format Markdown. Skrip memeriksa bahwa penutupan periode November menghasilkan sewa bersih Rp7.897.500 dan 43875 sen per token; bila tidak, pengukuran dihentikan supaya angka gas tidak berasal dari skenario yang salah.
