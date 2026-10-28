# Panduan Kontribusi

Semua perubahan masuk ke `main` lewat Pull Request. Tidak ada yang push langsung ke `main`.

## Alur kerja

1. Perbarui `main` di laptopmu:
   ```bash
   git switch main
   git pull
   ```
2. Buat branch baru dengan pola `p<progress>/j<jalur>-<topik>`, misalnya `p2/j2-webhook-midtrans`:
   ```bash
   git switch -c p2/j2-webhook-midtrans
   ```
3. Kerjakan perubahan hanya di wilayah file jalurmu, lalu commit.
4. Push branch dan buka Pull Request ke `main` dengan judul `[P2][J2] Webhook Midtrans`.
5. Koordinator memeriksa tab **Files changed**, lalu merge dengan **Create a merge commit** dan menghapus branch.

Satu pekerjaan = satu branch = satu Pull Request. Progress berikutnya dimulai setelah semua Pull Request progress sebelumnya di-merge.

## Wilayah file per jalur

| Jalur | Wilayah utama |
|---|---|
| 1 Bisnis & Keuangan | file root repo, `docs/bisnis`, `docs/regulasi`, `docs/log-ide`, `docs/presentasi`, `docs/pernyataan-ai.md`, seed data, `backend/src/finance`, modul & halaman rekonsiliasi |
| 2 Backend & Pembayaran | `backend/` (selain wilayah jalur 1 dan 3), `docker-compose.yml`, `.github/`, `docs/api`, laporan uji pembayaran |
| 3 Kontrak & Blockchain | `contracts/`, `backend/src/blockchain`, `backend/src/worker.ts`, `docs/kontrak`, laporan uji kontrak |
| 4 Frontend & Desain | `frontend/` (selain halaman rekonsiliasi), `docs/desain` |

Kalau perlu mengubah file di wilayah jalur lain, sampaikan ke pemilik jalur itu supaya tidak terjadi konflik.

## Pesan commit

Format [Conventional Commits](https://www.conventionalcommits.org/) berbahasa Indonesia:

```
<jenis>(<cakupan>): <ringkasan singkat>
```

- Jenis: `feat` (fitur), `fix` (perbaikan), `test`, `docs`, `chore` (konfigurasi/peralatan), `refactor`.
- Cakupan: `contracts`, `backend`, `frontend`, `docs`, atau `repo`.
- Contoh: `feat(contracts): tambah batas kepemilikan 10% di KosToken`.

## Aturan keamanan

- Jangan pernah commit file `.env`, private key, mnemonic, atau server key Midtrans. Yang boleh masuk repo hanya `.env.example` berisi nilai contoh.
- Hanya data dummy: tanpa nama asli, KTP, atau nomor rekening asli.
- Hanya Midtrans sandbox dan Sepolia testnet.
