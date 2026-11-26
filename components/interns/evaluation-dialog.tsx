"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/company/native-select";
import { FormField } from "@/components/common/form-field";
import { useAddInternEvaluation } from "@/hooks/use-interns";
import { localIsoDate } from "@/lib/dates";
import type { Intern } from "@/lib/company-types";
import { optionalText, requiredDate, showApiError } from "@/lib/validation";

/** Same limits and scoring as the API. */
const NOTE_MAX = 2000;
const MAX_RATING = 5;
export const RATINGS = [
  { key: "technical", label: "Technical skill" },
  { key: "communication", label: "Communication" },
  { key: "ownership", label: "Ownership" },
  { key: "learning", label: "Learning speed" },
] as const;
const RATING_LABELS = ["", "1 · Needs a lot of help", "2 · Below expectations", "3 · Meets expectations", "4 · Above expectations", "5 · Outstanding"];

const rating = (label: string) => z.coerce.number({ error: `Rate ${label.toLowerCase()}` }).int().min(1, `Rate ${label.toLowerCase()}`).max(MAX_RATING);

const schema = z
  .object({
    kind: z.enum(["periodic", "final"]),
    periodStart: requiredDate("Start date"),
    periodEnd: requiredDate("End date"),
    technical: rating("Technical skill"),
    communication: rating("Communication"),
    ownership: rating("Ownership"),
    learning: rating("Learning speed"),
    strengths: optionalText(NOTE_MAX),
    improvements: optionalText(NOTE_MAX),
    comments: optionalText(NOTE_MAX),
  })
  .superRefine((v, ctx) => {
    if (v.periodStart && v.periodEnd && v.periodEnd < v.periodStart) {
      ctx.addIssue({ code: "custom", path: ["periodEnd"], message: "End date can't be before the start date" });
    }
    if (v.periodEnd > localIsoDate()) {
      ctx.addIssue({ code: "custom", path: ["periodEnd"], message: "You can only evaluate a period that has already happened" });
    }
  });
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

/** Score shown while filling in, using the API's rounding. */
export function scorePreview(r: number[]): number | null {
  if (r.some((n) => !n)) return null;
  const sum = r.reduce((a, b) => a + b, 0);
  return Math.floor((sum * 100 + (MAX_RATING * r.length) / 2) / (MAX_RATING * r.length));
}

export function EvaluationDialog({
  intern,
  hasFinal,
  open,
  onOpenChange,
}: {
  intern: Intern;
  hasFinal: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const add = useAddInternEvaluation(intern.employeeId);
  const { register, handleSubmit, reset, setError, control, formState: { errors } } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
  });
  const watched = useWatch({ control, name: ["technical", "communication", "ownership", "learning"] });
  const preview = scorePreview(watched.map((n) => Number(n) || 0));
  const minDate = intern.startDate?.slice(0, 10);
  const today = localIsoDate();

  useEffect(() => {
    if (open) {
      reset({
        kind: "periodic",
        periodStart: minDate ?? today,
        periodEnd: today,
        strengths: "",
        improvements: "",
        comments: "",
      });
    }
  }, [open, minDate, today, reset]);

  const onSubmit = (v: FormValues) =>
    add.mutate(
      { ...v, strengths: v.strengths || undefined, improvements: v.improvements || undefined, comments: v.comments || undefined },
      {
        onSuccess: () => {
          toast.success(v.kind === "final" ? "Final evaluation saved" : "Evaluation saved");
          onOpenChange(false);
        },
        onError: (err) => showApiError(err, "Could not save the evaluation", setError),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Evaluate {intern.fullName}</DialogTitle>
          <DialogDescription>Rate each area from 1 to 5. The score out of 100 is worked out from the ratings.</DialogDescription>
        </DialogHeader>
        <form id="evaluation-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" required className="sm:col-span-2" error={errors.kind?.message}>
            <NativeSelect {...register("kind")}>
              <option value="periodic">Progress review</option>
              <option value="final" disabled={hasFinal}>
                Final evaluation{hasFinal ? " (already done)" : ""}
              </option>
            </NativeSelect>
          </FormField>
          <FormField label="Period from" required error={errors.periodStart?.message}>
            <Input type="date" min={minDate} max={today} {...register("periodStart")} />
          </FormField>
          <FormField label="Period to" required error={errors.periodEnd?.message}>
            <Input type="date" min={minDate} max={today} {...register("periodEnd")} />
          </FormField>
          {RATINGS.map((r) => (
            <FormField key={r.key} label={r.label} required error={errors[r.key]?.message}>
              <NativeSelect defaultValue="" {...register(r.key)}>
                <option value="" disabled>
                  Choose a rating
                </option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {RATING_LABELS[n]}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          ))}
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Score: <span className="font-semibold text-foreground">{preview === null ? "—" : `${preview} / 100`}</span>
          </p>
          <FormField label="Strengths" className="sm:col-span-2" error={errors.strengths?.message}>
            <Textarea rows={2} maxLength={NOTE_MAX} {...register("strengths")} />
          </FormField>
          <FormField label="To improve" className="sm:col-span-2" error={errors.improvements?.message}>
            <Textarea rows={2} maxLength={NOTE_MAX} {...register("improvements")} />
          </FormField>
          <FormField label="Comments" className="sm:col-span-2" error={errors.comments?.message}>
            <Textarea rows={2} maxLength={NOTE_MAX} {...register("comments")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={add.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="evaluation-form" disabled={add.isPending}>
            {add.isPending ? "Saving…" : "Save evaluation"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
