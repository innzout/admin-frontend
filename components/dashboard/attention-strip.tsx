"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { CalendarClock, CheckCircle2, ClipboardCheck, DoorOpen, FileText, GraduationCap, PhoneCall, Receipt, TimerOff } from "lucide-react";
import { useLeaveRequests } from "@/hooks/use-leave";
import { useOdRequests } from "@/hooks/use-od";
import { useInvoices } from "@/hooks/use-invoices";
import { useExpenses } from "@/hooks/use-expenses";
import { useDocuments } from "@/hooks/use-documents";
import { useLeadSummary } from "@/hooks/use-company";
import { useInternSummary } from "@/hooks/use-interns";
import { useTeamLoad } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";

interface Item {
  count: number | undefined;
  label: string;
  href: string;
  icon: LucideIcon;
  urgent?: boolean;
}

/**
 * "Needs attention" row on the management dashboard: every queue that is
 * waiting on someone, from live data. Items with nothing waiting are hidden.
 */
export function AttentionStrip() {
  const { data: leave } = useLeaveRequests({ status: "pending" });
  const { data: od } = useOdRequests({ status: "pending" });
  const { data: overdueInvoices } = useInvoices({ status: "overdue", limit: 1 });
  const { data: pendingExpenses } = useExpenses({ status: "pending", limit: 1 });
  const { data: drafts } = useDocuments({ status: "draft", limit: 1 });
  const { data: leads } = useLeadSummary(true);
  const { data: interns } = useInternSummary();
  const { data: team } = useTeamLoad();

  const sum = (key: "overdue" | "inReview") => team?.reduce((n, m) => n + m[key], 0);

  const items: Item[] = [
    { count: sum("overdue"), label: "overdue tasks", href: "/team", icon: TimerOff, urgent: true },
    { count: overdueInvoices?.total, label: "overdue invoices", href: "/billing", icon: Receipt, urgent: true },
    { count: sum("inReview"), label: "tasks waiting for your review", href: "/team", icon: ClipboardCheck },
    { count: leave?.length, label: "leave requests to approve", href: "/leave", icon: DoorOpen },
    { count: od?.length, label: "on-duty requests to approve", href: "/attendance", icon: CalendarClock },
    { count: pendingExpenses?.total, label: "expenses to review", href: "/expenses", icon: Receipt },
    { count: leads?.followUpsDue, label: "lead follow-ups due", href: "/leads", icon: PhoneCall },
    { count: interns?.endingSoon, label: "internships ending in 30 days", href: "/interns", icon: GraduationCap },
    { count: drafts?.total, label: "document drafts not issued", href: "/documents", icon: FileText },
  ];

  const loading = items.some((i) => i.count === undefined);
  const due = items.filter((i) => (i.count ?? 0) > 0);

  if (loading) return null;
  if (due.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300">
        <CheckCircle2 className="size-4" /> All clear — nothing is waiting on you.
      </div>
    );
  }

  return (
    <section aria-label="Needs attention" className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Needs attention</h2>
      <div className="flex flex-wrap gap-2">
        {due.map((i) => (
          <Link
            key={i.label}
            href={i.href}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              i.urgent
                ? "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
                : "border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300",
            )}
          >
            <i.icon className="size-4 shrink-0" />
            <b className="tabular-nums">{i.count}</b> {i.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
