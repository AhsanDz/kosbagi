import Link from "next/link";
import { CaretRightIcon } from "@phosphor-icons/react/ssr";

import type { OfferingDto, OfferingInvestorDto } from "@/lib/api/types";
import { monthlyWaterfall } from "@/lib/data/finance";
import { offerings } from "@/lib/data/offering";
import { kosSumbersari01 } from "@/lib/data/properties";
import { formatDate, formatNumber, formatPercent, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";

interface OfferingSummaryProps {
  offering: OfferingDto;
  investor: OfferingInvestorDto;
  className?: string;
}

/**
 * Ringkasan penawaran (Figma: kartu "Ringkasan penawaran"). Sisa token sudah
 * dikurangi pesanan yang sedang menunggu bayar, jadi bilah terisi = terjual +
 * sedang dipesan. Di ponsel angka penawaran menjadi baris label dan nilai.
 */
export function OfferingSummary({ offering, investor, className }: OfferingSummaryProps) {
  const property = kosSumbersari01;
  const taken = Math.min(offering.tokensOffered, offering.tokensSold + offering.tokensReserved);
  const takenPercent = offering.tokensOffered > 0 ? (taken / offering.tokensOffered) * 100 : 0;
  const soldShare = offering.tokensOffered > 0 ? offering.tokensSold / offering.tokensOffered : 0;
  const annualYield = offerings[0]?.estimatedAnnualYield ?? 0.053;

  const figures = [
    { label: "Harga per token", value: formatRupiah(offering.pricePerTokenIdr) },
    { label: "Per token per bulan", value: `±${monthlyWaterfall.payoutPerTokenLabel}` },
    { label: "Imbal per tahun", value: `±${formatPercent(annualYield)}` },
    { label: "Batas per investor", value: `${formatNumber(investor.maxPerInvestor)} token` },
  ];

  return (
    <section
      aria-labelledby="judul-ringkasan-penawaran"
      className={cn(
        "flex flex-col gap-6 rounded-xl bg-card px-5 py-7 text-card-foreground md:px-8",
        className
      )}
    >
      <div className="flex flex-col items-start gap-1 md:flex-row md:justify-between md:gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="judul-ringkasan-penawaran" className="text-h4 font-semibold">
            {property.name}
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {property.roomCount} kamar dekat Universitas Brawijaya. {property.shortAddress},{" "}
            {property.city}.
          </p>
        </div>
        <Link
          href={`/kos/${property.slug}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-sm text-sm leading-5 font-medium text-foreground underline underline-offset-4 hover:decoration-2"
        >
          Lihat detail kos
          <CaretRightIcon aria-hidden className="size-3.5" />
        </Link>
      </div>

      <p className="flex flex-col gap-1 md:flex-row md:items-baseline md:gap-3">
        <span className="text-number-hero font-semibold tabular-nums">
          {formatNumber(offering.tokensRemaining)}
        </span>
        <span className="text-base leading-6 text-muted-foreground">
          token tersisa dari {formatNumber(offering.tokensOffered)}
        </span>
      </p>

      <div className="flex flex-col gap-2">
        <div aria-hidden className="h-2.5 overflow-hidden rounded-[5px] bg-muted">
          <div className="h-full rounded-[5px] bg-foreground" style={{ width: `${takenPercent}%` }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm leading-5 text-muted-foreground">
          <p>
            {offering.tokensReserved > 0
              ? `${formatNumber(offering.tokensSold)} terjual, ${formatNumber(offering.tokensReserved)} sedang dipesan`
              : `${formatNumber(offering.tokensSold)} terjual (${formatPercent(soldShare)})`}
          </p>
          <p>Ditutup {formatDate(offering.closesAt)}</p>
        </div>
      </div>

      <dl className="flex flex-col md:flex-row">
        {figures.map((figure, index) => (
          <div
            key={figure.label}
            className={cn(
              "flex items-center justify-between gap-4 border-t border-border py-3 first:border-t-0 first:pt-0 last:pb-0",
              "md:flex-1 md:flex-col md:items-start md:justify-start md:gap-1 md:border-t-0 md:px-4 md:py-0",
              index === 0 ? "md:pl-0" : "md:border-l"
            )}
          >
            <dt className="text-sm leading-5 text-muted-foreground md:text-xs md:leading-4">
              {figure.label}
            </dt>
            <dd className="text-base leading-6 font-semibold whitespace-nowrap md:text-number-md">
              {figure.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
