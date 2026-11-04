import { BuildingsIcon } from "@phosphor-icons/react/ssr";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { kosSumbersari01 } from "@/lib/data/properties";

/**
 * Header area konten app shell (Figma: "Header aplikasi"): judul halaman (h1)
 * dan keterangan di kiri, identitas token properti + toggle tema di kanan.
 * Di ponsel ada tombol menu untuk membuka sidebar.
 */
export function AppHeader({ title, description }: { title: string; description: string }) {
  const property = kosSumbersari01;

  return (
    <header className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-4 md:px-8">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="-ml-2 md:hidden" />
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="text-h4 font-semibold text-foreground md:text-h3">{title}</h1>
          <p className="text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <p className="hidden items-center gap-2 rounded-full border border-border px-3 py-2 sm:flex">
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
