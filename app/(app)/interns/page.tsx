"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, CalendarClock, GraduationCap, IndianRupee, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { InternDialog } from "@/components/company/intern-sheet";
import { useInternSummary, useInterns } from "@/hooks/use-company";
import { cn } from "@/lib/utils";
import { inr, type Intern, type InternshipStatus } from "@/lib/company-types";

const tone: Record<InternshipStatus, StatusTone> = { ongoing: "info", completed: "success", terminated: "danger", converted: "accent" };
const tabs: { key: InternshipStatus | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "converted", label: "Converted" },
];

function progress(i: Intern) {
  const start = new Date((i.startDate ?? i.joinDate).slice(0, 10)).getTime();
  if (!i.endDate) return null;
  const end = new Date(i.endDate.slice(0, 10)).getTime();
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
}

export default function InternsPage() {
  const [status, setStatus] = useState<InternshipStatus | "">("");
  const { data: interns, isLoading } = useInterns(status || undefined);
  const { data: summary } = useInternSummary();
  const [selected, setSelected] = useState<Intern | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Interns"
        subtitle="Internship programme — mentors, stipends, evaluations and certificates. Interns log in with their own account to see assigned tasks."
        action={
          <Button className="rounded-full" render={<Link href="/employees" />}>
            <UserPlus className="size-4" />
            Add Intern
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={GraduationCap} iconClassName="bg-blue-100 text-blue-600" label="Active interns" value={summary?.active} />
        <KpiCard icon={IndianRupee} iconClassName="bg-green-100 text-green-600" label="Monthly stipend" value={summary && inr(summary.monthlyStipend)} />
        <KpiCard icon={CalendarClock} iconClassName="bg-amber-100 text-amber-600" label="Ending in 30 days" value={summary?.endingSoon} />
        <KpiCard
          icon={Award}
          iconClassName="bg-violet-100 text-violet-600"
          label="Completed / converted"
          value={summary && `${summary.completed} / ${summary.converted}`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              status === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : interns && interns.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {interns.map((i) => {
            const pct = progress(i);
            return (
              <button key={i.employeeId} onClick={() => setSelected(i)} className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition hover:border-primary/50">
                <div className="flex items-start gap-3">
                  <AvatarInitials name={i.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.designation} · {i.employeeCode}
                    </p>
                  </div>
                  <StatusBadge tone={tone[i.status]}>{i.status}</StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">College</p>
                    <p className="truncate font-medium">{i.college || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mentor</p>
                    <p className="truncate font-medium">{i.mentorName || "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Stipend</p>
                    <p className="font-medium">{inr(i.stipend)}/mo</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tasks</p>
                    <p className="font-medium">
                      {i.completedTasks} done · {i.openTasks} open
                    </p>
                  </div>
                </div>
                {pct !== null && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {(i.startDate ?? i.joinDate).slice(0, 10)} → {i.endDate?.slice(0, 10)}
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex gap-2 text-xs">
                  {i.certificateIssued && <StatusBadge tone="success">Certificate issued</StatusBadge>}
                  {i.evaluationScore !== undefined && i.evaluationScore !== null && <StatusBadge tone="neutral">Score {i.evaluationScore}</StatusBadge>}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          No interns yet. Add a person under Employees with employment type <b>Intern</b> and tick “create login” — they’ll appear here and can sign
          in to see their tasks.
        </div>
      )}

      <InternDialog intern={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </div>
  );
}
