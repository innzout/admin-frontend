"use client";

import { Suspense, useMemo } from "react";
import { useLinkedTask } from "@/hooks/use-linked-task";
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { StatusBadge } from "@/components/common/status-badge";
import { useMyTasks } from "@/hooks/use-company";
import { useUpdateTaskStatus } from "@/hooks/use-tasks";
import { changesRequested, TaskPanel } from "@/components/tasks/task-panel";
import { taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/lib/status";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { localIsoDate } from "@/lib/dates";
import { QueryError } from "@/components/common/query-error";

const COLUMNS: TaskStatus[] = ["new", "in_progress", "in_review", "completed"];

export default function MyTasksPage() {
  // useSearchParams (via useLinkedTask) needs a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <MyTasks />
    </Suspense>
  );
}

function MyTasks() {
  const { data: tasks, isLoading, isError: tasksFailed, refetch: tasksRetry, isFetching: tasksRetrying } = useMyTasks();
  const updateStatus = useUpdateTaskStatus();
  const linkedTask = useLinkedTask();
  const today = localIsoDate();

  const stats = useMemo(() => {
    const list = tasks ?? [];
    const open = list.filter((t) => t.status !== "completed" && t.status !== "cancelled");
    return {
      open: open.length,
      overdue: open.filter((t) => t.dueDate && t.dueDate.slice(0, 10) < today).length,
      dueToday: open.filter((t) => t.dueDate?.slice(0, 10) === today).length,
      done: list.filter((t) => t.status === "completed").length,
    };
  }, [tasks, today]);

  const move = (t: Task, status: TaskStatus) =>
    updateStatus.mutate(
      { id: t.id, status },
      {
        onSuccess: () => toast.success(`"${t.title}" → ${taskStatusLabel[status]}`),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update task"),
      },
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="My Tasks"
        subtitle="Start a task, post updates as you go, then submit it for review. Your lead approves it or sends feedback."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={ListChecks} iconClassName="bg-blue-100 text-blue-600" label="Open" value={isLoading ? undefined : stats.open} />
        <KpiCard
          icon={CalendarClock}
          iconClassName="bg-amber-100 text-amber-600"
          label="Due today"
          value={isLoading ? undefined : stats.dueToday}
        />
        <KpiCard
          icon={AlertTriangle}
          iconClassName="bg-red-100 text-red-600"
          label="Overdue"
          value={isLoading ? undefined : stats.overdue}
        />
        <KpiCard icon={CheckCircle2} iconClassName="bg-green-100 text-green-600" label="Done" value={isLoading ? undefined : stats.done} />
      </div>

      {tasksFailed && !tasks ? (
        <QueryError what="your tasks" onRetry={() => tasksRetry()} retrying={tasksRetrying} />
      ) : isLoading ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => {
            const items = (tasks ?? []).filter((t) => t.status === col);
            return (
              <div key={col} className="flex flex-col gap-2 rounded-xl border bg-card p-3">
                <div className="flex items-center justify-between">
                  <StatusBadge tone={taskStatusTone[col]}>{taskStatusLabel[col]}</StatusBadge>
                  <span className="text-xs text-muted-foreground">{items.length}</span>
                </div>
                {items.map((t) => {
                  const overdue = t.dueDate && t.dueDate.slice(0, 10) < today && col !== "completed";
                  const sentBack = changesRequested(t);
                  return (
                    <div key={t.id} className="rounded-lg border bg-background p-3 shadow-xs">
                      <button onClick={() => linkedTask.open(t.id)} className="block w-full text-left">
                        <p className={cn("text-sm font-medium", col === "completed" && "text-muted-foreground line-through")}>{t.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.projectName}</p>
                        {sentBack && (
                          <StatusBadge tone="warning" className="mt-1.5">
                            Changes requested
                          </StatusBadge>
                        )}
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={cn("text-xs", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                          {t.dueDate ? `Due ${t.dueDate.slice(0, 10)}` : "No due date"}
                        </span>
                        <StatusBadge tone={taskPriorityTone[t.priority]}>{t.priority}</StatusBadge>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {t.status === "new" && (
                          <Button
                            size="sm"
                            className="h-7 flex-1 text-xs"
                            disabled={updateStatus.isPending}
                            onClick={() => move(t, "in_progress")}
                          >
                            Start
                          </Button>
                        )}
                        {t.status === "in_progress" && (
                          <Button size="sm" className="h-7 flex-1 text-xs" onClick={() => linkedTask.open(t.id)}>
                            {sentBack ? "See feedback" : "Submit for review"}
                          </Button>
                        )}
                        {t.status === "in_review" && (
                          <span className="flex-1 self-center text-xs text-muted-foreground">With your lead</span>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() => linkedTask.open(t.id)}
                          aria-label="Open task and updates"
                        >
                          <MessageSquare className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground/60">Nothing here</p>}
              </div>
            );
          })}
        </div>
      )}

      {tasks && tasks.length === 0 && (
        <EmptyState
          className="rounded-xl border bg-card"
          title="No tasks assigned to you yet"
          hint="Tasks your manager assigns to you will show up here with their due dates."
        />
      )}

      <TaskPanel task={(tasks ?? []).find((t) => t.id === linkedTask.openId) ?? null} mode="member" onClose={linkedTask.close} />
    </div>
  );
}
