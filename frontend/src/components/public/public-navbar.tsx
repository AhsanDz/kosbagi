"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ListIcon } from "@phosphor-icons/react/ssr";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { publicNavLinks } from "@/lib/site";
import { cn } from "@/lib/utils";

/** Tautan aktif ditentukan dari path; "Cara kerja" (anchor) tidak pernah aktif. */
function isActive(pathname: string, href: string): boolean {
  if (href.includes("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Navbar halaman publik (Figma: "Navigasi publik"). Sticky di atas.
 * Desktop: logo, empat tautan, toggle tema, tombol Masuk (satu-satunya tombol terisi).
 * Ponsel: tombol menu membuka Sheet berisi tautan yang sama.
 */
export function PublicNavbar({ showLogin = true }: { showLogin?: boolean }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="container-page flex h-16 items-center justify-between gap-4 lg:h-[76px]">
        <div className="flex items-center gap-14">
          <Logo />
          <nav aria-label="Navigasi utama" className="hidden lg:block">
            <ul className="flex items-center gap-9 text-sm leading-5">
              {publicNavLinks.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "rounded-sm transition-colors",
                        active
                          ? "font-semibold text-foreground underline decoration-1 underline-offset-4"
                          : "font-medium text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <ThemeToggle />
          {showLogin ? (
            <Button asChild>
              <Link href="/masuk">Masuk</Link>
            </Button>
          ) : null}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                <ListIcon aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(20rem,85vw)] gap-0 bg-background">
              <SheetHeader className="px-6 pt-6 pb-2">
                <SheetTitle className="text-h4">Menu</SheetTitle>
                <SheetDescription>Halaman publik KosBagi.</SheetDescription>
              </SheetHeader>
              <nav aria-label="Navigasi utama (ponsel)" className="px-3">
                <ul className="flex flex-col">
                  {publicNavLinks.map((link) => {
                    const active = isActive(pathname, link.href);
                    return (
                      <li key={link.href}>
                        <SheetClose asChild>
                          <Link
                            href={link.href}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-12 items-center rounded-md px-3 text-base transition-colors hover:bg-accent",
                              active ? "font-semibold text-foreground" : "font-medium"
                            )}
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      </li>
                    );
                  })}
                </ul>
              </nav>
              {showLogin ? (
                <div className="mt-auto p-6">
                  <SheetClose asChild>
                    <Button asChild className="w-full">
                      <Link href="/masuk">Masuk</Link>
                    </Button>
                  </SheetClose>
                </div>
              ) : null}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
