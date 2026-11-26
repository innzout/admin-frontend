"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FolderKanban, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { AvatarStack } from "@/components/common/avatar-stack";
import { Pagination } from "@/components/common/pagination";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ProjectDialog } from "@/components/projects/project-dialog";
import { ManageTeamSheet } from "@/components/projects/manage-team-sheet";
import { useDeleteProject, useProjects, useUpdateProject } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";
import { projectStatusLabel, projectStatusTone } from "@/lib/status";
import { ApiError } from "@/lib/api";
import type { Project, ProjectStatus } from "@/lib/types";
import { QueryError } from "@/components/common/query-error";

const kanbanColumns: ProjectStatus[] = ["in_progress", "review", "completed", "on_hold"];
const PAGE_SIZE = 10;
// Kanban groups everything into 4 fixed columns rather than paging, so it
// fetches a generously large single page instead of using page controls.
const KANBAN_LIMIT = 100;

function progressOf(p: Project): number {
  if (p.taskCounts.total === 0) return 0;
  return Math.round((p.taskCounts.completed / p.taskCounts.total) * 100);
}

export default function ProjectsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId") ?? undefined;
  const clientName = searchParams.get("clientName") ?? undefined;

  const [view, setView] = useState<"list" | "kanban">("list");
  const [page, setPage] = useState(1);
  const { data, isLoading, isError: dataFailed, refetch: dataRetry, isFetching: dataRetrying } = useProjects(
    view === "list" ? { page, limit: PAGE_SIZE, clientId } : { limit: KANBAN_LIMIT, clientId },
  );
  const deleteProject = useDeleteProject();
  const updateProject = useUpdateProject();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteProject.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.name}" removed`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not remove project");
        setDeleteTarget(null);
      },
    });
  };

  const changeStatus = (p: Project, status: ProjectStatus) => {
    updateProject.mutate(
      { id: p.id, input: { status } },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update project status") },
    );
  };

  const projects = data?.projects ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Projects"
        subtitle="Track all active and completed projects."
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-full border p-0.5">
              {(["list", "kanban"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors",
                    view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Button className="rounded-full" onClick={openCreate}>
              <Plus className="size-4" />
              New Project
            </Button>
          </div>
        }
      />

      {clientId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Showing projects for</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium">
            {clientName ?? "this client"}
            <button onClick={() => router.push("/projects")} aria-label="Clear filter">
              <X className="size-3.5" />
            </button>
          </span>
        </div>
      )}

      {dataFailed && !data && <QueryError what="projects" onRetry={() => dataRetry()} retrying={dataRetrying} />}
      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {data && projects.length === 0 && (
        <EmptyState
          className="rounded-xl border bg-card"
          icon={FolderKanban}
          title="No projects here yet"
          hint="Create a project to assign a team, track tasks and follow its deadline."
        />
      )}

      {data && projects.length > 0 && view === "list" && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-32" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{p.code}</p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.clientId ? (
                        <Link href={`/clients`} className="hover:underline">
                          {p.clientName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <AvatarStack names={p.members.map((m) => m.employeeName)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${progressOf(p)}%` }} />
                        </div>
                        <span className="text-xs font-medium tabular-nums">{progressOf(p)}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.deadline?.slice(0, 10) ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={(v) => v && changeStatus(p, v as ProjectStatus)}>
                        <SelectTrigger size="sm">
                          <SelectValue>
                            <StatusBadge tone={projectStatusTone[p.status]}>{projectStatusLabel[p.status]}</StatusBadge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {kanbanColumns.map((s) => (
                            <SelectItem key={s} value={s}>
                              {projectStatusLabel[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <ManageTeamSheet project={p} />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}
        </>
      )}

      {data && projects.length > 0 && view === "kanban" && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {kanbanColumns.map((status) => (
            <div key={status} className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <p className="text-sm font-medium">{projectStatusLabel[status]}</p>
                <span className="text-xs text-muted-foreground">{projects.filter((p) => p.status === status).length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {projects
                  .filter((p) => p.status === status)
                  .map((p) => (
                    <div key={p.id} className="rounded-xl border bg-card p-3">
                      <Link href={`/projects/${p.id}`} className="text-sm font-medium hover:underline">
                        {p.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.clientName ?? "No client"}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <AvatarStack names={p.members.map((m) => m.employeeName)} max={3} />
                        <span className="text-xs font-medium tabular-nums text-muted-foreground">{progressOf(p)}%</span>
                      </div>
                      <Select value={p.status} onValueChange={(v) => v && changeStatus(p, v as ProjectStatus)}>
                        <SelectTrigger size="sm" className="mt-2 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {kanbanColumns.map((s) => (
                            <SelectItem key={s} value={s}>
                              {projectStatusLabel[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectDialog project={editing} open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete project?"
        description={deleteTarget ? `"${deleteTarget.name}" and all of its tasks will be permanently deleted.` : ""}
        confirmLabel="Delete"
        isPending={deleteProject.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
