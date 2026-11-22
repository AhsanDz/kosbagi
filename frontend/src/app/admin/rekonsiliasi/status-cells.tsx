import type { Icon } from "@phosphor-icons/react";
import {
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  EyeIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { cn } from "@/lib/utils";

import type { ReconciliationRow } from "./api";

/**
 * Isi kolom Database, Sepolia, dan Hasil (Figma: komponen "Baris rekonsiliasi").
 * Ikon 16 px + label 14 px Medium. Merah hanya untuk sumber yang menyimpang;
 * status yang wajar (kedaluwarsa, dibatalkan, tidak dicatat) tetap netral.
 */

type Tone = "default" | "muted" | "destructive";

interface StatusView {
  icon: Icon;
  label: string;
  tone: Tone;
  /** Ditulis dengan huruf mono, untuk status yang belum punya label. */
  mono?: boolean;
}

const toneClass: Record<Tone, string> = {
  default: "text-card-foreground",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
};

const PAID_MIDTRANS = new Set(["settlement", "capture"]);

export function StatusLabel({ view, className }: { view: StatusView; className?: string }) {
  const { icon: StatusIcon, label, tone, mono } = view;
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", toneClass[tone], className)}>
      <StatusIcon aria-hidden className="size-4 shrink-0" />
      <span className={cn("truncate", mono ? "font-mono text-xs leading-4" : "text-sm leading-5 font-medium")}>
        {label}
      </span>
    </span>
  );
}

const databaseViews: Record<string, Omit<StatusView, "tone">> = {
  PAID: { icon: CheckCircleIcon, label: "Lunas" },
  PENDING: { icon: ClockIcon, label: "Belum dibayar" },
  EXPIRED: { icon: ClockIcon, label: "Kedaluwarsa" },
  FAILED: { icon: XCircleIcon, label: "Gagal" },
  DUPLICATE_PAID: { icon: WarningCircleIcon, label: "Lunas ganda" },
  UNFULFILLED: { icon: WarningCircleIcon, label: "Tidak terpenuhi" },
  NOT_FOUND: { icon: WarningCircleIcon, label: "Tidak dikenal" },
  // Skema v4 jalur 2: lunas setelah periode ditutup, dana perlu dikembalikan.
  PAID_AFTER_CLOSE: { icon: WarningCircleIcon, label: "Lunas telat" },
};

/** Database dianggap menyimpang bila ditandai backend, atau Midtrans lunas sedangkan database tidak. */
function databaseFlagged(row: ReconciliationRow): boolean {
  if (row.result === "MATCH") return false;
  return (
    row.flagged.includes("DATABASE") ||
    (row.database.status !== "PAID" && PAID_MIDTRANS.has(row.midtrans.status))
  );
}

export function databaseStatusView(row: ReconciliationRow): StatusView {
  const known = databaseViews[row.database.status];
  const flagged = databaseFlagged(row);
  if (!known) {
    // Status baru dari skema berikutnya: tampil apa adanya.
    return { icon: WarningCircleIcon, label: row.database.status, tone: flagged ? "destructive" : "default", mono: true };
  }
  return flagged
    ? { icon: WarningCircleIcon, label: known.label, tone: "destructive" }
    : { ...known, tone: "default" };
}

export function chainStatusView(row: ReconciliationRow): StatusView {
  const flagged = row.flagged.includes("CHAIN");
  switch (row.chain.status) {
    case "RECORDED":
      return flagged
        ? { icon: WarningCircleIcon, label: "Tercatat", tone: "destructive" }
        : { icon: CheckCircleIcon, label: "Tercatat", tone: "default" };
    case "PENDING":
      return row.chain.jobStatus === "FAILED"
        ? { icon: XCircleIcon, label: "Gagal dicatat", tone: "destructive" }
        : { icon: ClockIcon, label: "Menunggu pencatatan", tone: "default" };
    case "ERROR":
      return { icon: WarningCircleIcon, label: "Tidak terbaca", tone: "destructive" };
    case "NONE":
      return flagged
        ? { icon: WarningCircleIcon, label: "Tidak dicatat", tone: "destructive" }
        : { icon: EyeIcon, label: "Tidak dicatat", tone: "muted" };
  }
}

/** Status Midtrans ditulis apa adanya dalam huruf mono, sesuai keputusan desain P4. */
export function MidtransStatus({ status }: { status: string }) {
  return (
    <span className={cn("font-mono text-xs leading-4", status === "error" ? "text-destructive" : "text-card-foreground")}>
      {status}
    </span>
  );
}

/** Lencana Cocok (lime) atau Selisih (merah muda). */
export function ResultBadge({ result }: { result: ReconciliationRow["result"] }) {
  const match = result === "MATCH";
  const BadgeIcon = match ? CheckIcon : WarningCircleIcon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full py-1 pr-2.5 pl-2 text-xs leading-4 font-medium",
        match
          ? "bg-success-muted text-success-muted-foreground"
          : "bg-destructive-muted text-destructive-muted-foreground"
      )}
    >
      <BadgeIcon aria-hidden className="size-3.5" />
      {match ? "Cocok" : "Selisih"}
    </span>
  );
}
