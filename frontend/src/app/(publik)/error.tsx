"use client";

import { RouteError } from "@/components/common/route-error";

/** Galat di halaman publik (P5): navbar dan footer tetap tampil. */
export default function PublicError({ error, retry }: { error: unknown; retry: () => void }) {
  return <RouteError error={error} retry={retry} homeHref="/" homeName="beranda" variant="halaman" />;
}
