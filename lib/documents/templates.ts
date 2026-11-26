import type { Client, Company, Employee, Invoice } from "@/lib/types";
import type { Block, DocType, DocumentContent, LineItem } from "@/lib/documents/types";
import { localIsoDate } from "@/lib/dates";

// Starting content for each document type, taken from the INNZOUT Word
// templates (Docs/Letterhead/Innzout Design System). Builders fill in what the
// linked record knows; everything stays editable before the document is issued.

export type LinkKind = "employee" | "intern" | "client" | "invoice" | "none";
export type TemplateGroup = "HR" | "Sales" | "Finance" | "General";

export interface TemplateContext {
  company?: Company;
  employee?: Employee;
  client?: Client;
  invoice?: Invoice;
  /** YYYY-MM-DD; injectable so builders stay pure and testable. */
  today: string;
}

export interface TemplateDef {
  type: DocType;
  label: string;
  group: TemplateGroup;
  description: string;
  link: LinkKind;
  /** Invoice-linked documents only make sense for these invoice states. */
  invoiceStatuses?: Invoice["status"][];
  build: (ctx: TemplateContext) => { title: string; content: DocumentContent };
}

const PLACEHOLDER = {
  ctc: "₹ X,XX,XXX",
  date: "DD Month YYYY",
};

/** "2026-07-14" → "14 July 2026", the format used across the templates. */
export function longDate(iso?: string): string {
  if (!iso) return PLACEHOLDER.date;
  const d = new Date(iso.slice(0, 10) + "T00:00:00");
  if (Number.isNaN(d.getTime())) return PLACEHOLDER.date;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localIsoDate(d);
}

const companyName = (ctx: { company?: Company }) => ctx.company?.name ?? "Innzout Technologies";
const clientLines = (c?: Client) => [c?.address, c?.gstNumber && `GSTIN ${c.gstNumber}`].filter(Boolean).join("\n") || "Street address, City, State, PIN";
const fromLines = (ctx: { company?: Company }) =>
  [ctx.company?.address, [ctx.company?.phone, ctx.company?.businessEmail].filter(Boolean).join(" · ")].filter(Boolean).join("\n");

const invoiceItems = (inv?: Invoice): LineItem[] =>
  inv?.lineItems.length
    ? inv.lineItems.map((li) => ({ description: li.description, quantity: li.quantity, rate: li.rate }))
    : [{ description: "Software development services", detail: "Description of work", quantity: 1, rate: 0 }];

const signoff: Block = { type: "signoff", closing: "Best regards," };
const bothSign = (other = "For the Client"): Block => ({ type: "signatures", left: "For Innzout Technologies", right: other });

export const TEMPLATES: TemplateDef[] = [
  {
    type: "offer_letter",
    label: "Offer letter",
    group: "HR",
    description: "Job offer with CTC, joining date and probation.",
    link: "employee",
    build: ({ employee, today, ...ctx }) => {
      const name = employee?.fullName ?? "Candidate name";
      const role = employee?.designation ?? "Software Developer";
      return {
        title: `Offer letter — ${name}`,
        content: {
          heading: "OFFER\nLETTER",
          blocks: [
            { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Candidate", value: name }, { label: "Position", value: role }] },
            { type: "paragraph", text: `Dear ${employee ? name.split(" ")[0] : "Candidate"},` },
            {
              type: "paragraph",
              text: `We are pleased to offer you the position of ${role} at ${companyName(ctx)}, Thanjavur. We were impressed with your skills and believe you will be a valuable addition to our team.`,
            },
            { type: "heading", text: "Offer details" },
            {
              type: "details",
              rows: [
                { label: "Designation", value: role },
                { label: "Annual CTC", value: PLACEHOLDER.ctc },
                { label: "Date of joining", value: longDate(employee?.joinDate) },
                { label: "Work location", value: "Thanjavur, Tamil Nadu" },
                { label: "Probation period", value: "3 months" },
              ],
            },
            {
              type: "paragraph",
              text: "This offer is contingent on verification of your documents and credentials. A detailed appointment letter with full terms of employment will be issued on your date of joining.",
            },
            {
              type: "paragraph",
              text: `To accept, please sign and return a copy of this letter by ${longDate(addDays(today, 7))}. We look forward to welcoming you to the team.`,
            },
            signoff,
            { type: "acceptance" },
          ],
        },
      };
    },
  },
  {
    type: "appointment_letter",
    label: "Appointment letter",
    group: "HR",
    description: "Terms of employment issued on joining.",
    link: "employee",
    build: ({ employee, today, ...ctx }) => {
      const name = employee?.fullName ?? "Employee name";
      const role = employee?.designation ?? "Software Developer";
      return {
        title: `Appointment letter — ${name}`,
        content: {
          heading: "APPOINTMENT\nLETTER",
          blocks: [
            { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Employee", value: name }, { label: "Designation", value: role }] },
            { type: "paragraph", text: `Dear ${employee ? name.split(" ")[0] : "Employee"},` },
            { type: "paragraph", text: `Further to your acceptance of our offer, we are pleased to confirm your appointment at ${companyName(ctx)} on the following terms:` },
            { type: "heading", text: "Terms of employment" },
            {
              type: "list",
              style: "numbered",
              items: [
                { title: "Designation & duties", text: `You are appointed as ${role}, reporting as assigned. Duties may be reasonably revised as business needs evolve.` },
                { title: "Commencement", text: `Your employment commences on ${longDate(employee?.joinDate)}.` },
                { title: "Compensation", text: `Annual CTC of ${PLACEHOLDER.ctc}, paid monthly, subject to statutory deductions. Salary details are in the annexure.` },
                { title: "Probation", text: "3 months from joining, during which employment may be ended by either side with 7 days’ notice. Confirmation will be communicated in writing." },
                { title: "Working hours", text: "As per company policy communicated from time to time." },
                { title: "Leave", text: "As per company leave policy." },
                { title: "Confidentiality & IP", text: "All work products created during employment belong to the company. You will keep company and client information confidential, during and after employment." },
                { title: "Notice period", text: "After confirmation, either side may end employment with 30 days’ written notice or salary in lieu." },
                { title: "Conduct", text: "You will follow company policies and maintain professional conduct. Any misrepresentation in your application may lead to termination." },
              ],
            },
            { type: "paragraph", text: "Please sign the duplicate copy of this letter as acceptance of these terms. We welcome you and wish you a rewarding career with us." },
            signoff,
            { type: "acceptance" },
          ],
        },
      };
    },
  },
  {
    type: "experience_certificate",
    label: "Experience certificate",
    group: "HR",
    description: "Relieving / experience letter for an exiting employee.",
    link: "employee",
    build: ({ employee, today, ...ctx }) => {
      const name = employee?.fullName ?? "[Employee name]";
      return {
        title: `Experience certificate — ${name}`,
        content: {
          heading: "EXPERIENCE\nCERTIFICATE",
          blocks: [
            { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Employee", value: name }] },
            { type: "heading", text: "TO WHOMSOEVER IT MAY CONCERN" },
            {
              type: "paragraph",
              text: `This is to certify that ${name} was employed with ${companyName(ctx)} as ${employee?.designation ?? "[Designation]"} from ${longDate(employee?.joinDate)} to ${longDate(employee?.exitDate)}.`,
            },
            {
              type: "paragraph",
              text: "During their tenure, they worked on [key projects/responsibilities] and demonstrated professionalism, technical competence, and dedication. Their conduct was found to be good.",
            },
            { type: "paragraph", text: `They have been relieved of their duties effective ${longDate(employee?.exitDate)}, and have no dues pending with the company.` },
            { type: "paragraph", text: "We thank them for their contribution and wish them success in their future endeavours." },
            signoff,
          ],
        },
      };
    },
  },
  {
    type: "internship_certificate",
    label: "Internship certificate",
    group: "HR",
    description: "Completion certificate for an intern.",
    link: "intern",
    build: ({ employee, today, ...ctx }) => {
      const name = employee?.fullName ?? "[Intern name]";
      return {
        title: `Internship certificate — ${name}`,
        content: {
          heading: "INTERNSHIP\nCERTIFICATE",
          blocks: [
            { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Intern", value: name }] },
            { type: "heading", text: "TO WHOMSOEVER IT MAY CONCERN" },
            {
              type: "paragraph",
              text: `This is to certify that ${name}, a student of [College/University name], has successfully completed an internship at ${companyName(ctx)} from ${longDate(employee?.joinDate)} to ${longDate(employee?.exitDate)} in the domain of ${employee?.designation ?? "[Web development / UI-UX design]"}.`,
            },
            { type: "paragraph", text: "During the internship, they worked on [project/task summary] and showed sincerity, eagerness to learn, and good technical aptitude." },
            { type: "paragraph", text: "We wish them the very best in their academic and professional journey." },
            signoff,
          ],
        },
      };
    },
  },
  {
    type: "nda",
    label: "Non-disclosure agreement",
    group: "Sales",
    description: "Mutual NDA with a client or partner.",
    link: "client",
    build: ({ client, today, ...ctx }) => ({
      title: `NDA — ${client?.companyName ?? "Client"}`,
      content: {
        heading: "NON-DISCLOSURE\nAGREEMENT",
        blocks: [
          { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Party A", value: companyName(ctx) }, { label: "Party B", value: client?.companyName ?? "Client / partner name" }] },
          {
            type: "paragraph",
            text: "This mutual Non-Disclosure Agreement is entered into between the parties named above to protect confidential information exchanged in connection with a potential or ongoing business engagement (“Purpose”).",
          },
          { type: "heading", text: "Terms" },
          {
            type: "list",
            style: "numbered",
            items: [
              { title: "Confidential information", text: "All non-public information disclosed by either party — business plans, pricing, client lists, designs, source code, credentials, and documents — whether written, oral, or electronic." },
              { title: "Obligations", text: "The receiving party will use confidential information only for the Purpose, protect it with at least reasonable care, and not disclose it to third parties without prior written consent." },
              { title: "Exclusions", text: "Information that is publicly available, already known to the recipient, independently developed, or lawfully received from a third party is not confidential. Disclosure required by law is permitted with prompt notice." },
              { title: "Term", text: "Obligations apply for 2 years from the date of disclosure, surviving the end of the engagement." },
              { title: "Return of materials", text: "On request or at the end of the engagement, each party will return or destroy the other’s confidential materials." },
              { title: "No licence", text: "Nothing in this Agreement grants any rights in either party’s intellectual property." },
              { title: "Governing law", text: "Laws of India; courts at Thanjavur, Tamil Nadu have jurisdiction." },
            ],
          },
          { type: "heading", text: "Signatures" },
          bothSign("For the other party"),
        ],
      },
    }),
  },
  {
    type: "quotation",
    label: "Quotation",
    group: "Sales",
    description: "Price estimate before a proposal or invoice.",
    link: "client",
    build: ({ client, today }) => ({
      title: `Quotation — ${client?.companyName ?? "Client"}`,
      content: {
        heading: "QUOTATION",
        blocks: [
          { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Valid for", value: "30 days" }, { label: "Prepared for", value: client?.companyName ?? "Client company name" }] },
          { type: "heading", text: "Scope summary" },
          { type: "paragraph", text: "Estimate for the design and development work discussed. Final scope and pricing will be confirmed in the proposal / agreement." },
          {
            type: "lineItems",
            items: [
              { description: "Website design & development", detail: "Responsive, up to 6 pages", quantity: 1, rate: 25000 },
              { description: "Content & imagery setup", detail: "Client-provided material", quantity: 1, rate: 5000 },
              { description: "Deployment & handover", detail: "Domain, hosting setup, training", quantity: 1, rate: 5000 },
            ],
            taxMode: "none",
            taxPercent: 18,
            totalLabel: "Estimated total",
            showRate: false,
          },
          {
            type: "note",
            title: "Notes",
            text: "This is an estimate, not a tax invoice — prices exclusive of GST.\nValidity: 30 days from the date above.\nScope changes may revise the estimate; any change will be confirmed in writing before work begins.",
          },
          signoff,
        ],
      },
    }),
  },
  {
    type: "proposal",
    label: "Proposal",
    group: "Sales",
    description: "Project proposal with scope, timeline and pricing.",
    link: "client",
    build: ({ client, today, company }) => ({
      title: `Proposal — ${client?.companyName ?? "Client"}`,
      content: {
        heading: "PROJECT\nPROPOSAL",
        blocks: [
          {
            type: "fields",
            items: [
              { label: "Date", value: longDate(today) },
              { label: "Client", value: client?.companyName ?? "Client name" },
              { label: "Prepared by", value: company?.signatoryName ?? "Purushothaman T" },
            ],
          },
          { type: "heading", text: "Project overview" },
          { type: "paragraph", text: "We propose to design and develop a modern, responsive, and professional website for your business. The website will effectively showcase your services and completed projects, helping you attract potential clients and generate leads." },
          { type: "heading", text: "Scope of work" },
          {
            type: "list",
            style: "bullet",
            items: ["Home page (about, services, contact overview)", "Projects showcase page", "Individual project detail pages", "Image gallery", "WhatsApp integration (click-to-chat)", "Contact form with email notification", "Mobile responsive design", "Basic SEO setup (Google-friendly structure)"].map((text) => ({ text })),
          },
          { type: "heading", text: "Development timeline" },
          { type: "paragraph", text: "The project will be completed within 7–15 working days from the date of confirmation and receipt of advance payment." },
          { type: "heading", text: "Pricing" },
          { type: "details", rows: [{ label: "Development package", value: "₹ 20,000 – ₹ 35,000" }, { label: "Maintenance (optional)", value: "₹ 1,500 – ₹ 3,000 / month" }] },
          { type: "heading", text: "Payment terms" },
          { type: "list", style: "bullet", items: [{ text: "50% advance to initiate the project" }, { text: "50% upon completion, before final delivery" }] },
          { type: "heading", text: "Acceptance" },
          { type: "paragraph", text: "Please confirm your approval to proceed with the project. Upon confirmation, we will initiate the development process." },
          signoff,
        ],
      },
    }),
  },
  {
    type: "service_agreement",
    label: "Service agreement",
    group: "Sales",
    description: "Contract terms for a client engagement.",
    link: "client",
    build: ({ client, today, ...ctx }) => ({
      title: `Service agreement — ${client?.companyName ?? "Client"}`,
      content: {
        heading: "SERVICE\nAGREEMENT",
        blocks: [
          { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Between", value: companyName(ctx) }, { label: "And", value: client?.companyName ?? "Client company name" }] },
          {
            type: "paragraph",
            text: `This Service Agreement (“Agreement”) is made between ${companyName(ctx)}, ${ctx.company?.address ?? "269 Thondarampet West, Thanjavur, Tamil Nadu 614905"} (“Service Provider”) and the client named above (“Client”), together the “Parties”.`,
          },
          { type: "heading", text: "Terms" },
          {
            type: "list",
            style: "numbered",
            items: [
              { title: "Scope of services", text: "The Service Provider will deliver the services described in the accepted proposal / quotation referenced above. Changes to scope must be agreed in writing and may revise cost and timeline." },
              { title: "Timeline", text: "Work begins on receipt of the advance payment and the required content/materials from the Client. Delays in providing materials or approvals extend the timeline accordingly." },
              { title: "Fees & payment", text: "Fees as per the accepted quotation. 50% advance to initiate; 50% on completion before final delivery. Invoices are payable within 14 days." },
              { title: "Client responsibilities", text: "The Client will provide content, branding materials, approvals, and access (domain, hosting) needed for the work, in a timely manner." },
              { title: "Intellectual property", text: "On receipt of full payment, ownership of the final deliverables transfers to the Client. The Service Provider retains rights to underlying tools, libraries, and know-how, and may showcase the work in its portfolio unless the Client objects in writing." },
              { title: "Confidentiality", text: "Each Party will keep the other’s non-public information confidential and use it only for this engagement." },
              { title: "Revisions & support", text: "The engagement includes the revision rounds stated in the proposal. Post-delivery support is covered under a separate maintenance arrangement, if opted." },
              { title: "Warranty & liability", text: "Services are provided with reasonable skill and care. The Service Provider’s total liability is limited to the fees paid under this Agreement; neither Party is liable for indirect or consequential loss." },
              { title: "Termination", text: "Either Party may terminate with 15 days’ written notice. The Client pays for all work completed up to the termination date." },
              { title: "Governing law", text: "This Agreement is governed by the laws of India; courts at Thanjavur, Tamil Nadu have jurisdiction." },
            ],
          },
          { type: "heading", text: "Signatures" },
          bothSign(),
        ],
      },
    }),
  },
  {
    type: "purchase_order",
    label: "Purchase order",
    group: "Finance",
    description: "Order goods or services from a vendor.",
    link: "none",
    build: ({ today, ...ctx }) => ({
      title: "Purchase order — Vendor",
      content: {
        heading: "PURCHASE\nORDER",
        blocks: [
          { type: "fields", items: [{ label: "PO date", value: longDate(today) }, { label: "Delivery by", value: longDate(addDays(today, 14)) }, { label: "Payment terms", value: "Net 15" }] },
          {
            type: "parties",
            left: { label: "Vendor", value: "Vendor company name", lines: "Street address, City, State, PIN\nGSTIN 00XXXXX0000X1Z0" },
            right: { label: "Deliver to", value: companyName(ctx), lines: fromLines(ctx) },
          },
          { type: "lineItems", items: [{ description: "Item or service name", detail: "Specification / model", quantity: 1, rate: 10000 }], taxMode: "none", taxPercent: 18, totalLabel: "PO total", showRate: true },
          {
            type: "note",
            title: "Terms",
            text: "Quote this PO number on all invoices, delivery challans, and correspondence.\nGoods/services must match the specification above; deviations require prior written approval.\nPayment as per terms above, after receipt and acceptance of goods/services.",
          },
          bothSign("For the Vendor"),
        ],
      },
    }),
  },
  {
    type: "proforma_invoice",
    label: "Proforma invoice",
    group: "Finance",
    description: "Advance invoice for reference before work starts.",
    link: "client",
    build: ({ client, today, ...ctx }) => ({
      title: `Proforma invoice — ${client?.companyName ?? "Client"}`,
      content: {
        heading: "PROFORMA\nINVOICE",
        blocks: [
          { type: "fields", items: [{ label: "Issue date", value: longDate(today) }, { label: "Valid until", value: longDate(addDays(today, 30)) }, { label: "GSTIN", value: ctx.company?.gstNumber ?? "—" }] },
          {
            type: "parties",
            left: { label: "From", value: companyName(ctx), lines: fromLines(ctx) },
            right: { label: "Prepared for", value: client?.companyName ?? "Client company name", lines: clientLines(client) },
          },
          { type: "lineItems", items: invoiceItems(), taxMode: "cgst_sgst", taxPercent: 18, totalLabel: "Estimated total", showRate: true },
          { type: "payment" },
          { type: "note", title: "Note", text: "This is a proforma invoice for advance reference only — not a demand for payment and not valid for input tax credit. A tax invoice follows on confirmation." },
        ],
      },
    }),
  },
  {
    type: "tax_invoice",
    label: "Tax invoice",
    group: "Finance",
    description: "Printable GST invoice for a Billing invoice.",
    link: "invoice",
    invoiceStatuses: ["sent", "overdue", "paid"],
    build: ({ invoice, client, ...ctx }) => ({
      title: `Tax invoice ${invoice?.invoiceNumber ?? ""} — ${invoice?.clientName ?? "Client"}`.trim(),
      content: {
        heading: "TAX INVOICE",
        blocks: [
          {
            type: "fields",
            items: [
              { label: "Invoice no.", value: invoice?.invoiceNumber ?? "—" },
              { label: "Issue date", value: longDate(invoice?.issueDate) },
              { label: "Due date", value: longDate(invoice?.dueDate) },
              { label: "GSTIN", value: ctx.company?.gstNumber ?? "—" },
            ],
          },
          {
            type: "parties",
            left: { label: "From", value: companyName(ctx), lines: fromLines(ctx) },
            right: { label: "Bill to", value: invoice?.clientName ?? client?.companyName ?? "Client company name", lines: clientLines(client) },
          },
          { type: "lineItems", items: invoiceItems(invoice), taxMode: "cgst_sgst", taxPercent: invoice?.taxPercent ?? 18, totalLabel: "Total due", showRate: true },
          { type: "payment" },
          { type: "note", title: "Terms", text: `Payment due by ${longDate(invoice?.dueDate)}. Please quote the invoice number with your payment.` },
        ],
      },
    }),
  },
  {
    type: "payment_receipt",
    label: "Payment receipt",
    group: "Finance",
    description: "Paid invoice / receipt for a settled invoice.",
    link: "invoice",
    invoiceStatuses: ["paid"],
    build: ({ invoice, client, ...ctx }) => {
      const last = invoice?.payments.at(-1);
      return {
        title: `Receipt ${invoice?.invoiceNumber ?? ""} — ${invoice?.clientName ?? "Client"}`.trim(),
        content: {
          heading: "INVOICE — PAID",
          blocks: [
            {
              type: "fields",
              items: [
                { label: "Invoice no.", value: invoice?.invoiceNumber ?? "—" },
                { label: "Issue date", value: longDate(invoice?.issueDate) },
                { label: "Payment date", value: longDate(last?.paidOn) },
                { label: "Payment mode", value: [last?.method?.toUpperCase(), last?.reference && `Ref ${last.reference}`].filter(Boolean).join(" · ") || "—" },
              ],
            },
            {
              type: "parties",
              left: { label: "From", value: companyName(ctx), lines: fromLines(ctx) },
              right: { label: "Billed to", value: invoice?.clientName ?? client?.companyName ?? "Client company name", lines: clientLines(client) },
            },
            { type: "lineItems", items: invoiceItems(invoice), taxMode: "cgst_sgst", taxPercent: invoice?.taxPercent ?? 18, totalLabel: "Amount received", showRate: true },
            { type: "highlight", label: "✔ PAID", value: "", caption: `Received in full on ${longDate(last?.paidOn)}`, tone: "success" },
            { type: "note", title: "Note", text: "This invoice has been settled in full. No further payment is due. Please retain this document for your records." },
          ],
        },
      };
    },
  },
  {
    type: "payment_reminder",
    label: "Payment reminder",
    group: "Finance",
    description: "Gentle reminder for an unpaid or overdue invoice.",
    link: "invoice",
    invoiceStatuses: ["sent", "overdue"],
    build: ({ invoice, today }) => {
      const due = invoice ? `₹ ${invoice.balanceDue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}` : "₹ 0.00";
      const overdueDays = invoice ? Math.max(0, Math.round((Date.parse(today) - Date.parse(invoice.dueDate.slice(0, 10))) / 86_400_000)) : 0;
      return {
        title: `Payment reminder ${invoice?.invoiceNumber ?? ""} — ${invoice?.clientName ?? "Client"}`.trim(),
        content: {
          heading: "PAYMENT\nREMINDER",
          blocks: [
            { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Invoice ref", value: invoice?.invoiceNumber ?? "—" }, { label: "Amount due", value: due }] },
            { type: "paragraph", text: "Dear Sir / Madam," },
            {
              type: "paragraph",
              text: `This is a gentle reminder that the invoice referenced above, issued on ${longDate(invoice?.issueDate)}, remains unpaid past its due date of ${longDate(invoice?.dueDate)}.`,
            },
            { type: "highlight", label: "Outstanding amount", value: due, caption: `Due date: ${longDate(invoice?.dueDate)} · Days overdue: ${overdueDays}`, tone: "warning" },
            { type: "paragraph", text: "We request you to arrange payment at the earliest. Payment can be made to the account below; please quote the invoice number with your payment." },
            { type: "payment" },
            {
              type: "paragraph",
              text: "If payment has already been made, kindly ignore this reminder and share the transaction reference so we can reconcile our records. For any queries regarding this invoice, please contact us.",
            },
            signoff,
          ],
        },
      };
    },
  },
  {
    type: "work_completion",
    label: "Work completion certificate",
    group: "Sales",
    description: "Client sign-off that a project was delivered.",
    link: "client",
    build: ({ client, today }) => ({
      title: `Work completion — ${client?.companyName ?? "Client"}`,
      content: {
        heading: "WORK COMPLETION\nCERTIFICATE",
        blocks: [
          { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "Project", value: "Website development" }, { label: "Client", value: client?.companyName ?? "Client company name" }] },
          { type: "paragraph", text: "This is to certify that the project referenced above has been completed and delivered as per the agreed scope of work." },
          { type: "heading", text: "Deliverables handed over" },
          {
            type: "list",
            style: "bullet",
            items: ["Live website deployed at the agreed domain", "Admin credentials and documentation", "Source files / repository access", "Training on content updates"].map((text) => ({ text })),
          },
          { type: "heading", text: "Acceptance" },
          {
            type: "paragraph",
            text: "By signing below, the client confirms that the deliverables have been received, reviewed, and accepted, and that the project is complete. Any support hereafter is covered under the maintenance terms, if opted.",
          },
          bothSign(),
        ],
      },
    }),
  },
  {
    type: "letter",
    label: "Blank letter",
    group: "General",
    description: "Free-form letter on the letterhead.",
    link: "none",
    build: ({ today }) => ({
      title: "Letter",
      content: {
        heading: "",
        blocks: [
          { type: "fields", items: [{ label: "Date", value: longDate(today) }, { label: "To", value: "[Recipient name]" }] },
          { type: "paragraph", text: "[Address]" },
          { type: "heading", text: "Subject: [Subject line]" },
          { type: "paragraph", text: "Dear Sir / Madam," },
          { type: "paragraph", text: "[Body of the letter]" },
          signoff,
        ],
      },
    }),
  },
];

export const TEMPLATE_BY_TYPE = Object.fromEntries(TEMPLATES.map((t) => [t.type, t])) as Record<DocType, TemplateDef>;
