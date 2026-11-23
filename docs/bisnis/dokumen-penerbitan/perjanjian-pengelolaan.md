# Perjanjian Pengelolaan Kos Sumbersari 01 (Dummy)

> **DOKUMEN DUMMY UNTUK PROTOTIPE TUGAS AKHIR.** Ini bukan perjanjian yang mengikat dan bukan nasihat hukum. Nama perwakilan para pihak fiktif dan tidak ada tanda tangan sungguhan. Tidak ada NIK, nomor rekening, alamat rumah, atau data pribadi asli.

| Butir | Isi |
|---|---|
| Jenis dokumen di KosToken | `DOCUMENT_MANAGEMENT_AGREEMENT` |
| Kode properti | SMR01 |
| Token | KB-SMR01 |
| Versi dokumen | 1 |
| Nomor perjanjian | PKS-DUMMY-SMR01-2026-01 |
| Tanggal | 22 Oktober 2026 |

## Para pihak

| Pihak | Peran |
|---|---|
| PT KosBagi Teknologi | Platform: menjalankan aplikasi dan smart contract, menagih sewa, menghitung distribusi, dan menunjuk pengelola harian |
| PT KosBagi Properti | Kustodian: memegang sertifikat Hak Guna Bangunan HGB-DUMMY-SMR01-0001 dan rekening penampungan untuk kepentingan pemegang token |
| Pemilik lama Kos Sumbersari 01 | Pemegang 5.400 token KB-SMR01 (30%), nama fiktif Rudi Hartanto |

## Pasal 1. Objek

1. Objek perjanjian adalah pengelolaan Kos Sumbersari 01 (kode SMR01), 10 kamar, dengan nilai pasar Rp1.800.000.000 menurut laporan penilaian LPP-DUMMY-SMR01-2026-01.
2. Hak manfaat ekonomi atas properti, yaitu sewa bersih dan hasil penjualan, diwakili 18.000 token KB-SMR01. Token bukan saham perusahaan dan bukan sertifikat tanah.

## Pasal 2. Token dan penawaran

1. Pemilik lama memegang 5.400 token (30%). Sebanyak 12.600 token (70%) ditawarkan kepada investor seharga Rp100.000 per token.
2. Satu investor paling banyak memegang 1.800 token (10%). Batas ini ditegakkan di kontrak KosToken, kecuali untuk dompet pemilik lama dan dompet perbendaharaan.
3. Hanya investor yang lolos verifikasi KYC yang dapat menerima token.
4. Penawaran ditutup 31 Desember 2026 pukul 23.59 WIB. Bila 12.600 token tidak terjual habis sampai batas itu, penawaran dibatalkan dan dana investor dikembalikan.
5. Bila penawaran berhasil, PT KosBagi Teknologi menerima fee penawaran 3% dari dana yang dihimpun, yaitu Rp37.800.000, yang dipotong dari dana penawaran. Pemilik lama menerima Rp1.222.200.000.

## Pasal 3. Penagihan sewa

1. Penghuni membayar sewa lewat payment gateway (virtual account, QRIS, atau dompet digital) ke rekening penampungan PT KosBagi Properti. Penghuni tidak dikenai biaya tambahan.
2. Setiap pembayaran sewa yang terverifikasi dicatat di kontrak KosLedger dengan kode properti, nomor kamar, periode, nominal, dan hash referensi pembayaran.
3. Biaya transaksi payment gateway ditanggung PT KosBagi Teknologi.

## Pasal 4. Biaya operasional

1. Pengelola harian yang ditunjuk PT KosBagi Teknologi (Hadi Santoso, nama dummy) mengurus kamar, penghuni, dan biaya operasional.
2. Setiap biaya dicatat bersama nota. Hash nota dicatat di kontrak KosLedger, dan satu nota hanya dapat dicatat sekali.

## Pasal 5. Fee pengelolaan, pajak, dan distribusi

1. Distribusi dihitung per periode bulan, dengan semua nominal dalam rupiah bilangan bulat dan setiap pembagian dibulatkan ke bawah:

   | Besaran | Rumus |
   |---|---|
   | Fee pengelolaan | sewa kotor × 500 ÷ 10.000 (5% dari sewa kotor) |
   | Laba kena pajak | sewa kotor − fee pengelolaan − biaya, bernilai 0 bila negatif |
   | Pajak | laba kena pajak × 2.200 ÷ 10.000 (22%) |
   | Sewa bersih | laba kena pajak − pajak |
   | Bagian satu pemegang | sewa bersih × saldo token ÷ total suplai |

2. Saldo token dibaca pada blok snapshot penutupan periode di kontrak KosToken. Total suplai adalah seluruh 18.000 token, termasuk token pemilik lama.
3. Sisa pembulatan masuk cadangan periode itu dan tidak dibawa ke periode berikutnya.
4. Bila biaya melebihi sewa setelah fee, sewa bersih periode itu Rp0 dan kekurangannya tidak dibawa ke periode berikutnya.
5. Tarif fee dan pajak tertulis di kontrak KosLedger dan tidak dapat diubah. Perubahan tarif hanya dapat dilakukan dengan kontrak baru dan adendum perjanjian ini.
6. Bagian atas token yang belum terjual dan masih berada di dompet perbendaharaan diatur dalam adendum.

## Pasal 6. Pencairan

Bagi hasil diakumulasi di saldo akun pemegang token dan dibayarkan dari rekening penampungan PT KosBagi Properti saat pemegang token menarik dana.

## Pasal 7. Keterbukaan dan data pribadi

1. Pemegang token dapat memeriksa setiap pembayaran sewa, biaya, dan penutupan periode di kontrak KosLedger lewat Etherscan.
2. Data identitas investor dan penghuni disimpan di basis data PT KosBagi Teknologi sesuai UU 27/2022 tentang Pelindungan Data Pribadi.
3. Blockchain hanya memuat kode properti, nomor kamar, periode, nominal, hash referensi pembayaran, hash nota, hash dokumen, dan alamat dompet. Nama dan nomor identitas tidak pernah dicatat di blockchain.

## Pasal 8. Keputusan besar

Renovasi besar dan penjualan properti diputuskan lewat pemungutan suara pemegang token, dengan bobot sesuai saldo token pada blok saat usulan dibuat. Hasil penjualan properti dibagi sesuai jumlah token. Tata cara pemungutan suara diatur terpisah.

## Pasal 9. Jangka waktu dan pengakhiran

Perjanjian berlaku selama token KB-SMR01 beredar dan berakhir setelah properti dijual dan hasilnya dibagikan kepada pemegang token, atau bila penawaran dibatalkan menurut Pasal 2 ayat 4.

## Pasal 10. Penyelesaian perselisihan

Perselisihan diselesaikan lebih dulu secara musyawarah. Perjanjian ini tunduk pada hukum Republik Indonesia.

## Pengesahan (dummy)

| Pihak | Diwakili oleh | Tanda tangan |
|---|---|---|
| PT KosBagi Teknologi | Direktur, nama fiktif | Tidak ada, dokumen dummy |
| PT KosBagi Properti | Direktur, nama fiktif | Tidak ada, dokumen dummy |
| Pemilik lama | Rudi Hartanto, nama fiktif | Tidak ada, dokumen dummy |

## Yang dicatat di blockchain

Yang dicatat hanya hash SHA-256 file ini, sebagai versi 1 jenis `DOCUMENT_MANAGEMENT_AGREEMENT` di kontrak KosToken lewat `anchorDocument` sesudah penerbitan. Hash dihitung dari isi file apa adanya: UTF-8, akhir baris LF. Adendum dicatat sebagai versi berikutnya, dan versi ini tetap tersimpan.
