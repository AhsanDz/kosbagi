import Link from "next/link";
import type { ReactNode } from "react";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import type { HoldingDto } from "@/lib/api/types";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatNumber, formatRupiah, shortenHash } from "@/lib/format";
import { holdingCostIdr, holdingShare } from "@/lib/investor";
import { cn } from "@/lib/utils";

function Figure({
  label,
  value,
  mono = false,
  first = false,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
  first?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        !first && "md:border-l md:border-border md:px-5",
        first && "md:pr-5"
      )}
    >
      <dt className="text-xs leading-4 text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "break-words text-card-foreground md:truncate",
          mono ? "font-mono text-sm leading-5" : "text-base leading-6 font-medium"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Jalur kepemilikan di bawah ringkasan investor (Figma: "Kepemilikan"): token
 * dimiliki, nilai beli, porsi dari 18.000 token, dan dompet kustodian, lalu
 * tautan ke halaman Portofolio.
 */
export function HoldingStrip({ holding, className }: { holding: HoldingDto; className?: string }) {
  return (
    <section
      aria-label="Kepemilikan token"
      className={cn(
        "flex flex-col gap-4 rounded-xl bg-card px-6 py-5 text-card-foreground md:flex-row md:items-center md:px-7 md:py-[22px]",
        className
      )}
    >
      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4 md:gap-0">
        <Figure
          first
          label="Token dimiliki"
          value={
            <>
              {formatNumber(holding.tokenBalance)} token{" "}
              {/* Simbol tidak dipatah di tanda hubung pada layar sempit ("KB-" lalu "SMR01"). */}
              <span className="whitespace-nowrap">{holding.tokenSymbol}</span>
            </>
          }
        />
        <Figure label="Nilai beli" value={formatRupiah(holdingCostIdr(holding.tokenBalance))} />
        <Figure
          label="Porsi kepemilikan"
          value={`${holdingShare(holding.tokenBalance)} dari ${formatNumber(kosSumbersari01.totalTokens)} token`}
        />
        <Figure label="Dompet kustodian" value={shortenHash(holding.walletAddress)} mono />
      </dl>
      <Link
        href="/investor/portofolio"
        className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-sm text-sm leading-5 font-medium text-foreground underline decoration-1 underline-offset-4 hover:decoration-2 md:self-center"
      >
        Lihat portofolio
        <CaretRightIcon aria-hidden className="size-3.5" />
      </Link>
    </section>
  );
}
