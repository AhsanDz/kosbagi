// Autentikasi dan otorisasi per route. Pemakaian:
//   router.get('/', requireAuth, requireRole('TENANT'), handler);
// requireAuth tidak menyentuh basis data: identitas dan peran dibaca dari JWT.
import type { Request, RequestHandler } from 'express';
import type { Role } from '../generated/prisma/enums.js';
import { AppError } from '../lib/errors.js';
import { type AccessTokenClaims, verifyAccessToken } from '../lib/jwt.js';

declare global {
  namespace Express {
    interface Request {
      /** Diisi requireAuth. */
      user?: AccessTokenClaims;
    }
  }
}

const BEARER = /^Bearer ([^\s]+)$/i;

function unauthenticated(): AppError {
  return new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.');
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = BEARER.exec(req.headers.authorization ?? '')?.[1];
  const claims = token ? await verifyAccessToken(token) : null;
  if (!claims) throw unauthenticated();

  req.user = claims;
  next();
};

/** Dipasang setelah requireAuth. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    const { role } = currentUser(req);
    if (!roles.includes(role)) {
      throw new AppError(403, 'FORBIDDEN', 'Akun ini tidak punya akses ke fitur tersebut.');
    }
    next();
  };
}

/** Pengguna yang sedang masuk. Hanya untuk handler di belakang requireAuth. */
export function currentUser(req: Request): AccessTokenClaims {
  if (!req.user) throw unauthenticated();
  return req.user;
}
