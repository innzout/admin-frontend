"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KeyRound, LogOut, Menu, Search, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { NotificationDropdown } from "@/components/layout/notification-dropdown";
import { useLogout } from "@/hooks/use-auth";
import { useCompanyName } from "@/hooks/use-settings";
import { readSession } from "@/lib/session";
import { navSections } from "./nav-items";

const allItems = navSections.flatMap((s) => s.items);

export function Topbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const logout = useLogout();
  const session = readSession();
  const companyName = useCompanyName() || "…";

  const currentLabel = allItems.find((i) => pathname === i.href || pathname.startsWith(i.href + "/"))?.label ?? "";

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <Button variant="ghost" size="icon" className="shrink-0 md:hidden" onClick={onMenuClick} aria-label="Open menu">
        <Menu className="size-5" />
      </Button>

      <nav className="hidden shrink-0 items-center gap-1.5 text-sm sm:flex">
        <span className="text-muted-foreground">{companyName}</span>
        {currentLabel && (
          <>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-medium">{currentLabel}</span>
          </>
        )}
      </nav>

      <div className="relative mx-auto max-w-md flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search anything…" className="rounded-full bg-muted/60 pl-9" />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ThemeToggle />

        <NotificationDropdown />

        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="rounded-full" />}>
            <AvatarInitials name={session.name || session.email} className="size-8" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-medium">{session.name}</span>
              <span className="text-xs font-normal text-muted-foreground">{session.email}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <UserIcon className="size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/change-password" />}>
              <KeyRound className="size-4" />
              Change Password
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => logout.mutate()} variant="destructive">
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
