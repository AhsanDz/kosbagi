"use client";

import useSWR from "swr";

import { expensesKey, fetchExpenses } from "@/lib/api/expenses";
import { fetchManagerRooms, managerRoomsKey } from "@/lib/api/manager";
import { kosSumbersari01 } from "@/lib/data/properties";
import { propertyPeriodCaption } from "@/lib/period";

/*
 * Keterangan header halaman pengelola. Tanpa ?periode= halaman tidak tahu
 * periodenya sampai backend menjawab, jadi keterangan dibaca dari kunci SWR yang
 * sama dengan isi halaman (tanpa permintaan tambahan).
 */

export function RoomsPeriodCaption({ period }: { period: string | null }) {
  const { data } = useSWR(managerRoomsKey(period), fetchManagerRooms);
  const shown = data?.period ?? period;
  return <>{shown ? propertyPeriodCaption(shown) : kosSumbersari01.name}</>;
}

export function ExpensesPeriodCaption({ period }: { period: string | null }) {
  const { data } = useSWR(expensesKey(period), fetchExpenses);
  const shown = data?.period ?? period;
  return <>{shown ? propertyPeriodCaption(shown) : kosSumbersari01.name}</>;
}
