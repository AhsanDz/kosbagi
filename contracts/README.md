# contracts

Smart contract KosBagi di Ethereum Sepolia, dibangun dengan Hardhat 3 dan OpenZeppelin Contracts 5. Dikelola jalur 3 (Kontrak & Blockchain).

| Kontrak | Fungsi | Catatan |
|---|---|---|
| `KosToken` | ERC-20 + ERC20Votes, satu kontrak per properti (KB-SMR01) | Hanya alamat lolos KYC yang boleh menerima token; saldo per investor maksimal 10% |
| `KosLedger` | `recordRent`, `recordExpense`, `closePeriod`, `shareOf` | Satu kontrak per token properti. Menolak referensi pembayaran ganda dan sewa kedua untuk kamar + periode yang sama; menyimpan sewa bersih, nilai per token, dan blok snapshot tiap periode |
| `KosVoting` (opsional) | `propose`, `vote`, `tally` | Bobot suara dari saldo token di blok saat proposal dibuat (progress 4) |

Semua fungsi tulis khusus dibatasi peran `AccessControl`: operasi harian (KYC, penyaluran token dari perbendaharaan, pencatatan sewa dan biaya, penutupan periode, jeda) oleh dompet operator; pengaturan peran, registri dokumen, dan jeda darurat oleh dompet admin. Fungsi standar ERC-20 (`transfer`, `approve`, `transferFrom`, `permit`) tetap terbuka bagi pemegang token, tetapi tunduk pada aturan KYC, batas 10%, dan jeda. Data on-chain hanya kode properti, nomor kamar, periode, nominal, `keccak256(order_id)`, dan hash dokumen atau nota, tanpa data pribadi. Rancangan lengkap: [`docs/kontrak/rancangan-kontrak.md`](../docs/kontrak/rancangan-kontrak.md). Laporan uji: [`docs/pengujian/kontrak.md`](../docs/pengujian/kontrak.md).

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

## Konfigurasi Sepolia (mulai progress 3)

Deploy dan verifikasi memakai variabel environment. Salin `.env.example` menjadi `.env` di folder ini lalu isi nilainya:

| Variabel | Isi |
|---|---|
| `SEPOLIA_RPC_URL` | URL RPC Sepolia dari Alchemy atau Infura |
| `OPERATOR_PRIVATE_KEY` | Private key dompet operator (dompet khusus testnet) |
| `ETHERSCAN_API_KEY` | API key Etherscan untuk verifikasi kontrak |

File `.env` diabaikan Git dan **tidak boleh** di-commit. Alternatifnya, simpan nilai terenkripsi dengan `npx hardhat keystore set <NAMA_VARIABEL>`; variabel environment tetap diutamakan bila keduanya ada.

Dompet admin (pemegang `DEFAULT_ADMIN_ROLE`) sebaiknya berbeda dari dompet operator. Saat deploy cukup alamatnya; kunci admin tidak perlu ada di `.env` backend. Alasannya dan prosedur darurat ada di rancangan kontrak bagian 3.1 dan 3.13.

## Struktur

```
contracts/
├── contracts/          kode Solidity (KosToken.sol, KosLedger.sol)
├── test/               test Hardhat TypeScript (mocha + chai)
│   └── fixtures/       angka perhitungan manual dari jalur 1 (skenario 12)
├── ignition/modules/   modul deploy Hardhat Ignition (LocalDeployment.ts untuk jaringan lokal)
├── scripts/            export-abi.ts menyalin ABI ke backend/src/blockchain/abi/; verifikasi dan data demo on-chain menyusul di P3
├── deployments/        alamat kontrak hasil deploy Sepolia
├── hardhat.config.ts   versi compiler, profil build, jaringan Sepolia, verifikasi
├── tsconfig.json       pengaturan TypeScript untuk test dan skrip
├── .env.example        contoh variabel environment (tanpa nilai asli)
└── package.json        dependensi dan perintah npm
```

Folder hasil build (`artifacts/`, `cache/`, `types/`, `coverage/`) dibuat otomatis dan tidak ikut repo.
