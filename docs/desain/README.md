# Desain KosBagi

Folder ini berisi dokumen desain KosBagi yang dikelola jalur 4 (Frontend & Desain): arsitektur sistem, user stories, ERD, dan acuan desain antarmuka di Figma. Semua diagram ditulis dengan Mermaid sehingga tampil langsung di GitHub.

## Isi folder

| Dokumen | Isi |
|---|---|
| [arsitektur.md](arsitektur.md) | Diagram konteks, komponen, dompet dan token, sekuens pembayaran sewa dan pembelian token, status di layar, deployment, dan keputusan arsitektur |
| [user-stories.md](user-stories.md) | 41 user stories per aktor dengan kriteria penerimaan Given/When/Then, prioritas, progress, serta kaitannya dengan demo wajib dan skenario uji |
| [erd.md](erd.md) | ERD basis data dari `backend/prisma/schema.prisma`: skema v1 (P1) dengan penjelasan kolom, relasi, constraint, dan enum, ditambah rencana entitas P2 sampai P4. Diperbarui setiap kali skema berubah |
| Alur demo | Storyboard video demo, menyusul di P5 |

## Desain antarmuka di Figma

File: [KosBagi Desain UI](https://www.figma.com/design/SiWSQc651BxoJmt67erq2d/KosBagi-Desain-UI). Bila Figma meminta izin, minta akses lihat ke koordinator.

Seluruh layar P1 disetujui pada 29 Okt 2026. Layar P2 sampai P4 (tagihan penghuni, kuitansi, KYC, penawaran, portofolio, pengelola, admin) menyusul di file yang sama, jadi tautan file tidak berubah.

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
| Wordmark logo | Archivo ExtraBold | |
| Antarmuka dan teks | Geist | Judul/H1 40/44 sampai Judul/H5 16/22, Teks/Default 16/24, Teks/Tombol SemiBold 15/20 |
| Hash, `order_id`, dan kolom angka | Geist Mono | Mono/Default 14/20, Mono/Kecil 12/16 |

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
- Pengecualian yang disengaja: bagian "Dari sewa ke bagi hasil" di beranda dan panel penawaran di detail kos selalu gelap. Di kode, keduanya dibungkus `class="dark"`.

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
| Status tagihan, Status on-chain, Status KYC | Lencana dan baris status wajib (lihat arsitektur bagian 6) |
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
| `/masuk` | Masuk | P1 tampilan, P2 berfungsi | Kartu akun demo, form email, state error, tautan Ajukan kos |
| `/pemilik` | Untuk pemilik kos | P2 (jalur 1) | Simulasi dana, alur 5 langkah, syarat dan dokumen, FAQ, form pengajuan |

Navbar publik berisi Beranda, Daftar kos, Cara kerja (menuju bagian di beranda), Untuk pemilik, dan tombol Masuk. Tombol Beli token di detail kos menuju `/masuk` bila belum masuk, lalu ke halaman Penawaran investor. Data halaman publik di P1 masih statis di `frontend/src/lib/`.

### Halaman per peran

Semua layar setelah masuk memakai app shell yang sama: sidebar tinta berisi menu peran, banner sandbox di atas header, judul halaman dengan periode berjalan (mis. November 2026), dan cip properti Kos Sumbersari 01 KB-SMR01. Di P1 isi setiap menu masih berupa skeleton.

| Peran | Menu di sidebar | Rute | Isi dibangun |
|---|---|---|---|
| Investor | Ringkasan | `/investor` | P3, P4 |
| | Penawaran | `/investor/penawaran` | P3 |
| | Portofolio (termasuk riwayat) | `/investor/portofolio` | P3, P4 |
| | Verifikasi KYC | `/investor/kyc` | P3 |
| Penghuni | Ringkasan | `/penghuni` | P2 |
| | Tagihan (termasuk kuitansi) | `/penghuni/tagihan` | P2, P3 |
| Pengelola | Status kamar | `/pengelola` | P4 |
| | Biaya dan nota | `/pengelola/biaya` | P4 |
| Admin | Ringkasan | `/admin` | P4 |
| | Verifikasi KYC | `/admin/kyc` | P3 |
| | Tutup periode | `/admin/periode` | P4 |
| | Rekonsiliasi | `/admin/rekonsiliasi` | P4 (jalur 1) |

Nama menu mengikuti frame app shell di Figma, dan menu serta rutenya sama dengan daftar di `frontend/src/components/app-shell/role-menus.ts`. Halaman `/admin/rekonsiliasi` (P4) dan `/pemilik` (P2) dikerjakan jalur 1; di P1 menu Rekonsiliasi sudah tampil di sidebar admin, tetapi halamannya belum ada.
