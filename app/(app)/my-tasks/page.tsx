"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ListChecks, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PageHeader } from "@/components/common/page-header";
import { KpiCard } from "@/components/common/kpi-card";
import { StatusBadge } from "@/components/common/status-badge";
import { useMyTasks } from "@/hooks/use-company";
import { useAddTaskComment, useTaskComments, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/lib/status";
import { timeAgo } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";

const COLUMNS: TaskStatus[] = ["new", "in_progress", "in_review", "completed"];
const NEXT: Partial<Record<TaskStatus, TaskStatus>> = { new: "in_progress", in_progress: "in_review", in_review: "completed" };

function TaskDetail({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data: comments } = useTaskComments(task?.id);
  const add = useAddTaskComment(task?.id ?? "");
  const [text, setText] = useState("");
  return (
    <Sheet open={!!task} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-4 sm:max-w-md">
        {task && (
          <>
            <SheetHeader>
              <SheetTitle>{task.title}</SheetTitle>
              <SheetDescription>
                {task.projectName} · due {task.dueDate?.slice(0, 10) ?? "—"}
              </SheetDescription>
            </SheetHeader>
            <div className="flex gap-2 px-4">
              <StatusBadge tone={taskStatusTone[task.status]}>{taskStatusLabel[task.status]}</StatusBadge>
              <StatusBadge tone={taskPriorityTone[task.priority]}>{task.priority}</StatusBadge>
            </div>
            {task.description && <p className="px-4 text-sm whitespace-pre-wrap">{task.description}</p>}
            <div className="flex flex-1 flex-col gap-2 overflow-y-auto border-t px-4 pt-4">
              <p className="text-sm font-semibold">Updates & comments</p>
              {comments?.map((c) => (
                <div key={c.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                  <p>{c.comment}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {c.authorName ?? "—"} · {timeAgo(c.createdAt)}
                  </p>
                </div>
              ))}
              {comments?.length === 0 && <p className="text-sm text-muted-foreground">No updates yet — post progress or blockers here.</p>}
            </div>
            <form
              className="flex gap-2 px-4 pb-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!text.trim()) return;
                add.mutate(text.trim(), { onSuccess: () => setText(""), onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not post") });
              }}
            >
              <Input placeholder="Post an update…" value={text} onChange={(e) => setText(e.target.value)} />
              <Button type="submit" size="icon" disabled={add.isPending}>
                <Send className="size-4" />
              </Button>
            </form>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function MyTasksPage() {
  const { data: tasks, isLoading } = useMyTasks();
  const updateStatus = useUpdateTaskStatus();
  const [selected, setSelected] = useState<Task | null>(null);
  const today = new Date().toISOString().slice(0, 10);

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
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you. Move them along as you work and post updates so your lead can see progress." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard icon={ListChecks} iconClassName="bg-blue-100 text-blue-600" label="Open" value={isLoading ? undefined : stats.open} />
        <KpiCard icon={CalendarClock} iconClassName="bg-amber-100 text-amber-600" label="Due today" value={isLoading ? undefined : stats.dueToday} />
        <KpiCard icon={AlertTriangle} iconClassName="bg-red-100 text-red-600" label="Overdue" value={isLoading ? undefined : stats.overdue} />
        <KpiCard icon={CheckCircle2} iconClassName="bg-green-100 text-green-600" label="Completed" value={isLoading ? undefined : stats.done} />
      </div>

      {isLoading ? (
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
                  const next = NEXT[t.status];
                  return (
                    <div key={t.id} className="rounded-lg border bg-background p-3 shadow-xs">
                      <button onClick={() => setSelected(t)} className="block w-full text-left">
                        <p className={cn("text-sm font-medium", col === "completed" && "text-muted-foreground line-through")}>{t.title}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{t.projectName}</p>
                      </button>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className={cn("text-xs", overdue ? "font-medium text-red-600" : "text-muted-foreground")}>
                          {t.dueDate ? `Due ${t.dueDate.slice(0, 10)}` : "No due date"}
                        </span>
                        <StatusBadge tone={taskPriorityTone[t.priority]}>{t.priority}</StatusBadge>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {next && (
                          <Button size="sm" className="h-7 flex-1 text-xs" disabled={updateStatus.isPending} onClick={() => move(t, next)}>
                            {next === "in_progress" ? "Start" : next === "in_review" ? "Submit for review" : "Mark done"}
                          </Button>
                        )}
                        {col === "completed" && (
                          <Button size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={() => move(t, "in_progress")}>
                            Reopen
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setSelected(t)} aria-label="Comments">
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

      {!isLoading && tasks?.length === 0 && (
        <EmptyState className="rounded-xl border bg-card" title="No tasks assigned to you yet" hint="Tasks your manager assigns to you will show up here with their due dates." />
      )}

      <TaskDetail task={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
