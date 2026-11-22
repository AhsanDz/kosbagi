"use client";

import useSWR from "swr";

import { formatPeriod } from "@/lib/format";

import { fetchReconciliation, reconciliationKey } from "./api";

const PREFIX = "Midtrans, database, dan Sepolia untuk periode";

/**
 * Keterangan header saat halaman dibuka tanpa ?periode=. Periodenya ditentukan
 * backend (periode tagihan terbaru), jadi dibaca dari respons laporan yang sama
 * dengan tabel; SWR hanya mengirim satu permintaan untuk keduanya.
 */
export function PeriodDescription() {
  const { data } = useSWR(reconciliationKey(null, false), fetchReconciliation, {
    revalidateOnFocus: false,
  });
  return <>{data ? `${PREFIX} ${formatPeriod(data.period)}` : `${PREFIX} tagihan terbaru`}</>;
}
