"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, CalendarClock, GraduationCap, IndianRupee, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { StatusBadge } from "@/components/common/status-badge";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { internshipProgress, internStatusLabel, internStatusTone } from "@/components/interns/intern-profile";
import { useInternSummary, useInterns } from "@/hooks/use-interns";
import { readSession } from "@/lib/session";
import { seesCompanyRecords } from "@/lib/types";
import { cn } from "@/lib/utils";
import { inr, type InternshipStatus } from "@/lib/company-types";

const PAGE_SIZE = 24;
const tabs: { key: InternshipStatus | ""; label: string }[] = [
  { key: "", label: "All" },
  { key: "ongoing", label: "Ongoing" },
  { key: "completed", label: "Completed" },
  { key: "converted", label: "Converted" },
  { key: "terminated", label: "Terminated" },
];

export default function InternsPage() {
  // Management sees every intern and the programme totals; a mentor sees their own interns.
  const management = seesCompanyRecords(readSession().role);
  const [status, setStatus] = useState<InternshipStatus | "">("");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useInterns({ status: status || undefined, page, limit: PAGE_SIZE });
  const { data: summary } = useInternSummary(management);
  const interns = data?.interns ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={management ? "Interns" : "My Interns"}
        subtitle={management ? "Mentors, progress, evaluations and certificates." : "Interns you mentor: progress and evaluations."}
        action={
          management && (
            <Button className="rounded-full" render={<Link href="/employees" />}>
              <UserPlus className="size-4" />
              Add Intern
            </Button>
          )
        }
      />

      {management && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard icon={GraduationCap} iconClassName="bg-blue-100 text-blue-600" label="Active interns" value={summary?.active} />
          <KpiCard icon={IndianRupee} iconClassName="bg-green-100 text-green-600" label="Monthly stipend" value={summary && inr(summary.monthlyStipend)} />
          <KpiCard icon={CalendarClock} iconClassName="bg-amber-100 text-amber-600" label="Ending in 30 days" value={summary?.endingSoon} />
          <KpiCard icon={Award} iconClassName="bg-violet-100 text-violet-600" label="Completed / converted" value={summary && `${summary.completed} / ${summary.converted}`} />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setStatus(t.key);
              setPage(1);
            }}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium",
              status === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load interns.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : interns.length === 0 ? (
        <EmptyState
          className="rounded-xl border bg-card"
          icon={GraduationCap}
          title={management ? "No interns here" : "You don't mentor any interns yet"}
          hint={management ? "Add a person under Employees with employment type Intern; they appear here." : "HR or a manager sets the mentor on an intern's profile."}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {interns.map((i) => {
            const progress = internshipProgress(i);
            return (
              <Link
                key={i.employeeId}
                href={`/interns/${i.employeeId}`}
                className="flex flex-col gap-3 rounded-xl border bg-card p-4 transition hover:border-primary/50"
              >
                <div className="flex items-start gap-3">
                  <AvatarInitials name={i.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{i.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {i.designation} · {i.employeeCode}
                    </p>
                  </div>
                  <StatusBadge tone={internStatusTone[i.status]}>{internStatusLabel[i.status]}</StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Field label="College" value={i.college} />
                  <Field label="Mentor" value={i.mentorName} />
                  {i.stipend !== undefined && <Field label="Stipend" value={`${inr(i.stipend)}/mo`} />}
                  <Field label="Tasks" value={`${i.completedTasks} done · ${i.openTasks} open`} />
                </div>
                {progress && i.status === "ongoing" && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{progress.pct}% through</span>
                      <span>{progress.daysLeft} days left</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  {i.certificateNumber && <StatusBadge tone="success">Certificate issued</StatusBadge>}
                  {i.evaluationScore != null && <StatusBadge tone="neutral">Final score {i.evaluationScore}</StatusBadge>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {data && data.total > PAGE_SIZE && <Pagination page={page} limit={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <p className="truncate font-medium">{value || "—"}</p>
    </div>
  );
}
