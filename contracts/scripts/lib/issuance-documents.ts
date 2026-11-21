import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ConfigError } from "./errors.js";

/**
 * Tiga dokumen penerbitan yang hash-nya dicatat di KosToken saat deploy.
 *
 * Nama file ditulis eksplisit (bukan membaca seluruh folder) karena folder
 * dokumen penerbitan juga berisi README.md yang bukan dokumen untuk dicatat.
 * `type` adalah nama konstanta jenis dokumen di KosToken. Isi file milik jalur 1
 * dan tidak boleh diubah setelah dicatat on-chain, karena hash-nya permanen.
 */
export const ISSUANCE_DOCUMENTS = [
  { type: "DOCUMENT_CERTIFICATE", fileName: "sertifikat-hak-milik.md", label: "Sertifikat hak milik" },
  { type: "DOCUMENT_APPRAISAL_REPORT", fileName: "laporan-penilaian.md", label: "Laporan penilaian" },
  { type: "DOCUMENT_MANAGEMENT_AGREEMENT", fileName: "perjanjian-pengelolaan.md", label: "Perjanjian pengelolaan" },
] as const;

export type IssuanceDocumentType = (typeof ISSUANCE_DOCUMENTS)[number]["type"];

/** Folder bawaan dokumen penerbitan: docs/bisnis/dokumen-penerbitan/ di root repo. */
export const DEFAULT_ISSUANCE_DOCS_DIR = fileURLToPath(
  new URL("../../../docs/bisnis/dokumen-penerbitan/", import.meta.url),
);

/** Root repo kosbagi/, dipakai untuk menulis path dokumen secara relatif. */
export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

export interface HashedDocument {
  type: IssuanceDocumentType;
  label: string;
  fileName: string;
  /** Path absolut file yang di-hash. */
  absolutePath: string;
  /** SHA-256 isi file apa adanya, bytes32 berawalan 0x. */
  sha256: string;
  sizeBytes: number;
}

/** Ekstensi file teks yang wajib berakhiran baris LF dan tanpa BOM. */
const TEXT_EXTENSIONS = new Set([".md", ".txt"]);

/**
 * SHA-256 dari byte file apa adanya, ditulis sebagai bytes32 heksadesimal berawalan 0x.
 * Hasilnya sama dengan `sha256sum` (Linux) atau `Get-FileHash` (PowerShell), hanya
 * ditambah awalan 0x.
 */
export function sha256Hex(content: Uint8Array): string {
  return `0x${createHash("sha256").update(content).digest("hex")}`;
}

/**
 * Membaca tiga dokumen penerbitan dari `directory` dan menghitung SHA-256-nya.
 *
 * Gagal bila ada file yang tidak ditemukan atau kosong, atau bila file teks
 * memakai akhir baris CRLF atau BOM. Repo menyimpan file teks dengan LF
 * (.gitattributes), jadi CRLF atau BOM berarti file berubah di laptop ini dan
 * hash-nya tidak akan sama dengan yang dicatat jalur 1.
 */
export async function hashIssuanceDocuments(directory: string): Promise<HashedDocument[]> {
  const results: HashedDocument[] = [];

  for (const document of ISSUANCE_DOCUMENTS) {
    const absolutePath = path.resolve(directory, document.fileName);
    let content: Buffer;
    try {
      content = await readFile(absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        throw new ConfigError(
          `Dokumen penerbitan tidak ditemukan: ${absolutePath}. ` +
            `Folder ${directory} harus berisi ${ISSUANCE_DOCUMENTS.map((d) => d.fileName).join(", ")}.`,
        );
      }
      throw error;
    }

    if (content.length === 0) {
      throw new ConfigError(`Dokumen penerbitan kosong: ${absolutePath}.`);
    }
    if (TEXT_EXTENSIONS.has(path.extname(document.fileName).toLowerCase())) {
      if (content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf) {
        throw new ConfigError(`${absolutePath} diawali BOM UTF-8. Simpan ulang tanpa BOM agar hash sama dengan versi repo.`);
      }
      if (content.includes(0x0d)) {
        throw new ConfigError(
          `${absolutePath} memakai akhir baris CRLF. Ambil ulang file dari Git (akhir baris LF) agar hash sama dengan versi repo.`,
        );
      }
    }

    results.push({
      type: document.type,
      label: document.label,
      fileName: document.fileName,
      absolutePath,
      sha256: sha256Hex(content),
      sizeBytes: content.length,
    });
  }

  return results;
}

/** Path dokumen untuk dicatat di berkas hasil deploy: relatif terhadap root repo bila di dalamnya. */
export function displayPath(absolutePath: string): string {
  const relative = path.relative(REPO_ROOT, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return absolutePath;
  return relative.split(path.sep).join("/");
}
