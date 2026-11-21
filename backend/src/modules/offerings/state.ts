// Membaca angka kuota dari basis data. Query dijalankan berurutan, bukan paralel, supaya fungsi ini
// aman dipakai di dalam transaksi (satu koneksi tidak boleh menjalankan dua query sekaligus).
import type { Offering, Prisma } from '../../generated/prisma/client.js';
import type { QuotaInput } from './quota.js';

type QuotaDb = Pick<Prisma.TransactionClient, 'tokenPurchase'>;

export interface QuotaScope {
  offering: Pick<Offering, 'id' | 'propertyId' | 'tokensOffered' | 'tokensSold'>;
  maxPerInvestor: number;
  investorId: string;
  now: Date;
  /** Pesanan yang sisihannya sedang diperiksa ulang (bayar ulang atau pelunasan). */
  excludePurchaseId?: string;
}

/** Pesanan yang masih menyisihkan token pada `now`. */
export function activeReservation(now: Date): Prisma.TokenPurchaseWhereInput {
  return { status: 'PENDING_PAYMENT', reservedUntil: { gt: now } };
}

function sumTokens(result: { _sum: { tokenAmount: number | null } }): number {
  return result._sum.tokenAmount ?? 0;
}

export async function loadQuotaInput(db: QuotaDb, scope: QuotaScope): Promise<QuotaInput> {
  const { offering, investorId, now, excludePurchaseId } = scope;
  const notExcluded: Prisma.TokenPurchaseWhereInput = excludePurchaseId ? { id: { not: excludePurchaseId } } : {};
  const sameProperty: Prisma.TokenPurchaseWhereInput = { offering: { propertyId: offering.propertyId } };

  const reserved = await db.tokenPurchase.aggregate({
    _sum: { tokenAmount: true },
    where: { offeringId: offering.id, ...activeReservation(now), ...notExcluded },
  });
  const holding = await db.tokenPurchase.aggregate({
    _sum: { tokenAmount: true },
    where: { investorId, status: 'PAID', ...sameProperty },
  });
  const reservedByInvestor = await db.tokenPurchase.aggregate({
    _sum: { tokenAmount: true },
    where: { investorId, ...activeReservation(now), ...sameProperty, ...notExcluded },
  });

  return {
    tokensOffered: offering.tokensOffered,
    tokensSold: offering.tokensSold,
    tokensReserved: sumTokens(reserved),
    maxPerInvestor: scope.maxPerInvestor,
    holdingTokens: sumTokens(holding),
    reservedByInvestor: sumTokens(reservedByInvestor),
  };
}
