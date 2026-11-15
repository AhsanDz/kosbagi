import type { Icon } from "@phosphor-icons/react";
import {
  ArrowsClockwiseIcon,
  CheckCircleIcon,
  ClockIcon,
  HourglassIcon,
  ReceiptIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import type { BillStatus } from "@/lib/types";

type BadgeVariant = "secondary" | "warning" | "info" | "success" | "destructive";

const statusMap: Record<BillStatus, { label: string; variant: BadgeVariant; icon: Icon }> = {
  UNPAID: { label: "Belum dibayar", variant: "secondary", icon: ReceiptIcon },
  PENDING: { label: "Menunggu pembayaran", variant: "warning", icon: HourglassIcon },
  CHECKING: { label: "Memeriksa pembayaran", variant: "info", icon: ArrowsClockwiseIcon },
  PAID: { label: "Lunas", variant: "success", icon: CheckCircleIcon },
  EXPIRED: { label: "Kedaluwarsa", variant: "destructive", icon: ClockIcon },
  FAILED: { label: "Gagal", variant: "destructive", icon: XCircleIcon },
  CANCELLED: { label: "Gagal", variant: "destructive", icon: XCircleIcon },
};

interface BillStatusBadgeProps {
  status: BillStatus;
  /** Sisa waktu pembayaran (batas 5 menit), mis. "04:12". Hanya untuk PENDING. */
  timeLeft?: string;
}

/** Badge status tagihan sewa atau pembelian token (Figma: "Status tagihan"). */
export function BillStatusBadge({ status, timeLeft }: BillStatusBadgeProps) {
  const { label, variant, icon: StatusIcon } = statusMap[status];
  return (
    <Badge variant={variant}>
      <StatusIcon aria-hidden />
      {label}
      {status === "PENDING" && timeLeft ? (
        <span className="font-mono font-normal tabular-nums">{timeLeft}</span>
      ) : null}
    </Badge>
  );
}
