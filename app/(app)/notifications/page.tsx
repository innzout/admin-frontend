"use client";

import { Bell, Briefcase, Building2, CalendarDays, ChevronRight, ClipboardCheck, Clock, ListChecks, TrendingUp, Users, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { useMarkAllNotificationsRead, useNotificationHasLink, useNotifications, useOpenNotification } from "@/hooks/use-notifications";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { EmptyState } from "@/components/common/empty-state";
import { QueryError } from "@/components/common/query-error";

const iconByType: Record<string, typeof Bell> = {
  employee: Users,
  department: Building2,
  lead: TrendingUp,
  task: ListChecks,
  task_review: ClipboardCheck,
  leave_request: CalendarDays,
  od_request: Briefcase,
  attendance_correction: Clock,
  payroll_run: Wallet,
};

export default function NotificationsPage() {
  const { data: notifications, isLoading, isError: notificationsFailed, refetch: notificationsRetry, isFetching: notificationsRetrying } = useNotifications();
  const openNotification = useOpenNotification();
  const hasLink = useNotificationHasLink();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        subtitle="Stay updated on all activity across your organization."
        action={
          <Button
            variant="outline"
            className="rounded-full"
            disabled={markAllRead.isPending || !notifications?.some((n) => !n.isRead)}
            onClick={() =>
              markAllRead.mutate(undefined, {
                onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update notifications"),
              })
            }
          >
            Mark all as read
          </Button>
        }
      />

      <div className="flex flex-col divide-y rounded-xl border bg-card">
        {notificationsFailed && !notifications ? (
        <QueryError what="notifications" onRetry={() => notificationsRetry()} retrying={notificationsRetrying} />
      ) : isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4">
              <Skeleton className="h-10 w-full" />
            </div>
          ))
        ) : notifications && notifications.length > 0 ? (
          notifications.map((n) => {
            const Icon = iconByType[n.relatedType ?? ""] ?? Bell;
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => openNotification(n)}
                className={cn("flex w-full items-start gap-3 p-4 text-left hover:bg-muted/40", !n.isRead && "bg-primary/[0.03]")}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-sm text-muted-foreground">{n.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  {!n.isRead && <span className="size-2 rounded-full bg-primary" />}
                  {hasLink(n) && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
                </div>
              </button>
            );
          })
        ) : (
          <EmptyState title="No notifications yet" hint="Approvals, new joiners and payroll updates will appear here." />
        )}
      </div>
    </div>
  );
}
