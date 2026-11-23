import { cn } from "@/lib/utils";

/**
 * Garis sobek mendatar dengan dua takik berwarna latar halaman, seperti kuitansi
 * yang disobek (Figma: "Garis sobek" di Slip tagihan, Kuitansi sewa, Tiket beli).
 */
export function TearLine({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("relative h-0.5 shrink-0 text-border", className)}>
      <div className="dash-line h-[1.5px]" />
      <span className="absolute -top-[7px] -left-2 size-4 rounded-full bg-background" />
      <span className="absolute -top-[7px] -right-2 size-4 rounded-full bg-background" />
    </div>
  );
}
