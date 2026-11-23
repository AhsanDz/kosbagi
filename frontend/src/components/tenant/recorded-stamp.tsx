import { cn } from "@/lib/utils";

interface RecordedStampProps {
  /** Miring 8 derajat seperti cap di Slip tagihan. Kuitansi dan Tiket beli memakai cap lurus. */
  rotated?: boolean;
  className?: string;
}

/**
 * Cap TERCATAT (Figma: "Cap tercatat"). Tampil hanya bila status on-chain
 * Tercatat, dan menjadi satu-satunya pemakaian Archivo di dalam aplikasi.
 * Hanya hiasan: informasinya sudah ada di Status on-chain.
 */
export function RecordedStamp({ rotated = true, className }: RecordedStampProps) {
  return (
    <p
      aria-hidden
      className={cn(
        "pointer-events-none rounded-md bg-success px-3.5 py-2 font-display text-display-stamp font-black whitespace-nowrap text-success-foreground uppercase",
        rotated && "-rotate-8",
        className
      )}
    >
      Tercatat
    </p>
  );
}
