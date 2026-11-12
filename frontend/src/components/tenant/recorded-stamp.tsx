import { cn } from "@/lib/utils";

/**
 * Cap TERCATAT (Figma: "Cap tercatat"). Tampil hanya bila status on-chain
 * Tercatat, dan menjadi satu-satunya pemakaian Archivo di dalam aplikasi.
 * Hanya hiasan: informasinya sudah ada di Status on-chain.
 */
export function RecordedStamp({ className }: { className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(
        "pointer-events-none -rotate-8 rounded-md bg-success px-3.5 py-2 font-display text-display-stamp font-black whitespace-nowrap text-success-foreground uppercase",
        className
      )}
    >
      Tercatat
    </p>
  );
}
