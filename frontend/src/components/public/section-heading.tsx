import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Judul bagian halaman publik: Archivo Black huruf kapital
 * (Figma: Display/Bagian 64/60 di desktop, Display/Bagian ponsel 36/36).
 */
export function SectionHeading({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        "font-display text-display-section-mobile font-black text-balance text-foreground uppercase md:text-display-mobile lg:text-display-section",
        className
      )}
    >
      {children}
    </h2>
  );
}
