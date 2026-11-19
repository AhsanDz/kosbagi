# Dokumen Penerbitan KB-SMR01 (Dummy)

Folder ini berisi tiga dokumen dummy yang menjadi dasar penerbitan token KB-SMR01. Isinya fiktif dan tidak berlaku untuk keperluan hukum, tetapi ceritanya mengikuti proposal: Sertifikat Hak Milik pemilik lama dialihkan ke PT KosBagi Properti sebagai kustodian dan diturunkan menjadi Hak Guna Bangunan, nilai properti ditetapkan lewat penilaian, lalu pengelolaan diatur dalam perjanjian.

Kontrak KosToken tidak menyimpan isi dokumen. Yang dicatat hanya hash SHA-256 tiap file, sehingga siapa pun yang memegang file dapat membuktikan bahwa dokumennya sama dengan yang dipakai saat penerbitan.

| File | Jenis dokumen di KosToken | Dicatat | SHA-256 versi 1 |
|---|---|---|---|
| [`sertifikat-hak-milik.md`](sertifikat-hak-milik.md) | `DOCUMENT_CERTIFICATE` | Konstruktor KosToken saat deploy | `0xec8c1044639cfdf4a8d6fba8c477df0dbe2f09b757f58c918d0676ddda581ef3` |
| [`laporan-penilaian.md`](laporan-penilaian.md) | `DOCUMENT_APPRAISAL_REPORT` | Konstruktor KosToken saat deploy | `0x49ce16e79ed47d0c21793650545a406c32108d8ba5a5a58a0ec1041d40eed732` |
| [`perjanjian-pengelolaan.md`](perjanjian-pengelolaan.md) | `DOCUMENT_MANAGEMENT_AGREEMENT` | `anchorDocument` sesudah deploy | `0x1839d3cf229ad401b50299dd9fdca617691bef295d720a88ec3ed7f806946741` |

File README ini bukan dokumen penerbitan dan tidak dicatat. Skrip deploy di `contracts/` membaca ketiga nama file di atas secara eksplisit dan menghitung hash-nya saat dijalankan.

## Aturan

1. **Isi ketiga file dibekukan sejak 3 November 2026.** Satu karakter yang berubah, termasuk spasi atau akhir baris, menghasilkan hash berbeda dan tidak akan cocok dengan catatan di blockchain.
2. File disimpan sebagai UTF-8 tanpa BOM dengan akhir baris LF. `.gitattributes` di root repo memaksa LF saat checkout, jadi hash di Windows sama dengan di Linux. Jangan menyimpan ulang file ini dengan editor yang mengubah akhir baris menjadi CRLF.
3. Revisi dokumen dibuat sebagai file versi baru, lalu dicatat lewat `anchorDocument`. Versi lama tetap tersimpan di `documentHistory` KosToken.
4. Tidak ada data pribadi asli. Nama pemilik lama, penilai, dan perwakilan para pihak adalah nama fiktif.

## Cara memeriksa hash

Dari folder ini, di PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 sertifikat-hak-milik.md, laporan-penilaian.md, perjanjian-pengelolaan.md
```

Di Git Bash, macOS, atau Linux:

```bash
sha256sum sertifikat-hak-milik.md laporan-penilaian.md perjanjian-pengelolaan.md
```

Hasilnya sama dengan kolom SHA-256 di tabel tanpa awalan `0x` (PowerShell menampilkan huruf besar). Setelah kontrak di-deploy, bandingkan dengan `currentDocumentHash` pada tab Read Contract KosToken di Etherscan. Isian `documentType` diambil dari fungsi baca dengan nama yang sama, misalnya `DOCUMENT_CERTIFICATE()`, yang bernilai `keccak256("DOCUMENT_CERTIFICATE")`.
