import { propertyParties } from "@/lib/data/properties";
import {
  formatNumber,
  formatPercent,
  formatRupiah,
  formatRupiahCompact,
} from "@/lib/format";
import type { Property } from "@/lib/types";

/** Tab Ringkasan: tentang kos, fakta angka, struktur token, dan pihak yang terlibat. */
export function OverviewTab({ property }: { property: Property }) {
  const facts = [
    { label: "Sewa per kamar", value: `${formatRupiah(property.monthlyRentIdr)}/bulan` },
    {
      label: "Okupansi",
      value: `${formatPercent(property.occupiedRooms / property.roomCount, 0)} (${property.occupiedRooms} dari ${property.roomCount})`,
    },
    { label: "Sewa kotor", value: `${formatRupiahCompact(property.annualGrossRentIdr)}/tahun` },
    { label: "Nilai properti", value: `${formatRupiahCompact(property.propertyValueIdr)} (dummy)` },
    { label: "Total token", value: `${formatNumber(property.totalTokens)} ${property.tokenSymbol}` },
    { label: "Harga token", value: formatRupiah(property.tokenPriceIdr) },
  ];
  const ownerPercent = (property.ownerTokens / property.totalTokens) * 100;

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold text-foreground">Tentang kos</h2>
        <p className="max-w-[680px] text-base leading-6 text-muted-foreground">
          {property.description}
        </p>
      </section>

      <dl className="grid grid-cols-2 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1.5 border-t border-border py-5 pr-4">
            <dt className="text-xs leading-4 font-medium text-muted-foreground">{fact.label}</dt>
            <dd className="text-base leading-6 font-semibold text-foreground tabular-nums sm:text-number-md">
              {fact.value}
            </dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3.5">
        <h2 className="text-h3 font-semibold text-foreground">Struktur token</h2>
        <div aria-hidden className="flex h-10 w-full gap-1 text-sm leading-5 font-semibold">
          <div
            className="flex items-center rounded-md bg-foreground pl-3.5 text-background"
            style={{ width: `${ownerPercent}%` }}
          >
            Pemilik {formatPercent(ownerPercent / 100, 0)}
          </div>
          <div className="flex flex-1 items-center rounded-md border border-foreground bg-card pl-3.5 text-foreground">
            Investor {formatPercent(1 - ownerPercent / 100, 0)}
          </div>
        </div>
        <ul className="flex flex-col gap-x-8 gap-y-1 text-sm leading-5 text-muted-foreground sm:flex-row sm:flex-wrap">
          <li>{formatNumber(property.ownerTokens)} token dipegang pemilik lama</li>
          <li>
            {formatNumber(property.investorTokens)} token ditawarkan, batas{" "}
            {formatNumber(property.maxTokensPerInvestor)} per investor
          </li>
        </ul>
      </section>

      <section className="flex flex-col">
        <h2 className="text-h3 font-semibold text-foreground">Pihak yang terlibat</h2>
        <dl className="flex flex-col">
          {propertyParties.map((party) => (
            <div
              key={party.role}
              className="flex justify-between gap-4 border-b border-border py-4 text-base leading-6"
            >
              <dt className="text-muted-foreground">{party.role}</dt>
              <dd className="text-right font-medium text-foreground">{party.name}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
