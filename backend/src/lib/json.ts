// JSON tidak mengenal tipe BigInt, sedangkan Prisma mengembalikan kolom uang (BigInt)
// sebagai BigInt. Tanpa penanganan ini, res.json() akan gagal dengan TypeError.

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * Replacer JSON untuk Express (app.set('json replacer', ...)).
 * Nominal rupiah dikirim sebagai number biasa, mis. 1500000. Nilai rupiah di aplikasi ini
 * jauh di bawah batas aman number (2^53 - 1, sekitar 9 kuadriliun). Nilai yang melewati
 * batas itu dikirim sebagai string supaya tidak kehilangan presisi.
 */
export function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value !== 'bigint') return value;
  return value >= MIN_SAFE && value <= MAX_SAFE ? Number(value) : value.toString();
}
