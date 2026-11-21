// Aturan kuota pembelian token, tanpa akses basis data supaya mudah diuji.
//
// Dua batas diperiksa sebelum pembayaran dibuat:
//   - Skenario 8: jumlah tidak boleh melebihi sisa penawaran.
//   - Skenario 9: kepemilikan investor tidak boleh melebihi batas 10% (1.800 token KB-SMR01).
// Pesanan yang masih menunggu bayar dan belum lewat reservedUntil ikut dihitung di keduanya,
// supaya token yang sama tidak bisa dibayar dua kali oleh dua investor.
import { AppError } from '../../lib/errors.js';

export interface QuotaInput {
  tokensOffered: number;
  tokensSold: number;
  /** Token yang disisihkan pesanan aktif semua investor, di luar pesanan yang sedang diperiksa. */
  tokensReserved: number;
  /** Batas kepemilikan per investor, mis. 1.800. */
  maxPerInvestor: number;
  /** Token dari pesanan PAID investor ini di properti yang sama. */
  holdingTokens: number;
  /** Token yang disisihkan pesanan aktif investor ini, di luar pesanan yang sedang diperiksa. */
  reservedByInvestor: number;
}

export interface QuotaSummary {
  /** Sisa penawaran yang masih bisa dipesan siapa pun. */
  tokensRemaining: number;
  /** Sisa yang masih boleh dipesan investor ini sebelum mencapai batas 10%. */
  remainingQuota: number;
}

export function summarizeQuota(input: QuotaInput): QuotaSummary {
  return {
    tokensRemaining: Math.max(0, input.tokensOffered - input.tokensSold - input.tokensReserved),
    remainingQuota: Math.max(0, input.maxPerInvestor - input.holdingTokens - input.reservedByInvestor),
  };
}

const tokens = new Intl.NumberFormat('id-ID');

export function offeringExceeded(tokensRemaining: number): AppError {
  return new AppError(
    422,
    'OFFERING_EXCEEDED',
    `Jumlah token melebihi sisa penawaran. Sisa penawaran ${tokens.format(tokensRemaining)} token.`,
    { tokensRemaining },
  );
}

export function holdingCapExceeded(remainingQuota: number, maxPerInvestor: number): AppError {
  return new AppError(
    422,
    'HOLDING_CAP_EXCEEDED',
    `Jumlah token melebihi batas kepemilikan ${tokens.format(maxPerInvestor)} token per investor. ` +
      `Sisa kuota kamu ${tokens.format(remainingQuota)} token.`,
    { remainingQuota },
  );
}

/**
 * Error pertama yang berlaku untuk pesanan `tokenAmount`, atau null bila boleh. Urutannya sesuai
 * kontrak API: sisa penawaran dulu, lalu batas kepemilikan.
 */
export function checkTokenAmount(tokenAmount: number, input: QuotaInput): AppError | null {
  const { tokensRemaining, remainingQuota } = summarizeQuota(input);
  if (tokenAmount > tokensRemaining) return offeringExceeded(tokensRemaining);
  if (tokenAmount > remainingQuota) return holdingCapExceeded(remainingQuota, input.maxPerInvestor);
  return null;
}
