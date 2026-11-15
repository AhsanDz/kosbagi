/**
 * Hitungan simulasi dana pemilik kos. Uang dihitung dengan bigint supaya tidak ada
 * selisih pembulatan, dan setiap pembagian dibulatkan ke bawah seperti closePeriod
 * di KosLedger. Rumusnya dijelaskan di docs/bisnis/asumsi-unit-ekonomi.md bagian 5.
 * Konstanta memakai BigInt(...) karena target TypeScript frontend menolak literal 100n.
 */

const TOKEN_PRICE_IDR = BigInt(100_000);
const OFFERED_PERCENT = BigInt(70);
const OFFERING_FEE_PERCENT = BigInt(3);
const PERCENT_DENOMINATOR = BigInt(100);

const BPS_DENOMINATOR = BigInt(10_000);
const OPERATING_COST_BPS = BigInt(2_000);
const PLATFORM_FEE_BPS = BigInt(500);
const TAX_BPS = BigInt(2_200);

const MONTHS_PER_YEAR = BigInt(12);

/** Nilai properti terkecil yang masih menghasilkan token untuk ditawarkan. */
export const MIN_PROPERTY_VALUE_IDR = 1_000_000;

export interface SimulationInput {
  roomCount: number;
  monthlyRentIdr: number;
  occupancyPercent: number;
  propertyValueIdr: number;
}

export interface SimulationResult {
  totalTokens: number;
  offeredTokens: number;
  ownerTokens: number;
  offeringFundsIdr: number;
  offeringFeeIdr: number;
  fundsReceivedIdr: number;
  annualGrossRentIdr: number;
  ownerMonthlyShareIdr: number;
}

/** Contoh Kos Sumbersari 01, sama dengan asumsi proposal. */
export const SUMBERSARI_EXAMPLE: SimulationInput = {
  roomCount: 10,
  monthlyRentIdr: 1_500_000,
  occupancyPercent: 90,
  propertyValueIdr: 1_800_000_000,
};

function percentOfBps(value: bigint, bps: bigint): bigint {
  return (value * bps) / BPS_DENOMINATOR;
}

export function simulateFunds(input: SimulationInput): SimulationResult {
  const totalTokens = BigInt(input.propertyValueIdr) / TOKEN_PRICE_IDR;
  const offeredTokens = (totalTokens * OFFERED_PERCENT) / PERCENT_DENOMINATOR;
  const ownerTokens = totalTokens - offeredTokens;

  const offeringFundsIdr = offeredTokens * TOKEN_PRICE_IDR;
  const offeringFeeIdr = (offeringFundsIdr * OFFERING_FEE_PERCENT) / PERCENT_DENOMINATOR;

  const monthlyGrossRentIdr =
    (BigInt(input.roomCount) * BigInt(input.monthlyRentIdr) * BigInt(input.occupancyPercent)) /
    PERCENT_DENOMINATOR;
  const taxableProfitIdr =
    monthlyGrossRentIdr -
    percentOfBps(monthlyGrossRentIdr, OPERATING_COST_BPS) -
    percentOfBps(monthlyGrossRentIdr, PLATFORM_FEE_BPS);
  const monthlyNetRentIdr = taxableProfitIdr - percentOfBps(taxableProfitIdr, TAX_BPS);

  return {
    totalTokens: Number(totalTokens),
    offeredTokens: Number(offeredTokens),
    ownerTokens: Number(ownerTokens),
    offeringFundsIdr: Number(offeringFundsIdr),
    offeringFeeIdr: Number(offeringFeeIdr),
    fundsReceivedIdr: Number(offeringFundsIdr - offeringFeeIdr),
    annualGrossRentIdr: Number(monthlyGrossRentIdr * MONTHS_PER_YEAR),
    ownerMonthlyShareIdr: Number((monthlyNetRentIdr * ownerTokens) / totalTokens),
  };
}
