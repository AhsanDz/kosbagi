import type { ManagerRoomsPayload } from "@/lib/api/types";
import { formatRupiah } from "@/lib/format";
import { legendCounts } from "@/lib/manager";
import { periodMonthName } from "@/lib/period";
import { cn } from "@/lib/utils";

function percent(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.min(Math.max((part / whole) * 100, 0), 100)}%`;
}

function LegendItem({
  swatch,
  label,
  count,
}: {
  swatch: string;
  label: string;
  count: number;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm leading-5 text-card-foreground">
      <span aria-hidden className={cn("size-3 shrink-0 rounded-[3px]", swatch)} />
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{count}</span>
    </li>
  );
}

/**
 * Ringkasan sewa masuk pengelola (Figma: Pengelola / Status kamar, "Ringkasan
 * sewa"): jumlah sewa lunas dari total yang diharapkan, bilah dua segmen
 * (tercatat di Sepolia, menunggu pencatatan), dan keterangan warna berjumlah.
 * Kontras segmen lime rendah di permukaan terang, jadi angkanya selalu tertulis.
 */
export function RentSummaryCard({ payload }: { payload: ManagerRoomsPayload }) {
  const { summary, period } = payload;
  const counts = legendCounts(payload);

  return (
    <section
      aria-labelledby="judul-ringkasan-sewa"
      className="flex flex-col gap-6 rounded-xl bg-card px-6 py-6 text-card-foreground lg:flex-row lg:items-center lg:gap-8 lg:px-8 lg:py-7"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h2 id="judul-ringkasan-sewa" className="text-sm leading-5 font-medium text-muted-foreground">
          Sewa masuk {periodMonthName(period)}
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-number-lg font-semibold tabular-nums md:text-number-hero">
            {formatRupiah(summary.paidIdr)}
          </span>
          <span className="text-base leading-6 text-muted-foreground">
            dari {formatRupiah(summary.expectedIdr)} untuk {summary.roomsOccupied} kamar terisi
          </span>
        </p>
        <div aria-hidden className="relative h-2.5 w-full overflow-hidden rounded-[5px] bg-muted">
          <div
            className="absolute inset-y-0 left-0 bg-success"
            style={{ width: percent(summary.recordedIdr, summary.expectedIdr) }}
          />
          <div
            className="absolute inset-y-0 bg-warning"
            style={{
              left: percent(summary.recordedIdr, summary.expectedIdr),
              width: percent(summary.pendingIdr, summary.expectedIdr),
            }}
          />
        </div>
      </div>
      <ul aria-label="Keterangan warna" className="flex shrink-0 flex-col gap-2.5">
        <LegendItem swatch="bg-success" label="Lunas, tercatat di Sepolia" count={counts.recorded} />
        <LegendItem swatch="bg-warning" label="Lunas, menunggu pencatatan" count={counts.waiting} />
        <LegendItem swatch="border border-border bg-card" label="Belum dibayar" count={counts.unpaid} />
        <LegendItem swatch="border border-dashed border-muted-foreground" label="Kosong" count={counts.vacant} />
      </ul>
    </section>
  );
}
