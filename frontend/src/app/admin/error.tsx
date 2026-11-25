"use client";

import { RoleRouteError } from "@/components/common/route-error";

/** Galat di halaman admin (P5): sidebar, header, dan tombol menu tetap tampil. */
export default function AdminError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RoleRouteError role="admin" error={error} retry={retry} />;
}
