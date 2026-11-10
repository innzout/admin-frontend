"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AvatarStack } from "@/components/common/avatar-stack";
import { StatusBadge } from "@/components/common/status-badge";
import { PanelCard } from "@/components/common/panel-card";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ManageTeamSheet } from "@/components/projects/manage-team-sheet";
import { TaskDialog } from "@/components/tasks/task-dialog";
import { useProject, useUpdateProject } from "@/hooks/use-projects";
import { useTasks, useUpdateTaskStatus } from "@/hooks/use-tasks";
import { projectStatusLabel, projectStatusTone, taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { ProjectStatus, Task, TaskStatus } from "@/lib/types";

const statusOptions: ProjectStatus[] = ["in_progress", "review", "completed", "on_hold"];
const taskStatusOptions: TaskStatus[] = ["new", "in_progress", "in_review", "completed", "cancelled"];

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: project, isLoading } = useProject(params.id);
  const { data: taskResult } = useTasks({ projectId: params.id, limit: 100 });
  const updateProject = useUpdateProject();
  const updateTaskStatus = useUpdateTaskStatus();

  const [editOpen, setEditOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  if (isLoading || !project) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const progress = project.taskCounts.total === 0 ? 0 : Math.round((project.taskCounts.completed / project.taskCounts.total) * 100);

  const changeStatus = (status: ProjectStatus) => {
    updateProject.mutate(
      { id: project.id, input: { status } },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update project status") },
    );
  };

  const changeTaskStatus = (task: Task, status: TaskStatus) => {
    updateTaskStatus.mutate(
      { id: task.id, status },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update task") },
    );
  };

  const openNewTask = () => {
    setEditingTask(null);
    setTaskDialogOpen(true);
  };
  const openEditTask = (t: Task) => {
    setEditingTask(t);
    setTaskDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/projects" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Projects
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{project.name}</h1>
            <Select value={project.status} onValueChange={(v) => v && changeStatus(v as ProjectStatus)}>
              <SelectTrigger size="sm">
                <SelectValue>
                  <StatusBadge tone={projectStatusTone[project.status]}>{projectStatusLabel[project.status]}</StatusBadge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {projectStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.code}
            {project.clientId ? (
              <>
                {" "}
                ·{" "}
                <Link href={`/clients`} className="text-primary hover:underline">
                  {project.clientName}
                </Link>
              </>
            ) : (
              " · No client"
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            {project.startDate && <span>Start {project.startDate.slice(0, 10)}</span>}
            {project.deadline && <span>Due {project.deadline.slice(0, 10)}</span>}
            {project.budget != null && <span>Budget {formatInrFull(project.budget)}</span>}
          </div>
          {project.description && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{project.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ManageTeamSheet project={project} />
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Progress</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm font-medium tabular-nums">{progress}%</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {project.taskCounts.completed} of {project.taskCounts.total} tasks completed
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Team</p>
          <div className="mt-2 flex items-center justify-between">
            <AvatarStack names={project.members.map((m) => m.employeeName)} />
            <span className="text-sm text-muted-foreground">{project.members.length} members</span>
          </div>
        </div>
      </div>

      <PanelCard
        title="Tasks"
        subtitle={`${taskResult?.total ?? 0} total`}
        action={
          <Button size="sm" className="rounded-full" onClick={openNewTask}>
            <Plus className="size-4" />
            Add Task
          </Button>
        }
        contentClassName="flex flex-col gap-1"
      >
        {(taskResult?.tasks ?? []).length === 0 && <p className="p-2 text-sm text-muted-foreground">No tasks yet.</p>}
        {(taskResult?.tasks ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-3 border-b py-3 last:border-0">
            <button onClick={() => openEditTask(t)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm hover:underline">{t.title}</p>
              {t.assigneeName && <p className="truncate text-xs text-muted-foreground">{t.assigneeName}</p>}
            </button>
            <StatusBadge tone={taskPriorityTone[t.priority]} className="hidden sm:inline-flex">
              {t.priority}
            </StatusBadge>
            <Select value={t.status} onValueChange={(v) => v && changeTaskStatus(t, v as TaskStatus)}>
              <SelectTrigger size="sm" className="w-32">
                <SelectValue>
                  <StatusBadge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</StatusBadge>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {taskStatusOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {taskStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </PanelCard>

      <ProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />
      <TaskDialog task={editingTask} defaultProjectId={project.id} open={taskDialogOpen} onOpenChange={setTaskDialogOpen} />
    </div>
  );
}
