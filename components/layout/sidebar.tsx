"use client";

import { LogOut } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { useLogout } from "@/hooks/use-auth";
import { useNavBadges } from "@/hooks/use-nav-badges";
import { readSession } from "@/lib/session";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { Button } from "@/components/ui/button";
import { navForRole } from "./nav-items";
import { isStaffRole } from "@/lib/types";
import { NavSectionGroup } from "./nav-section";

const OPEN_BY_DEFAULT = new Set(["Overview", "CRM", "People", "Operations", "Workspace"]);

/** The sidebar's actual content — shared between the fixed desktop rail and the mobile Sheet. */
export function SidebarContent() {
  const session = readSession();
  const logout = useLogout();
  const badges = useNavBadges();
  const isStaff = isStaffRole(session.role);
  const visibleSections = navForRole(session.role);

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <BrandLogo subtitle={isStaff ? "My Workspace" : "Admin Portal"} />
      </div>

      <nav className="flex-1 space-y-3 overflow-y-auto px-2 py-3">
        {visibleSections.map((section) => (
          <NavSectionGroup
            key={section.label}
            section={section}
            defaultOpen={OPEN_BY_DEFAULT.has(section.label)}
            badges={badges}
          />
        ))}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-sidebar-border p-3">
        <AvatarInitials name={session.name || session.email} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{session.name || "—"}</p>
          <p className="truncate text-xs text-sidebar-foreground/50">{session.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0 text-sidebar-foreground/50 hover:text-sidebar-foreground"
          aria-label="Log out"
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  return (
    // Always dark, independent of the light/dark theme toggle — matches the
    // reference design, which keeps the nav rail dark in both modes.
    <aside className="dark sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border md:flex">
      <SidebarContent />
    </aside>
  );
}
