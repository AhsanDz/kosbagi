import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

interface TextLinkProps {
  href: string;
  children: ReactNode;
  /** true untuk tautan keluar (Etherscan, email): buka tab baru + ikon. */
  external?: boolean;
  className?: string;
}

/**
 * Tautan teks (Figma: komponen "Tautan"): warna primary, selalu bergaris bawah.
 * Tautan keluar diberi ikon arrow-square-out dan membuka tab baru.
 */
export function TextLink({ href, children, external = false, className }: TextLinkProps) {
  const classes = cn(
    "inline-flex items-center gap-1 rounded-sm text-sm leading-5 font-medium text-primary underline decoration-1 underline-offset-4 transition-[text-decoration-thickness] hover:decoration-2",
    className
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
        <ArrowSquareOutIcon aria-hidden className="size-3.5 shrink-0" />
        <span className="sr-only">(membuka tab baru)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
