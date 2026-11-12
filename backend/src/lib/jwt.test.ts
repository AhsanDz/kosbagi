import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { signAccessToken, verifyAccessToken } from './jwt.js';

const user = { id: '01a18897-fb42-70b8-abc0-43d131ddbe3c', role: 'TENANT' } as const;
const wrongSecret = new TextEncoder().encode('kunci-lain-yang-panjangnya-tiga-puluh-dua-karakter');

describe('signAccessToken', () => {
  it('membuat token berlaku 8 jam yang bisa diverifikasi', async () => {
    const now = new Date();
    const { token, expiresAt } = await signAccessToken(user, now);

    expect(Math.round((expiresAt.getTime() - now.getTime()) / 1000 / 60 / 60)).toBe(8);
    await expect(verifyAccessToken(token)).resolves.toEqual(user);
  });
});

describe('verifyAccessToken', () => {
  it('menolak token kedaluwarsa', async () => {
    const nineHoursAgo = new Date(Date.now() - 9 * 60 * 60 * 1000);
    const { token } = await signAccessToken(user, nineHoursAgo);

    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it('menolak token yang ditandatangani kunci lain', async () => {
    const token = await new SignJWT({ role: 'ADMIN' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setExpirationTime('1h')
      .sign(wrongSecret);

    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it('menolak token alg none', async () => {
    const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const token = `${encode({ alg: 'none' })}.${encode({ sub: user.id, role: 'ADMIN' })}.`;

    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it('menolak token dengan peran yang tidak dikenal', async () => {
    const { token } = await signAccessToken({ id: user.id, role: 'SUPERADMIN' as never });

    await expect(verifyAccessToken(token)).resolves.toBeNull();
  });

  it('menolak teks yang bukan JWT', async () => {
    await expect(verifyAccessToken('bukan-token')).resolves.toBeNull();
  });
});
