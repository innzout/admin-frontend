"use client";

import { useNotifications } from "@/hooks/use-notifications";
import { useLeaveRequests } from "@/hooks/use-leave";
import { useTasks } from "@/hooks/use-tasks";
import { useLeadSummary } from "@/hooks/use-company";
import { readSession } from "@/lib/session";
import { isStaffRole } from "@/lib/types";

/**
 * Badge counts for the sidebar, computed from the same data the target page
 * renders — never a second, independently-hardcoded number that can drift
 * out of sync with what the page actually shows.
 */
export function useNavBadges(): Record<string, number | undefined> {
  const { data: notifications } = useNotifications();
  const { data: leaveRequests } = useLeaveRequests({ status: "pending" });
  // Generous cap for a sidebar badge count, not a real page fetch — see Pagination for real list views.
  const { data: taskResult } = useTasks({ limit: 200 });
  const staff = isStaffRole(readSession().role);
  const { data: leadSummary } = useLeadSummary(!staff);
  const openTasks = taskResult?.tasks.filter((t) => t.status !== "completed" && t.status !== "cancelled").length;

  return {
    "/leads": staff ? undefined : leadSummary?.followUpsDue || undefined,
    "/tasks": openTasks,
    "/my-tasks": openTasks,
    "/leave": leaveRequests?.length,
    "/notifications": notifications?.filter((n) => !n.isRead).length,
  };
}
