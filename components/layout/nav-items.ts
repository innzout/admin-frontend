import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Handshake,
  TrendingUp,
  FolderKanban,
  ListChecks,
  Users,
  CalendarCheck,
  DoorOpen,
  Wallet,
  CreditCard,
  Receipt,
  Bell,
  Settings,
  ShieldCheck,
  GraduationCap,
  IndianRupee,
  GanttChart,
  ClipboardList,
  FileText,
  UsersRound,
  KeyRound,
  Building2,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Hidden from the sidebar for anyone but admin — see Sidebar's role filter. */
  adminOnly?: boolean;
  /** Who sees it: "all" logins, "mgmt" (admin/hr/manager — the default), or "staff" (employee/intern only). */
  audience?: "all" | "mgmt" | "staff";
  /** Also shown to Team Leads (delivery pages only; they never see CRM or finance). */
  teamLead?: boolean;
  /** Only interns see it (their own internship). */
  internOnly?: boolean;
}

export interface NavSection {
  label: string;
  /** Sections without items in this slice render collapsed with no content, matching the reference. */
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, audience: "all" },
      { label: "My Tasks", href: "/my-tasks", icon: ClipboardList, audience: "all" },
      { label: "My Internship", href: "/my-internship", icon: GraduationCap, internOnly: true },
      { label: "Timeline", href: "/timeline", icon: GanttChart, audience: "all" }],
  },
  {
    label: "CRM",
    items: [
      { label: "Clients", href: "/clients", icon: Handshake },
      { label: "Leads", href: "/leads", icon: TrendingUp },
      { label: "Projects", href: "/projects", icon: FolderKanban, teamLead: true },
      { label: "Tasks", href: "/tasks", icon: ListChecks, teamLead: true },
      { label: "Team Board", href: "/team", icon: UsersRound, teamLead: true },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Employees", href: "/employees", icon: Users },
      { label: "Departments", href: "/departments", icon: Building2 },
      { label: "Interns", href: "/interns", icon: GraduationCap, teamLead: true },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck, audience: "all" },
      { label: "Leave Management", href: "/leave", icon: DoorOpen, audience: "all" },
      { label: "Payroll", href: "/payroll", icon: Wallet, audience: "all" },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Payments", href: "/payments", icon: IndianRupee },
      { label: "Expenses", href: "/expenses", icon: Receipt, audience: "all" },
      { label: "Documents", href: "/documents", icon: FileText },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Notifications", href: "/notifications", icon: Bell, audience: "all" },
      { label: "Activity Log", href: "/audit-log", icon: ShieldCheck, adminOnly: true },
      { label: "Roles & Access", href: "/access", icon: KeyRound, adminOnly: true },
      { label: "Settings", href: "/settings", icon: Settings, adminOnly: true },
    ],
  },
];

import type { Role } from "@/lib/types";

/** Sidebar sections filtered for a login's role. */
export function navForRole(role: Role | ""): NavSection[] {
  const staff = role === "employee" || role === "intern";
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.adminOnly && role !== "admin") return false;
        if (item.internOnly) return role === "intern";
        const audience = item.audience ?? "mgmt";
        if (audience === "all") return true;
        if (role === "team_lead") return !!item.teamLead;
        return staff ? audience === "staff" : audience === "mgmt";
      }),
    }))
    .filter((section) => section.items.length > 0);
}
