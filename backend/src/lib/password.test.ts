import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.js';

describe('hashPassword dan verifyPassword', () => {
  it('menyimpan hash scrypt, bukan kata sandi aslinya', async () => {
    const hash = await hashPassword('demo-kosbagi');
    expect(hash).toMatch(/^scrypt\$32768\$8\$3\$[\w-]+\$[\w-]+$/);
    expect(hash).not.toContain('demo-kosbagi');
  });

  it('menerima kata sandi yang benar dan menolak yang salah', async () => {
    const hash = await hashPassword('demo-kosbagi');
    await expect(verifyPassword('demo-kosbagi', hash)).resolves.toBe(true);
    await expect(verifyPassword('demo-kosbagi!', hash)).resolves.toBe(false);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('menghasilkan hash berbeda untuk kata sandi yang sama (salt acak)', async () => {
    const [first, second] = await Promise.all([hashPassword('sama'), hashPassword('sama')]);
    expect(first).not.toBe(second);
  });

  it('menganggap hash rusak atau berformat asing tidak cocok', async () => {
    await expect(verifyPassword('apa saja', '')).resolves.toBe(false);
    await expect(verifyPassword('apa saja', 'teks-biasa')).resolves.toBe(false);
    await expect(verifyPassword('apa saja', 'bcrypt$10$abc$def$ghi$jkl')).resolves.toBe(false);
    await expect(verifyPassword('apa saja', 'scrypt$bukan-angka$8$3$c2FsdA$aGFzaA')).resolves.toBe(false);
  });
});
