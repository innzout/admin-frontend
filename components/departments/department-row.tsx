"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateDepartment } from "@/hooks/use-departments";
import { ApiError } from "@/lib/api";
import type { Department } from "@/lib/types";
import { DEPARTMENT_NAME_MAX, departmentNameSchema } from "./department-name";

const NO_HEAD = "none";

export interface HeadCandidate {
  id: string;
  fullName: string;
  departmentId?: string;
  status: string;
}

/**
 * One department: its name (renamable in place), head and headcount. Edit
 * controls appear only when `canManage` (admin/HR); the API enforces the same.
 */
export function DepartmentRow({
  department,
  employees,
  canManage,
  onDelete,
}: {
  department: Department;
  employees: HeadCandidate[];
  canManage: boolean;
  onDelete: () => void;
}) {
  const update = useUpdateDepartment();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(department.name);
  const [error, setError] = useState<string | null>(null);

  // Current members are the head candidates; the current head stays listed
  // even if moved elsewhere, so the selected value can still render.
  const candidates = employees.filter(
    (e) => (e.departmentId === department.id && e.status !== "exited") || e.id === department.headEmployeeId,
  );

  const startEdit = () => {
    setDraft(department.name);
    setError(null);
    setEditing(true);
  };

  const saveName = () => {
    const parsed = departmentNameSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid name");
      return;
    }
    if (parsed.data === department.name) {
      setEditing(false);
      return;
    }
    update.mutate(
      { id: department.id, input: { name: parsed.data } },
      {
        onSuccess: () => {
          toast.success(`Renamed to "${parsed.data}"`);
          setEditing(false);
        },
        // Server message covers "name already taken" and permission errors.
        onError: (err) => setError(err instanceof ApiError ? err.message : "Could not rename department"),
      },
    );
  };

  const changeHead = (value: string | null) => {
    const clear = !value || value === NO_HEAD;
    update.mutate(
      { id: department.id, input: clear ? { clearHead: true } : { headEmployeeId: value } },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update department head") },
    );
  };

  const hasMembers = department.employeeCount > 0;

  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        {editing ? (
          <form
            className="flex items-start gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveName();
            }}
            noValidate
          >
            <div className="min-w-0 flex-1">
              <Input
                autoFocus
                aria-label="Department name"
                aria-invalid={!!error}
                value={draft}
                maxLength={DEPARTMENT_NAME_MAX}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
                disabled={update.isPending}
              />
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            <Button type="submit" size="icon" aria-label="Save name" disabled={update.isPending}>
              <Check className="size-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Cancel rename"
              onClick={() => setEditing(false)}
              disabled={update.isPending}
            >
              <X className="size-4" />
            </Button>
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <p className="truncate font-medium" title={department.name}>
              {department.name}
            </p>
            {canManage && (
              <Button variant="ghost" size="icon" className="size-7 shrink-0" aria-label={`Rename ${department.name}`} onClick={startEdit}>
                <Pencil className="size-3.5" />
              </Button>
            )}
          </div>
        )}
        <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="size-3" />
          {department.employeeCount} {department.employeeCount === 1 ? "employee" : "employees"}
        </p>
      </div>

      <div className="flex items-center gap-2 sm:w-72">
        {canManage ? (
          <Select value={department.headEmployeeId ?? NO_HEAD} onValueChange={changeHead} disabled={update.isPending}>
            <SelectTrigger className="w-full min-w-0" aria-label={`Head of ${department.name}`}>
              <SelectValue placeholder="No head assigned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_HEAD}>No head assigned</SelectItem>
              {candidates.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <p className="truncate text-sm text-muted-foreground">Head: {department.headName ?? "Not assigned"}</p>
        )}
        {canManage && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            aria-label={`Delete ${department.name}`}
            title={hasMembers ? "Move its employees to another department first" : "Delete department"}
            onClick={onDelete}
            disabled={hasMembers}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
