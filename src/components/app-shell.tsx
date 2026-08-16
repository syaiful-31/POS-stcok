"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  LayoutDashboard,
  LogOut,
  PackagePlus,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  UserCog,
  Users,
} from "lucide-react";
import { useStore } from "@/store/use-store";
import { APP_NAME, ROLE_LABELS } from "@/lib/constants";
import type { Role } from "@/store/types";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ShopSettingsDialog } from "@/components/shop-settings-dialog";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Rekap", icon: LayoutDashboard, roles: ["admin"] },
  { href: "/pos", label: "Kasir", icon: ShoppingCart, roles: ["admin", "kasir"] },
  { href: "/orders", label: "Riwayat Pesanan", icon: ReceiptText, roles: ["admin", "kasir"] },
  { href: "/customers", label: "Pelanggan", icon: Users, roles: ["admin", "kasir"] },
  { href: "/inventory", label: "Stok", icon: Boxes, roles: ["admin", "gudang"] },
  { href: "/suppliers", label: "Supplier", icon: Truck, roles: ["admin", "gudang"] },
  { href: "/purchases", label: "Pembelian", icon: PackagePlus, roles: ["admin", "gudang"] },
  { href: "/users", label: "Pengguna", icon: UserCog, roles: ["admin"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!user) return null; // AuthGuard sudah menangani

  const items = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const renderNav = (mobile = false) => (
    <nav className={cn("flex flex-col gap-1", mobile ? "flex-row overflow-x-auto p-2" : "px-3")}>
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              mobile && "shrink-0",
              active
                ? "bg-emerald-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const userMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5 text-left" />
        }
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-emerald-600 text-xs text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="hidden lg:block">
          <div className="text-sm font-medium leading-tight text-zinc-100">
            {user.name}
          </div>
          <div className="text-xs text-zinc-400">{ROLE_LABELS[user.role]}</div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="text-sm font-medium">{user.name}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {user.email} · {ROLE_LABELS[user.role]}
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {user.role === "admin" ? (
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Pengaturan Toko
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => void handleLogout()} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-zinc-900 md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Store className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-white">
              {APP_NAME}
            </div>
            <div className="text-[11px] text-zinc-400">Distributor FMCG</div>
          </div>
        </div>
        <Separator className="bg-zinc-800" />
        <div className="flex-1 overflow-y-auto py-4">{renderNav()}</div>
        <Separator className="bg-zinc-800" />
        <div className="p-3">{userMenu}</div>
      </aside>

      {/* Topbar (mobile) */}
      <div className="fixed inset-x-0 top-0 z-30 flex flex-col bg-zinc-900 md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <Store className="h-4 w-4" />
            </div>
            <span className="text-sm font-bold text-white">{APP_NAME}</span>
          </div>
          {userMenu}
        </div>
        <div className="border-t border-zinc-800">{renderNav(true)}</div>
      </div>

      {/* Konten */}
      <main className="min-w-0 flex-1 pt-[104px] md:ml-60 md:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>

      <ShopSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
