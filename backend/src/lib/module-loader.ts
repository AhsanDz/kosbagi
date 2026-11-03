// Pemuat router otomatis: setiap folder src/modules/<nama>/ yang berisi routes.ts
// dipasang di /api/<nama>. Modul baru cukup membuat folder + routes.ts, tanpa mengubah app.ts.
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Express, Router } from 'express';

// Ekstensi file modul mengikuti cara aplikasi dijalankan: .ts saat dijalankan langsung
// dari src/ (tsx, vitest), .js setelah dikompilasi ke dist/ (npm run build).
const DEFAULT_EXTENSION = path.extname(fileURLToPath(import.meta.url));

// Nama folder menjadi bagian URL, jadi hanya huruf kecil, angka, dan tanda hubung.
const MODULE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function isFile(filePath: string): Promise<boolean> {
  try {
    return (await stat(filePath)).isFile();
  } catch {
    return false;
  }
}

/**
 * Memasang router semua modul di `modulesDir` ke `app`, urut abjad.
 * Folder tanpa routes (mis. hanya berisi .gitkeep) dilewati.
 * Mengembalikan nama modul yang berhasil dipasang.
 */
export async function loadModuleRouters(
  app: Express,
  modulesDir: string,
  extension: string = DEFAULT_EXTENSION,
): Promise<string[]> {
  const entries = await readdir(modulesDir, { withFileTypes: true });
  const folders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const loaded: string[] = [];
  for (const name of folders) {
    const routesFile = path.join(modulesDir, name, `routes${extension}`);
    if (!(await isFile(routesFile))) continue;

    if (!MODULE_NAME.test(name)) {
      throw new Error(
        `Nama folder modul "${name}" tidak valid: gunakan huruf kecil, angka, dan tanda hubung (mis. owner-applications).`,
      );
    }

    // import() butuh URL file:// supaya path Windows (C:\...) terbaca benar.
    const imported: { default?: unknown } = await import(pathToFileURL(routesFile).href);
    if (typeof imported.default !== 'function') {
      throw new Error(`Modul "${name}": routes${extension} harus mengekspor default sebuah Router Express.`);
    }

    app.use(`/api/${name}`, imported.default as Router);
    loaded.push(name);
  }
  return loaded;
}
