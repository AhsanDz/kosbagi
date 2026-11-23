import type { Metadata } from "next";
import { Suspense } from "react";

import {
  PeriodCloseCaption,
  PeriodCloseSkeleton,
  PeriodCloseView,
} from "@/components/admin/period-close-view";
import { AppHeader } from "@/components/app-shell/app-header";
import { kosSumbersari01 } from "@/lib/data/properties";
import { isPeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Tutup periode" };

/** Membaca ?periode= dari URL. Dibungkus Suspense karena baru diketahui saat ada permintaan. */
async function PeriodFromParams({ searchParams }: Pick<PageProps<"/admin/periode">, "searchParams">) {
  const { periode } = await searchParams;
  const period = typeof periode === "string" && isPeriod(periode) ? periode : null;
  return (
    <>
      <AppHeader title="Tutup periode" description={<PeriodCloseCaption period={period} />} />
      <PeriodCloseView period={period} />
    </>
  );
}

/**
 * Tutup periode dan jalankan distribusi bagi hasil: struk penutupan, syarat
 * penutupan, closePeriod lewat antrean job, lalu distribusi sekali per periode.
 * Tanpa ?periode= halaman membuka periode berjalan dari GET /admin/summary.
 */
export default function AdminPeriodPage({ searchParams }: PageProps<"/admin/periode">) {
  return (
    <Suspense
      fallback={
        <>
          <AppHeader title="Tutup periode" description={kosSumbersari01.name} />
          <PeriodCloseSkeleton />
        </>
      }
    >
      <PeriodFromParams searchParams={searchParams} />
    </Suspense>
  );
}
