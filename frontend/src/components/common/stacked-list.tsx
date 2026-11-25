import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/*
 * Daftar bertumpuk: pengganti tabel saat kartunya sempit (ponsel dan laptop
 * kecil), pola yang sama dengan Baris riwayat penghuni versi Ponsel. Setiap
 * tabel menentukan sendiri lebar kartu tempat ia berganti dari daftar ke tabel
 * lewat container query (@container pada kartu), sehingga tabel tidak pernah
 * menggulir mendatar dan kolom Aksi tidak tersembunyi di luar layar.
 */

/** Satu butir daftar: garis atas kecuali butir pertama, isi bertumpuk. */
export function StackedListItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <li
      className={cn(
        "flex min-w-0 flex-col gap-1.5 border-t border-border px-4 py-3.5 first:border-t-0",
        className
      )}
    >
      {children}
    </li>
  );
}

interface StackedListHeadProps {
  /** Judul butir, mis. jenis transaksi atau periode. */
  title: ReactNode;
  /** Nilai di kanan, biasanya nominal. */
  value?: ReactNode;
  /** Nilai ditulis redup, mis. "Belum dihitung". */
  valueMuted?: boolean;
}

/** Baris pertama butir: judul di kiri, nominal di kanan. */
export function StackedListHead({ title, value, valueMuted = false }: StackedListHeadProps) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm leading-5">
      <span className="min-w-0 font-semibold text-card-foreground">{title}</span>
      {value !== undefined ? (
        <span
          className={cn(
            "shrink-0 text-right tabular-nums",
            valueMuted ? "text-muted-foreground" : "font-medium text-card-foreground"
          )}
        >
          {value}
        </span>
      ) : null}
    </div>
  );
}

/** Keterangan kecil di bawah judul (tanggal, rincian, referensi). */
export function StackedListMeta({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("min-w-0 text-xs leading-4 text-muted-foreground", className)}>{children}</p>;
}
