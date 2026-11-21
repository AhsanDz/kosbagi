// Kalkulator penawaran token: dana yang dihimpun, fee penawaran 3%, dan dana yang diterima
// pemilik lama. Fee penawaran dibayar pemilik dan dipotong dari dana penawaran, sekali per
// penawaran yang berhasil (proposal bagian 2.9). Penghuni tidak dikenai biaya apa pun.
import { BPS_DENOMINATOR, mulDivFloor, requireBps, requireNonNegative } from './integer-math.js';

/** Fee penawaran 3% dari dana yang dihimpun. */
export const OFFERING_FEE_BPS = 300n;

export interface OfferingSettlement {
  /** Token terjual × harga token. */
  fundsRaised: bigint;
  /** floor(dana dihimpun × 300 ÷ 10.000). Pendapatan PT KosBagi Teknologi. */
  offeringFee: bigint;
  /** Dana dihimpun − fee penawaran. Diterima pemilik lama. */
  ownerProceeds: bigint;
}

/** Fee penawaran: floor(dana dihimpun × feeBps ÷ 10.000). */
export function calculateOfferingFee(fundsRaised: bigint, offeringFeeBps: bigint = OFFERING_FEE_BPS): bigint {
  requireNonNegative(fundsRaised, 'Dana dihimpun');
  requireBps(offeringFeeBps, 'Fee penawaran');
  return mulDivFloor(fundsRaised, offeringFeeBps, BPS_DENOMINATOR);
}

/**
 * Rincian dana penawaran yang berhasil.
 * KB-SMR01: 12.600 token × Rp100.000 = Rp1.260.000.000, fee Rp37.800.000, pemilik Rp1.222.200.000.
 */
export function settleOffering(
  tokensSold: bigint,
  tokenPriceIdr: bigint,
  offeringFeeBps: bigint = OFFERING_FEE_BPS,
): OfferingSettlement {
  requireNonNegative(tokensSold, 'Token terjual');
  requireNonNegative(tokenPriceIdr, 'Harga token');
  const fundsRaised = tokensSold * tokenPriceIdr;
  const offeringFee = calculateOfferingFee(fundsRaised, offeringFeeBps);
  return { fundsRaised, offeringFee, ownerProceeds: fundsRaised - offeringFee };
}
