"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useAddProjectMember, useRemoveProjectMember } from "@/hooks/use-projects";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Project, ProjectMember } from "@/lib/types";

export function ManageTeamSheet({ project }: { project: Project }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState("");
  const { data: employeePage } = useEmployees({ limit: 100 });
  const addMember = useAddProjectMember();
  const removeMember = useRemoveProjectMember();
  const [removeTarget, setRemoveTarget] = useState<ProjectMember | null>(null);

  const memberIds = new Set(project.members.map((m) => m.employeeId));
  const candidates = (employeePage?.employees ?? []).filter((e) => e.status === "active" && !memberIds.has(e.id));

  const handleAdd = () => {
    if (!employeeId) return;
    addMember.mutate(
      { projectId: project.id, employeeId, role: role || undefined },
      {
        onSuccess: () => {
          setEmployeeId("");
          setRole("");
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not add team member"),
      },
    );
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    removeMember.mutate(
      { projectId: project.id, employeeId: removeTarget.employeeId },
      {
        onSuccess: () => setRemoveTarget(null),
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : "Could not remove team member");
          setRemoveTarget(null);
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="ghost" size="sm" />}>
        <Users className="size-4" />
        Team
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{project.name} — Team</SheetTitle>
        </SheetHeader>

        <div className="flex items-end gap-2 px-4">
          <div className="flex-1">
            <Select value={employeeId} onValueChange={(v) => v && setEmployeeId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.fullName} — {e.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" disabled={!employeeId || addMember.isPending} onClick={handleAdd}>
            Add
          </Button>
        </div>
        <div className="px-4 pt-2">
          <Input placeholder="Role on this project (optional)" value={role} onChange={(e) => setRole(e.target.value)} />
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {project.members.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No team members yet.</p>}
          {project.members.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
              <div className="flex items-center gap-2">
                <AvatarInitials name={m.employeeName} className="size-7" />
                <div>
                  <p className="text-sm font-medium">{m.employeeName}</p>
                  {m.role && <p className="text-xs text-muted-foreground">{m.role}</p>}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={removeMember.isPending}
                onClick={() => setRemoveTarget(m)}
              >
                <X className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </SheetContent>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(o) => !o && setRemoveTarget(null)}
        title="Remove team member?"
        description={removeTarget ? `${removeTarget.employeeName} will be unassigned from ${project.name}. Any tasks already assigned to them stay assigned unless you reassign them.` : ""}
        confirmLabel="Remove"
        isPending={removeMember.isPending}
        onConfirm={confirmRemove}
      />
    </Sheet>
  );
}
