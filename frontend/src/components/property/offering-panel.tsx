import Link from "next/link";
import { LockIcon } from "@phosphor-icons/react/ssr";

import { OfferingProgress } from "@/components/common/offering-progress";
import { TextLink } from "@/components/common/text-link";
import { Button } from "@/components/ui/button";
import { remainingTokens } from "@/lib/data/offering";
import { etherscanAddressUrl, formatDate, formatNumber, formatPercent, formatRupiah } from "@/lib/format";
import type { Offering, Property } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Panel penawaran yang menempel di samping tab (Figma: "Panel penawaran").
 * Selalu memakai mode Gelap lewat class "dark", di tema terang maupun gelap.
 * Tombol Beli token mengarah ke /masuk karena pengunjung belum masuk (P1).
 */
export function OfferingPanel({
  property,
  offering,
  className,
}: {
  property: Property;
  offering: Offering;
  className?: string;
}) {
  const rows = [
    { label: "Sisa penawaran", value: `${formatNumber(remainingTokens(offering))} token` },
    {
      label: "Batas per investor",
      value: `${formatNumber(property.maxTokensPerInvestor)} token (10%)`,
    },
    {
      label: "Estimasi bagi hasil",
      value: `±${formatPercent(offering.estimatedAnnualYield)} per tahun`,
    },
    { label: "Ditutup", value: formatDate(offering.closesAt) },
  ];

  return (
    <section
      aria-labelledby="judul-penawaran"
      className={cn(
        "dark flex flex-col gap-5 rounded-2xl border border-border bg-background p-6 text-foreground sm:p-7",
        className
      )}
    >
      <h2 id="judul-penawaran" className="text-sm leading-5 font-semibold text-muted-foreground">
        Penawaran {property.tokenSymbol}
      </h2>
      <p className="flex items-baseline gap-2">
        <span className="text-number-lg font-semibold tabular-nums">
          {formatRupiah(property.tokenPriceIdr)}
        </span>
        <span className="text-sm leading-5 text-muted-foreground">per token</span>
      </p>
      <OfferingProgress offering={offering} />
      <dl className="flex flex-col text-sm leading-5">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-4 border-t border-border py-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right font-semibold tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
      <Button asChild className="w-full">
        <Link href="/masuk">Beli token</Link>
      </Button>
      <p className="flex gap-2 text-xs leading-4 text-muted-foreground">
        <LockIcon aria-hidden className="size-4 shrink-0" />
        Kamu perlu masuk dan lolos KYC dummy sebelum membeli. Pembayaran lewat Midtrans sandbox.
      </p>
      <TextLink href={etherscanAddressUrl(property.contracts.kosToken)} external>
        Kontrak KosToken di Etherscan
      </TextLink>
    </section>
  );
}
