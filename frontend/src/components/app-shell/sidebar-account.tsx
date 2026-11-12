import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionUser } from "@/lib/api/types";
import { findDemoAccountByEmail, getDemoAccount } from "@/lib/data/demo-accounts";
import type { AppRole } from "@/lib/types";

/** "Sari Wulandari" -> "SW". */
function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

/** Blok akun di kaki sidebar: inisial, nama, dan keterangan pengguna dari sesi. */
export function SidebarAccount({ role, user }: { role: AppRole; user: SessionUser }) {
  const caption =
    findDemoAccountByEmail(user.email)?.sidebarCaption ??
    `Akun dummy · ${getDemoAccount(role).roleLabel}`;

  return (
    <div className="flex items-center gap-3 pl-2">
      <Avatar>
        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm leading-5 font-semibold text-sidebar-accent-foreground">
          {user.name}
        </span>
        <span className="truncate text-xs leading-4 text-sidebar-muted-foreground">{caption}</span>
      </div>
    </div>
  );
}

/** Pengganti blok akun selama sesi dimuat atau backend tidak bisa dihubungi. */
export function SidebarAccountSkeleton() {
  return (
    <div className="flex items-center gap-3 pl-2">
      <Skeleton className="size-8 shrink-0 rounded-full bg-sidebar-accent" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-3.5 w-28 bg-sidebar-accent" />
        <Skeleton className="h-3 w-36 max-w-full bg-sidebar-accent" />
      </div>
    </div>
  );
}
