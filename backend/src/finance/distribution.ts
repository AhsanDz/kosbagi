// Kalkulator distribusi bagi hasil satu periode sewa. Aturannya sama persis dengan
// KosLedger.closePeriod dan KosLedger.shareOf, dan langkahnya dijelaskan di
// docs/bisnis/perhitungan-distribusi.md bagian 1. Test di distribution.test.ts mencocokkan
// semua kasus di contracts/test/fixtures/distribusi-manual.json.
//
// Urutan hitung, dengan pembulatan ke bawah di setiap pembagian:
//   fee              = floor(sewaKotor × 500 ÷ 10.000)
//   labaKenaPajak    = sewaKotor − fee − biaya          (0 bila negatif)
//   pajak            = floor(labaKenaPajak × 2.200 ÷ 10.000)
//   sewaBersih       = labaKenaPajak − pajak
//   nilaiPerTokenSen = floor(sewaBersih × 100 ÷ totalSuplai)
//   bagianPemegang   = floor(sewaBersih × saldo ÷ totalSuplai)
//   sisaPembulatan   = sewaBersih − jumlah bagian semua pemegang
import {
  BPS_DENOMINATOR,
  SEN_PER_RUPIAH,
  mulDivFloor,
  requireBps,
  requireNonNegative,
  saturatingSub,
} from './integer-math.js';

/** Fee pengelolaan 5% dari sewa kotor. Sama dengan parameter platformFeeBps saat deploy KosLedger. */
export const PLATFORM_FEE_BPS = 500n;

/** PPh badan 22% atas laba kena pajak (keputusan 2 Nov 2026). Sama dengan parameter taxBps KosLedger. */
export const TAX_BPS = 2_200n;

/** Masukan satu periode. Semua nominal dalam rupiah bilangan bulat. */
export interface PeriodInput {
  /** Jumlah sewa yang tercatat pada periode itu, padanan grossRent di KosLedger. */
  grossRent: bigint;
  /** Jumlah biaya yang tercatat pada periode itu, padanan totalExpenses. */
  totalExpenses: bigint;
  /** Total suplai token di blok snapshot. KB-SMR01: 18.000. */
  totalSupply: bigint;
  /** Bawaan PLATFORM_FEE_BPS. */
  platformFeeBps?: bigint;
  /** Bawaan TAX_BPS. */
  taxBps?: bigint;
}

/** Hasil satu periode. Nama field sama dengan PeriodRecord di KosLedger dan fixture. */
export interface PeriodSummary {
  grossRent: bigint;
  totalExpenses: bigint;
  platformFee: bigint;
  /** Tidak disimpan di kontrak; dipakai menghitung pajak. */
  taxableProfit: bigint;
  tax: bigint;
  netRent: bigint;
  totalSupply: bigint;
  /** Nilai per token dalam sen: 43875 berarti Rp438,75. Hanya untuk tampilan, bukan dasar pembayaran. */
  valuePerTokenSen: bigint;
  /** Kekurangan saat biaya melebihi sewa setelah fee. Tidak disimpan di kontrak dan tidak dibawa ke periode berikutnya. */
  deficit: bigint;
}

/** Fee pengelolaan: floor(sewa kotor × feeBps ÷ 10.000). */
export function calculatePlatformFee(grossRent: bigint, platformFeeBps: bigint = PLATFORM_FEE_BPS): bigint {
  requireNonNegative(grossRent, 'Sewa kotor');
  requireBps(platformFeeBps, 'Fee pengelolaan');
  return mulDivFloor(grossRent, platformFeeBps, BPS_DENOMINATOR);
}

/** Laba kena pajak: sewa kotor − fee − biaya, bernilai 0 bila negatif. */
export function calculateTaxableProfit(grossRent: bigint, platformFee: bigint, totalExpenses: bigint): bigint {
  requireNonNegative(grossRent, 'Sewa kotor');
  requireNonNegative(platformFee, 'Fee pengelolaan');
  requireNonNegative(totalExpenses, 'Biaya');
  if (platformFee > grossRent) {
    throw new RangeError('Fee pengelolaan tidak boleh melebihi sewa kotor.');
  }
  return saturatingSub(grossRent - platformFee, totalExpenses);
}

/** Pajak: floor(laba kena pajak × taxBps ÷ 10.000). */
export function calculateTax(taxableProfit: bigint, taxBps: bigint = TAX_BPS): bigint {
  requireNonNegative(taxableProfit, 'Laba kena pajak');
  requireBps(taxBps, 'Tarif pajak');
  return mulDivFloor(taxableProfit, taxBps, BPS_DENOMINATOR);
}

/** Defisit: bagian biaya yang tidak tertutup sewa setelah fee. 0 bila sewa cukup. */
export function calculateDeficit(grossRent: bigint, platformFee: bigint, totalExpenses: bigint): bigint {
  requireNonNegative(grossRent, 'Sewa kotor');
  requireNonNegative(platformFee, 'Fee pengelolaan');
  requireNonNegative(totalExpenses, 'Biaya');
  return saturatingSub(platformFee + totalExpenses, grossRent);
}

function requirePositiveSupply(totalSupply: bigint): void {
  if (totalSupply <= 0n) {
    // Padanan revert NoSupplyAtSnapshot di KosLedger.
    throw new RangeError(`Total suplai token harus lebih besar dari 0 (diterima ${totalSupply}).`);
  }
}

/** Nilai per token dalam sen: floor(sewa bersih × 100 ÷ total suplai). */
export function calculateValuePerTokenSen(netRent: bigint, totalSupply: bigint): bigint {
  requireNonNegative(netRent, 'Sewa bersih');
  requirePositiveSupply(totalSupply);
  return mulDivFloor(netRent, SEN_PER_RUPIAH, totalSupply);
}

/**
 * Bagian satu pemegang: floor(sewa bersih × saldo ÷ total suplai). Padanan KosLedger.shareOf.
 * Dihitung langsung dari sewa bersih, bukan dari nilai per token yang sudah dibulatkan,
 * supaya pembulatan terjadi sekali per pemegang.
 */
export function calculateShare(netRent: bigint, balance: bigint, totalSupply: bigint): bigint {
  requireNonNegative(netRent, 'Sewa bersih');
  requireNonNegative(balance, 'Saldo token');
  requirePositiveSupply(totalSupply);
  return mulDivFloor(netRent, balance, totalSupply);
}

/**
 * Menghitung angka distribusi satu periode, padanan KosLedger.closePeriod.
 *
 * Seperti kontrak, periode tanpa sewa dan tanpa biaya ditolak (revert EmptyPeriod), begitu
 * juga total suplai 0 (revert NoSupplyAtSnapshot). Dengan begitu backend bisa memeriksa
 * periode sebelum membuat job closePeriod yang pasti gagal.
 */
export function calculatePeriod(input: PeriodInput): PeriodSummary {
  const { grossRent, totalExpenses, totalSupply } = input;
  const platformFeeBps = input.platformFeeBps ?? PLATFORM_FEE_BPS;
  const taxBps = input.taxBps ?? TAX_BPS;

  requireNonNegative(grossRent, 'Sewa kotor');
  requireNonNegative(totalExpenses, 'Biaya');
  if (grossRent === 0n && totalExpenses === 0n) {
    throw new RangeError('Periode kosong: belum ada sewa maupun biaya yang tercatat.');
  }
  requirePositiveSupply(totalSupply);

  const platformFee = calculatePlatformFee(grossRent, platformFeeBps);
  const taxableProfit = calculateTaxableProfit(grossRent, platformFee, totalExpenses);
  const tax = calculateTax(taxableProfit, taxBps);
  const netRent = taxableProfit - tax;

  return {
    grossRent,
    totalExpenses,
    platformFee,
    taxableProfit,
    tax,
    netRent,
    totalSupply,
    valuePerTokenSen: calculateValuePerTokenSen(netRent, totalSupply),
    deficit: calculateDeficit(grossRent, platformFee, totalExpenses),
  };
}

/** Satu pemegang token, mis. { walletAddress, balance }. Field lain dibawa apa adanya. */
export interface Holding {
  /** Saldo token di blok snapshot (token utuh). */
  balance: bigint;
}

export interface Distribution<T extends Holding> {
  /** Pemegang dalam urutan yang sama dengan masukan, ditambah bagian masing-masing. */
  holders: Array<T & { share: bigint }>;
  /** Jumlah bagian semua pemegang. */
  totalShares: bigint;
  /** Sisa pembulatan: sewa bersih − jumlah bagian. Masuk cadangan periode itu. */
  reserve: bigint;
}

/**
 * Membagi sewa bersih ke semua pemegang secara pro-rata.
 *
 * Jumlah saldo wajib sama dengan total suplai: sertakan semua pemegang, termasuk dompet
 * pemilik lama dan dompet perbendaharaan. Dengan begitu `reserve` hanya berisi sisa
 * pembulatan, yang selalu lebih kecil dari jumlah pemegang karena tiap pemegang kehilangan
 * kurang dari Rp1. Perlakuan bagian dompet perbendaharaan diputuskan di progress 4.
 */
export function distribute<T extends Holding>(
  netRent: bigint,
  totalSupply: bigint,
  holders: readonly T[],
): Distribution<T> {
  requireNonNegative(netRent, 'Sewa bersih');
  requirePositiveSupply(totalSupply);

  let totalBalance = 0n;
  for (const holder of holders) {
    requireNonNegative(holder.balance, 'Saldo token');
    totalBalance += holder.balance;
  }
  if (totalBalance !== totalSupply) {
    throw new RangeError(
      `Jumlah saldo pemegang (${totalBalance}) harus sama dengan total suplai (${totalSupply}). ` +
        'Sertakan semua pemegang, termasuk pemilik lama dan perbendaharaan.',
    );
  }

  const withShares = holders.map((holder) => ({
    ...holder,
    share: calculateShare(netRent, holder.balance, totalSupply),
  }));
  const totalShares = withShares.reduce((sum, holder) => sum + holder.share, 0n);

  return { holders: withShares, totalShares, reserve: netRent - totalShares };
}
