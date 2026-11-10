"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { navForRole } from "@/components/layout/nav-items";
import { isStaffRole } from "@/lib/types";
import { isLoggedIn } from "@/lib/session";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";
import { useMe } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { Topbar } from "@/components/layout/topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const loggedIn = useIsLoggedIn();
  const { data: me, isLoading: meLoading } = useMe();
  const mustResetPassword = me?.mustResetPassword === true;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  // Employee/intern logins only get their own workspace — bounce direct
  // URL visits to management pages (the API refuses them anyway).
  const staffBlocked =
    !!me &&
    isStaffRole(me.role) &&
    !navForRole(me.role)
      .flatMap((s) => s.items)
      .some((i) => pathname === i.href || pathname.startsWith(i.href + "/")) &&
    pathname !== "/change-password";

  useEffect(() => {
    if (!loggedIn) {
      // useIsLoggedIn reports false on the hydration pass even with a valid
      // token — check storage directly so a hard refresh doesn't bounce to login.
      if (!isLoggedIn()) router.replace("/login");
      return;
    }
    // Block everything else until a temp/forced password is replaced —
    // otherwise every screen behind the sidebar is reachable while the
    // account is still on a one-time password (see auth/service.go
    // CreateEmployeeLogin, which always sets mustResetPassword=true).
    if (!meLoading && mustResetPassword) {
      router.replace("/change-password");
    }
    if (staffBlocked) router.replace("/my-tasks");
  }, [loggedIn, meLoading, mustResetPassword, staffBlocked, router]);

  if (!loggedIn) return null;
  // Wait for the reset-flag check before ever painting the app shell — a
  // brief blank beat here beats letting a forced-reset user see (and use)
  // the full app for a frame before being bounced out.
  if (meLoading || mustResetPassword || staffBlocked) return null;

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <MobileSidebar open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
