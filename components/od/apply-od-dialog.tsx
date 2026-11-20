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
import { useApplyOd } from "@/hooks/use-od";
import { useEmployees } from "@/hooks/use-employees";
import { ApiError } from "@/lib/api";
import type { Role } from "@/lib/types";
import { requiredDate, requiredText, optionalText } from "@/lib/validation";

const SELF = "self";

const schema = z
  .object({
    employeeId: z.string(),
    fromDate: requiredDate("Start date"),
    toDate: requiredDate("End date"),
    purpose: requiredText("Purpose", 500, 3),
    location: optionalText().optional(),
  })
  .refine((v) => v.toDate >= v.fromDate, { message: "End date can't be before start date", path: ["toDate"] });

type FormValues = z.infer<typeof schema>;

export function ApplyOdDialog({
  open,
  onOpenChange,
  callerRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callerRole: Role;
}) {
  const { data: employeePage } = useEmployees({ limit: 100 });
  const applyOd = useApplyOd();
  const canApplyOnBehalf = callerRole === "admin" || callerRole === "hr";

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { employeeId: SELF },
  });

  const handleClose = (next: boolean) => {
    if (!next) reset({ employeeId: SELF, fromDate: "", toDate: "", purpose: "", location: "" });
    onOpenChange(next);
  };

  const onSubmit = (values: FormValues) => {
    applyOd.mutate(
      {
        employeeId: values.employeeId === SELF ? undefined : values.employeeId,
        fromDate: values.fromDate,
        toDate: values.toDate,
        purpose: values.purpose,
        location: values.location || undefined,
      },
      {
        onSuccess: () => {
          toast.success("On-duty request submitted");
          handleClose(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not submit on-duty request"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply On Duty</DialogTitle>
          <DialogDescription>Request on-duty status for off-site work (client visit, field work).</DialogDescription>
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="od-fromDate">From</Label>
              <Input id="od-fromDate" type="date" {...register("fromDate")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="od-toDate">To</Label>
              <Input id="od-toDate" type="date" {...register("toDate")} />
            </div>
            {errors.toDate && <p className="col-span-2 text-sm text-destructive">{errors.toDate.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="od-location">Location (optional)</Label>
            <Input id="od-location" placeholder="Client site, city…" {...register("location")} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="od-purpose">Purpose</Label>
            <Textarea id="od-purpose" {...register("purpose")} />
            {errors.purpose && <p className="text-sm text-destructive">{errors.purpose.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyOd.isPending}>
              {applyOd.isPending ? "Submitting…" : "Submit Request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
