"use client";

import { useState } from "react";
import { Award, Download, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { EmptyState } from "@/components/common/empty-state";
import { PanelCard } from "@/components/common/panel-card";
import { StatBlock } from "@/components/common/stat-block";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { InternDialog } from "@/components/company/intern-sheet";
import { EvaluationDialog, RATINGS } from "@/components/interns/evaluation-dialog";
import { useAttendanceList } from "@/hooks/use-attendance";
import { downloadCertificate, useInternEvaluations, useIssueCertificate } from "@/hooks/use-interns";
import { ApiError } from "@/lib/api";
import { inr, type Intern, type InternshipStatus } from "@/lib/company-types";
import { localIsoDate } from "@/lib/dates";

export const internStatusTone: Record<InternshipStatus, StatusTone> = { ongoing: "info", completed: "success", terminated: "danger", converted: "accent" };
export const internStatusLabel: Record<InternshipStatus, string> = {
  ongoing: "Ongoing",
  completed: "Completed",
  terminated: "Terminated",
  converted: "Converted to full-time",
};

const DAY_MS = 86_400_000;
const fmtDate = (iso?: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/** Progress through the internship and days left, from its dates. */
export function internshipProgress(i: Intern): { pct: number; daysLeft: number } | null {
  if (!i.startDate || !i.endDate) return null;
  const start = Date.parse(`${i.startDate.slice(0, 10)}T00:00:00`);
  const end = Date.parse(`${i.endDate.slice(0, 10)}T00:00:00`);
  const today = Date.parse(`${localIsoDate()}T00:00:00`);
  const pct = end > start ? Math.round(((today - start) / (end - start)) * 100) : 100;
  return { pct: Math.max(0, Math.min(100, pct)), daysLeft: Math.max(0, Math.round((end - today) / DAY_MS)) };
}

/**
 * Everything about one internship: profile, attendance and tasks, evaluations
 * and the certificate. Buttons appear only where the API says the viewer may act.
 */
export function InternProfile({ intern, self = false }: { intern: Intern; self?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const { data: evaluations, isLoading: evalLoading, isError: evalError, refetch } = useInternEvaluations(intern.employeeId);
  const progress = internshipProgress(intern);
  const hasFinal = (evaluations ?? []).some((e) => e.kind === "final");

  // Attendance during the internship. A mentor who is not the reporting manager
  // may not see it; the card is simply left out then.
  const from = intern.startDate?.slice(0, 10);
  const today = localIsoDate();
  const to = intern.endDate && intern.endDate.slice(0, 10) < today ? intern.endDate.slice(0, 10) : today;
  const { data: attendance, isError: attendanceHidden } = useAttendanceList(
    { employeeId: intern.employeeId, from, to, limit: 1 },
    { enabled: !!from && from <= to },
  );
  const a = attendance?.summary;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start">
        <AvatarInitials name={intern.fullName} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{intern.fullName}</h1>
            <StatusBadge tone={internStatusTone[intern.status]}>{internStatusLabel[intern.status]}</StatusBadge>
          </div>
          <p className="text-sm text-muted-foreground">
            {intern.designation} · {intern.employeeCode}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Info label="College" value={intern.college} />
            <Info label="Course" value={intern.course} />
            <Info label="Mentor" value={intern.mentorName} />
            <Info label="Starts" value={fmtDate(intern.startDate)} />
            <Info label="Ends" value={fmtDate(intern.endDate)} />
            {intern.stipend !== undefined && <Info label="Stipend" value={`${inr(intern.stipend)}/month`} />}
          </dl>
          {progress && intern.status === "ongoing" && (
            <div className="mt-4 max-w-md">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{progress.pct}% through</span>
                <span>{progress.daysLeft === 0 ? "Ends today" : `${progress.daysLeft} days left`}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          )}
        </div>
        {intern.can.edit && (
          <Button variant="outline" className="self-start" onClick={() => setEditing(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {a && !attendanceHidden && (
          <>
            <StatBlock tone="green" value={a.present + a.remote} label="Days present" />
            <StatBlock tone="yellow" value={a.late} label="Late" />
            <StatBlock tone="red" value={a.absent} label="Absent" />
            <StatBlock tone="orange" value={a.onLeave + a.halfDay} label="Leave" />
          </>
        )}
        <StatBlock tone="blue" value={intern.completedTasks} label="Tasks done" />
        <StatBlock tone="purple" value={intern.openTasks} label="Tasks open" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PanelCard
          title="Evaluations"
          className="lg:col-span-2"
          action={
            intern.can.evaluate && (
              <Button size="sm" onClick={() => setEvaluating(true)}>
                <Plus className="size-4" />
                Add evaluation
              </Button>
            )
          }
          contentClassName="flex flex-col gap-3"
        >
          {evalError ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load evaluations.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : evalLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (evaluations ?? []).length === 0 ? (
            <EmptyState
              className="py-6"
              title="No evaluations yet"
              hint={self ? "Your mentor's feedback will appear here." : "Add a progress review during the internship and a final evaluation at the end."}
            />
          ) : (
            evaluations!.map((e) => (
              <article key={e.id} className="rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={e.kind === "final" ? "accent" : "neutral"}>{e.kind === "final" ? "Final" : "Progress review"}</StatusBadge>
                    <span className="text-sm text-muted-foreground">
                      {fmtDate(e.periodStart)} – {fmtDate(e.periodEnd)}
                    </span>
                  </div>
                  <span className="text-lg font-semibold tabular-nums">{e.score}/100</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  {RATINGS.map((r) => (
                    <p key={r.key}>
                      <span className="text-muted-foreground">{r.label}: </span>
                      <span className="font-medium">{e[r.key]}/5</span>
                    </p>
                  ))}
                </div>
                {e.strengths && <Note label="Strengths" text={e.strengths} />}
                {e.improvements && <Note label="To improve" text={e.improvements} />}
                {e.comments && <Note label="Comments" text={e.comments} />}
                {e.evaluatorName && <p className="mt-2 text-xs text-muted-foreground">By {e.evaluatorName}</p>}
              </article>
            ))
          )}
        </PanelCard>

        <CertificatePanel intern={intern} hasFinal={hasFinal} self={self} />
      </div>

      {intern.can.edit && <InternDialog intern={intern} open={editing} onOpenChange={setEditing} />}
      {intern.can.evaluate && <EvaluationDialog intern={intern} hasFinal={hasFinal} open={evaluating} onOpenChange={setEvaluating} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-medium" title={value}>
        {value || "—"}
      </dd>
    </div>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  return (
    <p className="mt-2 break-words text-sm">
      <span className="font-medium text-muted-foreground">{label}: </span>
      {text}
    </p>
  );
}

function CertificatePanel({ intern, hasFinal, self }: { intern: Intern; hasFinal: boolean; self: boolean }) {
  const issue = useIssueCertificate(intern.employeeId);
  const { confirm, confirmDialog } = useConfirm();
  const [downloading, setDownloading] = useState(false);
  const finished = intern.status === "completed" || intern.status === "converted";

  const download = async () => {
    setDownloading(true);
    try {
      await downloadCertificate(intern.employeeId, `${intern.certificateNumber}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download the certificate");
    } finally {
      setDownloading(false);
    }
  };

  const askIssue = () =>
    confirm({
      title: `Issue ${intern.fullName}'s certificate?`,
      description: "A permanent certificate number is assigned and the intern can download it. This can't be undone.",
      confirmLabel: "Issue certificate",
      onConfirm: () =>
        issue.mutate(undefined, {
          onSuccess: () => toast.success("Certificate issued"),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not issue the certificate"),
        }),
    });

  const missing = [!finished && "mark the internship Completed", !hasFinal && "add a final evaluation"].filter(Boolean) as string[];

  return (
    <PanelCard title="Certificate" contentClassName="flex flex-col gap-3">
      {confirmDialog}
      {intern.certificateNumber ? (
        <>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400">
              <Award className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium">{intern.certificateNumber}</p>
              <p className="text-xs text-muted-foreground">Issued {fmtDate(intern.certificateIssuedAt)}</p>
            </div>
          </div>
          <Button variant="outline" onClick={download} disabled={downloading}>
            <Download className="size-4" />
            {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </>
      ) : intern.can.issueCertificate ? (
        <>
          <p className="text-sm text-muted-foreground">
            {missing.length === 0 ? "Ready to issue." : `To issue the certificate, ${missing.join(" and ")}.`}
          </p>
          <Button onClick={askIssue} disabled={missing.length > 0 || issue.isPending}>
            <Award className="size-4" />
            {issue.isPending ? "Issuing…" : "Issue certificate"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {self
            ? "Your certificate will be ready to download here once your internship is completed and HR issues it."
            : "Not issued yet. HR issues it after the internship is completed."}
        </p>
      )}
    </PanelCard>
  );
}
