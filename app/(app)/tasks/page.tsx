"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { Pagination } from "@/components/common/pagination";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { useDeleteTask, useTasks, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { cn } from "@/lib/utils";
import { taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/lib/status";
import { ApiError } from "@/lib/api";
import type { Task, TaskStatus } from "@/lib/types";

const filters: { key: TaskStatus | "all"; label: string }[] = [
  { key: "all", label: "All Tasks" },
  { key: "new", label: "New" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "completed", label: "Completed" },
];
const PAGE_SIZE = 15;

export default function TasksPage() {
  const [filter, setFilter] = useState<TaskStatus | "all">("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTasks({ status: filter === "all" ? undefined : filter, page, limit: PAGE_SIZE });
  const updateStatus = useUpdateTaskStatus();
  const deleteTask = useDeleteTask();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (t: Task) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const changeFilter = (f: TaskStatus | "all") => {
    setFilter(f);
    setPage(1);
  };

  const toggleDone = (t: Task) => {
    updateStatus.mutate(
      { id: t.id, status: t.status === "completed" ? "new" : "completed" },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update task") },
    );
  };

  const changeStatus = (t: Task, status: TaskStatus) => {
    updateStatus.mutate(
      { id: t.id, status },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update task") },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteTask.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.title}" removed`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not remove task");
        setDeleteTarget(null);
      },
    });
  };

  const tasks = data?.tasks ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tasks"
        subtitle="Manage and track all tasks across projects."
        action={
          <Button className="rounded-full" onClick={openCreate}>
            <Plus className="size-4" />
            Add Task
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => changeFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} tasks</p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && (
        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4">
              <button type="button" onClick={() => toggleDone(t)} className="shrink-0">
                {t.status === "completed" ? (
                  <CheckCircle2 className="size-5 text-primary" />
                ) : (
                  <Circle className="size-5 text-muted-foreground/40" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => openEdit(t)}
                  className={cn(
                    "truncate text-left text-sm font-medium hover:underline",
                    t.status === "completed" && "text-muted-foreground line-through",
                  )}
                >
                  {t.title}
                </button>
                <Link
                  href={`/projects/${t.projectId}`}
                  className="block truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
                >
                  {t.projectName}
                </Link>
              </div>
              <StatusBadge tone={taskPriorityTone[t.priority]} className="hidden sm:inline-flex">
                {t.priority}
              </StatusBadge>
              {t.assigneeName && <AvatarInitials name={t.assigneeName} className="size-7" />}
              <Select value={t.status} onValueChange={(v) => v && changeStatus(t, v as TaskStatus)}>
                <SelectTrigger size="sm" className="hidden w-32 sm:flex">
                  <SelectValue>
                    <StatusBadge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</StatusBadge>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(["new", "in_progress", "in_review", "completed", "cancelled"] as TaskStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {taskStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground sm:block">{t.dueDate?.slice(0, 10) ?? "—"}</p>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => setDeleteTarget(t)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {tasks.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">No tasks here.</p>}
        </div>
      )}

      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}

      <TaskDialog task={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete task?"
        description={deleteTarget ? `"${deleteTarget.title}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        isPending={deleteTask.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
