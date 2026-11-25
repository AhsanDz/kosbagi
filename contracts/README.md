# contracts

Smart contract KosBagi di Ethereum Sepolia, dibangun dengan Hardhat 3 dan OpenZeppelin Contracts 5. Dikelola jalur 3 (Kontrak & Blockchain).

| Kontrak | Fungsi | Catatan |
|---|---|---|
| `KosToken` | ERC-20 + ERC20Votes, satu kontrak per properti (KB-SMR01) | Hanya alamat lolos KYC yang boleh menerima token; saldo per investor maksimal 10% |
| `KosLedger` | `recordRent`, `recordExpense`, `closePeriod`, `shareOf` | Satu kontrak per token properti. Menolak referensi pembayaran ganda dan sewa kedua untuk kamar + periode yang sama; menyimpan sewa bersih, nilai per token, dan blok snapshot tiap periode |
| `KosVoting` (opsional) | `propose`, `vote`, `tally` | Tidak dibangun di prototipe (keputusan 16 Nov 2026); rancangannya disimpan sebagai pengembangan lanjutan |

Semua fungsi tulis khusus dibatasi peran `AccessControl`: operasi harian (KYC, penyaluran token dari perbendaharaan, pencatatan sewa dan biaya, penutupan periode, jeda) oleh dompet operator; pengaturan peran, registri dokumen, dan jeda darurat oleh dompet admin. Fungsi standar ERC-20 (`transfer`, `approve`, `transferFrom`, `permit`) tetap terbuka bagi pemegang token, tetapi tunduk pada aturan KYC, batas 10%, dan jeda. Data on-chain hanya kode properti, nomor kamar, periode, nominal, `keccak256(order_id)`, dan hash dokumen atau nota, tanpa data pribadi. Rancangan lengkap: [`docs/kontrak/rancangan-kontrak.md`](../docs/kontrak/rancangan-kontrak.md). Keamanan dan gas terukur: [`docs/kontrak/keamanan-dan-gas.md`](../docs/kontrak/keamanan-dan-gas.md). Laporan uji: [`docs/pengujian/kontrak.md`](../docs/pengujian/kontrak.md).

## Versi yang dipakai

| Komponen | Versi |
|---|---|
| Node.js | 24 LTS |
| Hardhat | 3.21.1 (toolbox mocha + ethers 4.0.0) |
| Solidity | 0.8.34, target EVM `osaka` |
| OpenZeppelin Contracts | 5.6.1 |
| ethers.js | 6.17.0 |

Semua versi dipin persis di `package.json` dan `package-lock.json`.

Cara memasang dan menjalankan test ada di [README root](../README.md#menjalankan-secara-lokal).

Catatan keamanan dependensi: `npm ci` melaporkan kerentanan tingkat high dan moderate. Sumbernya `zod` 3.25.76, yang dipakai Hardhat untuk memvalidasi file konfigurasi, serta `glob` dan `minimatch` lewat mocha dan typechain. Semuanya hanya ada di alat pengembangan dan tidak ikut ke kontrak yang di-deploy; `npm audit --omit=dev` menunjukkan 0. `npm audit fix --force` tidak boleh dijalankan karena menurunkan plugin ke versi Hardhat 2 dan merusak proyek.

## Deploy Sepolia

Deploy dan verifikasi memakai variabel environment dari file `.env` di folder ini (contohnya `.env.example`). Langkah lengkap, perkiraan ETH, dan pemecahan masalah ada di [`docs/kontrak/deploy-sepolia.md`](../docs/kontrak/deploy-sepolia.md).

| Variabel | Isi |
|---|---|
| `SEPOLIA_RPC_URL` | URL RPC Sepolia dari Alchemy atau Infura |
| `ADMIN_PRIVATE_KEY` | Private key dompet admin: menandatangani deploy dan pencatatan dokumen. Hanya dipakai di folder ini, tidak pernah di backend |
| `OPERATOR_PRIVATE_KEY` | Private key dompet operator: di folder ini hanya untuk mencocokkan alamat operator |
| `ETHERSCAN_API_KEY` | API key Etherscan untuk verifikasi kontrak, juga untuk membaca event di `npm run links:sepolia` |
| `ISSUANCE_DOCS_DIR` | Opsional, hanya untuk gladi lokal: folder lain berisi tiga dokumen penerbitan |
| `DEPLOY_LABEL` | Opsional, hanya untuk gladi demo di Sepolia: label kontrak baru, mis. `gladi1`. Hasilnya `deployments/sepolia-<label>.json` dan tidak ikut repo. Kosongkan untuk deploy demo akhir (`deployments/sepolia.json`). Lebih aman diisi di terminal |

Verifikasi tetap butuh keempat variabel pertama walaupun tidak mengirim transaksi. `npm run links:sepolia` (tautan Etherscan untuk presentasi dan README) cukup dengan `SEPOLIA_RPC_URL`, ditambah `ETHERSCAN_API_KEY` untuk membaca event; opsinya (`LINKS_FORMAT`, `LINKS_SOURCE`, `LINKS_BLOCK_RANGE`) di panduan deploy bagian 10.

File `.env` diabaikan Git dan **tidak boleh** di-commit. Alternatifnya, simpan nilai terenkripsi dengan `npx hardhat keystore set <NAMA_VARIABEL>`; variabel environment tetap diutamakan bila keduanya ada.

Dompet admin dan operator wajib berbeda; skrip deploy menolak bila sama. Alasannya dan prosedur darurat ada di rancangan kontrak bagian 3.1 dan 3.13, rancangan deploy di bagian 8.

| Jaringan di `hardhat.config.ts` | Keterangan |
|---|---|
| `sepolia` | Akun 1 dari `ADMIN_PRIVATE_KEY`, akun 2 dari `OPERATOR_PRIVATE_KEY` |
| `local8546` | Hardhat node khusus gladi deploy kontrak di port 8546, akun bawaan Hardhat. Port 8545 (`localhost`) dipakai Hardhat node layanan blockchain backend |

## Struktur

```
contracts/
├── contracts/            kode Solidity (KosToken.sol, KosLedger.sol)
├── test/                 test Hardhat TypeScript (mocha + chai)
│   └── fixtures/         angka perhitungan manual dari jalur 1 (skenario 12)
├── ignition/
│   ├── modules/          LocalDeployment.ts (jaringan lokal) dan SepoliaDeployment.ts (deploy Sepolia + dokumen penerbitan)
│   ├── parameters/       alamat dompet per jaringan: sepolia.json (diisi sebelum deploy), lokal.json (akun Hardhat)
│   └── deployments/      jejak Hardhat Ignition per deployment, dibuat saat deploy
├── scripts/
│   ├── deploy.ts         deploy KosToken + KosLedger, catat tiga dokumen, periksa hasil, tulis deployments/
│   ├── verify.ts         periksa bytecode lalu verifikasi kode sumber di Etherscan
│   ├── links.ts          cetak tautan Etherscan kontrak, dompet, dan transaksi penting (npm run links:sepolia)
│   ├── gas-report.ts     ukur gas setiap fungsi tulis pada bytecode production (npm run gas:report)
│   ├── export-abi.ts     salin ABI ke backend/src/blockchain/abi/
│   └── lib/              fungsi bersama skrip (target jaringan, dokumen penerbitan, pemeriksaan, format hasil)
├── deployments/          hasil deploy: sepolia.json (alamat, blok, dokumen, peran); lokal.json dan sepolia-<label>.json tidak ikut repo
├── hardhat.config.ts     versi compiler, profil build, jaringan Sepolia dan lokal, verifikasi
├── tsconfig.json         pengaturan TypeScript untuk test dan skrip
├── .env.example          contoh variabel environment (tanpa nilai asli)
└── package.json          dependensi dan perintah npm
```

Folder hasil build (`artifacts/`, `cache/`, `types/`, `coverage/`) dibuat otomatis dan tidak ikut repo, begitu juga hasil gladi lokal (`deployments/lokal.json`, `ignition/deployments/lokal-*/`), hasil gladi Sepolia berlabel (`deployments/sepolia-<label>.json`, `ignition/deployments/sepolia-smr01-<label>/`), dan jejak Ignition Sepolia utama (`ignition/deployments/sepolia-smr01/`, disimpan koordinator di luar repo).
