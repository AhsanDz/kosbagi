# 3 November 2026: Keputusan dari hasil QA progress 2

| Butir | Isi |
|---|---|
| Tanggal | Selasa, 3 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Angka bagi hasil di situs publik
2. Teks pengalihan sertifikat di halaman pemilik kos
3. Penolakan nota ganda di `KosLedger`
4. Defisit saat biaya melebihi sewa
5. Waktu masuk dokumen pernyataan AI

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Situs publik memakai angka eksak

Beranda dan tab Keuangan menampilkan Rp438,75 per token dan Rp43.875 untuk 100 token, menggantikan Rp439 dan Rp43.900. Angka ini mengubah teks dari desain yang sudah disetujui.

Alasan: `closePeriod` mencatat 43875 sen dan bagian tiap pemegang dihitung pro-rata (2 Nov, keputusan progress 2), jadi angka di situs harus sama dengan angka yang bisa dicek di Etherscan.

### K2. Teks halaman pemilik mengikuti proposal

Halaman `/pemilik` tidak lagi menyebut sertifikat "dititipkan". Sertifikat dialihkan ke PT KosBagi Properti sebagai kustodian, dan SHM diturunkan menjadi HGB. Kata "dasbor" diganti laporan bulanan dan pemeriksaan di Etherscan, karena prototipe tidak punya dasbor pemilik.

Alasan: teks lama berbeda dengan proposal dan [peta regulasi](../regulasi/peta-regulasi.md).

### K3. Satu nota hanya bisa dicatat sekali

`KosLedger` menolak hash nota yang sudah tercatat, sehingga satu berkas nota tidak bisa dipakai untuk dua pos biaya. Di progress 4, backend juga menolak nota ganda sebelum job dibuat, supaya basis data dan kontrak tidak berbeda diam-diam.

Alasan: job `recordExpense` yang diulang setelah koneksi putus tidak boleh menggandakan biaya.

### K4. Defisit tidak dibawa ke periode berikutnya

Bila biaya sebulan melebihi sewa, bagi hasil periode itu Rp0 dan periode berikutnya dihitung baru. Penutup kekurangan kas dibahas di bab risiko business case.

Alasan: setiap periode tetap bisa dicocokkan dengan hitungan manual tanpa bergantung pada periode lain.

### K5. Pernyataan AI masuk repositori di progress 5

Dokumen pernyataan AI, tautannya di README, dan item di footer situs baru ditambahkan di progress 5. Keputusan 29 Okt K4 tetap berlaku: penggunaan alat AI dinyatakan menyeluruh di dokumen itu, hanya waktu masuknya yang ditetapkan. Business case yang dikumpulkan 24 November mencantumkan penggunaan alat AI di lampirannya sendiri.

Alasan: (diisi koordinator)

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Menyamakan frame Figma dengan K1 dan K2 | Jalur 4 | Sebelum progress 3 | berjalan |
| Menolak hash nota ganda di backend | Jalur 2 | Progress 4 | belum |
| Memasukkan dokumen pernyataan AI beserta tautannya | Jalur 1 dan Jalur 4 | Progress 5, sebelum presentasi | belum |

## Rujukan

- [Keputusan sebelum progress 2](2026-11-02-keputusan-progress-2.md).
- [`docs/bisnis/perhitungan-distribusi.md`](../bisnis/perhitungan-distribusi.md).
- [`docs/kontrak/rancangan-kontrak.md`](../kontrak/rancangan-kontrak.md) bagian KosLedger.
