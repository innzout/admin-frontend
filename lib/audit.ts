import type { AuditLogEntry } from "@/lib/types";

// Turns a recorded HTTP request (method + path) into a readable action such as
// "Issued document" or "Updated lead". The audit log stores requests rather than
// business events (see backend middleware.AuditLog), so the wording is derived here.

const ENTITY: Record<string, string> = {
  leads: "lead",
  clients: "client",
  projects: "project",
  tasks: "task",
  employees: "employee",
  interns: "internship",
  departments: "department",
  invoices: "invoice",
  ledger: "payment",
  expenses: "expense",
  leave: "leave request",
  od: "on-duty request",
  attendance: "attendance",
  payroll: "payroll",
  documents: "document",
  timeline: "milestone",
  settings: "company settings",
  notifications: "notification",
  auth: "account",
};

/** Final path segments that name an action rather than an id. */
const ACTION_VERB: Record<string, string> = {
  issue: "Issued",
  void: "Voided",
  duplicate: "Duplicated",
  convert: "Converted",
  approve: "Approved",
  reject: "Rejected",
  cancel: "Cancelled",
  send: "Sent",
  reimburse: "Reimbursed",
  process: "Processed",
  paid: "Marked paid",
  status: "Changed status of",
  comments: "Commented on",
  activities: "Logged activity on",
  members: "Changed team of",
  payments: "Recorded payment on",
  "check-in": "Checked in",
  "check-out": "Checked out",
  "reset-password": "Reset password for",
  "change-password": "Changed password of",
  "read-all": "Marked all read:",
};

const METHOD_VERB: Record<string, string> = { POST: "Created", PUT: "Updated", PATCH: "Updated", DELETE: "Deleted" };

const isId = (s: string) => /^[0-9a-f-]{8,}$/i.test(s) || /^\d+$/.test(s);

export function describeAction(method: string, path: string): string {
  const parts = path.replace(/^\/api\/v1\//, "").split("/").filter(Boolean);
  const entity = ENTITY[parts[0]] ?? parts[0]?.replace(/-/g, " ") ?? "record";
  const last = parts[parts.length - 1];
  if (parts.length > 1 && !isId(last) && ACTION_VERB[last]) {
    return `${ACTION_VERB[last]} ${entity}`;
  }
  return `${METHOD_VERB[method] ?? method} ${entity}`;
}

export const AUDIT_TIME_ZONE = "Asia/Kolkata";

export const formatAuditTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: AUDIT_TIME_ZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));

const csvCell = (v: string) => `"${v.replace(/"/g, '""')}"`;

export function auditCsv(entries: AuditLogEntry[]): string {
  const header = ["When (IST)", "Who", "Role", "Action", "Record", "Method", "Path", "Status", "IP"];
  const rows = entries.map((e) =>
    [formatAuditTime(e.createdAt), e.actorName ?? "", e.actorRole ?? "", describeAction(e.method, e.path), e.recordLabel ?? "", e.method, e.path, String(e.statusCode), e.ipAddress ?? ""].map(csvCell).join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
