// Kalkulator keuangan KosBagi: fungsi murni tanpa basis data maupun jaringan.
// Dipakai modul lain lewat satu pintu ini, mis. import { calculatePeriod } from '../finance/index.js'.
export { BPS_DENOMINATOR, SEN_PER_RUPIAH, mulDivFloor, saturatingSub } from './integer-math.js';
export {
  PLATFORM_FEE_BPS,
  TAX_BPS,
  calculateDeficit,
  calculatePeriod,
  calculatePlatformFee,
  calculateShare,
  calculateTax,
  calculateTaxableProfit,
  calculateValuePerTokenSen,
  distribute,
} from './distribution.js';
export type { Distribution, Holding, PeriodInput, PeriodSummary } from './distribution.js';
export { OFFERING_FEE_BPS, calculateOfferingFee, settleOffering } from './offering.js';
export type { OfferingSettlement } from './offering.js';
