import type { DocStatus } from "@/lib/documents/types";
import type { StatusTone } from "@/components/common/status-badge";
import type {
  AttendanceStatus,
  ClientStatus,
  EmployeeStatus,
  ExpenseStatus,
  InvoiceStatus,
  LeaveRequestStatus,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/lib/types";

export const employeeStatusTone: Record<EmployeeStatus, StatusTone> = {
  active: "success",
  on_notice: "warning",
  exited: "neutral",
};

export const employeeStatusLabel: Record<EmployeeStatus, string> = {
  active: "Active",
  on_notice: "On notice",
  exited: "Exited",
};

export type PaymentStatus = "paid" | "pending" | "sent" | "overdue";

export const paymentStatusTone: Record<PaymentStatus, StatusTone> = {
  paid: "success",
  pending: "warning",
  sent: "info",
  overdue: "danger",
};

export const invoiceStatusTone: Record<InvoiceStatus, StatusTone> = {
  draft: "neutral",
  sent: "info",
  paid: "success",
  overdue: "danger",
};

export const expenseStatusTone: Record<ExpenseStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  reimbursed: "info",
};

export const leadStageTone: Record<string, StatusTone> = {
  new: "neutral",
  qualified: "info",
  proposal: "warning",
  negotiation: "accent",
  closed: "success",
};

export const projectStatusTone: Record<ProjectStatus, StatusTone> = {
  in_progress: "info",
  review: "warning",
  completed: "success",
  on_hold: "neutral",
};

export const projectStatusLabel: Record<ProjectStatus, string> = {
  in_progress: "In progress",
  review: "Review",
  completed: "Completed",
  on_hold: "On hold",
};

export const taskPriorityTone: Record<TaskPriority, StatusTone> = {
  low: "info",
  medium: "accent",
  high: "warning",
  urgent: "danger",
};

export const taskStatusTone: Record<TaskStatus, StatusTone> = {
  new: "neutral",
  in_progress: "info",
  in_review: "warning",
  completed: "success",
  cancelled: "danger",
};

export const taskStatusLabel: Record<TaskStatus, string> = {
  new: "Not started",
  in_progress: "In progress",
  in_review: "Waiting for review",
  completed: "Done",
  cancelled: "Cancelled",
};

export const clientStatusTone: Record<ClientStatus, StatusTone> = {
  active: "success",
  inactive: "neutral",
};

export const attendanceStatusTone: Record<AttendanceStatus, StatusTone> = {
  present: "success",
  remote: "info",
  half_day: "warning",
  on_leave: "neutral",
  absent: "danger",
  on_duty: "accent",
};

export const attendanceStatusLabel: Record<AttendanceStatus, string> = {
  present: "Present",
  remote: "Remote",
  half_day: "Half day",
  on_leave: "On leave",
  on_duty: "On duty",
  absent: "Absent",
};

export const leaveRequestStatusTone: Record<LeaveRequestStatus, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
  cancelled: "neutral",
};

export const recruitmentStageTone: Record<string, StatusTone> = {
  new: "neutral",
  screening: "info",
  interviewing: "warning",
  offer: "accent",
  hired: "success",
};

export const docStatusTone: Record<DocStatus, StatusTone> = { draft: "warning", issued: "success", void: "danger" };
