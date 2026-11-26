import type { Role } from "@/lib/types";

// What each role may do, for the Roles & Access page. This is documentation of
// the rules the API enforces — it does not grant anything. Keep it in sync with
// the backend: middleware.RequireRole / ManagementRoles in cmd/api/main.go, the
// per-module RequireRole groups, and the row-level checks in the leave, OD and
// expense services: whoever is set as a person's reporting manager may decide
// that person's requests, whatever their own role.

export const ROLES: { role: Role; label: string; summary: string }[] = [
  { role: "admin", label: "Admin", summary: "Everything, including company settings and the activity log." },
  { role: "hr", label: "HR", summary: "People, payroll and approvals, plus CRM and finance. No company settings." },
  { role: "manager", label: "Manager", summary: "CRM, projects, tasks and finance. Approves leave and expenses for people who report to them." },
  { role: "team_lead", label: "Team Lead", summary: "Runs projects, tasks and the Team Board. Approves leave and expenses for people who report to them. No CRM, finance or budgets." },
  { role: "employee", label: "Employee", summary: "Own tasks, attendance, leave, payslips and expenses." },
  { role: "intern", label: "Intern", summary: "Same as an employee." },
];

/** "own" = allowed only for their own records, or for approvals, people who report to them. */
export type Access = "yes" | "own" | "no";

/** Display name for a role value, e.g. "team_lead" -> "Team Lead". */
export const roleLabel = (role: string) => ROLES.find((r) => r.role === role)?.label ?? role;

export const ACTIONS: { action: string; access: Record<Role, Access> }[] = [
  { action: "Create, edit and delete projects and tasks", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "yes", employee: "no", intern: "no" } },
  { action: "Move a task's status and comment on it", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "yes", employee: "own", intern: "own" } },
  { action: "Submit own task for review", access: { admin: "own", hr: "own", manager: "own", team_lead: "own", employee: "own", intern: "own" } },
  { action: "Approve or send back submitted work (never own)", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "yes", employee: "no", intern: "no" } },
  { action: "Team Board (everyone's workload)", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "yes", employee: "no", intern: "no" } },
  { action: "Clients, leads, invoices and payments", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "no", employee: "no", intern: "no" } },
  { action: "Create and issue documents", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "no", employee: "no", intern: "no" } },
  { action: "Add and edit employees, interns and departments", access: { admin: "yes", hr: "yes", manager: "no", team_lead: "no", employee: "no", intern: "no" } },
  { action: "Edit intern profiles and stipends", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "no", employee: "no", intern: "no" } },
  { action: "Evaluate interns (as their mentor)", access: { admin: "yes", hr: "yes", manager: "own", team_lead: "own", employee: "no", intern: "no" } },
  { action: "Issue internship certificates", access: { admin: "yes", hr: "yes", manager: "no", team_lead: "no", employee: "no", intern: "no" } },
  { action: "See own internship, feedback and certificate", access: { admin: "no", hr: "no", manager: "no", team_lead: "no", employee: "no", intern: "yes" } },
  { action: "Request attendance corrections (own days)", access: { admin: "own", hr: "own", manager: "own", team_lead: "own", employee: "own", intern: "own" } },
  { action: "Approve attendance corrections", access: { admin: "yes", hr: "yes", manager: "own", team_lead: "own", employee: "own", intern: "own" } },
  { action: "Approve leave and on-duty requests", access: { admin: "yes", hr: "yes", manager: "own", team_lead: "own", employee: "own", intern: "own" } },
  { action: "Approve or reject expenses", access: { admin: "yes", hr: "yes", manager: "own", team_lead: "own", employee: "own", intern: "own" } },
  { action: "Mark expenses reimbursed", access: { admin: "yes", hr: "yes", manager: "no", team_lead: "no", employee: "no", intern: "no" } },
  { action: "Run payroll and set salaries", access: { admin: "yes", hr: "yes", manager: "no", team_lead: "no", employee: "no", intern: "no" } },
  { action: "See payslips", access: { admin: "yes", hr: "yes", manager: "own", team_lead: "own", employee: "own", intern: "own" } },
  { action: "Apply for leave, on-duty and expenses", access: { admin: "yes", hr: "yes", manager: "yes", team_lead: "yes", employee: "yes", intern: "yes" } },
  { action: "Change company settings and letterhead", access: { admin: "yes", hr: "no", manager: "no", team_lead: "no", employee: "no", intern: "no" } },
  { action: "View the activity log", access: { admin: "yes", hr: "no", manager: "no", team_lead: "no", employee: "no", intern: "no" } },
];
