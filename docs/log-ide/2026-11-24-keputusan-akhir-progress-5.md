# 24 November 2026: Keputusan akhir progress 5

| Butir | Isi |
|---|---|
| Tanggal | Selasa, 24 November 2026 |
| Waktu dan tempat | (diisi koordinator) |
| Peserta | (diisi koordinator) |
| Jenis | Keputusan koordinator (diisi koordinator bila keputusan ini dibahas dalam rapat) |
| Pencatat | (diisi koordinator) |

## Agenda

1. Angka bisnis di repositori setelah business case dikumpulkan
2. Deploy kontrak demo akhir ke Sepolia
3. Isi tabel transaksi di README
4. Gas di Sepolia setelah upgrade jaringan
5. Perbaikan roadmap dan lampiran pernyataan AI di business case
6. Bahan presentasi dan pernyataan AI di repositori
7. RPC Sepolia untuk backend saat demo

## Diskusi

(diisi koordinator: ringkasan pembahasan dan pendapat anggota, bila keputusan ini dibahas bersama)

## Keputusan

### K1. Angka bisnis di repositori disamakan dengan business case yang dikumpulkan

Business case dikumpulkan 24 November 2026 sebagai PDF dan docx. Angka proyeksi platform PT KosBagi Teknologi di naskah itu memakai empat asumsi biaya yang berbeda dari repositori, dan dokumen bisnis serta bahan presentasi di repositori disamakan dengannya:

| Asumsi | Sebelumnya | Naskah final | Alasan dan sumber |
|---|---|---|---|
| Biaya virtual account | Rp4.480 (PPN 12% sebagai batas atas) | Rp4.440 per transaksi | Rp4.000 (Midtrans, 2026) ditambah PPN efektif 11% menurut PMK 131/2024 |
| Kepatuhan dan hukum | Rp30.000.000 per tahun | Rp36.000.000 per tahun | Rp3.000.000 per bulan, batas atas tarif konsultan pajak (Jurnal.id) |
| Ruang kerja bersama | Rp12.000.000 per tahun | Rp33.000.000 per tahun | Rp2.750.000 per bulan, asumsi kelompok untuk tim empat orang |
| Investasi awal | Rp115.000.000 | Rp165.000.000 | Audit smart contract Rp125.000.000, di dalam kisaran US$3.000 sampai US$15.000 untuk kontrak token sederhana (Sherlock, 2026; CyberScope) |

Hasilnya: biaya tetap Rp351 juta per tahun dengan tim empat orang; skenario dasar (2, 5, 8 properti baru 10 kamar) rugi Rp156,9 juta di tahun 3, NPV 3 tahun −Rp690,8 juta, dan kebutuhan dana Rp885,1 juta; BEP operasional 70 properti 10 kamar atau 28 properti 20 kamar. Strategi kos 20 kamar memakai 3, 8, dan 12 properti baru, dengan NPV Rp19,8 juta, IRR 23,3%, balik modal sekitar 2,5 tahun, dan kebutuhan dana Rp349,9 juta. Pendanaan yang disarankan sekitar Rp525,4 juta, yaitu kebutuhan dana strategi ditambah cadangan enam bulan biaya tetap Rp175,5 juta.

Naskah yang dikumpulkan juga memperbarui biaya peralihan hak (Rp140 juta, karena BPHTB dihitung setelah NPOPTKP Rp80 juta dan jasa PPAT paling tinggi 0,5%), perkiraan pasar (SAM sekitar 16.700 kamar dari 1.113 kos yang terdaftar sebagai wajib pajak), dan skenario pajak (PPh final 0,5% tidak dipakai lagi karena PP 20/2026). Dokumen di repositori mengikutinya. Angka per token investor tidak berubah: Rp438,75 per token per bulan, 5,265% per tahun, dan distribusi November Rp7.897.500.

Alasan: naskah yang dikumpulkan dan repositori harus menunjukkan angka yang sama. Keempat asumsi yang berubah sebelumnya bertanda **[perlu verifikasi]**; tiga di antaranya kini punya sumber, sedangkan ruang kerja bersama tetap asumsi kelompok.

### K2. Kontrak demo akhir di-deploy langsung ke Sepolia tanpa gladi Sepolia

Kontrak demo akhir di-deploy ke Ethereum Sepolia pada 24 November 2026 dari dompet admin, tanpa `DEPLOY_LABEL`, dan keduanya terverifikasi di Etherscan:

| Kontrak | Alamat |
|---|---|
| `KosToken` (KB-SMR01) | `0x2E8Bf3f1ea83A43Ba7e22d046E4e340Fb51C7c26` |
| `KosLedger` | `0xE012C3179E9f501b646741491365eF531042c02e` |

Deploy ini tidak didahului gladi di Sepolia. Latihan berikutnya di Sepolia memakai `DEPLOY_LABEL` sehingga men-deploy kontrak gladi sendiri, dan kontrak demo akhir tidak terpakai sebelum demo. Latihan juga tetap bisa dijalankan di Hardhat lokal. Keputusan ini mengubah sebagian [keputusan 20 November 2026 K5](2026-11-20-keputusan-qa-progress-4.md): demo akhir memakai kontrak tanpa label ini, bukan deploy Sepolia yang terakhir.

Alasan: (diisi koordinator)

### K3. Tabel transaksi README berisi dua transaksi penerbitan

Bagian "Kontrak di Sepolia" di README memuat alamat kedua kontrak dan dua transaksi penerbitan: deploy `KosToken` (penerbitan 18.000 token beserta hash sertifikat dan laporan penilaian) dan `anchorDocument` (hash perjanjian pengelolaan). Transaksi demo, yaitu whitelist KYC dan pembelian Dimas, sewa K03, nota K07, dan penutupan November 2026, dicetak dengan `npm run links:sepolia` dari folder `contracts` setelah demo dijalankan.

Alasan: transaksi demo baru tercatat di kontrak ini saat demo dijalankan, jadi tautannya belum ada ketika README diperbarui.

### K4. Roadmap business case diperbaiki dan lampiran pernyataan AI ditambahkan

Pemeriksaan silang dokumen repositori dengan naskah business case menemukan dua hal, lalu naskah PDF dan docx diperbaiki sebelum dikumpulkan:

1. **Roadmap tidak sejalan dengan proyeksi strategi.** Tabel proyeksi menghitung strategi kos 20 kamar sebagai 3, 8, dan 12 properti baru 20 kamar, tetapi roadmap menulis percontohan tahun 1 berupa "Kos Sumbersari 01 dan dua kos 20 kamar". Bila Kos Sumbersari 01 (10 kamar) dihitung sebagai salah satu properti tahun 1, NPV strategi menjadi −Rp21.216.583, bukan Rp19.826.967. Kalimat roadmap diubah: percontohan tahun 1 adalah tiga kos 20 kamar, dan Kos Sumbersari 01 tetap studi kasus prototipe yang tidak dihitung dalam proyeksi strategi. Rekomendasi dan bab regulasi ikut disesuaikan (properti percontohan berupa kos 20 kamar). Angka proyeksi tidak berubah.
2. **Naskah belum memuat pernyataan penggunaan AI**, padahal [keputusan 3 November 2026](2026-11-03-keputusan-qa-progress-2.md) menaruhnya di lampiran business case. Lampiran Pernyataan Penggunaan AI ditambahkan: alat yang dipakai (Claude, Claude Code dengan Claude Opus 5.5, dan skill), bagian yang dibantu, dan cara hasilnya diperiksa. Naskah kini 25 halaman.

Alasan: naskah, model, dan repositori harus konsisten, dan penggunaan AI wajib dicantumkan sesuai ketentuan tugas.

### K5. Kerangka slide dan pembagian bicara dihapus, pernyataan AI diringkas

Slide presentasi disusun ulang menjadi dua section, Business Case dan Teknis Platform, masing-masing dibawakan dua orang. `docs/presentasi/kerangka-slide.md` (22 slide) dan `docs/presentasi/pembagian-bicara.md` (pembagian per jalur) tidak sesuai lagi, sehingga keduanya tidak dimasukkan ke repositori; folder `docs/presentasi/` kini berisi naskah demo dan aturan bahan presentasi. [Pernyataan AI](../pernyataan-ai.md) diringkas menjadi alat yang dipakai, cara kerja, yang dikerjakan anggota, cara verifikasi, dan batasan, tanpa rincian per progress.

Alasan: (diisi koordinator)

### K6. Backend memakai RPC Infura dan pencarian event worker 10.000 blok

`SEPOLIA_RPC_URL` di `backend/.env` diisi RPC Infura, dengan Alchemy sebagai `SEPOLIA_RPC_URL_FALLBACK`. Pencarian event mundur di worker (`LOG_LOOKBACK_BLOCKS` di `backend/src/blockchain/contracts.ts`) diturunkan dari 50.000 ke 10.000 blok (±33 jam di Sepolia).

Alasan: diuji 24 November 2026, Infura menerima `eth_getLogs` sampai 10.000 blok dan menolak 20.000 ("range 20000 exceeds limit of 10000"), sedangkan Alchemy gratis hanya 10 blok. Dengan rentang 50.000, pencarian event selalu ditolak di kedua RPC. Pencarian ini hanya dipakai di kasus tepi (job diulang setelah transaksinya tercatat, atau nota yang sama diunggah ulang), jadi alur demo normal tidak berubah.

## Temuan

**Gas penyimpanan di Sepolia jauh lebih mahal sejak upgrade jaringan 6 Oktober 2026.** Deploy demo akhir memakai 27.839.967 gas, sedangkan deploy yang sama di jaringan Hardhat lokal memakai 4.307.383 gas. Harga gas Sepolia saat deploy hanya sekitar 19 wei, jadi biayanya hampir nol (sekitar 0,0000000005 ETH). Perkiraan biaya gladi di README langkah 12 dan di dokumen kontrak sudah memuat catatan ini. Worker menghitung batas gas setiap transaksi dari `estimateGas` ditambah 20%, jadi tidak bergantung pada angka gas jaringan lokal.

**RPC Alchemy paket gratis menolak `eth_getLogs` lebih dari 10 blok.** Diuji 24 November 2026 dengan `backend/.env`: rentang 10 blok diterima, rentang 11 blok atau lebih ditolak. Status on-chain tetap benar karena dibaca lewat fungsi view, tetapi pencarian event di worker bisa gagal tanpa pesan ([`docs/kontrak/keamanan-dan-gas.md`](../kontrak/keamanan-dan-gas.md) bagian 8, README langkah 11). Keputusannya di K6: Infura untuk `backend/.env` dan pencarian event worker 10.000 blok.

## Tindak lanjut

| Apa | Siapa | Tenggat | Status |
|---|---|---|---|
| Dokumen bisnis, bahan presentasi, dan log ide disamakan dengan business case yang dikumpulkan (K1) | Jalur 1 | Progress 5 | selesai (Pull Request progress 5) |
| Latihan berikutnya memakai `DEPLOY_LABEL` atau Hardhat lokal (K2) | Tim | Sebelum presentasi | belum |
| Mencetak tautan transaksi demo dengan `npm run links:sepolia` dan menambahkannya ke README (K3) | Koordinator | Setelah demo | belum |
| Naskah business case diperbaiki (roadmap dan lampiran AI) lalu dikumpulkan (K4) | Koordinator | 24 November 2026 | (diisi koordinator) |
| `SEPOLIA_RPC_URL` di `backend/.env` diganti Infura, Alchemy menjadi cadangan (K6) | Koordinator | Sebelum demo | belum |
| Pencarian event worker 10.000 blok (K6) | Jalur 3 | Progress 5 | selesai (Pull Request progress 5) |

## Rujukan

- Business case Kelompok 9 versi PDF dan docx yang dikumpulkan 24 November 2026.
- [`docs/bisnis/proyeksi-keuangan.md`](../bisnis/proyeksi-keuangan.md) bagian 2 "Perubahan asumsi 24 November 2026" dan [`docs/bisnis/business-case.md`](../bisnis/business-case.md) bab 7.
- [Keputusan lanjutan progress 3](2026-11-15-keputusan-lanjutan-progress-3.md) K1 dan K2, yang angkanya diperbarui oleh K1 di atas.
- [Keputusan dari hasil QA progress 4](2026-11-20-keputusan-qa-progress-4.md) K5 dan [keputusan sebelum progress 5](2026-11-20-keputusan-progress-5.md) K5.
- README bagian "Kontrak di Sepolia" serta langkah 11 dan 12, [`docs/kontrak/deploy-sepolia.md`](../kontrak/deploy-sepolia.md), dan `contracts/deployments/sepolia.json`.
