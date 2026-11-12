import type { Icon } from "@phosphor-icons/react";
import {
  CaretRightIcon,
  CircleNotchIcon,
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

interface DemoAccountCardProps {
  account: DemoAccount;
  /** Kartu ini sedang memproses masuk. */
  pending: boolean;
  /** Ada proses masuk yang sedang berjalan, dari kartu ini atau kartu lain. */
  disabled: boolean;
  onSelect: (account: DemoAccount) => void;
}

/**
 * Kartu peran di halaman Masuk (Figma: "Kartu peran"). Seluruh kartu adalah
 * tombol yang masuk lewat API dengan akun demo peran itu.
 */
export function DemoAccountCard({ account, pending, disabled, onSelect }: DemoAccountCardProps) {
  const RoleIcon = roleIcons[account.role];

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={pending}
      onClick={() => onSelect(account)}
      className="group flex w-full items-start gap-4 rounded-xl border border-border bg-card p-5 text-left text-card-foreground transition-colors hover:border-primary focus-visible:border-ring disabled:cursor-not-allowed disabled:hover:border-border"
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
      {pending ? (
        <CircleNotchIcon
          aria-hidden
          className="size-[18px] shrink-0 animate-spin text-muted-foreground"
        />
      ) : (
        <CaretRightIcon
          aria-hidden
          className="size-[18px] shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      )}
    </button>
  );
}
