import type { Metadata } from "next";
import { Suspense } from "react";

import { AppHeader } from "@/components/app-shell/app-header";
import { ManagerRooms, ManagerRoomsSkeleton } from "@/components/manager/manager-rooms";
import { RoomsPeriodCaption } from "@/components/manager/period-captions";
import { kosSumbersari01 } from "@/lib/data/properties";
import { isPeriod } from "@/lib/period";

export const metadata: Metadata = { title: "Status kamar" };

/** Membaca ?periode= dari URL. Dibungkus Suspense karena baru diketahui saat ada permintaan. */
async function RoomsFromParams({ searchParams }: Pick<PageProps<"/pengelola">, "searchParams">) {
  const { periode } = await searchParams;
  const period = typeof periode === "string" && isPeriod(periode) ? periode : null;
  return (
    <>
      <AppHeader title="Status kamar" description={<RoomsPeriodCaption period={period} />} />
      <ManagerRooms period={period} />
    </>
  );
}

/**
 * Status kamar untuk pengelola: sewa masuk, papan kamar, dan hal yang perlu
 * ditindaklanjuti. Tanpa ?periode= backend memakai periode berjalan (tagihan
 * terbaru); ?periode=2026-12 membuka periode lain.
 */
export default function PengelolaRoomsPage({ searchParams }: PageProps<"/pengelola">) {
  return (
    <Suspense
      fallback={
        <>
          <AppHeader title="Status kamar" description={kosSumbersari01.name} />
          <ManagerRoomsSkeleton />
        </>
      }
    >
      <RoomsFromParams searchParams={searchParams} />
    </Suspense>
  );
}
