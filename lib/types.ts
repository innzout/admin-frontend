export type Role = "admin" | "hr" | "manager" | "team_lead" | "employee" | "intern";

/** Plain staff logins — see only their own tasks, attendance and leave. */
export const isStaffRole = (role: string | undefined) => role === "employee" || role === "intern";

/**
 * Roles that see company records: CRM, finance, budgets, colleagues' private
 * fields. Mirrors middleware.SeesCompanyRecords; Team Leads are excluded.
 */
export const seesCompanyRecords = (role: string | undefined) =>
  role === "admin" || role === "hr" || role === "manager";

/** A portal login as listed on the Roles & Access screen. */
export interface Login {
  id: string;
  name: string;
  username: string;
  role: Role;
  isActive: boolean;
  lastLoginAt?: string;
  employeeId?: string;
  employeeCode?: string;
  designation?: string;
}

export interface User {
  id: string;
  employeeId?: string;
  name: string;
  username: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  isActive: boolean;
  mustResetPassword: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  expiresInSec: number;
}

export type EmploymentType = "full_time" | "part_time" | "contract" | "intern";
export type EmployeeStatus = "active" | "on_notice" | "exited";

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  departmentName?: string;
  designation: string;
  employmentType: EmploymentType;
  joinDate: string;
  exitDate?: string;
  status: EmployeeStatus;
  reportingManagerId?: string;
  reportingManagerName?: string;
  dob?: string;
  address?: string;
  avatarUrl?: string;
  hasLogin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeListResult {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  phone?: string;
  departmentId?: string;
  designation: string;
  employmentType: EmploymentType;
  joinDate: string;
  reportingManagerId?: string;
  dob?: string;
  address?: string;
  createLogin?: boolean;
}

export interface UpdateEmployeeInput {
  fullName?: string;
  phone?: string;
  departmentId?: string;
  designation?: string;
  employmentType?: EmploymentType;
  reportingManagerId?: string;
  dob?: string;
  address?: string;
  status?: EmployeeStatus;
}

export interface Department {
  id: string;
  name: string;
  headEmployeeId?: string;
  headName?: string;
  employeeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateDepartmentInput {
  name?: string;
  headEmployeeId?: string;
  /** Remove the current head (omitting headEmployeeId leaves it unchanged). */
  clearHead?: boolean;
}

export interface Company {
  id: string;
  name: string;
  businessEmail?: string;
  phone?: string;
  website?: string;
  gstNumber?: string;
  /** Letterhead details printed on generated documents. */
  address?: string;
  tagline?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  bankAccountName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  upiId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCompanyInput {
  name?: string;
  businessEmail?: string;
  phone?: string;
  website?: string;
  gstNumber?: string;
  /** Letterhead details printed on generated documents. */
  address?: string;
  tagline?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  bankAccountName?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  upiId?: string;
}

export interface AppNotification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  isRead: boolean;
  relatedType?: string;
  relatedId?: string;
  createdAt: string;
}

export interface LeaveType {
  id: string;
  name: string;
  annualQuotaDays: number;
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  isPaid: boolean;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
}

export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  fromDate: string;
  toDate: string;
  isHalfDay: boolean;
  days: number;
  reason?: string;
  status: LeaveRequestStatus;
  approverId?: string;
  approverName?: string;
  decisionNote?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyLeaveInput {
  employeeId?: string;
  leaveTypeId: string;
  fromDate: string;
  toDate: string;
  isHalfDay: boolean;
  reason?: string;
}

export type AttendanceStatus = "present" | "remote" | "half_day" | "on_leave" | "absent" | "on_duty";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  breakStartedAt?: string;
  breakMinutes: number;
  workMinutes?: number;
  status: AttendanceStatus;
  isLate: boolean;
  source: "self" | "system";
  /** Times were fixed through an approved correction request. */
  corrected: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CorrectionStatus = "pending" | "approved" | "rejected" | "cancelled";

/** A missed-punch correction request. */
export interface AttendanceCorrection {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInAt?: string;
  checkOutAt?: string;
  reason: string;
  status: CorrectionStatus;
  approverName?: string;
  decisionNote?: string;
  decidedAt?: string;
  createdAt: string;
  /** The viewer may approve or reject it. */
  canDecide: boolean;
}

export interface CorrectionInput {
  date: string;
  checkIn?: string;
  checkOut?: string;
  reason: string;
}

/** Totals for the whole filtered range, not just the current page. */
export interface AttendanceSummary {
  days: number;
  present: number;
  remote: number;
  halfDay: number;
  onLeave: number;
  absent: number;
  onDuty: number;
  late: number;
  missedCheckout: number;
  workMinutes: number;
}

export interface AttendanceListResult {
  records: AttendanceRecord[];
  total: number;
  page: number;
  limit: number;
  summary: AttendanceSummary;
}

export type OdRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface OdRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  purpose: string;
  location?: string;
  status: OdRequestStatus;
  approverId?: string;
  approverName?: string;
  decisionNote?: string;
  decidedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyOdInput {
  employeeId?: string;
  fromDate: string;
  toDate: string;
  purpose: string;
  location?: string;
}

export interface Allowances {
  conveyance: number;
  medical: number;
  special: number;
}

export interface SalaryStructure {
  id: string;
  employeeId: string;
  employeeName: string;
  basic: number;
  hra: number;
  allowances: Allowances;
  pfPercent: number;
  taxPercent: number;
  effectiveFrom: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSalaryStructureInput {
  employeeId: string;
  basic: number;
  hra: number;
  allowances: Allowances;
  pfPercent: number;
  taxPercent: number;
  effectiveFrom: string;
}

export type PayrollRunStatus = "draft" | "processed" | "paid";

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  status: PayrollRunStatus;
  processedAt?: string;
  processedBy?: string;
  paidAt?: string;
  payslipCount: number;
  totalNet: number;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  payrollRunId: string;
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  runStatus: PayrollRunStatus;
  basic: number;
  hra: number;
  allowancesTotal: number;
  unpaidLeaveDays: number;
  gross: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  netSalary: number;
  createdAt: string;
  updatedAt: string;
}

export type ClientStatus = "active" | "inactive";

export interface Client {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  status: ClientStatus;
  source?: string;
  projectCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientInput {
  companyName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  source?: string;
}

export interface UpdateClientInput {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  source?: string;
  status?: ClientStatus;
}

export interface Activity {
  id: string;
  relatedType: string;
  relatedId: string;
  authorId?: string;
  authorName?: string;
  note: string;
  createdAt: string;
}

export type ProjectStatus = "in_progress" | "review" | "completed" | "on_hold";

export interface ProjectMember {
  id: string;
  projectId: string;
  employeeId: string;
  employeeName: string;
  role?: string;
  createdAt: string;
}

export interface ProjectTaskCounts {
  total: number;
  completed: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  clientId?: string;
  clientName?: string;
  status: ProjectStatus;
  startDate?: string;
  deadline?: string;
  budget?: number;
  description?: string;
  members: ProjectMember[];
  taskCounts: ProjectTaskCounts;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  clientId?: string;
  startDate?: string;
  deadline?: string;
  budget?: number;
  description?: string;
}

export interface UpdateProjectInput {
  name?: string;
  clientId?: string;
  status?: ProjectStatus;
  startDate?: string;
  deadline?: string;
  budget?: number;
  description?: string;
}

export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "new" | "in_progress" | "in_review" | "completed" | "cancelled";

export interface Task {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  assigneeId?: string;
  assigneeName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate?: string;
  /** Link the assignee attached when submitting for review. */
  reviewLink?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerName?: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskHistoryKind = "comment" | "submitted" | "approved" | "changes_requested";

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  authorId?: string;
  authorName?: string;
  comment: string;
  kind: TaskHistoryKind;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  method: string;
  path: string;
  statusCode: number;
  ipAddress?: string;
  /** The record the change touched, and its name at that moment. */
  recordId?: string;
  recordLabel?: string;
  createdAt: string;
}

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  rate: number;
}

export interface InvoicePayment {
  id: string;
  invoiceId: string;
  amount: number;
  paidOn: string;
  method?: string;
  reference?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  clientId: string;
  clientName: string;
  projectId?: string;
  projectName?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subtotal: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  notes?: string;
  lineItems: InvoiceLineItem[];
  payments: InvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvoiceInput {
  clientId: string;
  projectId?: string;
  issueDate: string;
  dueDate: string;
  taxPercent?: number;
  notes?: string;
  lineItems: InvoiceLineItemInput[];
}

export interface UpdateInvoiceInput {
  clientId?: string;
  projectId?: string;
  issueDate?: string;
  dueDate?: string;
  taxPercent?: number;
  notes?: string;
  lineItems?: InvoiceLineItemInput[];
}

export interface RecordPaymentInput {
  amount: number;
  paidOn: string;
  method?: string;
  reference?: string;
}

export type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";

export interface ExpenseCategory {
  id: string;
  name: string;
  monthlyBudget?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  title: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  paidByEmployeeId: string;
  paidByEmployeeName: string;
  projectId?: string;
  projectName?: string;
  expenseDate: string;
  status: ExpenseStatus;
  receiptUrl?: string;
  decidedByName?: string;
  decisionNote?: string;
  decidedAt?: string;
  reimbursedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  title: string;
  categoryId: string;
  amount: number;
  employeeId?: string;
  projectId?: string;
  expenseDate: string;
  receiptUrl?: string;
}

export interface ApiErrorBody {
  error: string;
  message: string;
  /** Per-field messages keyed by JSON field name (error = "validation_failed"). */
  fields?: Record<string, string>;
}
