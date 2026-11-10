import type { Company } from "@/lib/types";
import type { Block, DocumentContent } from "@/lib/documents/types";
import { computeTotals, formatRupees, lineAmount } from "@/lib/documents/money";
import { cn } from "@/lib/utils";

// Renders a document on the INNZOUT letterhead at A4 size. Colours are fixed
// (not theme tokens): a printed letter looks the same in light and dark mode.

const C = {
  navy: "#0d1b2e",
  blue: "#1565c0",
  text: "#334155",
  muted: "#64748b",
  line: "#e2e8f0",
  labelBg: "#f5f7fb",
};

interface LetterheadProps {
  content: DocumentContent;
  company?: Company;
  /** Issued number, e.g. INZ/OL/2026/0007; drafts show a DRAFT marker instead. */
  number?: string;
  status: "draft" | "issued" | "void";
}

export function Letterhead({ content, company, number, status }: LetterheadProps) {
  const [line1, line2] = content.heading.split("\n");
  return (
    <article
      data-print-root
      className="relative mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white px-[18mm] pt-[16mm] pb-[12mm] font-sans text-[10.5pt] leading-relaxed shadow-sm print:shadow-none"
      style={{ color: C.text }}
    >
      {status !== "issued" && (
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="-rotate-30 text-[96pt] font-black tracking-widest opacity-[0.07]" style={{ color: status === "void" ? "#dc2626" : C.navy }}>
            {status === "void" ? "VOID" : "DRAFT"}
          </span>
        </div>
      )}

      <header className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/gradient_logo.svg" alt="" className="h-[13mm] w-auto" />
          <div className="leading-tight">
            <p className="font-heading text-[20pt] font-extrabold tracking-[0.12em]" style={{ color: C.blue }}>
              INNZOUT
            </p>
            <p className="text-[8.5pt] tracking-[0.14em]" style={{ color: C.muted }}>
              {(company?.name ?? "Innzout Technologies").toUpperCase()}
            </p>
          </div>
        </div>
        <div className="text-right">
          {line1 && (
            <p className="font-heading text-[17pt] leading-tight font-extrabold" style={{ color: C.navy }}>
              {line1}
            </p>
          )}
          {line2 && (
            <p className="font-heading text-[17pt] leading-tight font-extrabold" style={{ color: C.blue }}>
              {line2}
            </p>
          )}
          {number && (
            <p className="mt-1 text-[9pt] font-semibold tracking-wide" style={{ color: C.muted }}>
              {number}
            </p>
          )}
        </div>
      </header>

      <div className="mt-[7mm] mb-[7mm] h-[1.2mm] rounded-full" style={{ backgroundColor: C.blue }} />

      <div className="flex flex-1 flex-col gap-[4mm]">
        {content.blocks.map((block, i) => (
          <BlockView key={i} block={block} company={company} />
        ))}
      </div>

      <footer className="mt-[10mm] border-t pt-[3mm] text-center text-[8.5pt] leading-snug" style={{ borderColor: C.line, color: C.muted }}>
        <p>{[company?.phone, company?.businessEmail, company?.website?.replace(/^https?:\/\//, "")].filter(Boolean).join("  |  ")}</p>
        <p>{[company?.tagline, company?.address].filter(Boolean).join("  |  ")}</p>
      </footer>
    </article>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[7.5pt] font-bold tracking-[0.16em] uppercase" style={{ color: C.blue }}>
      {children}
    </p>
  );
}

/** Keeps author line breaks ("\n") from textareas. */
function Multiline({ text, className }: { text: string; className?: string }) {
  return <p className={cn("whitespace-pre-line", className)}>{text}</p>;
}

function BlockView({ block, company }: { block: Block; company?: Company }) {
  switch (block.type) {
    case "fields":
      return (
        <div className="grid gap-x-[6mm] gap-y-[3mm]" style={{ gridTemplateColumns: `repeat(${Math.min(block.items.length, 4) || 1}, minmax(0, 1fr))` }}>
          {block.items.map((f, i) => (
            <div key={i} className="min-w-0">
              <Eyebrow>{f.label}</Eyebrow>
              <p className="mt-0.5 font-semibold break-words" style={{ color: C.navy }}>
                {f.value}
              </p>
            </div>
          ))}
        </div>
      );
    case "heading":
      return (
        <h3 className="mt-[2mm] font-heading text-[12.5pt] font-bold" style={{ color: C.blue }}>
          {block.text}
        </h3>
      );
    case "paragraph":
      return <Multiline text={block.text} />;
    case "list":
      return (
        <ol className={cn("flex flex-col gap-[1.5mm] pl-[6mm]", block.style === "numbered" ? "list-decimal" : "list-disc")}>
          {block.items.map((item, i) => (
            <li key={i} className="pl-[1mm]">
              {item.title && (
                <span className="font-semibold" style={{ color: C.navy }}>
                  {item.title} —{" "}
                </span>
              )}
              {item.text}
            </li>
          ))}
        </ol>
      );
    case "details":
      return (
        <table className="w-full border-collapse text-[10pt]">
          <tbody>
            {block.rows.map((r, i) => (
              <tr key={i} className="border-y" style={{ borderColor: C.line }}>
                <th scope="row" className="w-[34%] px-[3mm] py-[2.4mm] text-left font-semibold" style={{ backgroundColor: C.labelBg, color: C.muted }}>
                  {r.label}
                </th>
                <td className="px-[3mm] py-[2.4mm] font-semibold" style={{ color: C.navy }}>
                  {r.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "parties":
      return (
        <div className="grid grid-cols-2 gap-[6mm]">
          {[block.left, block.right].map((p, i) => (
            <div key={i}>
              <Eyebrow>{p.label}</Eyebrow>
              <p className="mt-0.5 font-semibold" style={{ color: C.navy }}>
                {p.value}
              </p>
              <Multiline text={p.lines} className="text-[9.5pt]" />
            </div>
          ))}
        </div>
      );
    case "lineItems":
      return <LineItemsView block={block} />;
    case "highlight": {
      const tone = { primary: C.blue, success: "#15803d", warning: "#b45309" }[block.tone];
      return (
        <div className="rounded-[2mm] border-l-[1.2mm] px-[4mm] py-[3mm]" style={{ borderColor: tone, backgroundColor: C.labelBg }}>
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-bold" style={{ color: tone }}>
              {block.label}
            </p>
            {block.value && (
              <p className="font-heading text-[14pt] font-extrabold tabular-nums" style={{ color: C.navy }}>
                {block.value}
              </p>
            )}
          </div>
          {block.caption && <p className="text-[9pt]">{block.caption}</p>}
        </div>
      );
    }
    case "note":
      return (
        <div className="rounded-[2mm] px-[4mm] py-[3mm]" style={{ backgroundColor: C.labelBg }}>
          <Eyebrow>{block.title}</Eyebrow>
          <ul className="mt-1 flex flex-col gap-0.5 text-[9.5pt]">
            {block.text
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <li key={i}>{line}</li>
              ))}
          </ul>
        </div>
      );
    case "payment":
      return (
        <div>
          <Eyebrow>Payment details</Eyebrow>
          <div className="mt-0.5 text-[9.5pt]">
            <p>A/C name: {company?.bankAccountName || "—"}</p>
            <p>
              A/C no: {company?.bankAccountNo || "—"} · IFSC: {company?.bankIfsc || "—"}
              {company?.upiId && ` · UPI: ${company.upiId}`}
            </p>
          </div>
        </div>
      );
    case "signoff":
      return (
        <div className="mt-[4mm]">
          <p>{block.closing}</p>
          <p className="mt-[8mm] font-bold" style={{ color: C.navy }}>
            {company?.signatoryName ?? "PURUSHOTHAMAN T"}
          </p>
          {company?.signatoryTitle && <p style={{ color: C.muted }}>{company.signatoryTitle}</p>}
          <p className="text-[9pt] font-bold tracking-[0.14em]" style={{ color: C.blue }}>
            {(company?.name ?? "Innzout Technologies").toUpperCase()}
          </p>
        </div>
      );
    case "signatures":
      return (
        <div className="mt-[10mm] grid grid-cols-2 gap-[12mm]">
          {[block.left, block.right].map((who, i) => (
            <div key={i}>
              <div className="border-b" style={{ borderColor: C.navy }} />
              <p className="mt-1 font-semibold" style={{ color: C.navy }}>
                {who}
              </p>
              <p className="text-[9pt]" style={{ color: C.muted }}>
                Name, designation & date
              </p>
            </div>
          ))}
        </div>
      );
    case "acceptance":
      return (
        <p className="mt-[6mm]">
          <span className="font-bold" style={{ color: C.navy }}>
            Accepted:
          </span>{" "}
          _____________________ <span style={{ color: C.muted }}>Date:</span> ____________
        </p>
      );
  }
}

function LineItemsView({ block }: { block: Extract<Block, { type: "lineItems" }> }) {
  const totals = computeTotals(block.items, block.taxMode, block.taxPercent);
  const head = "px-[2.5mm] py-[2.2mm] text-[7.5pt] font-bold tracking-[0.12em] uppercase";
  return (
    <div>
      <table className="w-full border-collapse text-[9.5pt]">
        <thead>
          <tr style={{ backgroundColor: C.labelBg, color: C.blue }}>
            <th className={cn(head, "text-left")}>Description</th>
            <th className={cn(head, "w-[14mm] text-right")}>Qty</th>
            {block.showRate && <th className={cn(head, "w-[28mm] text-right")}>Rate (₹)</th>}
            <th className={cn(head, "w-[30mm] text-right")}>{block.showRate ? "Amount (₹)" : "Estimate (₹)"}</th>
          </tr>
        </thead>
        <tbody>
          {block.items.map((item, i) => (
            <tr key={i} className="border-b align-top" style={{ borderColor: C.line }}>
              <td className="px-[2.5mm] py-[2.2mm]">
                <p className="font-semibold" style={{ color: C.navy }}>
                  {item.description}
                </p>
                {item.detail && <p className="text-[8.5pt]" style={{ color: C.muted }}>{item.detail}</p>}
              </td>
              <td className="px-[2.5mm] py-[2.2mm] text-right tabular-nums">{item.quantity}</td>
              {block.showRate && <td className="px-[2.5mm] py-[2.2mm] text-right tabular-nums">{formatRupees(item.rate)}</td>}
              <td className="px-[2.5mm] py-[2.2mm] text-right font-semibold tabular-nums" style={{ color: C.navy }}>
                {formatRupees(lineAmount(item))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-[2mm] ml-auto w-[75mm] text-[9.5pt]">
        {totals.taxes.length > 0 && (
          <>
            <Row label="Subtotal" value={formatRupees(totals.subtotal)} />
            {totals.taxes.map((t) => (
              <Row key={t.label} label={t.label} value={formatRupees(t.amount)} />
            ))}
          </>
        )}
        <div className="mt-[1mm] flex items-baseline justify-between rounded-[1.5mm] px-[2.5mm] py-[2mm] text-white" style={{ backgroundColor: C.blue }}>
          <span className="font-semibold">{block.totalLabel}</span>
          <span className="font-heading text-[12pt] font-extrabold tabular-nums">₹ {formatRupees(totals.total)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between px-[2.5mm] py-[1mm]">
      <span style={{ color: C.muted }}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
