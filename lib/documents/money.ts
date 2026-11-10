import type { LineItem, TaxMode } from "@/lib/documents/types";

// All money maths runs in integer paise so ₹0.1 + ₹0.2 never becomes 0.30000000000000004.
const toPaise = (rupees: number) => Math.round(rupees * 100);

export interface Totals {
  subtotal: number;
  /** One entry per tax line, e.g. CGST 9% + SGST 9%, or a single IGST 18%. */
  taxes: { label: string; amount: number }[];
  total: number;
}

export function lineAmount(item: LineItem): number {
  return Math.round(toPaise(item.rate) * (item.quantity || 0)) / 100;
}

export function computeTotals(items: LineItem[], taxMode: TaxMode, taxPercent: number): Totals {
  const subtotalPaise = items.reduce((sum, i) => sum + Math.round(toPaise(i.rate) * (i.quantity || 0)), 0);
  const taxes: Totals["taxes"] = [];
  if (taxMode === "cgst_sgst" && taxPercent > 0) {
    const half = taxPercent / 2;
    const each = Math.round((subtotalPaise * half) / 100);
    taxes.push({ label: `CGST ${half}%`, amount: each / 100 }, { label: `SGST ${half}%`, amount: each / 100 });
  } else if (taxMode === "igst" && taxPercent > 0) {
    taxes.push({ label: `IGST ${taxPercent}%`, amount: Math.round((subtotalPaise * taxPercent) / 100) / 100 });
  }
  const taxPaise = taxes.reduce((sum, t) => sum + toPaise(t.amount), 0);
  return { subtotal: subtotalPaise / 100, taxes, total: (subtotalPaise + taxPaise) / 100 };
}

/** ₹ 1,35,700.00 — Indian digit grouping, always two decimals, as on the templates. */
export function formatRupees(amount: number): string {
  return amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
