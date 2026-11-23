import type { PeriodDistributionPreviewDto } from "@/lib/api/types";
import { formatNumber, formatRupiah, shortenHash } from "@/lib/format";

/** Total yang dibagikan: bagian pemegang, bagian perbendaharaan, dan sisa pembulatan. */
export function distributedTotal(distribution: PeriodDistributionPreviewDto): number {
  const holders = distribution.holders.reduce((sum, holder) => sum + holder.shareIdr, 0);
  return holders + distribution.treasury.shareIdr;
}

interface HolderSharesProps {
  distribution: PeriodDistributionPreviewDto;
  /** true setelah Jalankan distribusi; false untuk pratinjau sebelum masuk saldo. */
  distributed: boolean;
  snapshotBlock: number | null;
}

/**
 * Bagian pemegang (Figma: Tutup periode, ditutup dan terdistribusi): satu baris
 * per pemegang dengan saldo di blok snapshot dan bagiannya, lalu baris
 * terpisah bagian perbendaharaan (token belum terjual, masuk ke saldo pemilik
 * lama sesuai keputusan 16 Nov 2026), sisa pembulatan, dan total sewa bersih.
 */
export function HolderShares({ distribution, distributed, snapshotBlock }: HolderSharesProps) {
  const holders = [...distribution.holders].sort((a, b) => {
    if (a.holderType !== b.holderType) return a.holderType === "ORIGINAL_OWNER" ? -1 : 1;
    return b.tokenBalance - a.tokenBalance;
  });
  const total = distributedTotal(distribution) + distribution.roundingRemainderIdr;

  return (
    <section
      aria-labelledby="judul-bagian-pemegang"
      className="flex flex-col rounded-xl bg-card px-6 pt-6 pb-5 text-card-foreground md:px-7"
    >
      <div className="flex flex-col gap-1 pb-3.5">
        <h2 id="judul-bagian-pemegang" className="text-h5 font-semibold">
          Bagian pemegang
        </h2>
        <p className="text-sm leading-5 text-muted-foreground">
          {distributed
            ? "Sudah masuk ke saldo bagi hasil masing-masing pemegang."
            : `Dihitung dengan shareOf dari saldo${snapshotBlock != null ? ` di blok ${formatNumber(snapshotBlock)}` : " di blok snapshot"}. Belum masuk ke saldo.`}
        </p>
      </div>

      <table className="w-full text-sm leading-5">
        <thead>
          <tr className="text-xs leading-4 font-medium text-muted-foreground">
            <th scope="col" className="py-2 text-left font-medium">
              Pemegang
            </th>
            <th scope="col" className="w-[110px] py-2 text-right font-medium">
              Saldo snapshot
            </th>
            <th scope="col" className="w-[120px] py-2 text-right font-medium">
              Bagian
            </th>
          </tr>
        </thead>
        <tbody>
          {holders.map((holder) => (
            <tr key={holder.walletAddress} className="border-t border-border">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{holder.label}</span>
                  <span className="font-mono text-xs leading-4 text-muted-foreground" title={holder.walletAddress}>
                    {shortenHash(holder.walletAddress)}
                  </span>
                </span>
              </th>
              <td className="py-2.5 text-right whitespace-nowrap tabular-nums">
                {formatNumber(holder.tokenBalance)} token
              </td>
              <td className="py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
                {formatRupiah(holder.shareIdr)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border">
            <th scope="row" colSpan={2} className="py-2.5 pr-3 text-left font-normal">
              <span className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">
                  Bagian perbendaharaan ({formatNumber(distribution.treasury.tokenBalance)} token belum
                  terjual)
                </span>
                <span className="text-xs leading-4 text-muted-foreground">
                  {distributed ? "Masuk ke saldo pemilik lama" : "Untuk pemilik lama"}
                </span>
              </span>
            </th>
            <td className="py-2.5 text-right font-medium whitespace-nowrap tabular-nums">
              {formatRupiah(distribution.treasury.shareIdr)}
            </td>
          </tr>
          <tr className="border-t border-border">
            <th scope="row" colSpan={2} className="py-2.5 text-left font-normal text-muted-foreground">
              Sisa pembulatan
            </th>
            <td className="py-2.5 text-right font-medium tabular-nums">
              {formatRupiah(distribution.roundingRemainderIdr)}
            </td>
          </tr>
          <tr className="border-t border-border font-semibold">
            <th scope="row" colSpan={2} className="py-2.5 text-left">
              Total sewa bersih
            </th>
            <td className="py-2.5 text-right whitespace-nowrap tabular-nums">{formatRupiah(total)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}
