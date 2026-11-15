import { formatNumber, formatRupiah, formatSignedNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

import { SUMBERSARI_EXAMPLE, simulateFunds } from "./simulation";

/**
 * Kartu "Rincian dana" di hero (Figma: Publik / Pemilik): contoh dana yang diterima
 * pemilik Kos Sumbersari 01. Miring 3 derajat di desktop, tegak di ponsel.
 */
export function FundsReceipt({ className }: { className?: string }) {
  const result = simulateFunds(SUMBERSARI_EXAMPLE);
  const rows = [
    { label: "Nilai properti", value: formatNumber(SUMBERSARI_EXAMPLE.propertyValueIdr) },
    { label: "Token ditawarkan (70%)", value: formatNumber(result.offeredTokens) },
    { label: "Dana penawaran", value: formatNumber(result.offeringFundsIdr) },
    { label: "Fee penawaran 3%", value: formatSignedNumber(-result.offeringFeeIdr) },
  ];

  return (
    <article
      aria-labelledby="judul-rincian-dana"
      className={cn(
        "overflow-hidden rounded-2xl bg-card text-card-foreground shadow-float",
        className
      )}
    >
      <header className="flex flex-col gap-1.5 px-7 pt-7 pb-6">
        <p className="text-xs leading-4 font-medium text-muted-foreground">
          Contoh: Kos Sumbersari 01
        </p>
        <h2 id="judul-rincian-dana" className="text-sm leading-5 font-semibold">
          Dana diterima pemilik
        </h2>
        <p className="text-number-lg font-semibold tabular-nums">
          {formatRupiah(result.fundsReceivedIdr)}
        </p>
      </header>

      {/* Garis sobek: putus-putus 6/6 px dengan warna --border. */}
      <div aria-hidden className="dash-line h-[1.5px] text-border" />

      <dl className="flex flex-col gap-3 px-7 pt-5 pb-6 text-sm leading-5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="font-mono tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-1 bg-muted px-7 pt-[18px] pb-[22px]">
        <p className="flex items-start justify-between gap-4 text-sm leading-5 text-foreground">
          <span className="font-semibold">Token tetap milikmu (30%)</span>
          <span className="font-mono tabular-nums">{formatNumber(result.ownerTokens)}</span>
        </p>
        <p className="text-xs leading-4 text-muted-foreground">
          Bagi hasil ±{formatRupiah(result.ownerMonthlyShareIdr)} per bulan
        </p>
      </div>
    </article>
  );
}
