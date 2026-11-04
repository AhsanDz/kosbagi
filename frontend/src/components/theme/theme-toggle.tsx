"use client";

import { MoonIcon, SunIcon } from "@phosphor-icons/react/ssr";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Tombol ikon kecil untuk berganti tema terang/gelap.
 * Kedua ikon selalu dirender; CSS (varian dark:) memilih yang tampil,
 * jadi HTML server dan peramban selalu sama (tidak ada hydration mismatch).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("text-current", className)}
      aria-label="Ganti tema terang atau gelap"
      title="Ganti tema terang atau gelap"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      <MoonIcon aria-hidden className="dark:hidden" />
      <SunIcon aria-hidden className="hidden dark:block" />
    </Button>
  );
}
