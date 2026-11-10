"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Clock, Pencil, Plus, Scale, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { PanelCard } from "@/components/common/panel-card";
import { SearchInput } from "@/components/common/search-input";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { StatusBadge } from "@/components/common/status-badge";
import { LedgerDialog } from "@/components/company/ledger-dialog";
import { useDeleteLedgerEntry, useLedger, useLedgerSummary } from "@/hooks/use-company";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { categoryLabel, inr, type LedgerEntry, paymentMethodLabel } from "@/lib/company-types";

export default function PaymentsPage() {
  const [direction, setDirection] = useState<"" | "in" | "out">("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data: entries, isLoading } = useLedger({ direction: direction || undefined, search: search || undefined, from: from || undefined, to: to || undefined });
  const { data: summary } = useLedgerSummary();
  const del = useDeleteLedgerEntry();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<LedgerEntry | null>(null);
  const [deleting, setDeleting] = useState<LedgerEntry | null>(null);

  const chart = (summary?.monthly ?? []).map((m) => ({
    month: new Date(m.month + "-01").toLocaleString("en-IN", { month: "short" }),
    In: m.in,
    Out: m.out,
  }));
  const shownIn = (entries ?? []).filter((e) => e.direction === "in").reduce((s, e) => s + e.amount, 0);
  const shownOut = (entries ?? []).filter((e) => e.direction === "out").reduce((s, e) => s + e.amount, 0);
  const topOut = (summary?.categories ?? []).filter((c) => c.direction === "out").slice(0, 6);
  const maxOut = Math.max(1, ...topOut.map((c) => c.total));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        subtitle="Every rupee in and out — salaries, stipends, vendors and client payments. Invoice payments from Billing appear here automatically."
        action={
          <Button
            className="rounded-full"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={ArrowDownLeft} iconClassName="bg-green-100 text-green-600" label="In this month" value={summary && inr(summary.thisMonthIn)} />
        <KpiCard icon={ArrowUpRight} iconClassName="bg-red-100 text-red-600" label="Out this month" value={summary && inr(summary.thisMonthOut)} />
        <KpiCard
          icon={Scale}
          iconClassName="bg-blue-100 text-blue-600"
          label="Net balance (all time)"
          value={summary && inr(summary.net)}
          trend={summary && { direction: summary.net >= 0 ? "up" : "down", text: `${inr(summary.totalIn)} in · ${inr(summary.totalOut)} out` }}
        />
        <KpiCard icon={Clock} iconClassName="bg-amber-100 text-amber-600" label="Receivable (unpaid invoices)" value={summary && inr(summary.receivable)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelCard title="Cash flow" subtitle="Last 6 months" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={52} tickFormatter={(v: number) => (v >= 1000 ? `₹${Math.round(v / 1000)}K` : `₹${v}`)} />
              <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "var(--border)" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="In" fill="#1565c0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Out" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </PanelCard>
        <PanelCard title="Where money goes" subtitle="Top spend categories, 6 months" contentClassName="flex flex-col gap-3">
          {topOut.length === 0 && <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>}
          {topOut.map((c) => (
            <div key={c.category}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="capitalize">{categoryLabel(c.category)}</span>
                <span className="font-medium tabular-nums">{inr(c.total)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-red-400" style={{ width: `${(c.total / maxOut) * 100}%` }} />
              </div>
            </div>
          ))}
        </PanelCard>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          {(["", "in", "out"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                direction === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {d === "" ? "All" : d === "in" ? "Money in" : "Money out"}
            </button>
          ))}
        </div>
        <div className="min-w-56 flex-1">
          <SearchInput placeholder="Search party, notes, reference…" value={search} onChange={setSearch} />
        </div>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Party</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries?.map((e) => (
                <tr key={e.source + e.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 whitespace-nowrap">{e.date.slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{e.party || e.clientName || "—"}</p>
                    {e.notes && <p className="max-w-64 truncate text-xs text-muted-foreground">{e.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="capitalize">{categoryLabel(e.category)}</span>
                    {e.source === "invoice" && (
                      <StatusBadge tone="info" className="ml-2">
                        invoice
                      </StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{e.method ? (paymentMethodLabel[e.method] ?? e.method) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.projectName ?? "—"}</td>
                  <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", e.direction === "in" ? "text-green-600" : "text-red-600")}>
                    {e.direction === "in" ? "+" : "−"}
                    {inr(e.amount)}
                  </td>
                  <td className="px-2 py-3 text-right whitespace-nowrap">
                    {e.source === "manual" ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground"
                          onClick={() => {
                            setEditing(e);
                            setOpen(true);
                          }}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => setDeleting(e)}>
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    ) : (
                      <Link href={`/billing/${e.invoiceId}`} className="px-2 text-xs text-primary hover:underline">
                        View invoice
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {entries?.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    No payments match.
                  </td>
                </tr>
              )}
            </tbody>
            {entries && entries.length > 0 && (
              <tfoot className="border-t bg-muted/20 text-sm">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-right text-muted-foreground">
                    Shown: in {inr(shownIn)} · out {inr(shownOut)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{inr(shownIn - shownOut)}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <LedgerDialog entry={editing} open={open} onOpenChange={setOpen} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete payment?"
        description={deleting ? `${inr(deleting.amount)} on ${deleting.date.slice(0, 10)} will be removed from the ledger.` : ""}
        confirmLabel="Delete"
        isPending={del.isPending}
        onConfirm={() =>
          deleting &&
          del.mutate(deleting.id, {
            onSuccess: () => {
              toast.success("Payment deleted");
              setDeleting(null);
            },
            onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete"),
          })
        }
      />
    </div>
  );
}
