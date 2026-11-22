// File nota biaya (P4). Jenis file ditentukan dari isi (magic bytes), bukan dari nama atau header
// Content-Type kiriman peramban, karena keduanya bisa diisi apa saja. Hash nota = SHA-256 isi
// file, ditulis 0x + 64 hex; yang dicatat on-chain hanya hash ini, filenya tetap di server.
//
// File disimpan dengan nama dari hash-nya sendiri (content-addressed): isi yang sama selalu jatuh
// ke nama yang sama, jadi tidak ada file kembar dan nama dari pengguna tidak pernah dipakai sebagai
// path.
import { createHash, randomUUID } from 'node:crypto';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

/** Batas ukuran nota: 5 MB. */
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export interface ReceiptFileType {
  contentType: 'application/pdf' | 'image/png' | 'image/jpeg';
  extension: 'pdf' | 'png' | 'jpg';
}

const SIGNATURES: Array<{ bytes: readonly number[]; type: ReceiptFileType }> = [
  // %PDF-
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], type: { contentType: 'application/pdf', extension: 'pdf' } },
  // \x89PNG\r\n\x1a\n
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], type: { contentType: 'image/png', extension: 'png' } },
  // JPEG: FF D8 FF
  { bytes: [0xff, 0xd8, 0xff], type: { contentType: 'image/jpeg', extension: 'jpg' } },
];

/** Jenis file dari beberapa byte pertama. Null untuk selain PDF, PNG, dan JPG. */
export function detectReceiptType(content: Uint8Array): ReceiptFileType | null {
  const match = SIGNATURES.find(({ bytes }) => bytes.every((byte, index) => content[index] === byte));
  return match?.type ?? null;
}

/** SHA-256 isi file: 0x diikuti 64 heksadesimal huruf kecil. Sama dengan hash yang dihitung peramban. */
export function receiptHash(content: Uint8Array): string {
  return `0x${createHash('sha256').update(content).digest('hex')}`;
}

/** Nama file di UPLOAD_DIR: hash tanpa 0x ditambah ekstensi dari isi file. */
export function storedFileNameOf(hash: string, type: ReceiptFileType): string {
  return `${hash.slice(2)}.${type.extension}`;
}

/**
 * Nama file asli untuk tampilan dan header unduhan. Hanya huruf, angka, spasi, titik, garis bawah,
 * dan tanda hubung; folder dan karakter lain dibuang.
 */
export function sanitizeFileName(original: string, type: ReceiptFileType): string {
  const base = path.basename(original.replaceAll('\\', '/'));
  const cleaned = base
    .replace(/[^A-Za-z0-9 ._-]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+/, '')
    .trim()
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : `nota.${type.extension}`;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Menyimpan isi nota di `directory`. Ditulis ke file sementara lalu di-rename, jadi pembaca tidak
 * pernah melihat file setengah jadi. File dengan nama yang sama berarti isinya sama, jadi dilewati.
 */
export async function storeReceiptFile(directory: string, storedFileName: string, content: Uint8Array): Promise<string> {
  await mkdir(directory, { recursive: true });
  const target = path.join(directory, storedFileName);
  if (await exists(target)) return target;

  const temporary = path.join(directory, `.${storedFileName}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, content, { flag: 'wx' });
    await rename(temporary, target);
  } finally {
    await rm(temporary, { force: true });
  }
  return target;
}

/** Path file nota yang tersimpan. Nama file selalu dari basis data, tidak pernah dari permintaan. */
export function receiptFilePath(directory: string, storedFileName: string): string {
  return path.join(directory, path.basename(storedFileName));
}
