// Modul auth: login akun dummy dan data pengguna yang sedang masuk.
import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import type { User } from '../../generated/prisma/client.js';
import { AppError } from '../../lib/errors.js';
import { signAccessToken } from '../../lib/jwt.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { prisma } from '../../lib/prisma.js';
import { z } from '../../lib/zod.js';
import { currentUser, requireAuth } from '../../middleware/auth.js';
import { createRateLimiter } from '../../middleware/rate-limit.js';

const loginLimiter = createRateLimiter({ limit: 10 });

const loginSchema = z.object({
  email: z.email().transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(200),
});

let decoyHash: Promise<string> | undefined;

/**
 * Hash pengganti untuk email yang tidak terdaftar. scrypt tetap dijalankan, supaya lama proses
 * tidak membocorkan apakah sebuah email punya akun.
 */
function getDecoyHash(): Promise<string> {
  decoyHash ??= hashPassword(randomUUID());
  return decoyHash;
}

function toUserDto({ id, name, email, role }: User) {
  return { id, name, email, role };
}

const router = Router();

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordMatches = await verifyPassword(password, user?.passwordHash ?? (await getDecoyHash()));
  if (!user || !passwordMatches) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email atau kata sandi salah.');

  const { token, expiresAt } = await signAccessToken(user);
  res.json({ data: { token, expiresAt, user: toUserDto(user) } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: currentUser(req).id } });
  // Token masih berlaku tetapi akunnya sudah tidak ada, mis. setelah basis data diisi ulang.
  if (!user) throw new AppError(401, 'UNAUTHENTICATED', 'Silakan masuk terlebih dahulu.');

  res.json({ data: { user: toUserDto(user) } });
});

export default router;
