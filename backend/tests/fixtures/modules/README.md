# Fixture pemuat router

Folder ini meniru `src/modules/` untuk test pemuat router dan format error.

- `sample/routes.ts`: modul contoh yang dipasang di `/api/sample`.
- `empty/`: hanya berisi `.gitkeep`, jadi harus dilewati pemuat router.
- `README.md` ini: berupa file, bukan folder, jadi juga dilewati.

Fixture lain di `tests/fixtures/`: `modules-invalid/` (ekspor default bukan Router), `modules-bad-name/` (nama folder tidak valid), dan `modules-js/` (meniru hasil build berekstensi `.js`).
