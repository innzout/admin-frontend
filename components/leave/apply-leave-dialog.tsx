"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useApplyLeave, useLeaveTypes } from "@/hooks/use-leave";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";
import { requiredSelect, requiredDate, requiredText } from "@/lib/validation";

const SELF = "self";

const schema = z
  .object({
    employeeId: z.string(),
    leaveTypeId: requiredSelect("a leave type"),
    fromDate: requiredDate("Start date"),
    toDate: requiredDate("End date"),
    isHalfDay: z.boolean(),
    reason: requiredText("Reason", 1000, 3),
  })
  .refine((v) => v.toDate >= v.fromDate, { message: "End date can't be before start date", path: ["toDate"] })
  // Balances are per year (same rule as the API).
  .refine((v) => !v.fromDate || !v.toDate || v.fromDate.slice(0, 4) === v.toDate.slice(0, 4), {
    message: "A leave can't run into the next year; apply for each year separately",
    path: ["toDate"],
  })
  .refine((v) => !v.isHalfDay || v.fromDate === v.toDate, {
    message: "A half-day request must use the same start and end date",
    path: ["toDate"],
  });

type FormValues = z.infer<typeof schema>;

export function ApplyLeaveDialog({
  open,
  onOpenChange,
  callerRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callerRole: Role;
}) {
  const { data: leaveTypes } = useLeaveTypes();
  const { data: employeePage } = useEmployees({ limit: 100 });
  const applyLeave = useApplyLeave();
  const canApplyOnBehalf = callerRole === "admin" || callerRole === "hr";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: SELF, isHalfDay: false },
  });

  const handleClose = (next: boolean) => {
    if (!next) reset({ employeeId: SELF, isHalfDay: false, leaveTypeId: "", fromDate: "", toDate: "", reason: "" });
    onOpenChange(next);
  };

  const onSubmit = (values: FormValues) => {
    applyLeave.mutate(
      {
        employeeId: values.employeeId === SELF ? undefined : values.employeeId,
        leaveTypeId: values.leaveTypeId,
        fromDate: values.fromDate,
        toDate: values.toDate,
        isHalfDay: values.isHalfDay,
        reason: values.reason,
      },
      {
        onSuccess: () => {
          toast.success("Leave request submitted");
          handleClose(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not submit leave request"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Leave</DialogTitle>
          <DialogDescription>Submit a new leave request for approval.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {canApplyOnBehalf && (
            <div className="flex flex-col gap-1.5">
              <Label>Employee</Label>
              <Controller
                control={control}
                name="employeeId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger>
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

          <div className="flex flex-col gap-1.5">
            <Label>Leave type</Label>
            <Controller
              control={control}
              name="leaveTypeId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(leaveTypes ?? []).map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} {!t.isPaid && "(unpaid)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.leaveTypeId && <p className="text-sm text-destructive">{errors.leaveTypeId.message}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fromDate">From</Label>
              <Input id="fromDate" type="date" {...register("fromDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="toDate">To</Label>
              <Input id="toDate" type="date" {...register("toDate")} />
            </div>
            {errors.toDate && <p className="col-span-2 text-sm text-destructive">{errors.toDate.message}</p>}
          </div>

          <Controller
            control={control}
            name="isHalfDay"
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={field.value} onCheckedChange={(c) => field.onChange(!!c)} />
                Half day
              </label>
            )}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" maxLength={1000} aria-invalid={!!errors.reason} placeholder="Why do you need this leave?" {...register("reason")} />
            {errors.reason && <p className="text-sm text-destructive">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyLeave.isPending}>
              {applyLeave.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
