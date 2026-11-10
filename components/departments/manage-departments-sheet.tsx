"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Building2, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { useCreateDepartment, useDeleteDepartment, useDepartments, useUpdateDepartment } from "@/hooks/use-departments";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Department } from "@/lib/types";
import { requiredText } from "@/lib/validation";

const schema = z.object({ name: requiredText("Department name", 100) });
type FormValues = z.infer<typeof schema>;

const NO_HEAD = "none";

export function ManageDepartmentsSheet() {
  const [open, setOpen] = useState(false);
  const { data: departments, isLoading } = useDepartments();
  const { data: employeePage } = useEmployees({ limit: 100 });
  const createDepartment = useCreateDepartment();
  const deleteDepartment = useDeleteDepartment();
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = (values: FormValues) => {
    createDepartment.mutate(values.name, {
      onSuccess: () => {
        toast.success(`"${values.name}" created`);
        reset();
      },
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create department"),
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDepartment.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`"${deleteTarget.name}" deleted`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not delete department");
        setDeleteTarget(null);
      },
    });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<Button variant="outline" />}>
        <Building2 className="size-4" />
        Departments
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Departments</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2 px-4" noValidate>
          <div className="flex-1">
            <Label htmlFor="dept-name" className="sr-only">
              Name
            </Label>
            <Input id="dept-name" placeholder="New department name…" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <Button type="submit" size="icon" disabled={createDepartment.isPending} aria-label="Add department">
            <Plus className="size-4" />
          </Button>
        </form>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
          ) : departments && departments.length > 0 ? (
            departments.map((d) => (
              <DepartmentRow
                key={d.id}
                department={d}
                employees={employeePage?.employees ?? []}
                onDelete={() => setDeleteTarget(d)}
                deleting={deleteDepartment.isPending}
              />
            ))
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No departments yet.</p>
          )}
        </div>
      </SheetContent>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Delete department?"
        description={deleteTarget ? `"${deleteTarget.name}" will be permanently deleted.` : ""}
        confirmLabel="Delete"
        isPending={deleteDepartment.isPending}
        onConfirm={confirmDelete}
      />
    </Sheet>
  );
}

function DepartmentRow({
  department,
  employees,
  onDelete,
  deleting,
}: {
  department: Department;
  employees: { id: string; fullName: string; departmentId?: string; status: string }[];
  onDelete: () => void;
  deleting: boolean;
}) {
  const updateDepartment = useUpdateDepartment();

  // Anyone currently in this department is a sensible head candidate — the
  // current head is kept in the list too even if reassigned elsewhere since
  // dropping them from the options would make the current selection unrenderable.
  const candidates = employees.filter(
    (e) => (e.departmentId === department.id && e.status !== "exited") || e.id === department.headEmployeeId,
  );

  const handleHeadChange = (value: string | null) => {
    updateDepartment.mutate(
      { id: department.id, input: { headEmployeeId: !value || value === NO_HEAD ? undefined : value } },
      {
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update department head"),
      },
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{department.name}</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3" />
            {department.employeeCount} {department.employeeCount === 1 ? "employee" : "employees"}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
      <Select value={department.headEmployeeId ?? NO_HEAD} onValueChange={handleHeadChange}>
        <SelectTrigger className="h-8 text-xs">
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
    </div>
  );
}
