# Desain KosBagi

Folder ini berisi dokumen desain KosBagi yang dikelola jalur 4 (Frontend & Desain): arsitektur sistem, user stories, ERD, dan acuan desain antarmuka di Figma. Semua diagram ditulis dengan Mermaid sehingga tampil langsung di GitHub.

## Isi folder

| Dokumen | Isi |
|---|---|
| [arsitektur.md](arsitektur.md) | Diagram konteks, komponen, dompet dan token, sekuens pembayaran sewa dan pembelian token, status di layar, deployment, dan keputusan arsitektur |
| [user-stories.md](user-stories.md) | User stories per aktor dengan kriteria penerimaan Given/When/Then, prioritas, progress, serta kaitannya dengan demo wajib dan skenario uji |
| [erd.md](erd.md) | ERD basis data dari `backend/prisma/schema.prisma`: skema v4 (P4, 18 tabel) dengan penjelasan kolom, relasi, constraint, enum, dan riwayat skema v1 sampai v4. Diperbarui setiap kali skema berubah |
| Alur demo | Storyboard video demo, menyusul di P5 |

## Desain antarmuka di Figma

File: [KosBagi Desain UI](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI). Bila Figma meminta izin, minta akses lihat ke koordinator.

Seluruh layar P1 disetujui pada 29 Okt 2026, layar P2 pada 2 Nov 2026, dan layar P3 (kuitansi, KYC investor, penawaran token, KYC admin) pada 3 Nov 2026. Layar P4 (ringkasan dan portofolio investor, status kamar dan biaya pengelola, ringkasan admin, tutup periode, rekonsiliasi) disetujui pada 16 Nov 2026 setelah satu revisi gaya tombol kolom Aksi. Semua layar ada di file yang sama, jadi tautan file tidak berubah.

### Frame P1

| Layar | Rute | Frame |
|---|---|---|
| Design system: fondasi (variabel terang dan gelap, tipografi, radius, spasi) | - | [35-741](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=35-741) |
| Design system: komponen dan semua state wajib | - | [13-170](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=13-170) |
| Design system: main component | - | [3-2](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=3-2) |
| Beranda desktop | `/` | [36-786](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=36-786) |
| Beranda desktop, mode gelap | `/` | [52-1777](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=52-1777) |
| Beranda ponsel | `/` | [39-415](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=39-415) |
| Masuk | `/masuk` | [41-565](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=41-565) |
| Masuk, state error | `/masuk` | [41-665](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=41-665) |
| Daftar kos | `/kos` | [42-1269](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=42-1269) |
| Detail kos, tab Ringkasan | `/kos/sumbersari-01` | [43-820](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=43-820) |
| Detail kos, tab Keuangan | `/kos/sumbersari-01?tab=keuangan` | [44-874](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=44-874) |
| Detail kos, tab Dokumen | `/kos/sumbersari-01?tab=dokumen` | [44-1059](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=44-1059) |
| Detail kos, tab Blockchain | `/kos/sumbersari-01?tab=blockchain` | [45-1020](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=45-1020) |
| Detail kos, tab Risiko | `/kos/sumbersari-01?tab=risiko` | [45-1353](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=45-1353) |
| Untuk pemilik kos | `/pemilik` | [49-1455](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=49-1455) |
| Untuk pemilik kos, form pengajuan error | `/pemilik` | [51-1668](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=51-1668) |
| Untuk pemilik kos, pengajuan terkirim | `/pemilik` | [51-1765](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=51-1765) |
| App shell investor | `/investor` | [24-1114](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=24-1114) |
| App shell penghuni | `/penghuni` | [25-2](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=25-2) |
| App shell pengelola | `/pengelola` | [25-123](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=25-123) |
| App shell admin | `/admin` | [25-240](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=25-240) |

### Frame P2

Frame penghuni belum punya versi mode gelap di Figma. Warnanya memakai variabel tema, jadi hasil gelapnya diperiksa langsung di aplikasi.

| Layar | Rute | Desktop | Ponsel |
|---|---|---|---|
| Ringkasan, belum dibayar | `/penghuni` | [73-368](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-368) | [74-2547](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-2547) |
| Ringkasan, lunas tercatat | `/penghuni` | [73-606](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-606) | - |
| Tagihan, belum dibayar | `/penghuni/tagihan` | [73-861](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-861) | [74-2767](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-2767) |
| Tagihan, menunggu pembayaran | `/penghuni/tagihan` | [73-1095](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-1095) | [74-2887](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-2887) |
| Tagihan, memeriksa pembayaran | `/penghuni/tagihan` | [73-1338](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-1338) | - |
| Tagihan, lunas menunggu pencatatan | `/penghuni/tagihan` | [73-1579](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-1579) | - |
| Tagihan, lunas tercatat | `/penghuni/tagihan` | [73-1870](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-1870) | [74-3015](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-3015) |
| Tagihan, lunas gagal dicatat | `/penghuni/tagihan` | [73-2147](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-2147) | - |
| Tagihan, kedaluwarsa | `/penghuni/tagihan` | [73-2430](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-2430) | [74-3153](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-3153) |
| Tagihan, gagal | `/penghuni/tagihan` | [73-2676](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=73-2676) | - |
| Tagihan, memuat | `/penghuni/tagihan` | [74-2244](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-2244) | - |
| Tagihan, kosong | `/penghuni/tagihan` | [74-2353](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-2353) | - |
| Tagihan, error | `/penghuni/tagihan` | [74-2457](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-2457) | - |
| Menu ponsel terbuka | `/penghuni` | - | [74-3280](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=74-3280) |
| Untuk pemilik kos, halaman penuh | `/pemilik` | - | [76-1752](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=76-1752) |
| Untuk pemilik kos, form error | `/pemilik` | - | [76-2153](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=76-2153) |
| Untuk pemilik kos, pengajuan terkirim | `/pemilik` | - | [76-2267](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=76-2267) |

Komponen baru P2 ada di frame main component: [Slip tagihan](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=70-1033), [Slip ringkas](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=70-1258), [Cap tercatat](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=70-699), [Jejak pembayaran](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=71-1044), [Baris riwayat](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=71-1155), [Kartu riwayat](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=71-1335), [Kartu kamar](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=71-1350), [Kartu bukti](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=75-1026), [Header ponsel](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=71-1403).

### Frame P3

Frame P3 belum punya versi mode gelap, kecuali Panel catatan on-chain yang memang selalu gelap. Warnanya memakai variabel tema, jadi hasil gelapnya diperiksa langsung di aplikasi.

| Layar | Rute | Desktop | Ponsel |
|---|---|---|---|
| Kuitansi, tercatat | `/penghuni/tagihan/[id]` | [109-4361](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=109-4361) | [109-5339](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=109-5339) |
| Kuitansi, menunggu pencatatan | `/penghuni/tagihan/[id]` | [109-4603](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=109-4603) | - |
| Kuitansi, gagal dicatat | `/penghuni/tagihan/[id]` | [109-4829](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=109-4829) | - |
| Kuitansi, memuat | `/penghuni/tagihan/[id]` | [109-5055](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=109-5055) | - |
| Kuitansi, tidak ditemukan | `/penghuni/tagihan/[id]` | [109-5214](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=109-5214) | - |
| KYC, belum mengajukan | `/investor/kyc` | [111-146](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-146) | [111-1469](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-1469) |
| KYC, form error | `/investor/kyc` | [111-327](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-327) | - |
| KYC, diajukan | `/investor/kyc` | [111-507](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-507) | - |
| KYC, disetujui, dompet sedang didaftarkan | `/investor/kyc` | [111-689](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-689) | - |
| KYC, disetujui, dompet tercatat | `/investor/kyc` | [111-895](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-895) | - |
| KYC, ditolak | `/investor/kyc` | [111-1123](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-1123) | - |
| KYC, memuat | `/investor/kyc` | [111-1336](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=111-1336) | - |
| Penawaran, siap bayar | `/investor/penawaran` | [113-2430](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-2430) | [114-3682](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=114-3682) |
| Penawaran, melebihi sisa (skenario 8) | `/investor/penawaran` | [113-2665](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-2665) | - |
| Penawaran, melebihi batas (skenario 9) | `/investor/penawaran` | [113-2896](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-2896) | [114-3937](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=114-3937) |
| Penawaran, perlu KYC | `/investor/penawaran` | [113-3143](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-3143) | - |
| Penawaran, mendaftarkan dompet | `/investor/penawaran` | [113-3348](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-3348) | - |
| Penawaran, menunggu pembayaran | `/investor/penawaran` | [113-3563](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-3563) | - |
| Penawaran, memeriksa pembayaran | `/investor/penawaran` | [113-3781](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-3781) | - |
| Penawaran, lunas, token dikirim | `/investor/penawaran` | [113-3987](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-3987) | - |
| Penawaran, lunas, token tercatat | `/investor/penawaran` | [113-4212](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-4212) | [114-4182](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=114-4182) |
| Penawaran, kedaluwarsa | `/investor/penawaran` | [113-4448](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-4448) | - |
| Penawaran, gagal | `/investor/penawaran` | [113-4652](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-4652) | - |
| Penawaran, penuh | `/investor/penawaran` | [113-4864](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-4864) | - |
| Penawaran, memuat | `/investor/penawaran` | [113-5066](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=113-5066) | - |
| KYC admin, menunggu | `/admin/kyc` | [115-146](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-146) | - |
| KYC admin, Sheet tinjau terbuka | `/admin/kyc` | [115-335](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-335) | - |
| KYC admin, Dialog tolak | `/admin/kyc` | [115-589](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-589) | - |
| KYC admin, setelah disetujui | `/admin/kyc` | [115-857](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-857) | - |
| KYC admin, tab Disetujui | `/admin/kyc` | [115-1084](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-1084) | - |
| KYC admin, kosong | `/admin/kyc` | [115-1365](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-1365) | - |
| KYC admin, memuat | `/admin/kyc` | [115-1517](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=115-1517) | - |

Komponen baru P3 ada di frame main component: [Kuitansi sewa](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=104-1136), [Panel catatan on-chain](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=104-1356), [Tiket beli](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=105-1655), [Jejak KYC](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=107-1514), [Kartu status KYC](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=107-1656), [Baris KYC](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=108-1493), [Sheet tinjau KYC](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=108-1696), [Dialog tolak KYC](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=108-1746). Komponen lama yang ikut diperbarui: Input jumlah token, Checkbox (label membungkus), Button (ikon mewarisi warna label), dan Baris riwayat (kolom Aksi dan panah ponsel kini tampil).

### Frame P4

Frame P4 hanya untuk desktop dan belum punya versi mode gelap, kecuali Kartu saldo bagi hasil yang selalu gelap. Di aplikasi, tata letaknya menyusun ulang menjadi satu kolom di bawah 1280 px dan tabel bisa digulir mendatar di ponsel; warnanya memakai variabel tema sehingga mode gelap tetap terbaca.

| Layar | Rute | Desktop | Ponsel |
|---|---|---|---|
| Ringkasan, setelah distribusi | `/investor` | [149-2589](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=149-2589) | - |
| Ringkasan, periode berjalan | `/investor` | [149-2859](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=149-2859) | - |
| Ringkasan, belum punya token | `/investor` | [149-3120](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=149-3120) | - |
| Ringkasan, memuat | `/investor` | [149-3319](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=149-3319) | - |
| Portofolio | `/investor/portofolio` | [150-3185](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=150-3185) | - |
| Portofolio, kosong | `/investor/portofolio` | [150-3442](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=150-3442) | - |
| Portofolio, memuat | `/investor/portofolio` | [150-3572](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=150-3572) | - |
| Status kamar, periode berjalan | `/pengelola` | [144-1782](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=144-1782) | - |
| Status kamar, semua tercatat | `/pengelola` | [144-2007](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=144-2007) | - |
| Status kamar, memuat | `/pengelola` | [144-2217](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=144-2217) | - |
| Biaya, semua tercatat | `/pengelola/biaya` | [145-429](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-429) | - |
| Biaya, Sheet catat biaya | `/pengelola/biaya` | [145-662](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-662) | - |
| Biaya, baru dicatat | `/pengelola/biaya` | [145-957](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-957) | - |
| Biaya, nota ganda | `/pengelola/biaya` | [145-1191](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-1191) | - |
| Biaya, kosong | `/pengelola/biaya` | [145-1515](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-1515) | - |
| Biaya, periode ditutup | `/pengelola/biaya` | [145-1649](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-1649) | - |
| Biaya, memuat | `/pengelola/biaya` | [145-1879](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=145-1879) | - |
| Admin ringkasan | `/admin` | [146-1041](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=146-1041) | - |
| Admin ringkasan, antrean bersih | `/admin` | [146-1270](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=146-1270) | - |
| Admin ringkasan, memuat | `/admin` | [146-1449](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=146-1449) | - |
| Tutup periode, belum siap | `/admin/periode` | [147-1292](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-1292) | - |
| Tutup periode, siap | `/admin/periode` | [147-1501](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-1501) | - |
| Tutup periode, konfirmasi | `/admin/periode` | [147-1706](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-1706) | - |
| Tutup periode, menutup | `/admin/periode` | [147-1927](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-1927) | - |
| Tutup periode, gagal | `/admin/periode` | [147-2115](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-2115) | - |
| Tutup periode, ditutup | `/admin/periode` | [147-2304](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-2304) | - |
| Tutup periode, terdistribusi | `/admin/periode` | [147-2580](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-2580) | - |
| Tutup periode, memuat | `/admin/periode` | [147-2869](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=147-2869) | - |
| Rekonsiliasi, semua (jalur 1) | `/admin/rekonsiliasi` | [148-2360](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=148-2360) | - |
| Rekonsiliasi, hanya selisih (jalur 1) | `/admin/rekonsiliasi` | [148-2857](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=148-2857) | - |
| Rekonsiliasi, tidak ada selisih (jalur 1) | `/admin/rekonsiliasi` | [148-3089](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=148-3089) | - |
| Rekonsiliasi, memuat (jalur 1) | `/admin/rekonsiliasi` | [148-3246](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=148-3246) | - |

Komponen baru P4 ada di frame main component: [Kartu saldo bagi hasil](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=142-1767), [Daftar sewa masuk](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=142-1939), [Baris biaya](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=138-1541), [Sheet catat biaya](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=138-1751), [Struk penutupan](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=140-1576), [Kartu syarat penutupan](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=140-1812), [Baris job on-chain](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=141-1710), [Baris rekonsiliasi](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI?node-id=141-1818). Revisi pengguna di P4: tombol di kolom Aksi tabel memakai varian Outline dan rata kiri bersama judul kolom, termasuk tombol Tinjau dan Detail di tabel KYC admin (P3). Tautan yang berpindah halaman, seperti Kuitansi di riwayat tagihan, tetap berupa Tautan.

## Arah visual: Lime kuitansi

KosBagi menjual satu hal: setiap sewa bisa dibuktikan. Bahasa visualnya karena itu meminjam kuitansi dan stabilo. Latar abu kapur seperti kertas, teks dan tombol berwarna tinta, dan stabilo lime yang hanya muncul untuk menandai bukti, seperti pembayaran lunas atau transaksi yang sudah tercatat di blockchain. Acuan visualnya Fintra di Dribbble.

### Warna

Nama token mengikuti variabel CSS shadcn/ui, dengan mode Terang di `:root` dan mode Gelap di `.dark`. Nilai lengkap kedua mode ada di koleksi variabel "Tema" pada frame fondasi Figma.

| Token | Nilai terang | Dipakai untuk |
|---|---|---|
| `background` (kapur) | `#ECEDE8` | Latar halaman |
| `foreground` (tinta) | `#0E0F0C` | Teks utama |
| `card` (panel) | `#FBFBF8` | Panel dan kartu |
| `primary` | `#0E0F0C` | Semua tombol utama |
| `muted-foreground` | `#5D6058` | Teks pendukung |
| `border` | `#D3D5CD` | Garis tepi kartu, tabel, dan field |
| `success` (stabilo lime) | `#D4F55A` | Hanya bukti: Lunas, Tercatat, Disetujui, cap TERCATAT, garis grafik |
| `success-muted-foreground` | `#2C3604` | Teks bukti di latar terang |
| `warning`, `warning-muted` (kunyit) | `#9C5F0B`, `#F4E4C1` | Menunggu pembayaran, banner sandbox |
| `info`, `info-muted` (nila) | `#3D58A6`, `#DFE5F4` | Menunggu pencatatan, KYC diajukan |
| `destructive`, `destructive-muted` (saga) | `#C0392B`, `#F5DCD8` | Gagal, kedaluwarsa, ditolak, pesan error |
| `sidebar` | `#0E0F0C` | Sidebar app shell, item aktif `#24261F` |

Pada mode gelap, latar menjadi `#0E0F0C`, kartu `#181A15`, teks dan tombol utama `#EDEEE8`, sedangkan lime tetap `#D4F55A`.

**Aturan lime:**

- Lime hanya untuk bukti. Tombol tidak pernah lime; semua tombol berwarna tinta, termasuk tombol Masuk di navbar.
- Lime tidak dipakai sebagai warna teks atau ikon di latar terang karena kontrasnya sekitar 1,1:1. Teks bukti di latar terang memakai `success-muted-foreground`.

### Tipografi

| Peran | Font | Gaya di Figma |
|---|---|---|
| Judul display huruf kapital, hanya di halaman publik | Archivo Black | Display/Hero 104/96, Display/Bagian 64/60, Display/Halaman 56/52, Display/Ponsel 48/46 |
| Cap TERCATAT, satu-satunya Archivo di dalam aplikasi | Archivo Black | Display/Cap 26/30 kapital |
| Wordmark logo | Archivo ExtraBold | |
| Antarmuka dan teks | Geist | Judul/H1 40/44 sampai Judul/H5 16/22, Teks/Default 16/24, Teks/Tombol SemiBold 15/20, Angka/Hero SemiBold 56/60 untuk nominal slip |
| Hash, `order_id`, dan kolom angka | Geist Mono | Mono/Default 14/20, Mono/Kecil 12/16, Mono/Besar Medium 32/38 untuk hitung mundur |

Semua font dimuat dengan `next/font`. Angka memakai `tabular-nums` supaya kolom rupiah sejajar.

### Ikon

Ikon memakai Phosphor (`@phosphor-icons/react`, weight regular), bukan lucide. Ikon lucide bawaan komponen shadcn/ui diganti di file komponennya. Ikon tidak dibungkus kotak, dan tombol tidak memakai panah "→".

### Bentuk, ruang, dan bayangan

| Token | Nilai | Dipakai untuk |
|---|---|---|
| `--radius-sm` | 8 px | Elemen kecil |
| `--radius-md` | 12 px | Input |
| `--radius` (lg) | 16 px (1rem) | Nilai dasar |
| `--radius-xl` | 20 px | Kartu |
| `--radius-2xl` | 28 px | Panel besar (token tambahan di `@theme`) |
| `rounded-full` | 9999 px | Tombol dan badge |

- Tombol tinggi 44 px dengan label Geist SemiBold 15 px.
- Spasi memakai kelipatan 4 px (skala bawaan Tailwind).
- Kartu tidak memakai bayangan, cukup garis tepi. Bayangan "Mengambang" hanya untuk elemen yang melayang: dialog, toast, popover, dan kuitansi di hero.
- Fokus keyboard memakai cincin ganda: 2 px warna latar lalu 4 px warna `ring` (tinta).

### Mode gelap

- Mode gelap berupa tombol toggle (`next-themes`, class `.dark`). Layar didesain dalam mode terang, ditambah satu contoh beranda gelap.
- Pengecualian yang disengaja: bagian "Dari sewa ke bagi hasil" di beranda, panel penawaran di detail kos, dan Kartu bukti di halaman penghuni selalu gelap. Di kode, ketiganya memakai `class="dark"`.

### Teks dan format

- Semua teks antarmuka berbahasa Indonesia, tanpa em dash, dan paling banyak satu titik tengah per baris.
- Rupiah ditulis `Rp1.500.000` tanpa spasi. Tanggal `29 Okt 2026`, jam `10.42`.
- Hash disingkat 6+4 karakter: `0x8f3a…c21d`.
- Setelah masuk, banner "Mode sandbox: data dummy, tanpa uang nyata" selalu tampil di atas header, dengan keterangan "Midtrans sandbox" dan "Ethereum Sepolia testnet" di sisi kanan.
- Daftar status beserta label dan warnanya ada di [arsitektur bagian 6](arsitektur.md#6-status-yang-tampil-di-layar).

### Komponen kunci

| Komponen | Keterangan |
|---|---|
| Papan kamar dan Ubin kamar | Grid kamar K01 sampai K10 dengan status sewa bulan berjalan. Diisi data nyata, dipakai di beranda, tab Blockchain, dan halaman pengelola (P4) |
| Kuitansi on-chain | Rincian `recordRent` satu kamar dengan cap TERCATAT dan daftar data yang tidak pernah dicatat on-chain |
| Mockup ponsel investor | Pratinjau layar Portofolio di hero beranda |
| Kartu kos | Ringkasan satu kos di beranda dan daftar kos |
| Navigasi publik, Footer publik, Tab, Item FAQ | Kerangka halaman publik |
| Banner sandbox | Penanda mode sandbox di semua layar setelah masuk |
| Slip tagihan dan Slip ringkas | Tagihan bulan berjalan sebagai kuitansi dengan garis sobek dan takik. Slip ringkas mendatar di `/penghuni` mulai 1024 px, Slip tagihan tegak di bawahnya dan di `/penghuni/tagihan` |
| Cap tercatat | Cap miring 8 derajat, hanya tampil bila status on-chain Tercatat |
| Jejak pembayaran | Empat tahap dari Midtrans sampai Sepolia. Tahap selesai tinta, hanya tahap Tercatat yang lime. Tidak tampil di ponsel |
| Baris riwayat dan Kartu riwayat | Riwayat tagihan lunas. Bentuk tabel atau daftar mengikuti lebar kartu |
| Kartu kamar dan Kartu bukti | Data kamar dan penjelasan apa yang dicatat di blockchain |
| Status tagihan, Status on-chain, Status KYC | Lencana dan baris status wajib (lihat arsitektur bagian 6). Status on-chain punya ukuran Ringkas untuk tabel dan Tumpuk untuk slip |
| Input jumlah token | Isian pembelian dengan sisa penawaran, sisa kuota, dan pesan skenario 8 serta 9 |
| Unggah file, Tabel transaksi, Kartu statistik, Dialog konfirmasi | Komponen data untuk halaman peran |

### Foto ilustrasi

Foto Kos Sumbersari 01 dibuat dengan generator gambar AI di Figma, bukan foto properti sebenarnya. Label "Foto ilustrasi" wajib tampil di setiap tempat foto itu muncul; di detail kos keterangannya "Foto ilustrasi buatan AI, bukan foto properti sebenarnya."

### Akun dummy

| Peran | Nama | Keterangan |
|---|---|---|
| Investor | Dimas Pratama | |
| Penghuni | Sari Wulandari | Kamar K03 |
| Pengelola | Hadi Santoso | |
| Admin | Laras Kusuma | |

Semua akun memakai email berpola `*.dummy@kosbagi.test`. Domain `.test` dicadangkan untuk pengujian sehingga tidak bisa menerima email sungguhan. Alamat lengkapnya ditetapkan di data seed.

## Rute halaman

### Halaman publik

| Rute | Halaman | Progress | Isi utama |
|---|---|---|---|
| `/` | Beranda | P1 | Hero investor, kos unggulan, bukti on-chain, cara kerja, dari sewa ke bagi hasil, ajakan pemilik kos, risiko dan pengaduan |
| `/kos` | Daftar kos | P1 | Satu kartu Kos Sumbersari 01 dan empty state "Properti berikutnya sedang dinilai" |
| `/kos/sumbersari-01` | Detail kos | P1 | Tab Ringkasan, Keuangan, Dokumen, Blockchain, Risiko dan panel penawaran. Setiap tab bisa ditautkan langsung dengan `?tab=`: `ringkasan` (bawaan), `keuangan`, `dokumen`, `blockchain`, `risiko` |
| `/masuk` | Masuk | P1 tampilan, P2 berfungsi | Kartu akun demo (masuk dengan kata sandi `demo-kosbagi`), form email, state error dari server, tautan Ajukan kos |
| `/pemilik` | Untuk pemilik kos | P2 (jalur 1) | Simulasi dana, alur 5 langkah, syarat dan dokumen, FAQ, form pengajuan |

Navbar publik berisi Beranda, Daftar kos, Cara kerja (menuju bagian di beranda), Untuk pemilik, dan tombol Masuk. Tombol Beli token di detail kos menuju `/masuk` bila belum masuk, lalu ke halaman Penawaran investor. Data halaman publik di P1 masih statis di `frontend/src/lib/`.

### Halaman per peran

Semua layar setelah masuk memakai app shell yang sama: sidebar tinta berisi menu peran dan pengguna dari sesi, banner sandbox di atas header, judul halaman dengan keterangan, dan cip properti Kos Sumbersari 01 KB-SMR01. Di ponsel, header diganti Header ponsel dan menu dibuka lewat Sheet. Halaman penghuni terisi di P2; isi menu peran lain masih berupa skeleton sampai progressnya.

| Peran | Menu di sidebar | Rute | Isi dibangun |
|---|---|---|---|
| Investor | Ringkasan | `/investor` | P4 |
| | Penawaran | `/investor/penawaran` | P3 |
| | Portofolio (termasuk riwayat) | `/investor/portofolio` | P4 |
| | Verifikasi KYC | `/investor/kyc` | P3 |
| Penghuni | Ringkasan | `/penghuni` | P2 |
| | Tagihan (termasuk kuitansi) | `/penghuni/tagihan` | P2, P3 |
| Pengelola | Status kamar | `/pengelola` | P4 |
| | Biaya dan nota | `/pengelola/biaya` | P4 |
| Admin | Ringkasan | `/admin` | P4 |
| | Verifikasi KYC | `/admin/kyc` | P3 |
| | Tutup periode | `/admin/periode` | P4 |
| | Rekonsiliasi | `/admin/rekonsiliasi` | P4 (jalur 1) |

Nama menu mengikuti frame app shell di Figma, dan menu serta rutenya sama dengan daftar di `frontend/src/components/app-shell/role-menus.ts`. Halaman `/admin/rekonsiliasi` (P4) dan `/pemilik` (P2) dikerjakan jalur 1. Menu Rekonsiliasi di sidebar admin dan butir Rekonsiliasi di kartu Perlu perhatian `/admin` menaut ke halaman itu.
