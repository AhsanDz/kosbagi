import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { categoryLabel, EXPENSE_CATEGORIES, isExpenseCategory } from './categories.js';
import { detectReceiptType, receiptFilePath, receiptHash, sanitizeFileName, storedFileNameOf, storeReceiptFile } from './files.js';

const PDF = { contentType: 'application/pdf', extension: 'pdf' } as const;

describe('kategori biaya', () => {
  it('lima kategori dengan kode uint8 1 sampai 5', () => {
    expect(EXPENSE_CATEGORIES.map(({ code, label }) => `${code} ${label}`)).toEqual([
      '1 Listrik dan air',
      '2 Kebersihan',
      '3 Internet',
      '4 Perbaikan',
      '5 Keamanan',
    ]);
    expect(isExpenseCategory(4)).toBe(true);
    expect(isExpenseCategory(6)).toBe(false);
    expect(categoryLabel(9)).toBe('Kategori 9');
  });
});

describe('detectReceiptType', () => {
  it('membaca jenis dari isi file, bukan nama', () => {
    expect(detectReceiptType(Buffer.from('%PDF-1.4\n'))).toEqual(PDF);
    expect(detectReceiptType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toMatchObject({ extension: 'png' });
    expect(detectReceiptType(Buffer.from([0xff, 0xd8, 0xff, 0xdb]))).toMatchObject({ contentType: 'image/jpeg' });
    expect(detectReceiptType(Buffer.from('<html>%PDF-'))).toBeNull();
    expect(detectReceiptType(Buffer.alloc(0))).toBeNull();
  });
});

describe('receiptHash', () => {
  it('SHA-256 isi file, 0x + 64 hex huruf kecil', () => {
    // Vektor uji SHA-256 untuk teks "abc".
    expect(receiptHash(Buffer.from('abc'))).toBe('0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(storedFileNameOf(receiptHash(Buffer.from('abc')), PDF)).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad.pdf');
  });
});

describe('sanitizeFileName', () => {
  it('membuang folder dan karakter berbahaya', () => {
    expect(sanitizeFileName('nota-listrik-nov-2026.pdf', PDF)).toBe('nota-listrik-nov-2026.pdf');
    expect(sanitizeFileName('..\\..\\Windows\\nota "ganda".pdf', PDF)).toBe('nota ganda.pdf');
    // Baris baru dan titik dua dibuang, jadi nama file tidak bisa menyisipkan header lain.
    expect(sanitizeFileName('a\r\nContent-Type: x.pdf', PDF)).toBe('aContent-Type x.pdf');
    expect(sanitizeFileName('/etc/.passwd', PDF)).toBe('passwd');
    expect(sanitizeFileName('###', PDF)).toBe('nota.pdf');
  });

  it('receiptFilePath tidak pernah keluar dari folder unggahan', () => {
    expect(receiptFilePath(path.join('/data', 'uploads'), '../rahasia.pdf')).toBe(path.join('/data', 'uploads', 'rahasia.pdf'));
  });
});

describe('storeReceiptFile', () => {
  let directory: string | undefined;

  afterEach(async () => {
    if (directory) await rm(directory, { recursive: true, force: true });
  });

  it('menulis file sekali; isi yang sama tidak ditulis ulang dan tidak meninggalkan file sementara', async () => {
    directory = await mkdtemp(path.join(tmpdir(), 'kosbagi-nota-'));
    const folder = path.join(directory, 'baru');
    const content = Buffer.from('%PDF-1.4 DUMMY');

    const first = await storeReceiptFile(folder, 'abc.pdf', content);
    const second = await storeReceiptFile(folder, 'abc.pdf', content);

    expect(second).toBe(first);
    expect((await readFile(first)).equals(content)).toBe(true);
    expect(await readdir(folder)).toEqual(['abc.pdf']);
  });
});
