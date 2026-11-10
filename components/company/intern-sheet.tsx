"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/company/native-select";
import { FormField } from "@/components/common/form-field";
import { useSaveIntern } from "@/hooks/use-company";
import { useEmployees } from "@/hooks/use-employees";
import type { Intern } from "@/lib/company-types";
import { amount, endNotBeforeStart, optionalDate, optionalText, requiredDate, showApiError, LIMITS } from "@/lib/validation";

const STATUSES = ["ongoing", "completed", "terminated", "converted"] as const;

const schema = z
  .object({
    college: optionalText(),
    course: optionalText(),
    mentorId: z.string(),
    startDate: requiredDate("Start date"),
    endDate: optionalDate,
    stipend: amount("Stipend", { allowZero: true }),
    status: z.enum(STATUSES),
    certificateIssued: z.boolean(),
    // Empty input → NaN via valueAsNumber → treated as "not scored yet".
    evaluationScore: z
      .number()
      .optional()
      .transform((n) => (n === undefined || Number.isNaN(n) ? undefined : n))
      .refine((n) => n === undefined || (Number.isInteger(n) && n >= 0 && n <= 100), "Score must be a whole number from 0 to 100"),
    notes: optionalText(LIMITS.text),
  })
  .superRefine(endNotBeforeStart("startDate", "endDate", "End date can't be before the start date"))
  .superRefine((v, ctx) => {
    if (v.certificateIssued && v.status === "ongoing") {
      ctx.addIssue({ code: "custom", path: ["certificateIssued"], message: "Issue the certificate after the internship is completed" });
    }
    if (v.status === "completed" && !v.endDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Set the end date for a completed internship" });
    }
  });
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

function toForm(intern: Intern): FormInput {
  return {
    college: intern.college ?? "",
    course: intern.course ?? "",
    mentorId: intern.mentorId ?? "",
    startDate: intern.startDate?.slice(0, 10) ?? intern.joinDate.slice(0, 10),
    endDate: intern.endDate?.slice(0, 10) ?? "",
    stipend: intern.stipend,
    status: intern.status,
    certificateIssued: intern.certificateIssued,
    evaluationScore: intern.evaluationScore ?? undefined,
    notes: intern.notes ?? "",
  };
}

export function InternDialog({ intern, open, onOpenChange }: { intern: Intern | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveIntern();
  const { data: employees } = useEmployees({ status: "active", limit: 100 });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open && intern) reset(toForm(intern));
  }, [open, intern, reset]);

  if (!intern) return null;

  const onSubmit = (values: FormValues) => {
    save.mutate(
      { employeeId: intern.employeeId, input: values },
      {
        onSuccess: () => {
          toast.success(values.status === "converted" ? `${intern.fullName} converted to full-time` : "Internship updated");
          onOpenChange(false);
        },
        onError: (err) => showApiError(err, "Could not save internship", setError),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{intern.fullName}</DialogTitle>
          <DialogDescription>
            {intern.employeeCode} · {intern.designation} — login username is the employee code.
          </DialogDescription>
        </DialogHeader>
        <form id="intern-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="College / institute" error={errors.college?.message}>
            <Input maxLength={200} {...register("college")} />
          </FormField>
          <FormField label="Course" error={errors.course?.message}>
            <Input maxLength={200} placeholder="B.E. CSE, 3rd year" {...register("course")} />
          </FormField>
          <FormField label="Mentor" error={errors.mentorId?.message}>
            <NativeSelect {...register("mentorId")}>
              <option value="">No mentor</option>
              {employees?.employees
                .filter((e) => e.employmentType !== "intern")
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
            </NativeSelect>
          </FormField>
          <FormField label="Monthly stipend (₹)" error={errors.stipend?.message}>
            <Input type="number" inputMode="decimal" min={0} step="0.01" {...register("stipend", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Start date" required error={errors.startDate?.message}>
            <Input type="date" {...register("startDate")} />
          </FormField>
          <FormField label="End date" error={errors.endDate?.message}>
            <Input type="date" {...register("endDate")} />
          </FormField>
          <FormField label="Status" required error={errors.status?.message}>
            <NativeSelect {...register("status")}>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="terminated">Terminated</option>
              <option value="converted">Converted to full-time</option>
            </NativeSelect>
          </FormField>
          <FormField label="Evaluation score (0–100)" error={errors.evaluationScore?.message}>
            <Input type="number" inputMode="numeric" min={0} max={100} step={1} {...register("evaluationScore", { valueAsNumber: true })} />
          </FormField>
          <div className="flex flex-col gap-1 sm:col-span-2">
            <Controller
              control={control}
              name="certificateIssued"
              render={({ field }) => (
                <label className="flex items-center gap-3 text-sm font-medium">
                  <Switch checked={!!field.value} onCheckedChange={(v) => field.onChange(!!v)} />
                  Internship certificate issued
                </label>
              )}
            />
            {errors.certificateIssued && (
              <p className="text-xs text-destructive" role="alert">
                {errors.certificateIssued.message}
              </p>
            )}
          </div>
          <FormField label="Notes / feedback" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea rows={3} maxLength={LIMITS.text} {...register("notes")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="intern-form" disabled={save.isPending || !isDirty}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
