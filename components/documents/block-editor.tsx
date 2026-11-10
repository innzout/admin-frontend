"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/company/native-select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Block, BlockType, DocumentContent, LabeledValue, LineItem, ListItem } from "@/lib/documents/types";
import { computeTotals, formatRupees } from "@/lib/documents/money";

// Editing UI for a document's blocks. Pure: takes content, reports changes;
// saving and validation of the whole document live in the page.

const TEXT_MAX = 4000;
const SHORT_MAX = 200;
const MAX_ROWS = 50;

const BLOCK_LABEL: Record<BlockType, string> = {
  fields: "Header fields",
  heading: "Section heading",
  paragraph: "Paragraph",
  list: "List",
  details: "Details table",
  parties: "From / To",
  lineItems: "Line items",
  highlight: "Highlight box",
  note: "Note box",
  payment: "Payment details",
  signoff: "Sign-off",
  signatures: "Signature lines",
  acceptance: "Acceptance line",
};

const NEW_BLOCK: Record<BlockType, () => Block> = {
  fields: () => ({ type: "fields", items: [{ label: "Label", value: "Value" }] }),
  heading: () => ({ type: "heading", text: "New section" }),
  paragraph: () => ({ type: "paragraph", text: "" }),
  list: () => ({ type: "list", style: "bullet", items: [{ text: "" }] }),
  details: () => ({ type: "details", rows: [{ label: "Label", value: "Value" }] }),
  parties: () => ({ type: "parties", left: { label: "From", value: "", lines: "" }, right: { label: "To", value: "", lines: "" } }),
  lineItems: () => ({ type: "lineItems", items: [{ description: "", quantity: 1, rate: 0 }], taxMode: "none", taxPercent: 18, totalLabel: "Total", showRate: true }),
  highlight: () => ({ type: "highlight", label: "Note", value: "", tone: "primary" }),
  note: () => ({ type: "note", title: "Note", text: "" }),
  payment: () => ({ type: "payment" }),
  signoff: () => ({ type: "signoff", closing: "Best regards," }),
  signatures: () => ({ type: "signatures", left: "For Innzout Technologies", right: "For the Client" }),
  acceptance: () => ({ type: "acceptance" }),
};

/** Problems that block issuing; shown inline and checked again before issue. */
export function contentProblems(content: DocumentContent): string[] {
  const problems: string[] = [];
  if (content.blocks.length === 0) problems.push("Add at least one block.");
  content.blocks.forEach((b, i) => {
    const where = `${BLOCK_LABEL[b.type]} (block ${i + 1})`;
    if (b.type === "lineItems") {
      if (b.items.length === 0) problems.push(`${where}: add at least one item.`);
      b.items.forEach((it, j) => {
        if (!it.description.trim()) problems.push(`${where}: item ${j + 1} needs a description.`);
        if (!(it.quantity > 0)) problems.push(`${where}: item ${j + 1} quantity must be more than 0.`);
        if (!(it.rate >= 0)) problems.push(`${where}: item ${j + 1} rate can't be negative.`);
      });
      if (b.taxMode !== "none" && !(b.taxPercent > 0 && b.taxPercent <= 100)) problems.push(`${where}: tax % must be between 0 and 100.`);
    }
    if ((b.type === "paragraph" || b.type === "heading") && !b.text.trim()) problems.push(`${where} is empty.`);
  });
  const placeholders = new Set(JSON.stringify(content).match(/\[(?:[A-Z][^\]]{2,60})\]|X,XX,XXX|DD Month YYYY/g) ?? []);
  placeholders.forEach((p) => problems.push(`Replace the placeholder “${p}”.`));
  return problems;
}

export function BlockEditor({ content, onChange, disabled }: { content: DocumentContent; onChange: (c: DocumentContent) => void; disabled?: boolean }) {
  const setBlocks = (blocks: Block[]) => onChange({ ...content, blocks });
  const update = (i: number, block: Block) => setBlocks(content.blocks.map((b, j) => (j === i ? block : b)));
  const move = (i: number, by: -1 | 1) => {
    const next = [...content.blocks];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    setBlocks(next);
  };

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-3 disabled:opacity-70">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Document heading
        <Textarea
          rows={2}
          maxLength={60}
          value={content.heading}
          onChange={(e) => onChange({ ...content, heading: e.target.value.toUpperCase() })}
          placeholder={"OFFER\nLETTER"}
        />
        <span className="text-xs font-normal text-muted-foreground">Second line prints in blue.</span>
      </label>

      {content.blocks.map((block, i) => (
        <section key={i} className="rounded-lg border bg-card p-3" aria-label={BLOCK_LABEL[block.type]}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="eyebrow">{BLOCK_LABEL[block.type]}</p>
            <div className="flex gap-0.5">
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp className="size-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7" aria-label="Move down" disabled={i === content.blocks.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown className="size-3.5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" aria-label="Remove block" onClick={() => setBlocks(content.blocks.filter((_, j) => j !== i))}>
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
          <BlockFields block={block} onChange={(b) => update(i, b)} />
        </section>
      ))}

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button type="button" variant="outline" className="self-start" />}>
          <Plus className="size-4" />
          Add block
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {(Object.keys(NEW_BLOCK) as BlockType[]).map((t) => (
            <DropdownMenuItem key={t} onClick={() => setBlocks([...content.blocks, NEW_BLOCK[t]()])}>
              {BLOCK_LABEL[t]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </fieldset>
  );
}

function BlockFields({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  switch (block.type) {
    case "fields":
      return <PairsEditor pairs={block.items} max={4} onChange={(items) => onChange({ ...block, items })} />;
    case "details":
      return <PairsEditor pairs={block.rows} max={MAX_ROWS} onChange={(rows) => onChange({ ...block, rows })} />;
    case "heading":
      return <Input aria-label="Heading" maxLength={SHORT_MAX} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />;
    case "paragraph":
      return <Textarea aria-label="Paragraph" rows={3} maxLength={TEXT_MAX} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />;
    case "list":
      return <ListEditor block={block} onChange={onChange} />;
    case "parties":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {(["left", "right"] as const).map((side) => (
            <div key={side} className="flex flex-col gap-1.5">
              <Input aria-label="Label" maxLength={40} value={block[side].label} onChange={(e) => onChange({ ...block, [side]: { ...block[side], label: e.target.value } })} />
              <Input aria-label="Name" maxLength={SHORT_MAX} value={block[side].value} onChange={(e) => onChange({ ...block, [side]: { ...block[side], value: e.target.value } })} />
              <Textarea aria-label="Address lines" rows={3} maxLength={500} value={block[side].lines} onChange={(e) => onChange({ ...block, [side]: { ...block[side], lines: e.target.value } })} />
            </div>
          ))}
        </div>
      );
    case "lineItems":
      return <LineItemsEditor block={block} onChange={onChange} />;
    case "highlight":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Label" maxLength={80} value={block.label} onChange={(e) => onChange({ ...block, label: e.target.value })} />
          <Input aria-label="Value" maxLength={80} value={block.value} onChange={(e) => onChange({ ...block, value: e.target.value })} />
          <Input aria-label="Caption" className="sm:col-span-2" maxLength={SHORT_MAX} value={block.caption ?? ""} onChange={(e) => onChange({ ...block, caption: e.target.value })} />
        </div>
      );
    case "note":
      return (
        <div className="flex flex-col gap-2">
          <Input aria-label="Title" maxLength={60} value={block.title} onChange={(e) => onChange({ ...block, title: e.target.value })} />
          <Textarea aria-label="Lines (one per line)" rows={3} maxLength={TEXT_MAX} value={block.text} onChange={(e) => onChange({ ...block, text: e.target.value })} />
        </div>
      );
    case "signoff":
      return <Input aria-label="Closing" maxLength={60} value={block.closing} onChange={(e) => onChange({ ...block, closing: e.target.value })} />;
    case "signatures":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input aria-label="Left signer" maxLength={80} value={block.left} onChange={(e) => onChange({ ...block, left: e.target.value })} />
          <Input aria-label="Right signer" maxLength={80} value={block.right} onChange={(e) => onChange({ ...block, right: e.target.value })} />
        </div>
      );
    case "payment":
      return <p className="text-xs text-muted-foreground">Uses the bank and UPI details from Settings → Letterhead.</p>;
    case "acceptance":
      return <p className="text-xs text-muted-foreground">Prints “Accepted: ____ Date: ____” for the recipient to sign.</p>;
  }
}

function PairsEditor({ pairs, max, onChange }: { pairs: LabeledValue[]; max: number; onChange: (p: LabeledValue[]) => void }) {
  const set = (i: number, patch: Partial<LabeledValue>) => onChange(pairs.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="flex flex-col gap-2">
      {pairs.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1.4fr_auto] gap-2">
          <Input aria-label="Label" maxLength={40} value={p.label} onChange={(e) => set(i, { label: e.target.value })} />
          <Input aria-label="Value" maxLength={SHORT_MAX} value={p.value} onChange={(e) => set(i, { value: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove row" onClick={() => onChange(pairs.filter((_, j) => j !== i))}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {pairs.length < max && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange([...pairs, { label: "", value: "" }])}>
          <Plus className="size-3.5" /> Add row
        </Button>
      )}
    </div>
  );
}

function ListEditor({ block, onChange }: { block: Extract<Block, { type: "list" }>; onChange: (b: Block) => void }) {
  const set = (i: number, patch: Partial<ListItem>) => onChange({ ...block, items: block.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  return (
    <div className="flex flex-col gap-2">
      <NativeSelect aria-label="List style" className="w-40" value={block.style} onChange={(e) => onChange({ ...block, style: e.target.value as "numbered" | "bullet" })}>
        <option value="numbered">Numbered</option>
        <option value="bullet">Bullets</option>
      </NativeSelect>
      {block.items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-start gap-2">
          <Input aria-label="Bold lead-in (optional)" placeholder="Lead-in" maxLength={60} value={it.title ?? ""} onChange={(e) => set(i, { title: e.target.value || undefined })} />
          <Textarea aria-label="Item text" rows={2} maxLength={1000} value={it.text} onChange={(e) => set(i, { text: e.target.value })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {block.items.length < MAX_ROWS && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange({ ...block, items: [...block.items, { text: "" }] })}>
          <Plus className="size-3.5" /> Add item
        </Button>
      )}
    </div>
  );
}

function LineItemsEditor({ block, onChange }: { block: Extract<Block, { type: "lineItems" }>; onChange: (b: Block) => void }) {
  const set = (i: number, patch: Partial<LineItem>) => onChange({ ...block, items: block.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const num = (v: string) => (v === "" ? Number.NaN : Number(v));
  const totals = computeTotals(block.items, block.taxMode, block.taxPercent);
  return (
    <div className="flex flex-col gap-2">
      {block.items.map((it, i) => (
        <div key={i} className="grid grid-cols-[1fr_4.5rem_7rem_auto] items-start gap-2">
          <div className="flex flex-col gap-1">
            <Input aria-label="Description" aria-invalid={!it.description.trim() || undefined} placeholder="Description" maxLength={SHORT_MAX} value={it.description} onChange={(e) => set(i, { description: e.target.value })} />
            <Input aria-label="Detail (optional)" placeholder="Detail (optional)" maxLength={SHORT_MAX} value={it.detail ?? ""} onChange={(e) => set(i, { detail: e.target.value || undefined })} />
          </div>
          <Input aria-label="Quantity" aria-invalid={!(it.quantity > 0) || undefined} type="number" inputMode="decimal" min={0.01} step="any" value={Number.isNaN(it.quantity) ? "" : it.quantity} onChange={(e) => set(i, { quantity: num(e.target.value) })} />
          <Input aria-label="Rate (₹)" aria-invalid={!(it.rate >= 0) || undefined} type="number" inputMode="decimal" min={0} step="0.01" value={Number.isNaN(it.rate) ? "" : it.rate} onChange={(e) => set(i, { rate: num(e.target.value) })} />
          <Button type="button" variant="ghost" size="icon" aria-label="Remove item" disabled={block.items.length === 1} onClick={() => onChange({ ...block, items: block.items.filter((_, j) => j !== i) })}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}
      {block.items.length < MAX_ROWS && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange({ ...block, items: [...block.items, { description: "", quantity: 1, rate: 0 }] })}>
          <Plus className="size-3.5" /> Add item
        </Button>
      )}
      <div className="grid gap-2 border-t pt-2 sm:grid-cols-[1fr_6rem_1fr]">
        <NativeSelect aria-label="Tax" value={block.taxMode} onChange={(e) => onChange({ ...block, taxMode: e.target.value as typeof block.taxMode })}>
          <option value="none">No GST</option>
          <option value="cgst_sgst">CGST + SGST (within Tamil Nadu)</option>
          <option value="igst">IGST (other states)</option>
        </NativeSelect>
        <Input aria-label="GST %" type="number" min={0} max={100} step="0.01" disabled={block.taxMode === "none"} value={Number.isNaN(block.taxPercent) ? "" : block.taxPercent} onChange={(e) => onChange({ ...block, taxPercent: num(e.target.value) })} />
        <Input aria-label="Total label" maxLength={40} value={block.totalLabel} onChange={(e) => onChange({ ...block, totalLabel: e.target.value })} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4 accent-primary" checked={block.showRate} onChange={(e) => onChange({ ...block, showRate: e.target.checked })} />
        Show rate column
      </label>
      <p className="text-right text-sm">
        Total <span className="font-semibold tabular-nums">₹ {formatRupees(totals.total)}</span>
      </p>
    </div>
  );
}
