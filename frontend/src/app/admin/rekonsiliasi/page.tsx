import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { formatPeriod } from "@/lib/format";

import { PeriodDescription } from "./period-description";
import { ReconciliationLoading, ReconciliationView } from "./reconciliation-view";

export const metadata: Metadata = { title: "Rekonsiliasi" };

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * Membaca ?periode= dari URL (nama parameter sama dengan halaman admin lain).
 * Karena searchParams baru diketahui saat ada permintaan, bagian ini dibungkus
 * <Suspense> dan kerangkanya diprarender. Tanpa parameter, backend memilih
 * periode tagihan terbaru.
 */
async function ReconciliationForPeriod({ searchParams }: Pick<PageProps<"/admin/rekonsiliasi">, "searchParams">) {
  const requested = (await searchParams).periode;
  const period = typeof requested === "string" && PERIOD.test(requested) ? requested : null;
  return (
    <>
      <AppHeader
        title="Rekonsiliasi"
        description={
          period ? `Midtrans, database, dan Sepolia untuk periode ${formatPeriod(period)}` : <PeriodDescription />
        }
      />
      <ReconciliationView key={period ?? "terbaru"} period={period} />
    </>
  );
}

/**
 * Rekonsiliasi admin: setiap order Midtrans satu periode dicocokkan dengan
 * basis data dan catatan di Sepolia. Periode lain bisa dibuka lewat
 * ?periode=YYYY-MM.
 */
export default function AdminReconciliationPage({ searchParams }: PageProps<"/admin/rekonsiliasi">) {
  return (
    <Suspense
      fallback={
        <>
          <AppHeader title="Rekonsiliasi" description="Midtrans, database, dan Sepolia" />
          <div className="p-4 md:p-8">
            <ReconciliationLoading />
          </div>
        </>
      }
    >
      <ReconciliationForPeriod searchParams={searchParams} />
    </Suspense>
  );
}
