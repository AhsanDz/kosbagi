import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DataRow {
  label: ReactNode;
  value: ReactNode;
  /** Nilai memakai Geist Mono (hash, nomor identitas, alamat dompet). */
  mono?: boolean;
}

interface DataRowsProps {
  rows: DataRow[];
  /** Garis tipis di antara baris (Kartu status KYC, Sheet tinjau). */
  divided?: boolean;
  className?: string;
}

/**
 * Daftar label dan nilai (baris "Nama lengkap ... Dimas Pratama" di Figma).
 * Label rata kiri berwarna muted, nilai rata kanan dan boleh membungkus.
 */
export function DataRows({ rows, divided = false, className }: DataRowsProps) {
  return (
    <dl className={cn("flex w-full flex-col text-sm leading-5", !divided && "gap-3", className)}>
      {rows.map((row, index) => (
        <div
          // Baris statis yang urutannya tidak berubah, jadi indeks aman sebagai kunci.
          key={index}
          className={cn(
            "flex items-start justify-between gap-4",
            divided && "border-t border-border py-[11px] first:border-t-0"
          )}
        >
          <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
          <dd
            className={cn(
              "min-w-0 text-right break-words text-card-foreground",
              row.mono ? "font-mono" : "font-medium"
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
