// Penggolongan kegagalan worker. Setiap kegagalan berakhir di salah satu dari dua golongan:
//
// - Permanen (PermanentJobError): mengulang tidak akan menolong, mis. kontrak menolak karena kamar
//   sudah tercatat atau dompet tidak dikenal. BullMQ tidak mengulang job ini (UnrecoverableError).
// - Sementara (RetryableJobError dan error lain yang tidak dikenal): RPC putus, waktu habis,
//   kontrak sedang dijeda. BullMQ mengulang dengan jeda yang makin panjang.
//
// Revert yang berarti "sudah tercatat" bukan kegagalan sama sekali; itu diputuskan per jenis job
// lewat RevertPolicy di processor.
import { UnrecoverableError } from 'bullmq';
import { type ErrorDescription, type Interface, isError } from 'ethers';

/** Kegagalan yang tidak boleh diulang otomatis. Pesannya aman disimpan dan ditampilkan ke admin. */
export class PermanentJobError extends UnrecoverableError {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentJobError';
  }
}

/** Kegagalan sementara: job diulang BullMQ dengan backoff. */
export class RetryableJobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableJobError';
  }
}

export interface DecodedRevert {
  /** Nama custom error di kontrak, mis. PaymentRefAlreadyRecorded. */
  name: string;
  args: readonly unknown[];
}

const HEX_DATA = /^0x(?:[0-9a-fA-F]{2})*$/;

/** Mencari data revert (selector + argumen) di dalam error ethers atau error JSON-RPC mentah. */
export function extractRevertData(error: unknown, depth = 0): string | null {
  if (depth > 5 || error === null || typeof error !== 'object') return null;
  const record = error as Record<string, unknown>;
  const data = record['data'];
  if (typeof data === 'string' && HEX_DATA.test(data) && data.length >= 10) return data;
  for (const key of ['data', 'error', 'info', 'cause']) {
    const found = extractRevertData(record[key], depth + 1);
    if (found) return found;
  }
  return null;
}

/** Mengurai revert memakai ABI kontrak tujuan. Null bila bukan revert atau custom error-nya tidak dikenal. */
export function decodeRevert(error: unknown, contractInterface: Interface): DecodedRevert | null {
  if (isError(error, 'CALL_EXCEPTION') && error.revert) {
    return { name: error.revert.name, args: error.revert.args };
  }
  const data = extractRevertData(error);
  if (!data) return null;
  let description: ErrorDescription | null = null;
  try {
    description = contractInterface.parseError(data);
  } catch {
    description = null;
  }
  return description ? { name: description.name, args: Array.from(description.args) } : null;
}

/** true bila error berasal dari kontrak yang menolak panggilan (revert), bukan dari jaringan. */
export function isRevert(error: unknown): boolean {
  return isError(error, 'CALL_EXCEPTION');
}

/**
 * Error yang pasti sama bila diulang detik itu juga: revert, argumen salah, atau kegagalan permanen.
 * Selain ini dianggap gangguan jaringan atau RPC dan boleh dicoba lagi.
 */
export function isDeterministicError(error: unknown): boolean {
  return (
    error instanceof PermanentJobError ||
    isError(error, 'CALL_EXCEPTION') ||
    isError(error, 'INVALID_ARGUMENT') ||
    isError(error, 'INSUFFICIENT_FUNDS') ||
    isError(error, 'NONCE_EXPIRED') ||
    isError(error, 'REPLACEMENT_UNDERPRICED') ||
    isError(error, 'UNSUPPORTED_OPERATION')
  );
}

const MAX_MESSAGE_LENGTH = 300;
// URL tidak pernah memuat spasi, kutip, kurung, atau sudut, dan tidak berakhir dengan tanda baca.
// Kurung tutup dan titik sesudah URL tetap tinggal di kalimat, mis. "(lihat https://...)".
const URL_PATTERN = /\bhttps?:\/\/[^\s"'<>()]*[^\s"'<>().,;:!?]/gi;

/**
 * Mengganti setiap nilai rahasia dan setiap URL (URL RPC memuat API key) dengan penanda. Semua URL
 * disamarkan, bukan hanya URL dari konfigurasi, karena URL di pesan error bisa berbeda bentuk dari
 * nilai konfigurasinya (mis. berakhiran garis miring) sehingga pencocokan teks persis tidak kena.
 * Petunjuk untuk pengguna karena itu ditulis tanpa awalan http://.
 */
export function redactSecrets(text: string, secrets: readonly (string | undefined)[]): string {
  let result = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 8) result = result.split(secret).join('[disamarkan]');
  }
  return result.replace(URL_PATTERN, '[url disamarkan]');
}

/**
 * Pesan error yang aman disimpan di basis data, Redis, dan log. Memakai shortMessage ethers (tanpa
 * isi permintaan JSON-RPC), menyamarkan semua nilai rahasia dan URL (URL RPC memuat API key),
 * lalu memotongnya.
 */
export function safeErrorMessage(error: unknown, secrets: readonly string[] = []): string {
  let message: string;
  if (error instanceof Error) {
    const short = (error as { shortMessage?: unknown }).shortMessage;
    const code = (error as { code?: unknown }).code;
    message = typeof short === 'string' && short.length > 0 ? short : error.message;
    if (typeof code === 'string' && !message.includes(code)) message = `${message} (${code})`;
  } else {
    message = String(error);
  }

  message = redactSecrets(message, secrets).replace(/\s+/g, ' ').trim();
  return message.length > MAX_MESSAGE_LENGTH ? `${message.slice(0, MAX_MESSAGE_LENGTH - 3)}...` : message;
}
