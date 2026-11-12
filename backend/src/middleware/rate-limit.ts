// Pembatas jumlah permintaan. Penghitung disimpan di memori proses: cukup untuk prototipe dengan
// satu proses API, dan otomatis kosong lagi saat server restart.
import type { Request, RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../lib/errors.js';
import { currentUser } from './auth.js';

interface RateLimitOptions {
  /** Jumlah permintaan yang diizinkan per jendela waktu. */
  limit: number;
  windowMs?: number;
  /** Bawaan: dihitung per IP. */
  keyGenerator?: (req: Request) => string;
}

export function createRateLimiter({ limit, windowMs = 60_000, keyGenerator }: RateLimitOptions): RequestHandler {
  return rateLimit({
    limit,
    windowMs,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (_req, _res, next) => {
      next(new AppError(429, 'RATE_LIMITED', 'Terlalu banyak permintaan. Coba lagi beberapa saat lagi.'));
    },
  });
}

/** Dihitung per pengguna, bukan per IP. Dipasang setelah requireAuth. */
export function createUserRateLimiter(options: Omit<RateLimitOptions, 'keyGenerator'>): RequestHandler {
  return createRateLimiter({ ...options, keyGenerator: (req) => currentUser(req).id });
}
