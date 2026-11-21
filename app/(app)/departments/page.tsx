"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { useConfirm } from "@/components/common/use-confirm";
import { DepartmentRow } from "@/components/departments/department-row";
import { DEPARTMENT_NAME_MAX, departmentNameSchema } from "@/components/departments/department-name";
import { useMe } from "@/hooks/use-auth";
import { useCreateDepartment, useDeleteDepartment, useDepartments } from "@/hooks/use-departments";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Department } from "@/lib/types";

const schema = z.object({ name: departmentNameSchema });
type FormValues = z.infer<typeof schema>;

export default function DepartmentsPage() {
  const { data: me } = useMe();
  const canManage = me?.role === "admin" || me?.role === "hr";
  const { data: departments, isLoading, isError, refetch } = useDepartments();
  // Head candidates are only needed by those who can change the head.
  const { data: employeePage } = useEmployees({ limit: 100 }, { enabled: canManage });
  const create = useCreateDepartment();
  const remove = useDeleteDepartment();
  const { confirm, confirmDialog } = useConfirm();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onCreate = (values: FormValues) =>
    create.mutate(values.name, {
      onSuccess: () => {
        toast.success(`"${values.name}" created`);
        reset();
      },
      onError: (err) => setError("name", { message: err instanceof ApiError ? err.message : "Could not create department" }),
    });

  const askDelete = (d: Department) =>
    confirm({
      title: "Delete department?",
      description: `"${d.name}" will be removed. This can't be undone from the app.`,
      confirmLabel: "Delete",
      destructive: true,
      onConfirm: () =>
        remove.mutate(d.id, {
          onSuccess: () => toast.success(`"${d.name}" deleted`),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not delete department"),
        }),
    });

  const count = departments?.length ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {confirmDialog}
      <PageHeader
        title="Departments"
        subtitle={departments ? `${count} ${count === 1 ? "department" : "departments"}` : "Loading…"}
      />

      {canManage && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onCreate)} className="flex items-start gap-2" noValidate>
              <div className="min-w-0 flex-1">
                <Input
                  aria-label="New department name"
                  placeholder="New department name…"
                  maxLength={DEPARTMENT_NAME_MAX}
                  aria-invalid={!!errors.name}
                  {...register("name")}
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <Button type="submit" disabled={create.isPending}>
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add department</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load departments.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : count === 0 ? (
          <EmptyState
            icon={Building2}
            title="No departments yet"
            hint={canManage ? "Add your first department above." : "An admin or HR can add departments."}
          />
        ) : (
          <ul className="divide-y">
            {departments!.map((d) => (
              <DepartmentRow
                key={d.id}
                department={d}
                employees={employeePage?.employees ?? []}
                canManage={canManage}
                onDelete={() => askDelete(d)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
