// Test kalkulator distribusi terhadap fixture perhitungan manual jalur 1
// (contracts/test/fixtures/distribusi-manual.json). Fixture yang sama dibaca test closePeriod
// di contracts/, jadi kalkulator backend dan KosLedger diuji dengan angka yang sama.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
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

interface FixtureHolder {
  label: string;
  balance: number;
  share: number;
}

interface FixtureCase {
  id: string;
  period: number;
  rents: Array<{ room: number; amount: number }>;
  grossRent: number;
  totalExpenses: number;
  platformFee: number;
  taxableProfit: number;
  tax: number;
  netRent: number;
  valuePerTokenSen: number;
  deficit: number;
  holders: FixtureHolder[];
  totalShares: number;
  reserve: number;
}

interface Fixture {
  parameters: { platformFeeBps: number; taxBps: number; totalSupply: number };
  cases: FixtureCase[];
}

const FIXTURE_URL = new URL('../../../contracts/test/fixtures/distribusi-manual.json', import.meta.url);
const fixture = JSON.parse(readFileSync(FIXTURE_URL, 'utf8')) as Fixture;

/** Angka fixture ditulis sebagai number JSON; diubah ke bigint setelah dipastikan bulat dan aman. */
function big(value: number): bigint {
  if (!Number.isSafeInteger(value)) throw new Error(`Angka fixture bukan bilangan bulat aman: ${value}`);
  return BigInt(value);
}

const totalSupply = big(fixture.parameters.totalSupply);

describe('parameter fixture', () => {
  it('sama dengan tarif kalkulator dan parameter deploy KosLedger', () => {
    expect(big(fixture.parameters.platformFeeBps)).toBe(PLATFORM_FEE_BPS);
    expect(big(fixture.parameters.taxBps)).toBe(TAX_BPS);
    expect(totalSupply).toBe(18_000n);
  });

  it('memuat keempat kasus perhitungan manual', () => {
    expect(fixture.cases.map((testCase) => testCase.id)).toEqual([
      'dasar-november-2026',
      'sisa-pembulatan-dua-belas-pemegang',
      'biaya-melebihi-sewa',
      'pembulatan-di-setiap-langkah',
    ]);
  });
});

describe.each(fixture.cases)('kasus fixture $id', (testCase) => {
  const grossRent = big(testCase.grossRent);
  const totalExpenses = big(testCase.totalExpenses);
  const summary = calculatePeriod({ grossRent, totalExpenses, totalSupply });

  it('sewa kotor sama dengan jumlah sewa per kamar', () => {
    const sum = testCase.rents.reduce((total, rent) => total + big(rent.amount), 0n);
    expect(sum).toBe(grossRent);
  });

  it('angka periode sama dengan hitungan manual', () => {
    expect(summary).toEqual({
      grossRent,
      totalExpenses,
      platformFee: big(testCase.platformFee),
      taxableProfit: big(testCase.taxableProfit),
      tax: big(testCase.tax),
      netRent: big(testCase.netRent),
      totalSupply,
      valuePerTokenSen: big(testCase.valuePerTokenSen),
      deficit: big(testCase.deficit),
    });
  });

  it('fungsi per langkah menghasilkan angka yang sama', () => {
    const platformFee = calculatePlatformFee(grossRent);
    const taxableProfit = calculateTaxableProfit(grossRent, platformFee, totalExpenses);
    expect(platformFee).toBe(big(testCase.platformFee));
    expect(taxableProfit).toBe(big(testCase.taxableProfit));
    expect(calculateTax(taxableProfit)).toBe(big(testCase.tax));
    expect(calculateValuePerTokenSen(big(testCase.netRent), totalSupply)).toBe(big(testCase.valuePerTokenSen));
    expect(calculateDeficit(grossRent, platformFee, totalExpenses)).toBe(big(testCase.deficit));
  });

  it('bagian tiap pemegang, jumlah bagian, dan sisa pembulatan sama dengan hitungan manual', () => {
    const holders = testCase.holders.map((holder) => ({ label: holder.label, balance: big(holder.balance) }));
    const result = distribute(summary.netRent, totalSupply, holders);

    expect(result.holders).toEqual(
      testCase.holders.map((holder) => ({ label: holder.label, balance: big(holder.balance), share: big(holder.share) })),
    );
    expect(result.totalShares).toBe(big(testCase.totalShares));
    expect(result.reserve).toBe(big(testCase.reserve));
  });

  it('sisa pembulatan lebih kecil dari jumlah pemegang', () => {
    expect(big(testCase.reserve)).toBeLessThan(BigInt(testCase.holders.length));
  });
});

describe('aturan pembulatan', () => {
  it('membulatkan ke bawah, bukan ke rupiah terdekat', () => {
    // Kasus pembulatan-di-setiap-langkah: 61.728,35 → 61.728 dan 230.864,26 → 230.864.
    expect(calculatePlatformFee(1_234_567n)).toBe(61_728n);
    expect(calculateTax(1_049_383n)).toBe(230_864n);
    // 81.851,9 dibulatkan biasa menjadi 81.852; aturan floor menghasilkan 81.851.
    expect(calculateShare(818_519n, 1_800n, 18_000n)).toBe(81_851n);
  });

  it('bagian dihitung langsung dari sewa bersih, bukan dari nilai per token yang sudah dibulatkan', () => {
    // Kasus sisa-pembulatan-dua-belas-pemegang: 5.400 × Rp392,35 = Rp2.118.690, kurang Rp21.
    const netRent = 7_062_372n;
    const valuePerTokenSen = calculateValuePerTokenSen(netRent, 18_000n);
    expect(valuePerTokenSen).toBe(39_235n);
    expect((5_400n * valuePerTokenSen) / 100n).toBe(2_118_690n);
    expect(calculateShare(netRent, 5_400n, 18_000n)).toBe(2_118_711n);
  });

  it('tetap eksak untuk nominal di atas batas aman number JavaScript', () => {
    // 10^24 rupiah jauh di atas 2^53. Tanpa bigint, angka ini kehilangan presisi.
    const grossRent = 10n ** 24n + 7n;
    const summary = calculatePeriod({ grossRent, totalExpenses: 1n, totalSupply: 18_000n });
    const fee = (grossRent * 500n) / 10_000n;
    const profit = grossRent - fee - 1n;
    expect(summary.platformFee).toBe(fee);
    expect(summary.tax).toBe((profit * 2_200n) / 10_000n);
    expect(summary.netRent).toBe(profit - (profit * 2_200n) / 10_000n);
  });

  it('memenuhi sifat dasar untuk banyak masukan acak', () => {
    // Pembangkit acak sederhana dengan benih tetap, supaya hasil test selalu sama.
    let state = 20_261_103n;
    const next = (limit: bigint): bigint => {
      state = (state * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n) % 2n ** 64n;
      return state % limit;
    };

    for (let round = 0; round < 500; round += 1) {
      const grossRent = next(20_000_000n) + 1n;
      const totalExpenses = next(25_000_000n);
      const summary = calculatePeriod({ grossRent, totalExpenses, totalSupply: 18_000n });

      expect(summary.platformFee + summary.taxableProfit + totalExpenses - summary.deficit).toBe(grossRent);
      expect(summary.tax + summary.netRent).toBe(summary.taxableProfit);
      expect(summary.taxableProfit === 0n || summary.deficit === 0n).toBe(true);

      // Pemilik lama 5.400, enam investor di batas 1.800, sisanya dipecah acak.
      const remaining = 18_000n - 5_400n - 6n * 1_800n;
      const split = next(remaining + 1n);
      const holders = [5_400n, 1_800n, 1_800n, 1_800n, 1_800n, 1_800n, 1_800n, split, remaining - split].map(
        (balance) => ({ balance }),
      );
      const result = distribute(summary.netRent, 18_000n, holders);

      expect(result.reserve).toBeGreaterThanOrEqual(0n);
      expect(result.reserve).toBeLessThan(BigInt(holders.length));
      expect(result.totalShares + result.reserve).toBe(summary.netRent);
    }
  });
});

describe('unit ekonomi proposal', () => {
  it('sewa kotor setahun Rp162.000.000 dengan biaya 20% menghasilkan Rp94.770.000 dibagikan', () => {
    const summary = calculatePeriod({ grossRent: 162_000_000n, totalExpenses: 32_400_000n, totalSupply: 18_000n });
    expect(summary.platformFee).toBe(8_100_000n);
    expect(summary.tax).toBe(26_730_000n);
    expect(summary.netRent).toBe(94_770_000n);
    // Rp5.265 per token per tahun = 5,265% dari harga token Rp100.000.
    expect(calculateShare(summary.netRent, 1n, 18_000n)).toBe(5_265n);
  });

  it('100 token menerima Rp43.875 per bulan dan pemilik 5.400 token Rp2.369.250', () => {
    const summary = calculatePeriod({ grossRent: 13_500_000n, totalExpenses: 2_700_000n, totalSupply: 18_000n });
    expect(summary.valuePerTokenSen).toBe(43_875n);
    expect(calculateShare(summary.netRent, 100n, 18_000n)).toBe(43_875n);
    expect(calculateShare(summary.netRent, 5_400n, 18_000n)).toBe(2_369_250n);
  });

  it('demo November: enam pemegang, bagian perbendaharaan 8.140 token untuk pemilik lama, sisa Rp0', () => {
    // docs/bisnis/perhitungan-distribusi.md bagian 6 dan keputusan 16 November 2026. Biaya Rp2.400.000
    // disiapkan skrip demo, ditambah nota perbaikan K07 Rp300.000 yang dicatat saat demo.
    const summary = calculatePeriod({ grossRent: 13_500_000n, totalExpenses: 2_400_000n + 300_000n, totalSupply: 18_000n });
    const holders = [
      { label: 'Pemilik lama', balance: 5_400n },
      { label: 'Bagas', balance: 1_800n },
      { label: 'Citra', balance: 1_200n },
      { label: 'Eko', balance: 800n },
      { label: 'Fajar', balance: 560n },
      { label: 'Dimas', balance: 100n },
      { label: 'Perbendaharaan', balance: 8_140n },
    ];
    const result = distribute(summary.netRent, summary.totalSupply, holders);

    expect(summary).toMatchObject({ platformFee: 675_000n, taxableProfit: 10_125_000n, tax: 2_227_500n, netRent: 7_897_500n });
    expect(result.holders.map((holder) => [holder.label, holder.share])).toEqual([
      ['Pemilik lama', 2_369_250n],
      ['Bagas', 789_750n],
      ['Citra', 526_500n],
      ['Eko', 351_000n],
      ['Fajar', 245_700n],
      ['Dimas', 43_875n],
      ['Perbendaharaan', 3_571_425n],
    ]);
    expect(result.reserve).toBe(0n);

    // Saldo pemilik lama periode ini: bagian 5.400 token ditambah bagian perbendaharaan.
    const [owner, , , , , , treasury] = result.holders;
    expect(owner!.share + treasury!.share).toBe(5_940_675n);
  });

  it('skenario fasilitas Pasal 31E (tarif efektif 11%) menghasilkan Rp500,62 per token per bulan', () => {
    // docs/bisnis/proyeksi-keuangan.md bagian 7. Bukan tarif yang dipakai KosLedger saat ini.
    const summary = calculatePeriod({
      grossRent: 13_500_000n,
      totalExpenses: 2_700_000n,
      totalSupply: 18_000n,
      taxBps: 1_100n,
    });
    expect(summary.tax).toBe(1_113_750n);
    expect(summary.netRent).toBe(9_011_250n);
    expect(summary.valuePerTokenSen).toBe(50_062n);
    expect(calculateShare(summary.netRent, 100n, 18_000n)).toBe(50_062n);
  });
});

describe('penolakan masukan', () => {
  it('menolak periode tanpa sewa dan tanpa biaya, seperti revert EmptyPeriod', () => {
    expect(() => calculatePeriod({ grossRent: 0n, totalExpenses: 0n, totalSupply: 18_000n })).toThrow(/Periode kosong/);
  });

  it('tetap menghitung periode yang hanya punya biaya', () => {
    const summary = calculatePeriod({ grossRent: 0n, totalExpenses: 250_000n, totalSupply: 18_000n });
    expect(summary.netRent).toBe(0n);
    expect(summary.deficit).toBe(250_000n);
  });

  it('menolak total suplai 0, seperti revert NoSupplyAtSnapshot', () => {
    expect(() => calculatePeriod({ grossRent: 1_500_000n, totalExpenses: 0n, totalSupply: 0n })).toThrow(RangeError);
    expect(() => calculateShare(1_000n, 1n, 0n)).toThrow(RangeError);
  });

  it('menolak nominal negatif', () => {
    expect(() => calculatePeriod({ grossRent: -1n, totalExpenses: 0n, totalSupply: 18_000n })).toThrow(/negatif/);
    expect(() => calculatePeriod({ grossRent: 1n, totalExpenses: -1n, totalSupply: 18_000n })).toThrow(/negatif/);
    expect(() => calculateShare(1_000n, -5n, 18_000n)).toThrow(/negatif/);
  });

  it('menolak tarif di luar 0 sampai 10.000 basis poin', () => {
    expect(() => calculatePlatformFee(1_000n, 10_001n)).toThrow(/basis poin/);
    expect(() => calculateTax(1_000n, -1n)).toThrow(/basis poin/);
  });

  it('menolak fee yang melebihi sewa kotor', () => {
    expect(() => calculateTaxableProfit(1_000n, 1_001n, 0n)).toThrow(/melebihi/);
  });

  it('menolak distribusi bila jumlah saldo tidak sama dengan total suplai', () => {
    expect(() => distribute(7_897_500n, 18_000n, [{ balance: 5_400n }, { balance: 12_000n }])).toThrow(/total suplai/);
    expect(() => distribute(7_897_500n, 18_000n, [{ balance: 18_001n }])).toThrow(/total suplai/);
  });

  it('membawa field lain pemegang apa adanya', () => {
    const result = distribute(7_897_500n, 18_000n, [
      { walletAddress: '0xpemilik', balance: 5_400n },
      { walletAddress: '0xperbendaharaan', balance: 12_600n },
    ]);
    expect(result.holders).toEqual([
      { walletAddress: '0xpemilik', balance: 5_400n, share: 2_369_250n },
      { walletAddress: '0xperbendaharaan', balance: 12_600n, share: 5_528_250n },
    ]);
    expect(result.reserve).toBe(0n);
  });
});
