import type { Metadata, Viewport } from "next";
import { Archivo, Geist, Geist_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";

import "./globals.css";

// Font lewat next/font: diunduh saat build lalu disajikan sendiri (tanpa
// permintaan ke Google saat halaman dibuka). Masing-masing jadi variabel CSS.
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  weight: ["800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name}: ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ecede8" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f0c" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // next-themes mengubah class <html> sebelum hidrasi, jadi peringatannya diredam.
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(geist.variable, geistMono.variable, archivo.variable)}
    >
      <body className="min-h-svh">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
