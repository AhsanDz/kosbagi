import { describe, expect, it } from 'vitest';
import { mulDivFloor, saturatingSub } from './integer-math.js';
import { OFFERING_FEE_BPS, calculateOfferingFee, settleOffering } from './offering.js';

describe('settleOffering', () => {
  it('KB-SMR01: 12.600 token menghimpun Rp1.260.000.000, fee Rp37.800.000, pemilik Rp1.222.200.000', () => {
    expect(settleOffering(12_600n, 100_000n)).toEqual({
      fundsRaised: 1_260_000_000n,
      offeringFee: 37_800_000n,
      ownerProceeds: 1_222_200_000n,
    });
  });

  it('fee penawaran bawaan 3%', () => {
    expect(OFFERING_FEE_BPS).toBe(300n);
    expect(calculateOfferingFee(10_000_000n)).toBe(300_000n);
  });

  it('membulatkan fee ke bawah dan sisanya tetap milik pemilik', () => {
    // 3% × Rp1.234.567 = Rp37.037,01 → Rp37.037.
    expect(calculateOfferingFee(1_234_567n)).toBe(37_037n);
    const result = settleOffering(1n, 1_234_567n);
    expect(result.offeringFee + result.ownerProceeds).toBe(result.fundsRaised);
  });

  it('menolak nilai negatif dan tarif di atas 100%', () => {
    expect(() => settleOffering(-1n, 100_000n)).toThrow(/negatif/);
    expect(() => calculateOfferingFee(1_000n, 10_001n)).toThrow(/basis poin/);
  });
});

describe('integer-math', () => {
  it('mulDivFloor membulatkan ke bawah setelah perkalian', () => {
    expect(mulDivFloor(7n, 3n, 2n)).toBe(10n);
    expect(mulDivFloor(0n, 5n, 3n)).toBe(0n);
  });

  it('mulDivFloor menolak penyebut 0 dan pengali negatif', () => {
    expect(() => mulDivFloor(1n, 1n, 0n)).toThrow(/Penyebut/);
    expect(() => mulDivFloor(-1n, 1n, 1n)).toThrow(/negatif/);
  });

  it('saturatingSub berhenti di 0', () => {
    expect(saturatingSub(5n, 3n)).toBe(2n);
    expect(saturatingSub(3n, 5n)).toBe(0n);
  });
});
