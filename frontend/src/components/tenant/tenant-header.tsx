"use client";

import { AppHeader } from "@/components/app-shell/app-header";
import { useTenantBilling } from "@/components/tenant/tenant-billing-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { kosSumbersari01 } from "@/lib/data/properties";

/** Header halaman penghuni. Keterangan kamar datang dari API, jadi dimuat di klien. */
export function TenantHeader({ title }: { title: string }) {
  const { room, status } = useTenantBilling();

  if (status === "loading") {
    return <AppHeader title={title} description={<Skeleton className="mt-1 h-3.5 w-48" />} />;
  }

  return (
    <AppHeader
      title={title}
      description={room ? `Kamar ${room.number}, ${room.propertyName}` : kosSumbersari01.name}
    />
  );
}
