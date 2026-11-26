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
import { FormField } from "@/components/common/form-field";
import { useRequestCorrection } from "@/hooks/use-attendance";
import { localIsoDate } from "@/lib/dates";
import { formatClock } from "@/lib/format";
import type { AttendanceRecord } from "@/lib/types";
import { requiredDate, requiredText, showApiError } from "@/lib/validation";

/** Same limits as the API. */
export const MAX_CORRECTION_AGE_DAYS = 30;
const REASON_MIN = 5;
const REASON_MAX = 500;
const DAY_MS = 86_400_000;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Earliest day a correction may be asked for. */
export const oldestCorrectableDay = () => localIsoDate(new Date(Date.now() - MAX_CORRECTION_AGE_DAYS * DAY_MS));
const time = z.string().refine((v) => v === "" || HHMM.test(v), "Enter a time like 09:30");

const schema = z
  .object({
    date: requiredDate("Date"),
    checkIn: time,
    checkOut: time,
    reason: requiredText("Reason", REASON_MAX, REASON_MIN),
  })
  .superRefine((v, ctx) => {
    if (!v.checkIn && !v.checkOut) ctx.addIssue({ code: "custom", path: ["checkIn"], message: "Give the correct check-in or check-out time" });
    if (v.checkIn && v.checkOut && v.checkOut <= v.checkIn) ctx.addIssue({ code: "custom", path: ["checkOut"], message: "Check-out must be after check-in" });
    if (v.date > localIsoDate()) ctx.addIssue({ code: "custom", path: ["date"], message: "You can only correct a day that has started" });
    if (v.date && v.date < oldestCorrectableDay())
      ctx.addIssue({ code: "custom", path: ["date"], message: `Corrections are allowed for the last ${MAX_CORRECTION_AGE_DAYS} days` });
  });
type FormValues = z.infer<typeof schema>;

const hhmm = (iso?: string) => (iso ? new Date(iso).toTimeString().slice(0, 5) : "");

/**
 * Ask to fix a missed or wrong check-in / check-out. `record` pre-fills the
 * day; leave a time blank to keep what is recorded.
 */
export function CorrectionDialog({ open, onOpenChange, record }: { open: boolean; onOpenChange: (o: boolean) => void; record?: AttendanceRecord | null }) {
  const request = useRequestCorrection();
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (open) {
      reset({
        date: record?.date.slice(0, 10) ?? localIsoDate(),
        checkIn: "",
        checkOut: "",
        reason: "",
      });
    }
  }, [open, record, reset]);

  const onSubmit = (v: FormValues) =>
    request.mutate(
      { date: v.date, checkIn: v.checkIn || undefined, checkOut: v.checkOut || undefined, reason: v.reason },
      {
        onSuccess: () => {
          toast.success("Correction sent for approval");
          onOpenChange(false);
        },
        onError: (err) => showApiError(err, "Could not send the correction", setError),
      },
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Correct attendance</DialogTitle>
          <DialogDescription>
            {record
              ? `Recorded: in ${formatClock(record.checkInAt)}, out ${formatClock(record.checkOutAt)}. Fill only the time that is wrong or missing.`
              : "Fill only the time that is wrong or missing. Your manager approves it."}
          </DialogDescription>
        </DialogHeader>
        <form id="correction-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <FormField label="Date" required className="sm:col-span-2" error={errors.date?.message}>
            <Input type="date" min={oldestCorrectableDay()} max={localIsoDate()} readOnly={!!record} {...register("date")} />
          </FormField>
          <FormField label="Check-in" hint={record?.checkInAt ? `Now ${hhmm(record.checkInAt)}` : undefined} error={errors.checkIn?.message}>
            <Input type="time" {...register("checkIn")} />
          </FormField>
          <FormField label="Check-out" hint={record?.checkOutAt ? `Now ${hhmm(record.checkOutAt)}` : undefined} error={errors.checkOut?.message}>
            <Input type="time" {...register("checkOut")} />
          </FormField>
          <FormField label="Reason" required className="sm:col-span-2" error={errors.reason?.message}>
            <Textarea rows={3} maxLength={REASON_MAX} placeholder="e.g. Forgot to check out; left at 6 pm" {...register("reason")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={request.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="correction-form" disabled={request.isPending}>
            {request.isPending ? "Sending…" : "Send for approval"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
