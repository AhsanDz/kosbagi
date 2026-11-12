import { Prisma } from '../generated/prisma/client.js';

/** Melanggar constraint atau index unik (kode Prisma P2002). */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
