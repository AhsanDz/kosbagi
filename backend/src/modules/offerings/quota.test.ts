import { describe, expect, it } from 'vitest';
import { AppError } from '../../lib/errors.js';
import { checkTokenAmount, type QuotaInput, summarizeQuota } from './quota.js';

// Penawaran KB-SMR01: 12.600 token ditawarkan, batas 1.800 per investor.
const base: QuotaInput = {
  tokensOffered: 12_600,
  tokensSold: 0,
  tokensReserved: 0,
  maxPerInvestor: 1_800,
  holdingTokens: 0,
  reservedByInvestor: 0,
};

function rejection(tokenAmount: number, input: QuotaInput): AppError {
  const error = checkTokenAmount(tokenAmount, input);
  expect(error).toBeInstanceOf(AppError);
  return error as AppError;
}

describe('summarizeQuota', () => {
  it('sisa penawaran dan sisa kuota dikurangi pesanan yang masih disisihkan', () => {
    expect(summarizeQuota({ ...base, tokensSold: 4_360, tokensReserved: 100, holdingTokens: 100, reservedByInvestor: 100 })).toEqual({
      tokensRemaining: 8_140,
      remainingQuota: 1_600,
    });
  });

  it('tidak pernah negatif', () => {
    expect(summarizeQuota({ ...base, tokensSold: 12_600, tokensReserved: 50, holdingTokens: 1_800, reservedByInvestor: 10 })).toEqual({
      tokensRemaining: 0,
      remainingQuota: 0,
    });
  });
});

describe('checkTokenAmount', () => {
  it('pesanan dalam batas diterima', () => {
    expect(checkTokenAmount(100, base)).toBeNull();
    expect(checkTokenAmount(1_800, base)).toBeNull();
  });

  it('skenario 8: sisa penawaran 120 token dan investor memesan 200', () => {
    const error = rejection(200, { ...base, tokensSold: 12_480 });

    expect(error).toMatchObject({ status: 422, code: 'OFFERING_EXCEEDED', details: { tokensRemaining: 120 } });
    expect(error.message).toContain('120 token');
  });

  it('skenario 9: investor memegang 1.500 token dan memesan 500, sisa kuota 300', () => {
    const error = rejection(500, { ...base, holdingTokens: 1_500 });

    expect(error).toMatchObject({ status: 422, code: 'HOLDING_CAP_EXCEEDED', details: { remainingQuota: 300 } });
    expect(error.message).toContain('Sisa kuota kamu 300 token');
    expect(error.message).toContain('1.800 token per investor');
    // Tepat mengisi sisa kuota diterima, seperti tombol "Pakai 300 token".
    expect(checkTokenAmount(300, { ...base, holdingTokens: 1_500 })).toBeNull();
  });

  it('pesanan yang menunggu bayar ikut mengurangi sisa', () => {
    expect(rejection(10, { ...base, tokensSold: 12_500, tokensReserved: 100 }).code).toBe('OFFERING_EXCEEDED');
    expect(rejection(301, { ...base, holdingTokens: 1_000, reservedByInvestor: 500 })).toMatchObject({
      details: { remainingQuota: 300 },
    });
  });

  it('bila keduanya terlampaui, sisa penawaran diperiksa lebih dulu', () => {
    expect(rejection(2_000, { ...base, tokensSold: 11_000, holdingTokens: 1_500 }).code).toBe('OFFERING_EXCEEDED');
  });
});
