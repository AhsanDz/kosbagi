// Hash dan verifikasi kata sandi akun dummy memakai scrypt bawaan Node.js (tanpa paket tambahan).
// Dipakai login (auth) dan data dummy (seed), jadi keduanya selalu memakai format yang sama.
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Parameter sesuai salah satu rekomendasi OWASP untuk scrypt: N=2^15, r=8, p=3.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELISM = 3;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
// Batas memori bawaan Node (32 MiB) terlalu sempit untuk N=2^15, jadi dinaikkan.
const MAX_MEMORY = 64 * 1024 * 1024;

function deriveKey(password: string, salt: Buffer, cost: number, blockSize: number, parallelism: number, keyLength: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(
      password.normalize('NFKC'),
      salt,
      keyLength,
      { N: cost, r: blockSize, p: parallelism, maxmem: MAX_MEMORY },
      (error, key) => (error ? reject(error) : resolve(key)),
    );
  });
}

/**
 * Menghasilkan hash berformat `scrypt$N$r$p$salt$hash` (salt dan hash dalam base64url).
 * Salt acak membuat dua hash dari kata sandi yang sama selalu berbeda.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const key = await deriveKey(password, salt, COST, BLOCK_SIZE, PARALLELISM, KEY_LENGTH);
  return ['scrypt', COST, BLOCK_SIZE, PARALLELISM, salt.toString('base64url'), key.toString('base64url')].join('$');
}

/** Mencocokkan kata sandi dengan hash tersimpan. Hash rusak atau format asing dianggap tidak cocok. */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, cost, blockSize, parallelism, salt, key, ...rest] = storedHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !key || rest.length > 0) return false;

  const expected = Buffer.from(key, 'base64url');
  try {
    const actual = await deriveKey(
      password,
      Buffer.from(salt, 'base64url'),
      Number(cost),
      Number(blockSize),
      Number(parallelism),
      expected.length,
    );
    // Perbandingan waktu-konstan supaya lama proses tidak membocorkan berapa byte yang cocok.
    return expected.length > 0 && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
