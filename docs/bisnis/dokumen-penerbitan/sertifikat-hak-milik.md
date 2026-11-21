# Sertifikat Hak Milik Kos Sumbersari 01 (Dummy)

> **DOKUMEN DUMMY UNTUK PROTOTIPE TUGAS AKHIR.** Ini bukan sertifikat tanah, bukan salinan dokumen kantor pertanahan, dan tidak berlaku untuk keperluan hukum apa pun. Semua nomor, nama orang, ukuran, dan tanggal di dokumen ini fiktif. Tidak ada NIK, nomor rekening, alamat rumah, atau data pribadi asli.

| Butir | Isi |
|---|---|
| Jenis dokumen di KosToken | `DOCUMENT_CERTIFICATE` |
| Kode properti | SMR01 |
| Token | KB-SMR01 |
| Versi dokumen | 1 |
| Tanggal dokumen | 20 Oktober 2026 |

## 1. Data hak atas tanah sebelum penerbitan token

| Butir | Isi |
|---|---|
| Jenis hak | Hak Milik |
| Nomor sertifikat | SHM-DUMMY-SMR01-0001 |
| Nomor surat ukur | SU-DUMMY-SMR01-0001 |
| Letak | Kelurahan Sumbersari, Kecamatan Lowokwaru, Kota Malang, Jawa Timur. Nama jalan dan nomor bangunan sengaja tidak dicantumkan |
| Luas tanah | 250 m² |
| Pemegang hak | Pemilik lama Kos Sumbersari 01, nama fiktif Rudi Hartanto. Nomor identitas tidak dicantumkan |
| Bangunan | Rumah kos dua lantai, 10 kamar berkamar mandi dalam, luas bangunan 330 m² |
| Persetujuan bangunan | PBG-DUMMY-SMR01-0001 |
| Beban dan sengketa | Tidak tercatat hak tanggungan, sita, atau sengketa |

## 2. Peralihan ke kustodian

Token KB-SMR01 mewakili hak manfaat ekonomi atas Kos Sumbersari 01, yaitu sewa bersih dan hasil penjualan properti. Token bukan sertifikat tanah. Supaya hak manfaat itu tidak bergantung pada pemilik lama, sertifikat dipegang PT KosBagi Properti sebagai kustodian untuk kepentingan seluruh pemegang token.

Perseroan tidak dapat memegang Hak Milik (UU 5/1960 tentang Peraturan Dasar Pokok-Pokok Agraria). Karena itu, dalam cerita prototipe, peralihan berjalan sebagai berikut:

| No | Langkah | Hasil dalam cerita prototipe |
|---|---|---|
| 1 | Pemilik lama dan PT KosBagi Properti menandatangani akta peralihan di hadapan PPAT | Akta AKTA-DUMMY-SMR01-0001, PPAT fiktif |
| 2 | Hak Milik dilepaskan dan diturunkan menjadi Hak Guna Bangunan supaya dapat dipegang perseroan | Permohonan ke kantor pertanahan |
| 3 | Kantor pertanahan menerbitkan Hak Guna Bangunan atas nama PT KosBagi Properti | HGB-DUMMY-SMR01-0001, jangka waktu contoh 30 tahun |
| 4 | Sertifikat Hak Guna Bangunan disimpan kustodian | Dipegang untuk kepentingan pemegang token KB-SMR01 |
| 5 | Pemilik lama menerima 5.400 token (30%) dan 12.600 token (70%) ditawarkan ke investor | Tercatat di KosToken saat penerbitan |

Status peralihan per tanggal dokumen ini: dianggap selesai, karena prototipe tidak menyimulasikan proses pertanahan. Biaya peralihan (pajak pengalihan hak, BPHTB, PPAT, dan kantor pertanahan) dibahas di proyeksi keuangan business case.

## 3. Yang dicatat di blockchain

Yang dicatat hanya hash SHA-256 file ini, sebagai versi 1 jenis `DOCUMENT_CERTIFICATE` di kontrak KosToken saat penerbitan. Isi file, termasuk nama fiktif di atas, tidak ikut dicatat. Siapa pun yang memegang file ini dapat menghitung ulang hash-nya dan mencocokkannya dengan `currentDocumentHash` di Etherscan.

Hash dihitung dari isi file apa adanya: UTF-8, akhir baris LF. Perubahan sekecil apa pun, termasuk satu spasi, menghasilkan hash berbeda. Revisi berarti versi baru yang dicatat lagi lewat `anchorDocument`, dan versi lama tetap tersimpan.
