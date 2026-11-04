import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

interface LogoProps {
  /**
   * "auto": di halaman publik; tanda berganti otomatis mengikuti tema.
   * "sidebar": di sidebar app shell yang selalu bertinta gelap.
   */
  surface?: "auto" | "sidebar";
  href?: string;
  className?: string;
}

/**
 * Logo KosBagi (Figma: komponen "Logo"): tanda rumah yang dibagi dua (tinta +
 * stabilo) dan wordmark Archivo ExtraBold 22 px. Tanda memakai dua file SVG
 * hasil ekspor Figma; CSS memilih versi terang atau gelap.
 */
export function Logo({ surface = "auto", href = "/", className }: LogoProps) {
  return (
    <Link
      href={href}
      aria-label="KosBagi, ke beranda"
      className={cn("inline-flex shrink-0 items-center gap-2 rounded-sm", className)}
    >
      {surface === "auto" ? (
        <>
          <Image
            src="/brand/kosbagi-mark.svg"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="size-7 dark:hidden"
          />
          <Image
            src="/brand/kosbagi-mark-dark.svg"
            alt=""
            width={28}
            height={28}
            unoptimized
            className="hidden size-7 dark:block"
          />
        </>
      ) : (
        <Image
          src="/brand/kosbagi-mark-dark.svg"
          alt=""
          width={28}
          height={28}
          unoptimized
          className="size-7"
        />
      )}
      <span
        aria-hidden
        className={cn(
          "font-display text-[22px] leading-[26px] font-extrabold tracking-[-0.03em]",
          surface === "sidebar" ? "text-sidebar-accent-foreground" : "text-foreground"
        )}
      >
        KosBagi
      </span>
    </Link>
  );
}
