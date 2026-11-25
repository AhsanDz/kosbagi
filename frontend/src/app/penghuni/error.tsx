"use client";

import { RoleRouteError } from "@/components/common/route-error";

/** Galat di halaman penghuni (P5): sidebar, header, dan tombol menu tetap tampil. */
export default function PenghuniError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RoleRouteError role="penghuni" error={error} retry={retry} />;
}
