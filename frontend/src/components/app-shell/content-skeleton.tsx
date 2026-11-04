import { Skeleton } from "@/components/ui/skeleton";

const rows = ["baris-1", "baris-2", "baris-3", "baris-4", "baris-5"];

/**
 * Isi area konten app shell di progress 1 (Figma: App shell / Default, "Konten
 * (memuat)"): kerangka tiga kartu statistik dan satu tabel. Halaman sungguhan
 * per peran dibangun di progress 2 sampai 4 sesuai desainnya.
 */
export function ContentSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-6 p-4 md:p-8">
      <p className="sr-only">Isi halaman ini sedang disiapkan dan dibangun di progress berikutnya.</p>
      <div className="grid gap-6 sm:grid-cols-3">
        {["kartu-1", "kartu-2", "kartu-3"].map((key) => (
          <div
            key={key}
            className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5"
          >
            <Skeleton className="h-3.5 w-30" />
            <Skeleton className="h-7.5 w-40 max-w-full" />
            <Skeleton className="h-3 w-50 max-w-full" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="px-4 pt-5 pb-3">
          <Skeleton className="h-5 w-55 max-w-full" />
        </div>
        {rows.map((key) => (
          <div key={key} className="flex h-[52px] items-center gap-8 border-b border-border px-4 last:border-b-0">
            <Skeleton className="h-3 w-50" />
            <Skeleton className="h-3 w-22.5" />
            <Skeleton className="hidden h-3 w-27.5 sm:block" />
            <Skeleton className="hidden h-3 w-35 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
