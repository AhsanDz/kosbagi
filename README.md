# KosBagi

Platform tokenisasi hak manfaat ekonomi kos mahasiswa di sekitar Universitas Brawijaya, Malang. Investor membeli token mulai Rp100.000 per token dan menerima bagi hasil sewa bulanan. Setiap pembayaran sewa penghuni lewat Midtrans tercatat di smart contract Ethereum Sepolia, sehingga pendapatan yang menjadi dasar bagi hasil bisa diverifikasi per transaksi.

> Prototipe tugas akhir mata kuliah **Teknologi Blockchain dan Platform Keuangan Digital** (kelas B, FILKOM UB), Kelompok 9. Prototipe hanya berjalan di **Midtrans sandbox** dan **Ethereum Sepolia testnet** dengan **data dummy**: tidak ada uang nyata, token bernilai, KTP, atau nomor rekening asli.

## Studi kasus

**Kos Sumbersari 01**: 10 kamar eksklusif, sewa Rp1.500.000 per kamar per bulan, nilai properti Rp1,8 miliar.

| Item | Nilai |
|---|---|
| Token | KB-SMR01, 18.000 token @ Rp100.000 |
| Pemilik lama | 30% (5.400 token) |
| Dijual ke investor | 70% (12.600 token) |
| Batas kepemilikan | 10% per investor (1.800 token) |
| Kustodian sertifikat | PT KosBagi Properti |

## Arsitektur singkat

```
Penghuni / Investor ──▶ Frontend (Next.js) ──▶ Backend (Express) ──▶ Midtrans Snap (sandbox)
                                                   ▲                       │
                                                   └────── webhook ◀───────┘
Backend ──▶ PostgreSQL ──▶ antrean BullMQ (Redis) ──▶ worker ──▶ KosToken / KosLedger (Sepolia)
```

Webhook Midtrans adalah satu-satunya pintu perubahan status pembayaran. Setelah signature dan status terverifikasi, backend menaruh tugas pencatatan di antrean, lalu worker yang memegang dompet operator mengirim transaksi ke smart contract. Penjelasan lengkap ada di [`docs/desain/`](docs/desain/).

## Struktur repositori

| Folder | Isi |
|---|---|
| [`contracts/`](contracts/) | Smart contract Solidity (KosToken, KosLedger, KosVoting) dan test Hardhat |
| [`backend/`](backend/) | API Express + Prisma, integrasi Midtrans, antrean, worker blockchain |
| [`frontend/`](frontend/) | Aplikasi web Next.js untuk investor, penghuni, pengelola, dan admin |
| [`docs/`](docs/) | Dokumentasi bisnis, regulasi, API, kontrak, pengujian, dan desain |

## Menjalankan secara lokal

Langkah lengkap ada di README tiap folder dan dilengkapi seiring pengembangan.

Prasyarat:
- Node.js 24 LTS
- Docker Desktop (untuk PostgreSQL dan Redis lokal)
- Akun Midtrans sandbox (server key dan client key sandbox)
- RPC Ethereum Sepolia (Alchemy atau Infura) dan dompet operator berisi ETH Sepolia

## Tim

| Jalur | Tanggung jawab | Anggota |
|---|---|---|
| 1 | Bisnis & keuangan: model bisnis, regulasi, proyeksi keuangan, rekonsiliasi, koordinasi | _menyusul_ |
| 2 | Backend & pembayaran: API, basis data, Midtrans, webhook, antrean | _menyusul_ |
| 3 | Kontrak & blockchain: smart contract, test Hardhat, deploy Sepolia, layanan blockchain | _menyusul_ |
| 4 | Frontend & desain: antarmuka, ERD, arsitektur, user stories | _menyusul_ |

Anggota Kelompok 9: Ahsan Faqih, Alya Hamidah Izzatul Laili, Azzahra Callysta Putri Aditya, Nofita Rahma Sabillah. Dosen pengampu: Hariz Farisi, S.Kom., M.T.

## Kontribusi dan penggunaan AI

- Alur kerja branch dan Pull Request: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Pernyataan penggunaan AI: [`docs/pernyataan-ai.md`](docs/pernyataan-ai.md)
