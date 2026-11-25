"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowsClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { useSWRConfig } from "swr";

import { AppHeader } from "@/components/app-shell/app-header";
import { roleMenus } from "@/components/app-shell/role-menus";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { kosSumbersari01 } from "@/lib/data/properties";
import type { AppRole } from "@/lib/types";

interface RouteErrorProps {
  /** Nilai yang dilempar; dari Server Component berupa Error dengan digest. */
  error: unknown;
  /** retry() dari error.tsx Next.js: mengambil ulang dan merender ulang segmen. */
  retry: () => void;
  /** Jalan keluar bila memuat ulang tetap gagal, mis. /investor. */
  homeHref: string;
  /** Nama halaman itu dalam huruf kecil, mis. "ringkasan" atau "beranda". */
  homeName: string;
  /** "halaman" untuk halaman publik (gaya 404), "panel" di dalam app shell peran. */
  variant?: "halaman" | "panel";
}

/** Kode galat dari Next.js untuk dicocokkan dengan log server; isi pesan tidak ditampilkan. */
function errorDigest(error: unknown): string | null {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    return error.digest;
  }
  return null;
}

/**
 * Isi error.tsx (P5): tampil bila komponen halaman melempar galat yang tidak
 * tertangani state galat biasa, mis. data dari backend berbentuk tak terduga.
 * Tanpa ini Next.js menampilkan halaman galat bawaan berbahasa Inggris.
 * Pesan galat aslinya tidak ditampilkan karena bisa berisi rincian teknis.
 */
export function RouteError({ error, retry, homeHref, homeName, variant = "panel" }: RouteErrorProps) {
  const { mutate } = useSWRConfig();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    console.error(error);
  }, [error]);

  /*
   * retry() saja tidak cukup (temuan QA P5 R5): data dari backend disimpan di
   * cache SWR, jadi komponen yang dirender ulang langsung membaca data rusak
   * yang sama dan melempar galat lagi. Cache dikosongkan dulu tanpa meminta
   * ulang, supaya setelah retry() setiap halaman mengambil data baru.
   */
  async function handleRetry() {
    setRetrying(true);
    try {
      await mutate(() => true, undefined, { revalidate: false });
    } finally {
      setRetrying(false);
      retry();
    }
  }

  const digest = errorDigest(error);
  const actions = (
    <div className="flex flex-wrap gap-3">
      <Button
        type="button"
        variant={variant === "halaman" ? "default" : "outline"}
        disabled={retrying}
        aria-busy={retrying}
        onClick={() => void handleRetry()}
      >
        <ArrowsClockwiseIcon
          aria-hidden
          data-icon="inline-start"
          className={retrying ? "animate-spin" : undefined}
        />
        Muat ulang
      </Button>
      <Button asChild variant={variant === "halaman" ? "outline" : "ghost"}>
        <Link href={homeHref}>Ke {homeName}</Link>
      </Button>
    </div>
  );
  const digestNote = digest ? (
    <p className="font-mono text-xs leading-4 text-muted-foreground">Kode galat {digest}</p>
  ) : null;

  if (variant === "halaman") {
    return (
      <div role="alert" className="container-page flex flex-col items-start gap-5 py-20 lg:py-28">
        <h1 className="font-display text-display-section-mobile font-black text-foreground uppercase md:text-display-page">
          Halaman gagal ditampilkan
        </h1>
        <p className="max-w-[560px] text-base leading-6 text-muted-foreground md:text-lg md:leading-7">
          Ada galat saat menyiapkan halaman ini. Muat ulang halaman; bila masih gagal, kembali ke{" "}
          {homeName}.
        </p>
        <div className="pt-2">{actions}</div>
        {digestNote}
      </div>
    );
  }

  return (
    <div role="alert" className="rounded-xl bg-card text-card-foreground">
      <Empty className="rounded-xl border-0 px-6 py-10">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="text-destructive">
            <WarningCircleIcon aria-hidden />
          </EmptyMedia>
          <EmptyTitle className="mt-2">Halaman gagal ditampilkan</EmptyTitle>
          <EmptyDescription>
            Ada galat saat menyiapkan halaman ini. Muat ulang halaman; bila masih gagal, kembali ke{" "}
            {homeName}.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          {actions}
          {digestNote}
        </EmptyContent>
      </Empty>
    </div>
  );
}

/** Label menu yang sedang dibuka, mis. "Biaya dan nota" untuk /pengelola/biaya. */
function activeMenuLabel(role: AppRole, pathname: string): string {
  const { items } = roleMenus[role];
  const home = `/${role}`;
  const matches = items.filter((item) =>
    item.href === home
      ? pathname === home
      : pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const best = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return best?.label ?? items[0].label;
}

/**
 * Isi error.tsx halaman peran. AppHeader biasanya dirender page.tsx, yang ikut
 * terganti saat galat, sehingga di ponsel tombol menu ikut hilang (temuan QA
 * P5 R6). Di sini header dirender lagi dengan judul menu yang sedang dibuka,
 * jadi tombol menu, judul, dan tombol tema tetap ada di semua ukuran layar.
 */
export function RoleRouteError({
  role,
  error,
  retry,
}: {
  role: AppRole;
  error: unknown;
  retry: () => void;
}) {
  const pathname = usePathname() ?? `/${role}`;
  const home = roleMenus[role].items[0];

  return (
    <>
      <AppHeader title={activeMenuLabel(role, pathname)} description={kosSumbersari01.name} />
      <div className="p-4 md:p-8">
        <RouteError
          error={error}
          retry={retry}
          homeHref={home.href}
          homeName={home.label.toLowerCase()}
        />
      </div>
    </>
  );
}
