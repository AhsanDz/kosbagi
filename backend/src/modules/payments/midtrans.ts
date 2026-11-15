// Pembungkus tipis klien resmi midtrans-client. Hanya sandbox: isProduction ditulis tetap false,
// sehingga permintaan selalu menuju
//   Snap  : https://app.sandbox.midtrans.com/snap/v1/transactions
//   Status: https://api.sandbox.midtrans.com/v2/{order_id}/status
// Server key hanya dipakai di file ini dan di verifikasi signature webhook.
//
// Semua akses ke Midtrans lewat objek `midtrans` supaya test bisa menirunya dengan vi.spyOn.
import midtransClient, { type Snap } from 'midtrans-client';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { formatMidtransTime } from '../../lib/wib.js';
import { z } from '../../lib/zod.js';

/** Batas bayar satu percobaan, sekaligus batas uji kedaluwarsa. */
export const PAYMENT_WINDOW_MINUTES = 5;

/**
 * Metode yang ditawarkan di Snap: virtual account, QRIS, dan e-wallet.
 * Nilai QRIS menurut dokumen Midtrans adalah other_qris, bukan qris. Metode yang belum aktif di
 * dashboard sandbox tidak ditampilkan Snap.
 */
export const SNAP_ENABLED_PAYMENTS = [
  'bca_va',
  'bni_va',
  'bri_va',
  'permata_va',
  'other_qris',
  'gopay',
  'shopeepay',
] as const;

// Midtrans memutus notifikasi setelah 15 detik dan menyarankan balasan dalam 5 detik.
export const MIDTRANS_TIMEOUT_MS = 8_000;

export interface SnapTransactionInput {
  orderId: string;
  amountIdr: bigint;
  itemName: string;
  customer: { name: string; email: string };
  /** Awal hitungan batas bayar. */
  startsAt: Date;
}

export interface SnapTransaction {
  token: string;
  redirectUrl: string;
}

const statusResponseSchema = z.object({
  status_code: z.string(),
  transaction_status: z.string(),
  gross_amount: z.string(),
  fraud_status: z.string().optional(),
  payment_type: z.string().optional(),
  transaction_id: z.string().optional(),
});

/** Jawaban API status Midtrans. Sumber kebenaran untuk keputusan webhook. */
export type TransactionStatus = z.output<typeof statusResponseSchema>;

/** Midtrans tidak bisa dihubungi, membalas error, atau jawabannya tidak bisa dibaca. */
export class MidtransUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MidtransUnavailableError';
  }
}

let snapClient: Snap | undefined;

function client(): Snap {
  if (!env.MIDTRANS_SERVER_KEY) throw new MidtransUnavailableError('MIDTRANS_SERVER_KEY belum diisi.');
  if (!snapClient) {
    snapClient = new midtransClient.Snap({ isProduction: false, serverKey: env.MIDTRANS_SERVER_KEY });
    snapClient.httpClient.http_client.defaults.timeout = MIDTRANS_TIMEOUT_MS;
  }
  return snapClient;
}

function describeFailure(error: unknown): { httpStatusCode: unknown; messages: unknown } {
  if (error instanceof midtransClient.MidtransError) {
    return { httpStatusCode: error.httpStatusCode, messages: error.ApiResponse?.error_messages };
  }
  return { httpStatusCode: null, messages: error instanceof Error ? error.message : String(error) };
}

function isNotFound(error: unknown): boolean {
  return error instanceof midtransClient.MidtransError && Number(error.httpStatusCode) === 404;
}

export const midtrans = {
  /** Server key, atau undefined bila belum diisi. */
  serverKey(): string | undefined {
    return env.MIDTRANS_SERVER_KEY;
  },

  /** Membuat transaksi Snap. `gross_amount` berupa bilangan bulat sesuai aturan Snap. */
  async createSnapTransaction(input: SnapTransactionInput): Promise<SnapTransaction> {
    const grossAmount = Number(input.amountIdr);
    try {
      const { token, redirect_url: redirectUrl } = await client().createTransaction({
        transaction_details: { order_id: input.orderId, gross_amount: grossAmount },
        item_details: [{ id: input.orderId, name: input.itemName, price: grossAmount, quantity: 1 }],
        customer_details: { first_name: input.customer.name, email: input.customer.email },
        enabled_payments: [...SNAP_ENABLED_PAYMENTS],
        expiry: {
          start_time: formatMidtransTime(input.startsAt),
          unit: 'minutes',
          duration: PAYMENT_WINDOW_MINUTES,
        },
        // Tanpa ini halaman Snap tetap bisa dibuka 24 jam, walau metode bayarnya sudah kedaluwarsa.
        page_expiry: { duration: PAYMENT_WINDOW_MINUTES, unit: 'minutes' },
      });
      return { token, redirectUrl };
    } catch (error) {
      logger.warn({ orderId: input.orderId, ...describeFailure(error) }, 'Gagal membuat transaksi Snap');
      throw new MidtransUnavailableError('Transaksi Snap gagal dibuat.', { cause: error });
    }
  },

  /**
   * Bertanya status transaksi ke Midtrans. Mengembalikan null bila transaksi tidak ada, yang juga
   * terjadi selama penghuni belum memilih metode bayar di Snap.
   */
  async getTransactionStatus(orderId: string): Promise<TransactionStatus | null> {
    let response: unknown;
    try {
      response = await client().transaction.status(orderId);
    } catch (error) {
      if (isNotFound(error)) return null;
      logger.warn({ orderId, ...describeFailure(error) }, 'Gagal mengecek status Midtrans');
      throw new MidtransUnavailableError('Status transaksi gagal dicek.', { cause: error });
    }

    const parsed = statusResponseSchema.safeParse(response);
    if (!parsed.success) {
      logger.warn({ orderId, issues: parsed.error.issues }, 'Jawaban status Midtrans tidak bisa dibaca');
      throw new MidtransUnavailableError('Jawaban status Midtrans tidak bisa dibaca.');
    }
    return parsed.data;
  },
};
