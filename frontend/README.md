# frontend

Aplikasi web KosBagi: Next.js (App Router) + TypeScript, Tailwind CSS, dan shadcn/ui, dengan Midtrans Snap untuk pembayaran di peramban. Dikelola jalur 4 (Frontend & Desain), kecuali halaman rekonsiliasi milik jalur 1.

## Halaman

| Rute | Peran | Isi |
|---|---|---|
| `/` | publik | Profil Kos Sumbersari 01 dan penawaran token |
| `/masuk` | publik | Masuk dengan akun dummy |
| `/investor/...` | investor | Dasbor, KYC dummy, beli token, portofolio, riwayat |
| `/penghuni/...` | penghuni | Tagihan, bayar via Snap, kuitansi + tautan Etherscan |
| `/pengelola/...` | pengelola | Status kamar, catat biaya dan unggah nota |
| `/admin/...` | admin | Persetujuan KYC, tutup periode dan distribusi |
| `/admin/rekonsiliasi` | admin | Pencocokan Midtrans, basis data, dan blockchain (jalur 1) |

## Struktur

```
frontend/
├── src/
│   ├── app/            rute halaman (App Router)
│   ├── components/     ui/ (komponen shadcn) dan komponen domain
│   └── lib/            klien API, format rupiah & tanggal, tautan Etherscan
└── public/             aset statis
```

Hanya client key Midtrans dan URL API yang boleh berada di sisi klien (variabel `NEXT_PUBLIC_*`). Perintah instalasi dan menjalankan aplikasi ditambahkan saat kerangka Next.js dibuat (progress 1).
