import { formatNumber } from "@/lib/format";
import { soldPercent } from "@/lib/data/offering";
import type { Offering } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Progres penawaran: angka terjual + bilah. Tinta = token terjual,
 * garis putus = sisa (Figma: komponen "Kartu kos", bagian Progres).
 * Bilah hanya hiasan; angkanya sudah tertulis sebagai teks.
 */
export function OfferingProgress({
  offering,
  className,
}: {
  offering: Offering;
  className?: string;
}) {
  const percent = soldPercent(offering);

  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <p className="flex items-baseline gap-1.5 text-sm leading-5">
        <span className="font-semibold text-foreground tabular-nums">
          {formatNumber(offering.soldTokens)}
        </span>
        <span className="text-muted-foreground">
          dari <span className="tabular-nums">{formatNumber(offering.offeredTokens)}</span> token
          terjual
        </span>
      </p>
      <div aria-hidden className="flex h-2 w-full gap-1">
        <div className="h-2 rounded-[4px] bg-foreground" style={{ width: `${percent}%` }} />
        <div className="h-2 flex-1 rounded-[4px] border border-dashed border-input" />
      </div>
    </div>
  );
}
