// Kontrak antara backend dan worker blockchain: nama antrean, jenis job, dan isi tiap job.
// Isi job ikut terbaca siapa pun yang punya akses Redis, jadi hanya boleh memuat kode properti,
// nomor kamar, periode, nominal, hash, dan alamat dompet. Skema .strict() menolak field lain,
// termasuk nama atau data pribadi yang tidak sengaja ikut.
import { id as keccak256OfText } from 'ethers';
import type { OutboxJobType } from '../generated/prisma/enums.js';
import { z } from '../lib/zod.js';

export const BLOCKCHAIN_QUEUE_NAME = 'blockchain';

const hash32 = z.string().regex(/^0x[0-9a-f]{64}$/);
const walletAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const propertyCode = z.string().min(1);
const period = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const rupiah = z.number().int().positive();

export const jobPayloadSchemas = {
  RECORD_RENT: z.strictObject({
    propertyCode,
    roomNumber: z.string().regex(/^K\d+$/),
    period,
    amountIdr: rupiah,
    /** keccak256(order_id). */
    paymentRef: hash32,
  }),
  WHITELIST_KYC: z.strictObject({
    walletAddress,
    approved: z.boolean(),
  }),
  TRANSFER_TOKENS: z.strictObject({
    propertyCode,
    walletAddress,
    tokenAmount: z.number().int().positive(),
    /** keccak256(order_id). */
    paymentRef: hash32,
  }),
  RECORD_EXPENSE: z.strictObject({
    propertyCode,
    period,
    category: z.number().int().min(0).max(255),
    amountIdr: rupiah,
    receiptHash: hash32,
  }),
  CLOSE_PERIOD: z.strictObject({
    propertyCode,
    period,
  }),
} satisfies Record<OutboxJobType, z.ZodType>;

export type JobPayload<T extends OutboxJobType = OutboxJobType> = z.output<(typeof jobPayloadSchemas)[T]>;

/** Isi job di BullMQ. Nama job sama dengan `type`, id job sama dengan `outboxJobId`. */
export interface BlockchainJobData<T extends OutboxJobType = OutboxJobType> {
  outboxJobId: string;
  type: T;
  payload: JobPayload<T>;
}

/** Memvalidasi isi job. Melempar ZodError bila ada field yang kurang atau tidak dikenal. */
export function parseJobPayload<T extends OutboxJobType>(type: T, payload: unknown): JobPayload<T> {
  return jobPayloadSchemas[type].parse(payload) as JobPayload<T>;
}

/** Referensi pembayaran on-chain: keccak256 dari order_id, 32 byte berawalan 0x. */
export function paymentReference(orderId: string): string {
  return keccak256OfText(orderId);
}
