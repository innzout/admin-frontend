"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateExpense, useExpenseCategories } from "@/hooks/use-expenses";
import { useEmployees } from "@/hooks/use-employees";
import { useProjects } from "@/hooks/use-projects";
import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";
import { requiredText, requiredSelect, amount, requiredDate, optionalUrl } from "@/lib/validation";

const SELF = "self";
const NO_PROJECT = "none";

const schema = z.object({
  title: requiredText("Title", 200),
  categoryId: requiredSelect("a category"),
  amount: amount("Amount"),
  employeeId: z.string(),
  projectId: z.string(),
  expenseDate: requiredDate("Expense date").refine((v) => v <= new Date().toISOString().slice(0, 10), "Expense date can't be in the future"),
  receiptUrl: optionalUrl.optional(),
});
type FormValues = z.infer<typeof schema>;

export function ExpenseDialog({
  open,
  onOpenChange,
  callerRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callerRole: Role;
}) {
  const { data: categories } = useExpenseCategories();
  const { data: employeePage } = useEmployees({ limit: 100 });
  const { data: projectsResult } = useProjects({ limit: 100 });
  const createExpense = useCreateExpense();
  const canSubmitOnBehalf = callerRole === "admin" || callerRole === "hr";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: SELF, projectId: NO_PROJECT, expenseDate: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (!open) return;
    reset({
      title: "",
      categoryId: "",
      amount: 0,
      employeeId: SELF,
      projectId: NO_PROJECT,
      expenseDate: new Date().toISOString().slice(0, 10),
      receiptUrl: "",
    });
  }, [open, reset]);

  const onSubmit = (values: FormValues) => {
    createExpense.mutate(
      {
        title: values.title,
        categoryId: values.categoryId,
        amount: values.amount,
        employeeId: values.employeeId === SELF ? undefined : values.employeeId,
        projectId: values.projectId === NO_PROJECT ? undefined : values.projectId,
        expenseDate: values.expenseDate,
        receiptUrl: values.receiptUrl || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Expense submitted");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not submit expense"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Submit an expense for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-title">Title</Label>
            <Input id="ex-title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {(categories ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p className="text-sm text-destructive">{errors.categoryId.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-amount">Amount</Label>
              <Input id="ex-amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
            </div>
          </div>

          {canSubmitOnBehalf && (
            <div className="flex flex-col gap-1.5">
              <Label>Employee</Label>
              <Controller
                control={control}
                name="employeeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={SELF}>Myself</SelectItem>
                      {(employeePage?.employees ?? [])
                        .filter((e) => e.status === "active")
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.fullName} — {e.designation}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Project (optional)</Label>
              <Controller
                control={control}
                name="projectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_PROJECT}>No project</SelectItem>
                      {(projectsResult?.projects ?? []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ex-date">Date</Label>
              <Input id="ex-date" type="date" {...register("expenseDate")} />
              {errors.expenseDate && <p className="text-sm text-destructive">{errors.expenseDate.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ex-receipt">Receipt link (optional)</Label>
            <Input id="ex-receipt" placeholder="https://…" {...register("receiptUrl")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createExpense.isPending}>
              {createExpense.isPending ? "Submitting…" : "Submit Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
