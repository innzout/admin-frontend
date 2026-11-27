import type { AppNotification, Role } from "@/lib/types";
import { seesCompanyRecords } from "@/lib/types";

const isPeopleAdmin = (role: Role) => role === "admin" || role === "hr";

/**
 * Where a notification leads when clicked, from the record it is about.
 * Returns null when there is no screen for it, or the viewer's role can't
 * open that screen (the click then only marks it read).
 */
export function notificationHref(n: AppNotification, role: Role): string | null {
  const id = n.relatedId ? encodeURIComponent(n.relatedId) : "";
  switch (n.relatedType) {
    case "task_review":
      return id ? `/team?task=${id}` : "/team";
    case "task":
      return id ? `/my-tasks?task=${id}` : "/my-tasks";
    case "leave_request":
      return "/leave";
    case "od_request":
    case "attendance_correction":
      return "/attendance";
    case "payroll_run":
      return "/payroll";
    case "employee":
      return isPeopleAdmin(role) && id ? `/employees/${id}` : null;
    case "department":
      return isPeopleAdmin(role) ? "/departments" : null;
    case "lead":
      return seesCompanyRecords(role) ? "/leads" : null;
    default:
      return null;
  }
}
