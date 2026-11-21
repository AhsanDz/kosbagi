// Pembungkus tipis klien resmi midtrans-client. Hanya sandbox: isProduction ditulis tetap false,
// sehingga permintaan selalu menuju
//   Snap  : https://app.sandbox.midtrans.com/snap/v1/transactions
//   Status: https://api.sandbox.midtrans.com/v2/{order_id}/status
//   Charge: https://api.sandbox.midtrans.com/v2/charge (Core API, hanya skrip demo:bayar-sewa)
// Server key hanya dipakai di file ini dan di verifikasi signature webhook.
//
// Semua akses ke Midtrans lewat objek `midtrans` supaya test bisa menirunya dengan vi.spyOn.
import midtransClient, { type CoreApi, type Snap } from 'midtrans-client';
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

/** Hanya virtual account, untuk nominal di atas batas QRIS. */
export const VIRTUAL_ACCOUNT_PAYMENTS = ['bca_va', 'bni_va', 'bri_va', 'permata_va'] as const;

/**
 * Batas QRIS Rp10.000.000 per transaksi. Pembelian di atas nominal ini, yaitu di atas 100 token
 * KB-SMR01 @ Rp100.000, hanya ditawari virtual account. E-wallet ikut disembunyikan karena di
 * desktop juga dibayar lewat QR.
 */
export const QRIS_MAX_AMOUNT_IDR = 10_000_000n;

export type SnapPaymentMethod = (typeof SNAP_ENABLED_PAYMENTS)[number];

/** Metode yang ditawarkan Snap untuk nominal tertentu. */
export function enabledPaymentsFor(amountIdr: bigint): readonly SnapPaymentMethod[] {
  return amountIdr > QRIS_MAX_AMOUNT_IDR ? VIRTUAL_ACCOUNT_PAYMENTS : SNAP_ENABLED_PAYMENTS;
}

// Midtrans memutus notifikasi setelah 15 detik dan menyarankan balasan dalam 5 detik.
export const MIDTRANS_TIMEOUT_MS = 8_000;

export interface SnapTransactionInput {
  orderId: string;
  amountIdr: bigint;
  itemName: string;
  /** Jumlah barang, mis. 100 token. Bawaan 1. Harga per barang = amountIdr / quantity. */
  quantity?: number;
  customer: { name: string; email: string };
  /** Awal hitungan batas bayar. */
  startsAt: Date;
  /** Bawaan SNAP_ENABLED_PAYMENTS. */
  enabledPayments?: readonly SnapPaymentMethod[];
}

/** Bank virtual account yang bisa dibuat lewat Core API. */
export type VirtualAccountBank = 'bca' | 'bni' | 'bri' | 'permata';

export interface BankTransferInput {
  orderId: string;
  amountIdr: bigint;
  itemName: string;
  bank: VirtualAccountBank;
  customer: { name: string; email: string };
  startsAt: Date;
}

export interface BankTransferCharge {
  transactionId: string;
  bank: VirtualAccountBank;
  /** Nomor virtual account. Hanya ditampilkan di terminal skrip demo, tidak disimpan. */
  vaNumber: string;
}

export interface SnapTransaction {
  token: string;
  redirectUrl: string;
}

const vaNumberSchema = z.object({ bank: z.string(), va_number: z.string() });

const statusResponseSchema = z.object({
  status_code: z.string(),
  transaction_status: z.string(),
  gross_amount: z.string(),
  fraud_status: z.string().optional(),
  payment_type: z.string().optional(),
  transaction_id: z.string().optional(),
  /** Virtual account BCA, BNI, BRI. Nomornya tidak pernah disimpan atau dicatat di log. */
  va_numbers: z.array(vaNumberSchema).optional(),
  /** Virtual account Permata memakai field tersendiri. */
  permata_va_number: z.string().optional(),
});

/** Jawaban API status Midtrans. Sumber kebenaran untuk keputusan webhook. */
export type TransactionStatus = z.output<typeof statusResponseSchema>;

type VirtualAccountFields = Pick<TransactionStatus, 'va_numbers' | 'permata_va_number'>;

/** Bank virtual account dari jawaban Midtrans, mis. bca. Null untuk metode lain. */
export function virtualAccountBank(status: VirtualAccountFields): string | null {
  if (status.permata_va_number) return 'permata';
  return status.va_numbers?.[0]?.bank ?? null;
}

/** Nomor virtual account dari jawaban Midtrans. Hanya untuk ditampilkan skrip demo. */
export function virtualAccountNumber(status: VirtualAccountFields): string | null {
  return status.permata_va_number ?? status.va_numbers?.[0]?.va_number ?? null;
}

const chargeResponseSchema = z.object({
  transaction_id: z.string(),
  transaction_status: z.string(),
  va_numbers: z.array(vaNumberSchema).optional(),
  permata_va_number: z.string().optional(),
});

/**
 * Midtrans menolak karena `order_id` sudah pernah dipakai di akun ini. Menurut dokumen Midtrans
 * (Snap API dan Core API, "Code 4xx"), kode 406 berarti "Duplicate order ID. Order ID has already
 * been utilized previously". Terjadi bila basis data diisi ulang sementara akun sandbox tetap sama,
 * sehingga nomor percobaan mulai lagi dari 1.
 */
export class OrderIdTakenError extends Error {
  constructor(orderId: string, options?: ErrorOptions) {
    super(`order_id ${orderId} sudah dipakai di Midtrans.`, options);
    this.name = 'OrderIdTakenError';
  }
}

/** Midtrans tidak bisa dihubungi, membalas error, atau jawabannya tidak bisa dibaca. */
export class MidtransUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MidtransUnavailableError';
  }
}

let snapClient: Snap | undefined;
let coreClient: CoreApi | undefined;

function serverKeyOrThrow(): string {
  if (!env.MIDTRANS_SERVER_KEY) throw new MidtransUnavailableError('MIDTRANS_SERVER_KEY belum diisi.');
  return env.MIDTRANS_SERVER_KEY;
}

function client(): Snap {
  if (!snapClient) {
    snapClient = new midtransClient.Snap({ isProduction: false, serverKey: serverKeyOrThrow() });
    snapClient.httpClient.http_client.defaults.timeout = MIDTRANS_TIMEOUT_MS;
  }
  return snapClient;
}

function core(): CoreApi {
  if (!coreClient) {
    coreClient = new midtransClient.CoreApi({ isProduction: false, serverKey: serverKeyOrThrow() });
    coreClient.httpClient.http_client.defaults.timeout = MIDTRANS_TIMEOUT_MS;
  }
  return coreClient;
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

/** Kode 406 resmi Midtrans: order_id sudah pernah dipakai. */
function isDuplicateOrderId(error: unknown): boolean {
  return error instanceof midtransClient.MidtransError && Number(error.httpStatusCode) === 406;
}

export const midtrans = {
  /** Server key, atau undefined bila belum diisi. */
  serverKey(): string | undefined {
    return env.MIDTRANS_SERVER_KEY;
  },

  /**
   * Membuat transaksi Snap. `gross_amount` berupa bilangan bulat sesuai aturan Snap, dan harga
   * barang dikali jumlahnya harus sama dengan `gross_amount`.
   */
  async createSnapTransaction(input: SnapTransactionInput): Promise<SnapTransaction> {
    const grossAmount = Number(input.amountIdr);
    const quantity = input.quantity ?? 1;
    try {
      const { token, redirect_url: redirectUrl } = await client().createTransaction({
        transaction_details: { order_id: input.orderId, gross_amount: grossAmount },
        item_details: [{ id: input.orderId, name: input.itemName, price: grossAmount / quantity, quantity }],
        customer_details: { first_name: input.customer.name, email: input.customer.email },
        enabled_payments: [...(input.enabledPayments ?? SNAP_ENABLED_PAYMENTS)],
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
      if (isDuplicateOrderId(error)) throw new OrderIdTakenError(input.orderId, { cause: error });
      throw new MidtransUnavailableError('Transaksi Snap gagal dibuat.', { cause: error });
    }
  },

  /**
   * Membuat virtual account langsung lewat Core API dengan batas bayar 5 menit yang sama. Hanya
   * dipakai skrip demo:bayar-sewa supaya nomor VA bisa langsung dicetak tanpa membuka Snap.
   * Status, notifikasi, dan signature-nya sama dengan transaksi Snap.
   */
  async chargeBankTransfer(input: BankTransferInput): Promise<BankTransferCharge> {
    const grossAmount = Number(input.amountIdr);
    const method =
      input.bank === 'permata'
        ? { payment_type: 'permata' }
        : { payment_type: 'bank_transfer', bank_transfer: { bank: input.bank } };
    let response: unknown;
    try {
      response = await core().charge({
        ...method,
        transaction_details: { order_id: input.orderId, gross_amount: grossAmount },
        item_details: [{ id: input.orderId, name: input.itemName, price: grossAmount, quantity: 1 }],
        customer_details: { first_name: input.customer.name, email: input.customer.email },
        custom_expiry: {
          order_time: formatMidtransTime(input.startsAt),
          expiry_duration: PAYMENT_WINDOW_MINUTES,
          unit: 'minute',
        },
      });
    } catch (error) {
      logger.warn({ orderId: input.orderId, ...describeFailure(error) }, 'Gagal membuat virtual account');
      if (isDuplicateOrderId(error)) throw new OrderIdTakenError(input.orderId, { cause: error });
      throw new MidtransUnavailableError('Virtual account gagal dibuat.', { cause: error });
    }

    const parsed = chargeResponseSchema.safeParse(response);
    const vaNumber = parsed.success ? virtualAccountNumber(parsed.data) : null;
    if (!parsed.success || !vaNumber) {
      logger.warn({ orderId: input.orderId }, 'Jawaban charge Midtrans tidak berisi nomor virtual account');
      throw new MidtransUnavailableError('Jawaban charge Midtrans tidak bisa dibaca.');
    }
    return { transactionId: parsed.data.transaction_id, bank: input.bank, vaNumber };
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
