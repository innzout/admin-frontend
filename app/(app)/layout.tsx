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
import { Button } from "@/components/ui/button";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const loggedIn = useIsLoggedIn();
  const { data: me, isLoading: meLoading, isError: meFailed, refetch: refetchMe, isFetching: meRetrying } = useMe();
  const mustResetPassword = me?.mustResetPassword === true;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = usePathname();
  // Every role may open only the pages in its own sidebar. A typed URL to
  // anything else (Settings for HR, Payroll runs for staff…) bounces home.
  // The API refuses those calls anyway; this keeps the screen from showing.
  const pageBlocked =
    !!me &&
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
    if (pageBlocked) router.replace(isStaffRole(me?.role) ? "/my-tasks" : "/dashboard");
  }, [loggedIn, meLoading, mustResetPassword, pageBlocked, me?.role, router]);

  if (!loggedIn) return null;
  // Wait for the reset-flag check before ever painting the app shell — a
  // brief blank beat here beats letting a forced-reset user see (and use)
  // the full app for a frame before being bounced out.
  if (meLoading || mustResetPassword || pageBlocked) return null;
  // Without the profile no page knows the role, so every screen would render
  // empty. Say so and offer a retry instead (a lost session already went to
  // /login inside api()).
  if (!me) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="font-heading text-lg font-semibold">Can&apos;t reach the server</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          {meFailed ? "Check your connection, then try again." : "Loading your profile…"}
        </p>
        {meFailed && (
          <Button variant="outline" disabled={meRetrying} onClick={() => refetchMe()}>
            {meRetrying ? "Retrying…" : "Try again"}
          </Button>
        )}
      </div>
    );
  }

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
