// A document is a title plus an ordered list of blocks rendered on the INNZOUT
// letterhead. The backend stores `DocumentContent` as JSON and never interprets
// it; adding a block type here only needs a renderer and an editor.

export type DocType =
  | "offer_letter"
  | "appointment_letter"
  | "experience_certificate"
  | "internship_certificate"
  | "nda"
  | "quotation"
  | "proposal"
  | "service_agreement"
  | "purchase_order"
  | "proforma_invoice"
  | "tax_invoice"
  | "payment_receipt"
  | "payment_reminder"
  | "work_completion"
  | "letter";

export type DocStatus = "draft" | "issued" | "void";

export interface LabeledValue {
  label: string;
  value: string;
}

export interface ListItem {
  /** Bold lead-in, e.g. "Probation" in "Probation — 3 months…". */
  title?: string;
  text: string;
}

export interface LineItem {
  description: string;
  detail?: string;
  quantity: number;
  /** Rupees with up to 2 decimals. Totals are computed in paise. */
  rate: number;
}

export type TaxMode = "none" | "cgst_sgst" | "igst";

export type Block =
  | { type: "fields"; items: LabeledValue[] }
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; style: "numbered" | "bullet"; items: ListItem[] }
  | { type: "details"; rows: LabeledValue[] }
  | { type: "parties"; left: LabeledValue & { lines: string }; right: LabeledValue & { lines: string } }
  | { type: "lineItems"; items: LineItem[]; taxMode: TaxMode; taxPercent: number; totalLabel: string; showRate: boolean }
  | { type: "highlight"; label: string; value: string; caption?: string; tone: "primary" | "success" | "warning" }
  | { type: "note"; title: string; text: string }
  | { type: "payment" }
  | { type: "signoff"; closing: string }
  | { type: "signatures"; left: string; right: string }
  | { type: "acceptance" };

export type BlockType = Block["type"];

export interface DocumentContent {
  /** Big header title; "\n" splits it onto two lines like "OFFER\nLETTER". */
  heading: string;
  blocks: Block[];
}

export interface DocumentRecord {
  id: string;
  type: DocType;
  number?: string;
  title: string;
  status: DocStatus;
  content?: DocumentContent;
  employeeId?: string;
  clientId?: string;
  clientName?: string;
  invoiceId?: string;
  authorName?: string;
  issuedAt?: string;
  voidedAt?: string;
  voidReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentListResult {
  documents: DocumentRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateDocumentInput {
  type: DocType;
  title: string;
  content: DocumentContent;
  employeeId?: string;
  clientId?: string;
  invoiceId?: string;
}
