# Panduan Deploy dan Verifikasi Sepolia

Panduan ini untuk koordinator yang men-deploy `KosToken` dan `KosLedger` KB-SMR01 ke Ethereum Sepolia, mencatat tiga dokumen penerbitan, lalu memverifikasi kode sumbernya di Etherscan. Rancangannya dijelaskan di [`rancangan-kontrak.md`](rancangan-kontrak.md) bagian 8.

Semua perintah dijalankan dari folder `contracts/` di clone repo (mis. `$HOME\Documents\GitHub\kosbagi\contracts`), memakai Node.js 24 LTS, setelah `npm ci`. Kalau PowerShell menolak menjalankan `npm` atau `npx`, jalankan perintah yang sama di Command Prompt.

## 1. Gambaran

| Langkah | Perintah | Butuh ETH | Hasil |
|---|---|---|---|
| Gladi lokal | `npm run node:local` lalu `npm run deploy:local` dan `npm run verify:local` | Tidak (akun bawaan Hardhat) | `deployments/lokal.json` (tidak ikut repo) |
| Gladi demo di Sepolia (kontrak baru setiap gladi) | `DEPLOY_LABEL=<label>` lalu `npm run deploy:sepolia` (bagian 5.2) | Ya, dari dompet admin | `deployments/sepolia-<label>.json` (tidak ikut repo) |
| Deploy Sepolia untuk demo akhir | `npm run deploy:sepolia` tanpa `DEPLOY_LABEL` | Ya, dari dompet admin | `deployments/sepolia.json` |
| Verifikasi | `npm run verify:sepolia` | Tidak, hanya API key Etherscan | Kode sumber terverifikasi, status ditulis ke berkas hasil yang sama |

Skrip deploy mengirim tiga transaksi, semuanya ditandatangani **dompet admin**:

1. deploy `KosToken`: konstruktor mencatat hash sertifikat dan laporan penilaian versi 1, mencetak 5.400 token ke pemilik lama dan 12.600 ke perbendaharaan, dan memberi peran;
2. deploy `KosLedger` yang terhubung ke `KosToken`;
3. `anchorDocument(DOCUMENT_MANAGEMENT_AGREEMENT, hash)` untuk perjanjian pengelolaan.

Hash ketiga dokumen dihitung skrip dari file di `docs/bisnis/dokumen-penerbitan/` saat dijalankan. Tidak ada hash yang ditulis tangan.

## 2. Dompet dan perkiraan ETH

| Dompet | Fungsi | Kunci dipakai di | ETH Sepolia |
|---|---|---|---|
| Admin | Pemegang `DEFAULT_ADMIN_ROLE` dan `PAUSER_ROLE`. Menandatangani deploy, pencatatan dokumen, dan prosedur darurat | `contracts/.env` saja | Disarankan **0,15 ETH** untuk tiga gladi + demo akhir (0,05 ETH bila hanya satu deploy) |
| Operator | Pemegang peran operasional. Mengirim semua transaksi harian worker backend | `backend/.env` (dan `contracts/.env` untuk pencocokan alamat) | Disarankan **0,15 ETH** untuk tiga gladi + demo akhir (0,1 ETH bila hanya satu demo) |
| Pemilik lama | Menerima 5.400 token saat deploy | Tidak dipakai | 0 |
| Perbendaharaan | Menerima 12.600 token; token keluar lewat `transferFromTreasury` oleh operator | Tidak dipakai | 0 |
| Dompet kustodian investor | Diturunkan backend dari `CUSTODIAL_WALLET_MNEMONIC` | Tidak pernah menandatangani | 0 |

Keempat dompet pertama harus beralamat berbeda; skrip menolak bila ada yang sama. Untuk pemilik lama dan perbendaharaan cukup buat dua akun baru di MetaMask dan salin alamatnya. Kuncinya tidak dipakai prototipe, tetapi tetap simpan di MetaMask.

### Dasar perkiraan

Gas yang terukur saat gladi deploy (profil `production`):

| Transaksi | Gas |
|---|---|
| Deploy KosToken | 3.073.916 |
| Deploy KosLedger | 1.162.028 |
| `anchorDocument` perjanjian pengelolaan | 71.439 |
| **Total deploy** | **4.307.383** |

Biaya = gas x harga gas. Harga gas Sepolia naik turun; cek dulu di https://sepolia.etherscan.io/gastracker.

| Harga gas | Biaya deploy (dompet admin) |
|---|---|
| 1 gwei | 0,0043 ETH |
| 3 gwei | 0,0129 ETH |
| 10 gwei | 0,0431 ETH |
| 30 gwei | 0,1292 ETH |

Sebelum mengirim, skrip mensyaratkan saldo admin minimal **4.500.000 gas x harga gas maksimum** yang dilaporkan RPC saat itu. Harga maksimum = dua kali harga dasar (base fee) ditambah tip (biasanya 1 gwei), jadi syarat saldonya kira-kira dua kali biaya sebenarnya. Kelebihannya tidak terpakai dan tetap di dompet.

| Harga dasar Sepolia | Syarat saldo skrip | Biaya sebenarnya (perkiraan) |
|---|---|---|
| 1 gwei | 0,0135 ETH | 0,0086 ETH |
| 3 gwei | 0,0315 ETH | 0,0172 ETH |
| 5 gwei | 0,0495 ETH | 0,0258 ETH |
| 10 gwei | 0,0945 ETH | 0,0474 ETH |

Selain deploy, admin perlu cadangan untuk prosedur darurat (rancangan bagian 3.13: dua `pause`, lima `revokeRole`, lima `grantRole`, dua `unpause`, sekitar 0,6 juta gas atau 0,006 ETH pada 10 gwei) dan pembaruan dokumen (57.000 sampai 71.000 gas per versi).

### Satu gladi atau satu demo

Catatan on-chain tidak ikut terhapus saat basis data di-reset: periode yang sudah ditutup tidak bisa ditutup lagi, saldo token investor tetap (pembelian ulang Bagas ditolak batas 1.800 token), dan nota yang sama sudah tercatat. Karena itu **setiap gladi demo di Sepolia memakai kontrak baru** (keputusan 20 Nov 2026, bagian 5.2), dan setiap gladi membayar deploy sekali lagi. Perkiraan gas satu putaran demo (angka transaksi operator dari rancangan bagian 3.10 dan 4.11):

| Kegiatan | Dompet | Hitungan | Gas |
|---|---|---|---|
| Deploy KosToken, KosLedger, `anchorDocument` | Admin | Terukur saat gladi lokal | 4.307.383 |
| KYC lima investor (Bagas, Citra, Eko, Fajar, Dimas) | Operator | 5 x 48.000 | 240.000 |
| Pembelian token | Operator | 5 pembelian pertama x 191.000 + 1 pembelian lanjutan x 137.000 (bila VA Bagas dipecah) | 1.092.000 |
| Sewa November, sembilan kamar | Operator | 99.000 + 8 x 82.000 | 755.000 |
| Biaya November (persiapan dan nota K07) | Operator | 76.000 + 5 x 59.000 (perkiraan enam nota) | 371.000 |
| Tutup periode | Operator | 199.000 | 199.000 |
| **Jumlah operator** | | | **±2,66 juta** |
| **Jumlah satu putaran** | | | **±6,97 juta** |

| Harga gas | Admin per putaran | Operator per putaran | Tiga gladi + demo akhir (admin / operator) |
|---|---|---|---|
| 1 gwei | 0,0043 ETH | 0,0027 ETH | 0,017 / 0,011 ETH |
| 3 gwei | 0,0129 ETH | 0,0080 ETH | 0,052 / 0,032 ETH |
| 10 gwei | 0,0431 ETH | 0,0266 ETH | 0,172 / 0,106 ETH |

Saran isi dompet untuk **tiga gladi + demo akhir** (empat deploy dan empat putaran demo):

- **Admin 0,15 ETH.** Pada harga dasar 5 gwei, empat deploy memakan sekitar 4 x 0,0258 = 0,103 ETH. Sebelum deploy keempat, skrip tetap mensyaratkan saldo 0,0495 ETH, jadi total yang dibutuhkan sekitar 0,127 ETH, ditambah cadangan prosedur darurat 0,006 ETH. Bila harga dasar di atas 5 gwei, tunggu harga turun atau tambah saldo admin.
- **Operator 0,15 ETH.** Empat putaran sekitar 10,6 juta gas, atau 0,106 ETH pada 10 gwei, ditambah ruang untuk percobaan ulang, transaksi yang gagal (tetap memakai gas), Coba lagi admin, dan lonjakan harga gas. Worker memberi peringatan bila saldo operator di bawah 0,01 ETH.

Bila hanya satu deploy dan satu demo tanpa gladi, admin 0,05 ETH dan operator 0,1 ETH sudah cukup.

ETH Sepolia didapat dari faucet (mis. Google Cloud Web3, Alchemy, atau Infura). Syarat dan jumlahnya berubah-ubah, jadi cek di situs masing-masing dan isi dompet beberapa hari sebelum deploy.

## 3. Persiapan sekali

### 3.1 Kunci dan API key

1. Buat URL RPC Sepolia di Alchemy atau Infura.
2. Buat API key di https://etherscan.io/myapikey (satu key berlaku untuk Sepolia).
3. Ekspor private key dompet admin dan operator dari MetaMask (Detail akun, Tampilkan kunci pribadi). Pakai dompet khusus testnet, jangan dompet pribadi.
4. Salin `contracts/.env.example` menjadi `contracts/.env`, lalu isi:

   | Variabel | Isi |
   |---|---|
   | `SEPOLIA_RPC_URL` | URL RPC dari langkah 1 |
   | `ADMIN_PRIVATE_KEY` | Private key dompet admin, `0x` + 64 karakter heksadesimal |
   | `OPERATOR_PRIVATE_KEY` | Private key dompet operator. Skrip deploy hanya memakainya untuk mencocokkan alamat operator, tidak mengirim transaksi dari dompet ini |
   | `ETHERSCAN_API_KEY` | API key dari langkah 2 |

   Biarkan `ISSUANCE_DOCS_DIR` kosong.

`contracts/.env` diabaikan Git. Jangan menyalin `ADMIN_PRIVATE_KEY` ke `backend/.env`, dan jangan mengirim isi `.env` lewat chat atau Drive.

Alternatif yang lebih aman untuk kunci admin: simpan terenkripsi dengan `npx hardhat keystore set ADMIN_PRIVATE_KEY` (Hardhat meminta kata sandi setiap kali dipakai). Bila variabel yang sama juga ada di `.env`, nilai `.env` yang dipakai.

### 3.2 Alamat dompet

Isi `contracts/ignition/parameters/sepolia.json` dengan empat alamat (huruf besar kecil bebas):

```json
{
  "KosBagiSepolia": {
    "admin": "0x...alamat dompet admin",
    "operator": "0x...alamat dompet operator",
    "originalOwner": "0x...alamat dompet pemilik lama",
    "treasury": "0x...alamat dompet perbendaharaan",
    "propertyCode": "SMR01"
  }
}
```

Alamat bukan rahasia; file ini ikut di-commit setelah deploy sebagai catatan parameter. Jangan menambah kunci lain (mis. hash dokumen): skrip menolaknya.

### 3.3 Periksa dokumen penerbitan

Ketiga file ini harus ada dan isinya final, karena hash-nya tercatat permanen:

- `docs/bisnis/dokumen-penerbitan/sertifikat-hak-milik.md`
- `docs/bisnis/dokumen-penerbitan/laporan-penilaian.md`
- `docs/bisnis/dokumen-penerbitan/perjanjian-pengelolaan.md`

`README.md` di folder yang sama hanya penjelasan dari jalur 1 dan tidak ikut dicatat; skrip hanya membaca tiga nama file di atas.

Untuk melihat hash-nya sendiri (PowerShell, dari root repo):

```powershell
Get-FileHash docs\bisnis\dokumen-penerbitan\*.md -Algorithm SHA256
```

Hasilnya harus sama dengan yang dicetak skrip deploy (skrip menambahkan awalan `0x` dan memakai huruf kecil). Skrip menolak file yang memakai akhir baris CRLF atau diawali BOM; bila itu terjadi, ambil ulang file dari Git, jangan menyimpannya ulang dengan editor.

## 4. Gladi di Hardhat node lokal

Wajib dijalankan sebelum Sepolia. Gladi memakai modul, skrip, dan file dokumen yang sama, dengan akun bawaan Hardhat dan port 8546 (port 8545 dipakai Hardhat node layanan blockchain backend).

Terminal 1:

```
npm run node:local
```

Biarkan menyala. Terminal 2:

```
npm run deploy:local
npm run verify:local
```

Hasil yang benar:

- ringkasan menampilkan tiga hash dokumen yang sama dengan `Get-FileHash`;
- `Pemeriksaan pasca-deploy: 50 dari 50 sesuai.`;
- KosToken di `0x5FbDB2315678afecb367f032d93F642f64180aa3` dan KosLedger di `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` bila node baru dinyalakan;
- `Gas total : 4307383`;
- `verify:local` mencetak `Pemeriksaan bytecode lulus.`

Hentikan node dengan Ctrl+C. Setiap kali node dinyalakan ulang, chain lokal kosong lagi dan `deploy:local` bisa diulang.

## 5. Deploy ke Sepolia

Ada dua jenis deploy Sepolia, dengan perintah yang sama:

| Jenis | `DEPLOY_LABEL` | Id deployment Ignition | Berkas hasil | Ikut repo |
|---|---|---|---|---|
| Deploy utama (demo akhir) | Kosong atau tidak diisi | `sepolia-smr01` | `deployments/sepolia.json` | Ya, berkas hasilnya |
| Gladi demo | Diisi, mis. `gladi1` | `sepolia-smr01-gladi1` | `deployments/sepolia-gladi1.json` | Tidak (diabaikan Git) |

Pemeriksaan keduanya sama: chain id, alamat dan kunci, hash dokumen dari `docs/bisnis/dokumen-penerbitan/` (`ISSUANCE_DOCS_DIR` tetap ditolak), cek saldo admin, konfirmasi `DEPLOY`, dan 50 pemeriksaan pasca-deploy.

### 5.1 Deploy utama

```
npm run deploy:sepolia
```

Urutan yang terjadi:

1. Skrip mengompilasi dengan profil `production`, memastikan chain id 11155111, membaca alamat, dan mencocokkan alamat admin dan operator dengan kuncinya.
2. Skrip mencetak ringkasan: empat alamat, tiga hash dokumen, harga gas, perkiraan biaya, dan saldo admin. Bila saldo kurang, skrip berhenti tanpa mengirim apa pun.
3. Periksa ringkasan itu, terutama alamat operator dan hash dokumen. Ketik `DEPLOY` lalu Enter untuk melanjutkan; jawaban lain membatalkan.
4. Hardhat Ignition mengirim tiga transaksi dan menunggu konfirmasi. Totalnya beberapa menit.
5. Skrip membaca ulang kontrak (50 pemeriksaan), lalu menulis `deployments/sepolia.json` dan mencetak tautan Etherscan serta baris untuk `backend/.env`.

**Bila terputus** (RPC error, laptop mati, Ctrl+C), jalankan `npm run deploy:sepolia` lagi. Ignition melanjutkan dari jejak di `ignition/deployments/sepolia-smr01/` dan tidak men-deploy ulang kontrak yang sudah jadi. Jangan mengubah file dokumen, `sepolia.json` parameter, atau kode kontrak di antaranya, dan jangan menghapus folder jejak itu.

Karena alasan yang sama, menjalankan `npm run deploy:sepolia` tanpa label setelah deploy utama selesai **tidak** membuat kontrak baru; skrip hanya membaca ulang kontrak lama dan menulis ulang `deployments/sepolia.json`. Untuk kontrak baru, pakai gladi berlabel (bagian 5.2).

### 5.2 Gladi demo berulang (`DEPLOY_LABEL`)

Setiap gladi demo yang dijalankan di Sepolia diawali deploy kontrak baru berlabel, lalu basis data di-reset. Urutannya:

1. Pilih label baru untuk setiap gladi: huruf kecil, angka, dan tanda hubung, 1 sampai 20 karakter, mis. `gladi1`, `gladi2`, `gladi3`. Label yang sudah dipakai melanjutkan gladi itu (bila terputus), bukan membuat kontrak baru.
2. Isi `DEPLOY_LABEL` di terminal, lalu jalankan deploy:

   | Terminal | Perintah |
   |---|---|
   | PowerShell | `$env:DEPLOY_LABEL="gladi1"; npm run deploy:sepolia` |
   | Command Prompt | `set DEPLOY_LABEL=gladi1` lalu `npm run deploy:sepolia` |
   | Git Bash | `DEPLOY_LABEL=gladi1 npm run deploy:sepolia` |

   Variabel ini juga boleh ditulis di `contracts/.env`, tetapi mengisinya di terminal lebih aman supaya tidak terbawa ke deploy demo akhir. Di PowerShell dan Command Prompt nilainya bertahan sampai jendela terminal ditutup; kosongkan dengan `$env:DEPLOY_LABEL=""` atau `set DEPLOY_LABEL=`.
3. Ringkasan mencetak `Jenis deploy : gladi berlabel gladi1`, `Id deployment Ignition : sepolia-smr01-gladi1`, dan `Berkas hasil : contracts/deployments/sepolia-gladi1.json`. Periksa, lalu ketik `DEPLOY`.
4. Isi `backend/.env` dengan `KOS_TOKEN_ADDRESS` dan `KOS_LEDGER_ADDRESS` yang dicetak skrip.
5. Kosongkan basis data dan jalankan seed lagi (langkah di README root), lalu nyalakan ulang worker. Worker memeriksa bahwa kedua alamat itu KosToken dan KosLedger yang saling terikat dan bahwa operator memegang perannya.
6. Opsional: verifikasi kontrak gladi dengan `DEPLOY_LABEL` yang sama, lalu `npm run verify:sepolia`. Statusnya ditulis ke `deployments/sepolia-gladi1.json`.

Untuk **demo akhir**, kosongkan `DEPLOY_LABEL` (atau buka terminal baru), jalankan `npm run deploy:sepolia`, lalu ikuti bagian 6 dan 7. Ringkasan harus menulis `Jenis deploy : utama (tanpa DEPLOY_LABEL)` dan `Berkas hasil : contracts/deployments/sepolia.json`.

Hasil gladi (`deployments/sepolia-<label>.json`) dan jejak Ignition-nya (`ignition/deployments/sepolia-smr01-<label>/`) diabaikan Git. Simpan berkas hasil gladi selama gladi itu masih dipakai; bila jejak Ignition sebuah label sudah dihapus tetapi berkas hasilnya masih ada, skrip menolak label itu supaya alamat gladi lama tidak tertimpa diam-diam.

Bila deploy utama (`sepolia-smr01`) terlanjur dipakai untuk gladi sebelum keputusan ini, demo akhir tetap butuh kontrak baru: pindahkan folder `ignition/deployments/sepolia-smr01/` ke luar repo sebagai arsip, lalu jalankan `npm run deploy:sepolia` tanpa label. Skrip men-deploy kontrak baru dan menulis ulang `deployments/sepolia.json`.

## 6. Verifikasi Etherscan

```
npm run verify:sepolia
```

Skrip membaca `deployments/sepolia.json` (atau `deployments/sepolia-<label>.json` bila `DEPLOY_LABEL` diisi), membandingkan bytecode di Sepolia dengan hasil build `production`, lalu mengirim kode sumber dan argumen konstruktor ke Etherscan. Bila Etherscan belum mengindeks kontrak yang baru di-deploy, tunggu satu sampai dua menit lalu ulangi. Kontrak yang sudah terverifikasi dilewati.

Setelah selesai, tab Contract di Etherscan menampilkan tanda centang dan kode sumber, dan tab Read Contract bisa dipakai untuk memeriksa `currentDocumentHash`, `balanceOf`, `hasRole`, dan `periods`.

## 7. Setelah deploy

Bagian ini untuk deploy utama (demo akhir). Untuk gladi, cukup langkah 1 dan 2, lalu reset basis data (bagian 5.2); berkas hasil gladi tidak di-commit.

1. **Periksa di Etherscan**: tiga transaksi dari dompet admin, saldo 5.400 dan 12.600 di tab Holders, dan `currentDocumentHash` ketiga jenis dokumen sama dengan hash di `deployments/sepolia.json`. Nilai jenis dokumen (`typeHash`) juga ada di berkas itu.
2. **Isi `backend/.env`** dengan baris yang dicetak skrip:

   ```
   KOS_TOKEN_ADDRESS=<contracts.KosToken.address>
   KOS_LEDGER_ADDRESS=<contracts.KosLedger.address>
   CHAIN_ID=11155111
   ```

   Ditambah `SEPOLIA_RPC_URL` dan `OPERATOR_PRIVATE_KEY` yang sama dengan `contracts/.env`. **Jangan** menyalin `ADMIN_PRIVATE_KEY`.
3. **Commit** (lewat paket koordinator, sesuai alur repo):
   - `contracts/deployments/sepolia.json`
   - `contracts/ignition/parameters/sepolia.json`

   Folder jejak Ignition `contracts/ignition/deployments/sepolia-smr01/` (sekitar 4 MB karena memuat build info) **tidak** di-commit dan sudah masuk `.gitignore` (keputusan 15 November 2026). Simpan salinannya di luar repo, misalnya di Drive koordinator, karena folder itu dibutuhkan untuk melanjutkan deploy yang terputus dan untuk `npx hardhat ignition status sepolia-smr01 --network sepolia`. `deployments/sepolia.json` sudah cukup untuk backend dan verifikasi.
4. **Halaman publik**: alamat kontrak dan hash dokumen di frontend diperbarui koordinator dari `deployments/sepolia.json` (kontrak kerja P3 bagian 7).
5. Simpan dompet admin dengan baik. Dompet ini satu-satunya jalan untuk prosedur darurat (rancangan bagian 3.13 dan 4.13).

## 8. Isi `deployments/sepolia.json`

| Field | Isi |
|---|---|
| `network`, `chainId`, `explorerUrl` | Jaringan tempat deploy |
| `ignitionDeploymentId` | `sepolia-smr01` (gladi: `sepolia-smr01-<label>`) |
| `deployLabel` | `null` untuk deploy utama, label untuk gladi |
| `recordedAt` | Waktu berkas ditulis (UTC) |
| `propertyCode`, `tokenSymbol` | `SMR01`, `KB-SMR01` |
| `compiler` | `solc` 0.8.34, `osaka`, profil `production`, optimizer 200 runs |
| `wallets` | Alamat admin, operator, pemilik lama, perbendaharaan |
| `parameters` | 5.400, 12.600, 500 bp, 2.200 bp |
| `contracts.KosToken`, `contracts.KosLedger` | `address`, `fullyQualifiedName`, `deployTxHash`, `blockNumber`, `gasUsed`, `constructorArgs`, dan `etherscan` setelah verifikasi |
| `documents[]` | `type`, `typeHash`, `label`, `file`, `sha256`, `sizeBytes`, `version`, `txHash` dan `blockNumber` transaksi pencatatnya |
| `roles` | Pemegang tiap peran di kedua kontrak |
| `totalGasUsed` | Total gas tiga transaksi deploy |

Semua isinya data publik yang juga terlihat di Etherscan. Tidak ada kunci di berkas ini.

## 9. Pemecahan masalah

| Pesan | Penyebab | Perbaikan |
|---|---|---|
| `Jalankan dengan --build-profile production` | Skrip dijalankan dengan `npx hardhat run` biasa | Pakai `npm run deploy:sepolia` atau `npm run verify:sepolia` |
| `Configuration Variable "ADMIN_PRIVATE_KEY" not found` (atau variabel lain) | `contracts/.env` belum ada atau variabelnya kosong | Isi sesuai bagian 3.1 |
| `Invalid private key value for ...` | Format kunci salah | Kunci harus `0x` + 64 karakter heksadesimal |
| `Chain id ... tidak didukung` | `SEPOLIA_RPC_URL` menunjuk jaringan lain | Pakai URL RPC Sepolia |
| `"admin" masih alamat nol` | `ignition/parameters/sepolia.json` belum diisi | Isi sesuai bagian 3.2 |
| `Akun penanda tangan pertama (...) bukan alamat admin` | `ADMIN_PRIVATE_KEY` milik dompet lain | Samakan kunci dan alamat admin |
| `Alamat operator di ... tidak sama dengan alamat dari OPERATOR_PRIVATE_KEY` | Salah ketik alamat operator, atau kunci operator salah | Perbaiki salah satunya. Jangan dilanjutkan: peran akan jatuh ke alamat yang salah |
| `harus empat alamat yang berbeda` | Dua peran memakai dompet yang sama | Buat dompet terpisah |
| `Dokumen penerbitan tidak ditemukan` | File jalur 1 belum ada di clone | Tarik `main` terbaru |
| `memakai akhir baris CRLF` atau `diawali BOM` | File dokumen berubah setelah diambil dari Git | Pulihkan file dari Git |
| `Saldo admin kurang dari perkiraan biaya` | ETH admin belum cukup | Isi dompet admin dari faucet |
| `ISSUANCE_DOCS_DIR hanya untuk gladi lokal` | Variabel itu terisi saat deploy Sepolia | Kosongkan di `contracts/.env` |
| `DEPLOY_LABEL "..." tidak valid` | Label memakai huruf besar, spasi, atau karakter lain | Pakai huruf kecil, angka, dan tanda hubung, mis. `gladi1` |
| `... sudah ada dari gladi sebelumnya, tetapi jejak Ignition ... tidak ada` | Label yang sama dipakai lagi setelah jejaknya dihapus | Pakai label baru |
| Deploy tanpa label tidak membuat kontrak baru | Jejak `sepolia-smr01` sudah ada, jadi Ignition melanjutkannya | Untuk gladi pakai `DEPLOY_LABEL`; untuk demo akhir lihat paragraf terakhir bagian 5.2 |
| Ringkasan menulis `gladi berlabel` padahal ingin deploy demo akhir | `DEPLOY_LABEL` masih terisi di terminal atau `contracts/.env` | Jawab selain `DEPLOY`, kosongkan variabelnya, lalu ulangi |
| Ignition melaporkan reconciliation failed | Parameter, dokumen, atau kode berubah setelah deploy sebelumnya terputus | Kembalikan ke kondisi semula. Bila memang ingin deploy baru, konsultasikan dulu: jejak lama harus diarsipkan |
| `Bytecode ... berbeda dengan hasil build saat ini` (verifikasi) | Kode kontrak atau `hardhat.config.ts` berubah sejak deploy | Kembalikan ke commit saat deploy, lalu ulangi |
| `Hasil deploy tidak ditemukan` (verifikasi) | `deployments/sepolia.json` belum ada | Jalankan deploy lebih dulu |
| `Tidak ada kontrak di ...` (`verify:local`) | Hardhat node lokal dinyalakan ulang | Jalankan `deploy:local` lagi |
