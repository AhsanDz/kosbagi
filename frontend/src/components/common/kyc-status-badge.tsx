import type { Icon } from "@phosphor-icons/react";
import {
  HourglassIcon,
  ShieldCheckIcon,
  UserIcon,
  XCircleIcon,
} from "@phosphor-icons/react/ssr";

import { Badge } from "@/components/ui/badge";
import type { KycStatus } from "@/lib/api/types";

type BadgeVariant = "secondary" | "info" | "success" | "destructive";

/** Investor tanpa pengajuan dianggap NONE (Figma: Belum mengajukan). */
export type KycBadgeStatus = KycStatus | "NONE";

const statusMap: Record<KycBadgeStatus, { label: string; variant: BadgeVariant; icon: Icon }> = {
  NONE: { label: "Belum mengajukan", variant: "secondary", icon: UserIcon },
  SUBMITTED: { label: "Diajukan", variant: "info", icon: HourglassIcon },
  APPROVED: { label: "Disetujui", variant: "success", icon: ShieldCheckIcon },
  REJECTED: { label: "Ditolak", variant: "destructive", icon: XCircleIcon },
};

/**
 * Badge status KYC (Figma: "Status KYC"). Disetujui memakai lime karena menjadi
 * bukti lolos KYC, sesuai aturan lime hanya untuk bukti.
 */
export function KycStatusBadge({ status }: { status: KycBadgeStatus }) {
  const { label, variant, icon: StatusIcon } = statusMap[status];
  return (
    <Badge variant={variant}>
      <StatusIcon aria-hidden />
      {label}
    </Badge>
  );
}
