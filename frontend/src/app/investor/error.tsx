"use client";

import { RoleRouteError } from "@/components/common/route-error";

/** Galat di halaman investor (P5): sidebar, header, dan tombol menu tetap tampil. */
export default function InvestorError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RoleRouteError role="investor" error={error} retry={retry} />;
}
