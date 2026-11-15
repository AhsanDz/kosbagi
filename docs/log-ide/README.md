# Log Pengembangan Ide

Folder ini berisi catatan diskusi dan keputusan tim selama pengembangan KosBagi. Log ini termasuk dokumentasi wajib tugas akhir, yaitu catatan diskusi dan keputusan tiap pertemuan. Tujuannya supaya siapa pun yang membaca repositori bisa menelusuri kapan sebuah keputusan diambil, apa alasannya, dan apa tindak lanjutnya.

## Aturan

- Satu file untuk satu pertemuan atau satu hari keputusan. Nama file memakai pola `YYYY-MM-DD-topik-singkat.md`, misalnya `2026-10-29-keputusan-pengembangan.md`.
- Tulis hanya yang benar-benar terjadi. Bagian yang memang tidak ada diisi "(tidak ada)". Bagian yang belum sempat diisi ditandai "(diisi ...)" beserta nama peran yang akan mengisinya.
- Keputusan diberi nomor K1, K2, dan seterusnya di dalam satu entri. Untuk merujuk keputusan dari entri lain, tulis tanggal dan nomornya, misalnya "29 Okt K3".
- Keputusan lama tidak dihapus. Bila sebuah keputusan berubah, tulis entri baru yang merujuk keputusan lama, lalu tambahkan catatan "diganti oleh ..." di entri lama.
- Sebutkan rujukan bila ada: bagian proposal, dokumen di repositori, atau Pull Request.
- Jangan mencatat data pribadi selain nama anggota yang hadir.
- Log dikelola Jalur 1 sesuai pembagian wilayah file di [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Anggota lain menyampaikan catatannya lewat koordinator.

## Templat entri

Salin templat berikut ke file baru, lalu ganti teks di dalam tanda `< >`.

```markdown
# <tanggal>: <topik>

| Butir | Isi |
|---|---|
| Tanggal | <hari, tanggal bulan tahun> |
| Waktu dan tempat | <jam, luring atau daring> |
| Peserta | <nama anggota yang hadir> |
| Jenis | <rapat, diskusi daring, atau keputusan koordinator> |
| Pencatat | <nama> |

## Agenda

1. <butir agenda>

## Diskusi

- <pokok pembicaraan, pendapat yang muncul, dan data yang dirujuk>

## Keputusan

### K1. <judul keputusan>

<isi keputusan>

Alasan: <alasan yang disepakati>

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| <pekerjaan> | <nama atau jalur> | <tanggal> | belum, berjalan, atau selesai |

## Rujukan

- <bagian proposal, dokumen, atau Pull Request>
```

## Daftar entri

| Tanggal | Entri | Ringkasan |
|---|---|---|
| 29 Oktober 2026 | [Keputusan pengembangan setelah proposal](2026-10-29-keputusan-pengembangan.md) | Proposal dikumpulkan; rencana 5 progress dan 4 jalur; alur branch dan Pull Request; transparansi AI; arah desain "Lime kuitansi", rute publik, dan aktor pemilik kos; persiapan Docker |
| 2 November 2026 | [Pembagian anggota per jalur dan panduan menjalankan](2026-11-02-pembagian-anggota.md) | Nama anggota tiap jalur ditetapkan; langkah menjalankan aplikasi dipusatkan di README root |
| 2 November 2026 | [Keputusan sebelum progress 2](2026-11-02-keputusan-progress-2.md) | Sewa ganda ditolak di backend dan kontrak; bagi hasil pro-rata dengan sisa masuk cadangan; state "Memeriksa pembayaran" |
| 3 November 2026 | [Keputusan dari hasil QA progress 2](2026-11-03-keputusan-qa-progress-2.md) | Angka eksak di situs publik; teks pengalihan sertifikat; nota ganda ditolak; defisit tidak dibawa; pernyataan AI masuk di progress 5 |

Diskusi sebelum 29 Oktober 2026 (pemilihan topik dan penyusunan proposal) belum tercatat di folder ini. Bila tim memiliki catatannya, misalnya riwayat percakapan grup, tambahkan sebagai entri dengan tanggal sesuai kejadiannya.
