import type { Icon } from "@phosphor-icons/react";
import {
  CalendarBlankIcon,
  ChartPieSliceIcon,
  CoinsIcon,
  FileTextIcon,
  HouseIcon,
  ReceiptIcon,
  ScalesIcon,
  ShieldCheckIcon,
  SquaresFourIcon,
} from "@phosphor-icons/react/ssr";

import type { AppRole } from "@/lib/types";

export interface RoleMenuItem {
  href: string;
  label: string;
  icon: Icon;
}

export interface RoleMenu {
  /** Label grup di sidebar, mis. "Menu investor". */
  groupLabel: string;
  items: RoleMenuItem[];
}

/**
 * Menu sidebar per peran (Figma: komponen "Sidebar"). Halaman yang isinya
 * dibangun di progress berikutnya sudah punya rute dengan tampilan memuat.
 * /admin/rekonsiliasi dikerjakan jalur 1 di progress 4.
 */
export const roleMenus: Record<AppRole, RoleMenu> = {
  investor: {
    groupLabel: "Menu investor",
    items: [
      { href: "/investor", label: "Ringkasan", icon: HouseIcon },
      { href: "/investor/penawaran", label: "Penawaran", icon: CoinsIcon },
      { href: "/investor/portofolio", label: "Portofolio", icon: ChartPieSliceIcon },
      { href: "/investor/kyc", label: "Verifikasi KYC", icon: ShieldCheckIcon },
    ],
  },
  penghuni: {
    groupLabel: "Menu penghuni",
    items: [
      { href: "/penghuni", label: "Ringkasan", icon: HouseIcon },
      { href: "/penghuni/tagihan", label: "Tagihan", icon: ReceiptIcon },
    ],
  },
  pengelola: {
    groupLabel: "Menu pengelola",
    items: [
      { href: "/pengelola", label: "Status kamar", icon: SquaresFourIcon },
      { href: "/pengelola/biaya", label: "Biaya dan nota", icon: FileTextIcon },
    ],
  },
  admin: {
    groupLabel: "Menu admin",
    items: [
      { href: "/admin", label: "Ringkasan", icon: HouseIcon },
      { href: "/admin/kyc", label: "Verifikasi KYC", icon: ShieldCheckIcon },
      { href: "/admin/periode", label: "Tutup periode", icon: CalendarBlankIcon },
      { href: "/admin/rekonsiliasi", label: "Rekonsiliasi", icon: ScalesIcon },
    ],
  },
};
