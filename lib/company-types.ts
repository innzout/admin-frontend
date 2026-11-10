// Types for the INNZOUT Admin modules: leads, interns, payments ledger, timeline.

export type LeadStage = "new" | "contacted" | "qualified" | "proposal" | "negotiation" | "won" | "lost";
export const LEAD_STAGES: LeadStage[] = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"];
export const leadStageLabel: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal Sent",
  negotiation: "Negotiation",
  won: "Won",
  lost: "Lost",
};

export interface Lead {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  serviceInterest?: string;
  estimatedValue: number;
  stage: LeadStage;
  ownerId?: string;
  ownerName?: string;
  nextFollowUp?: string;
  lostReason?: string;
  clientId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadInput {
  name?: string;
  company?: string;
  email?: string;
  phone?: string;
  source?: string;
  serviceInterest?: string;
  estimatedValue?: number;
  stage?: LeadStage;
  ownerId?: string;
  nextFollowUp?: string;
  lostReason?: string;
  notes?: string;
}

export interface LeadSummary {
  stages: { stage: LeadStage; count: number; value: number }[];
  openValue: number;
  wonValue: number;
  conversionPct: number;
  followUpsDue: number;
}

export interface LeadActivity {
  id: string;
  authorName?: string;
  note: string;
  createdAt: string;
}

export type InternshipStatus = "ongoing" | "completed" | "terminated" | "converted";

export interface Intern {
  employeeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone?: string;
  designation: string;
  departmentName?: string;
  joinDate: string;
  employeeStatus: string;
  college?: string;
  course?: string;
  mentorId?: string;
  mentorName?: string;
  startDate?: string;
  endDate?: string;
  stipend: number;
  status: InternshipStatus;
  certificateIssued: boolean;
  evaluationScore?: number;
  notes?: string;
  openTasks: number;
  completedTasks: number;
}

export interface InternInput {
  college?: string;
  course?: string;
  mentorId?: string;
  startDate?: string;
  endDate?: string;
  stipend?: number;
  status?: InternshipStatus;
  certificateIssued?: boolean;
  evaluationScore?: number;
  notes?: string;
}

export interface InternSummary {
  active: number;
  completed: number;
  converted: number;
  monthlyStipend: number;
  endingSoon: number;
}

export type Direction = "in" | "out";

export const LEDGER_CATEGORIES: { value: string; label: string; direction: Direction | "both" }[] = [
  { value: "client_payment", label: "Client payment", direction: "in" },
  { value: "advance", label: "Advance received", direction: "in" },
  { value: "investment", label: "Investment / capital", direction: "in" },
  { value: "other_income", label: "Other income", direction: "in" },
  { value: "salary", label: "Salary", direction: "out" },
  { value: "stipend", label: "Intern stipend", direction: "out" },
  { value: "freelancer", label: "Freelancer / contractor", direction: "out" },
  { value: "rent", label: "Rent & utilities", direction: "out" },
  { value: "software", label: "Software & hosting", direction: "out" },
  { value: "marketing", label: "Marketing & ads", direction: "out" },
  { value: "hardware", label: "Hardware & equipment", direction: "out" },
  { value: "tax", label: "Tax & compliance", direction: "out" },
  { value: "travel", label: "Travel", direction: "out" },
  { value: "other", label: "Other", direction: "both" },
];
export const categoryLabel = (v: string) => LEDGER_CATEGORIES.find((c) => c.value === v)?.label ?? v.replace(/_/g, " ");

export const PAYMENT_METHODS = ["upi", "bank_transfer", "cash", "card", "cheque", "razorpay", "other"];
export const paymentMethodLabel: Record<string, string> = {
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cash: "Cash",
  card: "Card",
  cheque: "Cheque",
  razorpay: "Razorpay",
  other: "Other",
};

export interface LedgerEntry {
  id: string;
  source: "manual" | "invoice";
  direction: Direction;
  category: string;
  amount: number;
  date: string;
  method?: string;
  reference?: string;
  party?: string;
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectName?: string;
  invoiceId?: string;
  notes?: string;
}

export interface LedgerInput {
  direction?: Direction;
  category?: string;
  amount?: number;
  date?: string;
  method?: string;
  reference?: string;
  party?: string;
  clientId?: string;
  projectId?: string;
  notes?: string;
}

export interface LedgerSummary {
  totalIn: number;
  totalOut: number;
  net: number;
  thisMonthIn: number;
  thisMonthOut: number;
  receivable: number;
  monthly: { month: string; in: number; out: number }[];
  categories: { direction: Direction; category: string; total: number }[];
}

export type MilestoneKind = "milestone" | "launch" | "deadline" | "meeting" | "hiring" | "other";
export type MilestoneStatus = "planned" | "done" | "missed";

export interface TimelineEvent {
  id: string;
  source: "milestone" | "project_start" | "project_deadline" | "task" | "lead_follow_up";
  title: string;
  description?: string;
  date: string;
  kind: MilestoneKind;
  status: MilestoneStatus;
  projectId?: string;
  projectName?: string;
  link?: string;
}

export interface MilestoneInput {
  title?: string;
  description?: string;
  date?: string;
  kind?: MilestoneKind;
  status?: MilestoneStatus;
  projectId?: string;
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
