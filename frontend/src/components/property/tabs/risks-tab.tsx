import { ComplaintCard } from "@/components/common/complaint-card";
import { risks } from "@/lib/data/risks";
import type { Property } from "@/lib/types";

/** Tab Risiko: ringkasan risiko versi lengkap dan kanal pengaduan. */
export function RisksTab({ property }: { property: Property }) {
  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold text-foreground">Ringkasan risiko</h2>
        <p className="max-w-[680px] text-base leading-6 text-muted-foreground">
          Token {property.tokenSymbol} memberi hak atas bagi hasil sewa {property.name}, bukan
          sertifikat tanah atau bangunan. Pahami risiko berikut sebelum membeli.
        </p>
      </section>

      <ol className="flex flex-col">
        {risks.map((risk, index) => (
          <li
            key={risk.title}
            className="flex gap-4 border-t border-border py-[22px] sm:gap-6"
          >
            <span className="font-mono text-sm leading-5 text-muted-foreground tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="flex min-w-0 flex-col gap-1.5 text-base">
              <h3 className="text-h5 font-semibold text-foreground">{risk.title}</h3>
              <p className="leading-6 text-muted-foreground">{risk.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <ComplaintCard description="Kirim pertanyaan atau keluhan tentang kos ini. Kami membalas paling lambat 2 hari kerja." />
    </div>
  );
}
