"use client";

import { useState } from "react";
import { CalendarClock, IndianRupee, Plus, Target, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { SearchInput } from "@/components/common/search-input";
import { LeadDialog } from "@/components/company/lead-dialog";
import { useLeadSummary, useLeads, useSaveLead } from "@/hooks/use-company";
import { cn } from "@/lib/utils";
import { inr, LEAD_STAGES, leadStageLabel, type Lead, type LeadStage } from "@/lib/company-types";

const stageAccent: Record<LeadStage, string> = {
  new: "border-t-slate-400",
  contacted: "border-t-sky-400",
  qualified: "border-t-blue-500",
  proposal: "border-t-amber-400",
  negotiation: "border-t-violet-500",
  won: "border-t-green-500",
  lost: "border-t-red-400",
};

export default function LeadsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useLeads({ search: search || undefined });
  const { data: summary } = useLeadSummary();
  const save = useSaveLead();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const leads = data?.leads ?? [];
  const today = new Date().toISOString().slice(0, 10);

  const moveTo = (id: string, stage: LeadStage) => {
    const l = leads.find((x) => x.id === id);
    if (l && l.stage !== stage) save.mutate({ id, input: { stage } });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leads"
        subtitle="Track every enquiry from first contact to signed client. Drag cards between stages."
        action={
          <Button
            className="rounded-full"
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" />
            Add Lead
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={IndianRupee} iconClassName="bg-blue-100 text-blue-600" label="Open pipeline" value={summary && inr(summary.openValue)} />
        <KpiCard icon={Trophy} iconClassName="bg-green-100 text-green-600" label="Won value" value={summary && inr(summary.wonValue)} />
        <KpiCard icon={Target} iconClassName="bg-violet-100 text-violet-600" label="Win rate" value={summary && `${summary.conversionPct.toFixed(0)}%`} />
        <KpiCard icon={CalendarClock} iconClassName="bg-amber-100 text-amber-600" label="Follow-ups due" value={summary?.followUpsDue} />
      </div>

      <SearchInput placeholder="Search leads by name, company or email…" value={search} onChange={setSearch} />

      {isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {LEAD_STAGES.map((stage) => {
            const items = leads.filter((l) => l.stage === stage);
            const value = items.reduce((s, l) => s + l.estimatedValue, 0);
            return (
              <div
                key={stage}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dragId && moveTo(dragId, stage)}
                className={cn("flex w-64 shrink-0 flex-col gap-2 rounded-xl border border-t-4 bg-card p-3", stageAccent[stage])}
              >
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-semibold">{leadStageLabel[stage]}</p>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                <p className="-mt-1 text-xs text-muted-foreground">{inr(value)}</p>
                <div className="flex min-h-24 flex-col gap-2">
                  {items.map((l) => (
                    <button
                      key={l.id}
                      draggable
                      onDragStart={() => setDragId(l.id)}
                      onDragEnd={() => setDragId(null)}
                      onClick={() => {
                        setEditing(l);
                        setOpen(true);
                      }}
                      className="rounded-lg border bg-background p-3 text-left shadow-xs transition hover:border-primary/50"
                    >
                      <p className="truncate text-sm font-medium">{l.company || l.name}</p>
                      {l.company && <p className="truncate text-xs text-muted-foreground">{l.name}</p>}
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-medium text-primary">{inr(l.estimatedValue)}</span>
                        {l.nextFollowUp && (
                          <span className={cn("text-muted-foreground", l.nextFollowUp.slice(0, 10) <= today && !["won", "lost"].includes(l.stage) && "font-medium text-amber-600")}>
                            ⏰ {l.nextFollowUp.slice(0, 10)}
                          </span>
                        )}
                      </div>
                      {(l.serviceInterest || l.ownerName) && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {[l.serviceInterest, l.ownerName].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </button>
                  ))}
                  {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground/60">Drop here</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && leads.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="size-4" /> No leads yet — add your first enquiry.
        </p>
      )}

      <LeadDialog lead={editing} open={open} onOpenChange={setOpen} />
    </div>
  );
}
