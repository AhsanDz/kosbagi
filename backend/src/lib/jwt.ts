// Membuat dan memeriksa JWT akun dummy. Algoritma dikunci ke HS256 saat verifikasi, jadi token
// berheader alg lain (termasuk "none") ditolak.
import { jwtVerify, SignJWT } from 'jose';
import { env } from '../config/env.js';
import { Role } from '../generated/prisma/enums.js';

const ALGORITHM = 'HS256';
const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;
const secret = new TextEncoder().encode(env.JWT_SECRET);

export interface AccessTokenClaims {
  id: string;
  role: Role;
}

export interface SignedToken {
  token: string;
  expiresAt: Date;
}

/** Membuat token 8 jam dengan klaim `sub` (id pengguna) dan `role`. */
export async function signAccessToken({ id, role }: AccessTokenClaims, now: Date = new Date()): Promise<SignedToken> {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const expiresAt = issuedAt + TOKEN_LIFETIME_SECONDS;
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(id)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(secret);
  return { token, expiresAt: new Date(expiresAt * 1000) };
}

/** Mengembalikan isi token, atau null bila token palsu, kedaluwarsa, atau isinya tidak lengkap. */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: [ALGORITHM] });
    const role = Object.values(Role).find((value) => value === payload['role']);
    if (!payload.sub || !role) return null;
    return { id: payload.sub, role };
  } catch {
    return null;
  }
}
