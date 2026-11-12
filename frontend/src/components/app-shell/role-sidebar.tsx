"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildingsIcon, SignOutIcon } from "@phosphor-icons/react/ssr";

import { roleMenus } from "@/components/app-shell/role-menus";
import { Logo } from "@/components/brand/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/lib/api/session";
import { kosSumbersari01 } from "@/lib/data/properties";
import type { AppRole } from "@/lib/types";

/** Menu aktif: halaman awal peran harus sama persis, halaman lain boleh punya subhalaman. */
function isActive(pathname: string, href: string, roleHome: string) {
  if (href === roleHome) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface RoleSidebarProps {
  role: AppRole;
  /** Blok akun, dirender di server karena membaca sesi. */
  account: ReactNode;
}

/**
 * Sidebar app shell per peran (Figma: "Sidebar"): logo dan properti di atas,
 * menu peran, lalu blok akun + Keluar di bawah. Di layar < 768 px sidebar ini
 * otomatis menjadi Sheet yang dibuka dari tombol menu di header.
 */
export function RoleSidebar({ role, account }: RoleSidebarProps) {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const [signingOut, setSigningOut] = useState(false);
  const menu = roleMenus[role];
  const roleHome = menu.items[0]?.href ?? `/${role}`;
  const closeMobile = () => setOpenMobile(false);

  function handleSignOut() {
    setSigningOut(true);
    void signOut();
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <Logo surface="sidebar" href="/" />
        <p className="flex items-center gap-2 text-xs leading-4 font-medium text-sidebar-muted-foreground">
          <BuildingsIcon aria-hidden className="size-3.5 shrink-0" />
          {kosSumbersari01.name}
        </p>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{menu.groupLabel}</SidebarGroupLabel>
          <nav aria-label={menu.groupLabel}>
            <SidebarMenu>
              {menu.items.map((item) => {
                const active = isActive(pathname, item.href, roleHome);
                const ItemIcon = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        onClick={closeMobile}
                      >
                        <ItemIcon aria-hidden />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        {account}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton disabled={signingOut} onClick={handleSignOut}>
              <SignOutIcon aria-hidden />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
