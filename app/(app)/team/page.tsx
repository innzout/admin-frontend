"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, Plus, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { StatusBadge } from "@/components/common/status-badge";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { TaskPanel } from "@/components/tasks/task-panel";
import type { Task } from "@/lib/types";
import { useTask, useTasks, useTeamLoad, type MemberLoad } from "@/hooks/use-tasks";
import { ClipboardCheck } from "lucide-react";
import { taskStatusLabel, taskStatusTone } from "@/lib/status";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { localIsoDate } from "@/lib/dates";

/** Days without any task update before someone is flagged as possibly stuck. */
const STALE_DAYS = 3;
const MEMBER_TASK_LIMIT = 50;
/** Review queue size shown at once; it is oldest-first, so nothing waits unseen. */
const REVIEW_QUEUE_LIMIT = 50;
const OPEN_STATUSES = new Set(["new", "in_progress", "in_review"]);

const isStale = (m: MemberLoad) => m.open > 0 && (!m.lastActivityAt || Date.now() - Date.parse(m.lastActivityAt) > STALE_DAYS * 86_400_000);

export default function TeamPage() {
  const { data: members, isLoading, isError, refetch } = useTeamLoad();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assignTo, setAssignTo] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const { data: queue } = useTasks({
    status: "in_review",
    sort: "submittedAt",
    dir: "asc",
    limit: REVIEW_QUEUE_LIMIT,
  });
  const reviewTasks = queue?.tasks ?? [];

  const list = (members ?? []).filter((m) => m.fullName.toLowerCase().includes(search.trim().toLowerCase()));
  const totals = (members ?? []).reduce(
    (t, m) => ({
      open: t.open + m.open,
      review: t.review + m.inReview,
      overdue: t.overdue + m.overdue,
      idle: t.idle + (m.open === 0 ? 1 : 0),
    }),
    { open: 0, review: 0, overdue: 0, idle: 0 },
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Team Board"
        subtitle="Assign work, review what's submitted, and spot late or stuck tasks."
        action={
          <Button className="rounded-full" onClick={() => setAssignTo("")}>
            <Plus className="size-4" /> Assign task
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Open tasks" value={totals.open} />
        <Stat label="Waiting for your review" value={totals.review} tone={totals.review ? "info" : undefined} />
        <Stat label="Overdue" value={totals.overdue} tone={totals.overdue ? "danger" : undefined} />
        <Stat label="People with no open task" value={totals.idle} />
      </div>

      <ReviewQueue tasks={reviewTasks} onOpen={(t) => setOpenTaskId(t.id)} />

      <SearchInput value={search} onChange={setSearch} placeholder="Search people…" className="w-full sm:w-72" />

      {isError ? (
        <Card className="items-center gap-3 py-10">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load the team.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </Card>
      ) : isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <Card className="items-center gap-2 py-12 text-center">
          <UsersRound className="size-9 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {search ? "No one matches that search." : "No active employees or interns yet. Add them under People."}
          </p>
        </Card>
      ) : (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((m) => (
            <Card key={m.employeeId} className="gap-3 px-4 py-4">
              <div className="flex items-start gap-3">
                <AvatarInitials name={m.fullName} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.fullName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {m.designation}
                    {m.employmentType === "intern" && " · Intern"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAssignTo(m.employeeId)} aria-label={`Assign a task to ${m.fullName}`}>
                  <Plus className="size-3.5" /> Assign
                </Button>
              </div>

              <dl className="grid grid-cols-4 gap-1 text-center">
                <Count label="Open" value={m.open} />
                <Count label="Doing" value={m.inProgress} />
                <Count label="Review" value={m.inReview} highlight={m.inReview > 0 ? "info" : undefined} />
                <Count label="Overdue" value={m.overdue} highlight={m.overdue > 0 ? "danger" : undefined} />
              </dl>

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className={cn("flex items-center gap-1", isStale(m) && "text-amber-600 dark:text-amber-400")}>
                  {isStale(m) && <AlertTriangle className="size-3.5" />}
                  {m.lastActivityAt ? `Last update ${timeAgo(m.lastActivityAt)}` : "No task activity yet"}
                </span>
                <span>{m.doneLast7Days} done this week</span>
              </div>

              {m.open > 0 && (
                <button
                  type="button"
                  aria-expanded={expanded === m.employeeId}
                  onClick={() => setExpanded(expanded === m.employeeId ? null : m.employeeId)}
                  className="flex items-center gap-1 self-start rounded text-xs font-medium text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <ChevronDown className={cn("size-3.5 transition-transform", expanded === m.employeeId && "rotate-180")} />
                  {expanded === m.employeeId ? "Hide tasks" : `Show ${m.open} open task${m.open === 1 ? "" : "s"}`}
                </button>
              )}
              {expanded === m.employeeId && <MemberTasks employeeId={m.employeeId} onOpen={(t) => setOpenTaskId(t.id)} />}
            </Card>
          ))}
        </div>
      )}

      <TaskDialog
        task={null}
        defaultAssigneeId={assignTo || undefined}
        open={assignTo !== null}
        onOpenChange={(o) => !o && setAssignTo(null)}
      />
      <OpenTask taskId={openTaskId} onClose={() => setOpenTaskId(null)} />
    </div>
  );
}

/** Work submitted for review, oldest first, each opening the review panel. */
function ReviewQueue({ tasks, onOpen }: { tasks: Task[]; onOpen: (t: Task) => void }) {
  if (tasks.length === 0) return null;
  const today = localIsoDate();
  return (
    <Card className="gap-3 px-4 py-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-4 text-primary" />
        <p className="font-medium">Waiting for your review</p>
        <span className="text-sm text-muted-foreground">({tasks.length})</span>
      </div>
      <ul className="flex flex-col divide-y rounded-lg border">
        {tasks.map((t) => {
          const late = !!t.dueDate && t.dueDate.slice(0, 10) < today;
          return (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className={cn("truncate text-xs", late ? "text-destructive" : "text-muted-foreground")}>
                  {t.assigneeName ?? "Unassigned"}
                  {t.submittedAt && ` · submitted ${timeAgo(t.submittedAt)}`}
                  {t.dueDate && ` · due ${t.dueDate.slice(0, 10)}`}
                </p>
              </div>
              <Button size="sm" onClick={() => onOpen(t)}>
                Review
              </Button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** The review panel for one task, always rendered from fresh data. */
function OpenTask({ taskId, onClose }: { taskId: string | null; onClose: () => void }) {
  const { data } = useTask(taskId ?? undefined);
  return <TaskPanel task={taskId ? (data ?? null) : null} mode="reviewer" onClose={onClose} />;
}

function MemberTasks({ employeeId, onOpen }: { employeeId: string; onOpen: (t: Task) => void }) {
  const { data, isLoading } = useTasks({
    assigneeId: employeeId,
    sort: "dueDate",
    dir: "asc",
    limit: MEMBER_TASK_LIMIT,
  });
  if (isLoading) return <Skeleton className="h-16 w-full" />;
  const open = (data?.tasks ?? []).filter((t) => OPEN_STATUSES.has(t.status));
  const today = localIsoDate();
  return (
    <ul className="flex flex-col divide-y rounded-lg border">
      {open.map((t) => {
        const overdue = !!t.dueDate && t.dueDate.slice(0, 10) < today;
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onOpen(t)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.title}</p>
                <p className={cn("truncate text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
                  {t.projectName}
                  {t.dueDate && ` · due ${t.dueDate.slice(0, 10)}`}
                </p>
              </div>
              <StatusBadge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</StatusBadge>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "info" | "danger" }) {
  return (
    <Card className="gap-0.5 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-heading text-2xl font-bold tabular-nums",
          tone === "danger" && "text-destructive",
          tone === "info" && "text-primary",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

function Count({ label, value, highlight }: { label: string; value: number; highlight?: "info" | "danger" }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-muted/60 py-1.5",
        highlight === "danger" && "bg-destructive/10 text-destructive",
        highlight === "info" && "bg-primary/10 text-primary",
      )}
    >
      <dd className="font-heading text-lg leading-tight font-bold tabular-nums">{value}</dd>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
    </div>
  );
}
