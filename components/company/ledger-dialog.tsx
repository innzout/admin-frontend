"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/company/native-select";
import { FormField } from "@/components/common/form-field";
import { useSaveLedgerEntry } from "@/hooks/use-company";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { cn } from "@/lib/utils";
import { LEDGER_CATEGORIES, PAYMENT_METHODS, paymentMethodLabel, type Direction, type LedgerEntry } from "@/lib/company-types";
import { amount, optionalText, requiredDate, requiredSelect, showApiError, LIMITS } from "@/lib/validation";
import { localIsoDate } from "@/lib/dates";

const today = () => localIsoDate();
/** Furthest a payment may be dated ahead — catches year typos like 2062. */
const MAX_FUTURE_DAYS = 31;

const schema = z
  .object({
    direction: z.enum(["in", "out"]),
    category: requiredSelect("a category"),
    amount: amount("Amount"),
    date: requiredDate("Date"),
    method: z.string(),
    reference: optionalText(100),
    party: optionalText(),
    clientId: z.string(),
    projectId: z.string(),
    notes: optionalText(LIMITS.text),
  })
  .superRefine((v, ctx) => {
    const limit = new Date();
    limit.setDate(limit.getDate() + MAX_FUTURE_DAYS);
    if (v.date > localIsoDate(limit)) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Date is too far in the future" });
    }
    if (v.direction === "out" && !v.party) {
      ctx.addIssue({ code: "custom", path: ["party"], message: "Who was this paid to?" });
    }
    if (v.method && v.method !== "cash" && !v.reference) {
      ctx.addIssue({ code: "custom", path: ["reference"], message: "Add the UTR / transaction reference" });
    }
  });
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const defaultCategory = (d: Direction) => (d === "in" ? "client_payment" : "salary");

function toForm(entry: LedgerEntry | null): FormInput {
  if (!entry) {
    return { direction: "out", category: defaultCategory("out"), amount: Number.NaN, date: today(), method: "bank_transfer", reference: "", party: "", clientId: "", projectId: "", notes: "" };
  }
  return {
    direction: entry.direction,
    category: entry.category,
    amount: entry.amount,
    date: entry.date.slice(0, 10),
    method: entry.method ?? "",
    reference: entry.reference ?? "",
    party: entry.party ?? "",
    clientId: entry.clientId ?? "",
    projectId: entry.projectId ?? "",
    notes: entry.notes ?? "",
  };
}

export function LedgerDialog({ entry, open, onOpenChange }: { entry: LedgerEntry | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const save = useSaveLedgerEntry();
  const { data: clients } = useClients({ limit: 100 });
  const { data: projects } = useProjects({ limit: 100 });

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    setError,
    formState: { errors, isDirty },
  } = useForm<FormInput, unknown, FormValues>({ resolver: zodResolver(schema), defaultValues: toForm(null) });

  useEffect(() => {
    if (open) reset(toForm(entry));
  }, [open, entry, reset]);

  const direction = useWatch({ control, name: "direction" });
  const cats = LEDGER_CATEGORIES.filter((c) => c.direction === "both" || c.direction === direction);

  const chooseDirection = (d: Direction) => {
    setValue("direction", d, { shouldDirty: true });
    setValue("category", defaultCategory(d), { shouldDirty: true });
  };

  const onSubmit = (values: FormValues) => {
    save.mutate(
      { id: entry?.id, input: values },
      {
        onSuccess: () => {
          toast.success(entry ? "Payment updated" : "Payment recorded");
          onOpenChange(false);
        },
        onError: (err) => showApiError(err, "Could not save payment", setError),
      },
    );
  };

  const dirBtn = (d: Direction, label: string) => (
    <button
      type="button"
      aria-pressed={direction === d}
      onClick={() => chooseDirection(d)}
      className={cn(
        "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        direction === d
          ? d === "in"
            ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400"
            : "border-red-500 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit payment" : "Record payment"}</DialogTitle>
        </DialogHeader>
        <form id="ledger-form" onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4 sm:grid-cols-2">
          <div className="flex gap-2 sm:col-span-2" role="group" aria-label="Direction">
            {dirBtn("in", "↓ Money in")}
            {dirBtn("out", "↑ Money out")}
          </div>
          <FormField label="Amount (₹)" required error={errors.amount?.message}>
            <Input type="number" inputMode="decimal" min={0.01} step="0.01" {...register("amount", { valueAsNumber: true })} />
          </FormField>
          <FormField label="Date" required error={errors.date?.message}>
            <Input type="date" {...register("date")} />
          </FormField>
          <FormField label="Category" required error={errors.category?.message}>
            <NativeSelect {...register("category")}>
              {cats.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Method" error={errors.method?.message}>
            <NativeSelect {...register("method")}>
              <option value="">Not set</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {paymentMethodLabel[m]}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label={direction === "in" ? "Received from" : "Paid to"} required={direction === "out"} error={errors.party?.message}>
            <Input maxLength={200} placeholder="Person, vendor or company" {...register("party")} />
          </FormField>
          <FormField label="Reference / UTR" error={errors.reference?.message}>
            <Input maxLength={100} {...register("reference")} />
          </FormField>
          <FormField label="Client" error={errors.clientId?.message}>
            <NativeSelect {...register("clientId")}>
              <option value="">No client</option>
              {clients?.clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Project" error={errors.projectId?.message}>
            <NativeSelect {...register("projectId")}>
              <option value="">No project</option>
              {projects?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField label="Notes" className="sm:col-span-2" error={errors.notes?.message}>
            <Textarea rows={2} maxLength={LIMITS.text} {...register("notes")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="ledger-form" disabled={save.isPending || (!!entry && !isDirty)}>
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
