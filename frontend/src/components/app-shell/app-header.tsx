import type { ReactNode } from "react";
import { BuildingsIcon } from "@phosphor-icons/react/ssr";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { kosSumbersari01 } from "@/lib/data/properties";

/**
 * Header area konten app shell. Desktop mengikuti "Header aplikasi": judul
 * halaman (h1) dan keterangan di kiri, cip token properti di kanan. Ponsel
 * mengikuti "Header ponsel": tombol menu 44 px yang membuka Sheet sidebar.
 * Tombol tema tetap ada di ponsel karena tidak punya tempat lain.
 */
export function AppHeader({ title, description }: { title: string; description: ReactNode }) {
  const property = kosSumbersari01;

  return (
    <header className="flex items-center justify-between gap-2 border-b border-border bg-card py-3 pr-4 pl-2 md:gap-4 md:px-8 md:py-4">
      <div className="flex min-w-0 items-center gap-1">
        <SidebarTrigger
          size="icon-lg"
          className="md:hidden [&_svg:not([class*='size-'])]:size-[22px]"
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-h4 font-semibold text-foreground md:text-h3">{title}</h1>
          <div className="min-h-5 text-sm leading-5 text-muted-foreground">{description}</div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 lg:flex">
          <BuildingsIcon aria-hidden className="size-4 shrink-0" />
          <span className="text-sm leading-5 font-medium text-foreground">{property.name}</span>
          <span className="font-mono text-xs leading-4 text-muted-foreground">
            {property.tokenSymbol}
          </span>
        </p>
        <ThemeToggle />
      </div>
    </header>
  );
}
