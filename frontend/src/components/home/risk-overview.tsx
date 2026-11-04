import { ComplaintCard } from "@/components/common/complaint-card";
import { SectionHeading } from "@/components/public/section-heading";
import { risks } from "@/lib/data/risks";

/**
 * Bagian "Pahami risikonya." Daftar risiko berurutan (nomor mono) dan kanal
 * pengaduan. Ponsel: judul, daftar, lalu kartu pengaduan; desktop: judul dan
 * kartu di kolom kiri, daftar di kanan.
 */
export function RiskOverview() {
  return (
    <section aria-labelledby="judul-risiko" className="container-page py-14 lg:py-28">
      <div className="grid gap-5 lg:grid-cols-[400px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-20 lg:gap-y-6">
        <div className="flex flex-col gap-5 lg:col-start-1 lg:row-start-1 lg:gap-6">
          <SectionHeading id="judul-risiko">Pahami risikonya.</SectionHeading>
          <p className="max-w-[360px] text-base leading-6 text-muted-foreground">
            Token KosBagi adalah hak atas bagi hasil sewa, bukan sertifikat tanah atau bangunan. Baca
            ini sebelum membeli.
          </p>
        </div>

        <ol className="flex flex-col lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {risks.map((risk, index) => (
            <li
              key={risk.title}
              className="flex gap-4 border-t border-border py-[18px] first:border-t-0 lg:gap-6 lg:py-6"
            >
              <span className="font-mono text-xs leading-4 text-muted-foreground tabular-nums lg:text-sm lg:leading-5">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="flex min-w-0 flex-col gap-1 lg:gap-1.5">
                <h3 className="text-h5 font-semibold text-foreground lg:text-h4">{risk.title}</h3>
                <p className="text-sm leading-5 text-muted-foreground lg:text-base lg:leading-6">
                  {risk.summary}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <ComplaintCard className="lg:col-start-1 lg:row-start-2 lg:self-start" />
      </div>
    </section>
  );
}
