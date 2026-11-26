"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/company/native-select";
import { FormField } from "@/components/common/form-field";
import { useConfirm } from "@/components/common/use-confirm";
import { useInternMentors, useSaveIntern } from "@/hooks/use-interns";
import { roleLabel } from "@/lib/access";
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
    notes: optionalText(LIMITS.text),
  })
  .superRefine(endNotBeforeStart("startDate", "endDate", "End date can't be before the start date"))
  .superRefine((v, ctx) => {
    if ((v.status === "completed" || v.status === "converted") && !v.endDate) {
      ctx.addIssue({ code: "custom", path: ["endDate"], message: "Set the end date before completing the internship" });
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
    stipend: intern.stipend ?? 0,
    status: intern.status,
    notes: intern.notes ?? "",
  };
}

export function InternDialog({ intern, open, onOpenChange }: { intern: Intern | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveIntern();
  const { data: mentors } = useInternMentors(open);
  const { confirm, confirmDialog } = useConfirm();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open && intern) reset(toForm(intern));
  }, [open, intern, reset]);

  if (!intern) return null;

  const persist = (values: FormValues) => {
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

  // Converting changes their login role and employment type, so ask first.
  const onSubmit = (values: FormValues) => {
    if (values.status !== "converted" || intern.status === "converted") return persist(values);
    confirm({
      title: `Convert ${intern.fullName} to full-time?`,
      description: "Their employment type becomes Full-time and their login changes from Intern to Employee. The internship stays in the history.",
      confirmLabel: "Convert",
      onConfirm: () => persist(values),
    });
  };

  return (
    <>
    {confirmDialog}
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
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
              {(mentors ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} · {roleLabel(m.role)}
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
          <FormField label="Notes" className="sm:col-span-2" error={errors.notes?.message}>
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
    </>
  );
}
