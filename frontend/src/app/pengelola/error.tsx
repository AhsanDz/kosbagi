"use client";

import { RoleRouteError } from "@/components/common/route-error";

/** Galat di halaman pengelola (P5): sidebar, header, dan tombol menu tetap tampil. */
export default function PengelolaError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RoleRouteError role="pengelola" error={error} retry={retry} />;
}
