"use client";

import Link from "next/link";
import { Bell, Building2, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from "@/hooks/use-notifications";
import { ApiError } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const iconByType: Record<string, typeof Bell> = {
  employee: Users,
  department: Building2,
  lead: TrendingUp,
};

/**
 * Bell icon opens an in-place preview of recent notifications instead of
 * just navigating to /notifications — the bell previously only linked away,
 * which read as "nothing happens" to users expecting a dropdown.
 */
export function NotificationDropdown() {
  const { data: notifications } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const recent = (notifications ?? []).slice(0, 8);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative text-muted-foreground" aria-label="Notifications" />}>
        <Bell className="size-4" />
        {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-destructive" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between gap-2 p-3">
          <DropdownMenuLabel className="p-0 font-medium">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={markAllRead.isPending}
              onClick={(e) => {
                e.preventDefault();
                markAllRead.mutate(undefined, {
                  onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update notifications"),
                });
              }}
            >
              Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />

        <div className="max-h-80 overflow-y-auto">
          {recent.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>}
          {recent.map((n) => {
            const Icon = iconByType[n.relatedType ?? ""] ?? Bell;
            return (
              <DropdownMenuItem
                key={n.id}
                className={cn("flex items-start gap-3 rounded-none px-3 py-2.5", !n.isRead && "bg-primary/[0.04]")}
                onSelect={() => !n.isRead && markRead.mutate(n.id)}
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
                {!n.isRead && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
              </DropdownMenuItem>
            );
          })}
        </div>

        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem render={<Link href="/notifications" />} className="justify-center rounded-none py-2.5 text-sm font-medium">
          View all notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
