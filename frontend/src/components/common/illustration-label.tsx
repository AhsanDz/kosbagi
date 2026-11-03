import { cn } from "@/lib/utils";

/**
 * Label "Foto ilustrasi" yang selalu tampil di atas foto kos buatan AI
 * (wajib menurut serah terima desain), supaya pengunjung tidak mengira
 * foto itu foto properti sebenarnya.
 */
export function IllustrationLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute bottom-3 left-3 rounded-full bg-card/90 px-2.5 py-1 text-xs leading-4 font-medium text-card-foreground",
        className
      )}
    >
      Foto ilustrasi
    </span>
  );
}
