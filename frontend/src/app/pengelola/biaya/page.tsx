import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { ExpensesSkeleton, ExpensesView } from "@/components/manager/expenses-view";
import { ExpensesPeriodCaption } from "@/components/manager/period-captions";
import { kosSumbersari01 } from "@/lib/data/properties";
import { isPeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Biaya dan nota" };

/** Membaca ?periode= dari URL. Dibungkus Suspense karena baru diketahui saat ada permintaan. */
async function ExpensesFromParams({
  searchParams,
}: Pick<PageProps<"/pengelola/biaya">, "searchParams">) {
  const { periode } = await searchParams;
  const period = typeof periode === "string" && isPeriod(periode) ? periode : null;
  return (
    <>
      <AppHeader title="Biaya dan nota" description={<ExpensesPeriodCaption period={period} />} />
      <ExpensesView period={period} />
    </>
  );
}

/**
 * Pencatatan biaya operasional dan unggah nota. Hash SHA-256 nota dicatat
 * on-chain lewat recordExpense; file notanya disimpan di backend. Tanpa
 * ?periode= backend memakai periode berjalan.
 */
export default function PengelolaExpensesPage({ searchParams }: PageProps<"/pengelola/biaya">) {
  return (
    <Suspense
      fallback={
        <>
          <AppHeader title="Biaya dan nota" description={kosSumbersari01.name} />
          <ExpensesSkeleton />
        </>
      }
    >
      <ExpensesFromParams searchParams={searchParams} />
    </Suspense>
  );
}
