import { z } from './zod.js';

const uuidSchema = z.uuid();

/** Kolom id bertipe uuid. Nilai lain ditolak PostgreSQL, jadi route memeriksanya lebih dulu. */
export function isUuid(value: string): boolean {
  return uuidSchema.safeParse(value).success;
}
