import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  CaretRightIcon,
  CoinsIcon,
  DoorOpenIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "@phosphor-icons/react/ssr";

import type { DemoAccount } from "@/lib/data/demo-accounts";
import type { AppRole } from "@/lib/types";

const roleIcons: Record<AppRole, Icon> = {
  investor: CoinsIcon,
  penghuni: DoorOpenIcon,
  pengelola: WrenchIcon,
  admin: ShieldCheckIcon,
};

/**
 * Kartu peran di halaman Masuk (Figma: "Kartu peran"). Seluruh kartu bisa
 * diklik. Di progress 1 kartu langsung membuka app shell peran itu; mulai
 * progress 2 kartu ini masuk lewat API dengan akun demo.
 */
export function DemoAccountCard({ account }: { account: DemoAccount }) {
  const RoleIcon = roleIcons[account.role];

  return (
    <Link
      href={account.homeHref}
      className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-primary focus-visible:border-ring"
    >
      <RoleIcon aria-hidden className="size-6 shrink-0 text-foreground" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-h5 font-semibold">
          <span className="sr-only">Masuk sebagai </span>
          {account.roleLabel}
        </span>
        <span className="text-xs leading-4 font-medium text-muted-foreground">
          {account.cardAccount}
        </span>
        <span className="text-sm leading-5">{account.cardDescription}</span>
      </span>
      <CaretRightIcon
        aria-hidden
        className="size-[18px] shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
