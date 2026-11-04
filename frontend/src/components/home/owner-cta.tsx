import Link from "next/link";

import { TextLink } from "@/components/common/text-link";
import { SectionHeading } from "@/components/public/section-heading";
import { Button } from "@/components/ui/button";
import { ownerHighlights } from "@/lib/data/finance";
import { formatPercent, formatRupiah, formatRupiahCompact } from "@/lib/format";

const highlights = [
  {
    value: formatRupiahCompact(ownerHighlights.upfrontFundsIdr, "short"),
    description: "dana diterima di muka untuk Kos Sumbersari 01, setelah fee 3%",
  },
  {
    value: formatPercent(ownerHighlights.ownerShare, 0),
    description: "token tetap milikmu; bagi hasilnya masuk tiap bulan",
  },
  {
    value: formatRupiah(ownerHighlights.tenantExtraFeeIdr),
    description: "biaya tambahan untuk penghuni",
  },
];

/**
 * Bagian "Punya kos dekat kampus?" untuk calon pemilik kos. Mengarah ke
 * halaman /pemilik (dibangun jalur 1 di progress 2).
 */
export function OwnerCta() {
  return (
    <section aria-labelledby="judul-pemilik" className="container-page py-2 lg:pt-28 lg:pb-0">
      <div className="flex flex-col gap-[18px] rounded-[24px] bg-card px-5 py-7 text-card-foreground lg:flex-row lg:items-center lg:gap-20 lg:rounded-2xl lg:p-14">
        <div className="flex min-w-0 flex-1 flex-col items-start gap-[18px] lg:gap-6">
          <p className="text-xs leading-4 font-medium text-muted-foreground lg:text-sm lg:leading-5 lg:font-semibold">
            Untuk pemilik kos
          </p>
          <SectionHeading id="judul-pemilik" className="max-w-[540px] text-card-foreground">
            Punya kos dekat kampus?
          </SectionHeading>
          <p className="max-w-[500px] text-base leading-6 text-muted-foreground lg:text-lg lg:leading-7">
            Tokenisasi kosmu untuk dana di muka, tetap pegang 30% token, dan biarkan pembukuannya
            tercatat on-chain.
          </p>
          <div className="hidden flex-wrap items-center gap-5 pt-2 lg:flex">
            <Button asChild>
              <Link href="/pemilik">Pelajari untuk pemilik</Link>
            </Button>
            <TextLink href="/pemilik#ajukan">Ajukan kos</TextLink>
          </div>
        </div>

        <dl className="flex w-full flex-col lg:w-[440px] lg:shrink-0">
          {highlights.map((item, index) => (
            <div
              key={item.value}
              className={
                index === 0
                  ? "flex flex-col gap-1.5 border-t border-border py-3.5 lg:flex-row lg:items-center lg:gap-6 lg:border-t-0 lg:py-5"
                  : "flex flex-col gap-1.5 border-t border-border py-3.5 lg:flex-row lg:items-center lg:gap-6 lg:py-5"
              }
            >
              <dt className="font-display text-display-section-mobile font-black whitespace-nowrap lg:w-[250px] lg:shrink-0 lg:text-display-mobile">
                {item.value}
              </dt>
              <dd className="text-xs leading-4 text-muted-foreground lg:text-sm lg:leading-5">
                {item.description}
              </dd>
            </div>
          ))}
        </dl>

        <Button asChild className="w-full lg:hidden">
          <Link href="/pemilik">Pelajari untuk pemilik</Link>
        </Button>
      </div>
    </section>
  );
}
