"use client";

import type { ComponentProps } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Penyedia tema terang/gelap dari next-themes.
 * - attribute="class": tema gelap = class "dark" di <html> (cocok dengan .dark di globals.css).
 * - defaultTheme="system": awalnya mengikuti pengaturan perangkat.
 * - next-themes menyisipkan skrip kecil di <head> yang memasang class sebelum
 *   halaman dilukis, jadi tidak ada kedipan tema saat muat.
 */
export function ThemeProvider(props: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Skrip tema hanya perlu berjalan dari HTML server. Di peramban jenisnya
      // diubah ke text/plain supaya React tidak memperingatkan tag <script>.
      scriptProps={{
        type: typeof window === "undefined" ? "text/javascript" : "text/plain",
      }}
      {...props}
    />
  );
}
