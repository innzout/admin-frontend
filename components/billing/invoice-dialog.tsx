"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
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
import { useCreateInvoice, useUpdateInvoice } from "@/hooks/use-invoices";
import { useClients } from "@/hooks/use-clients";
import { useProjects } from "@/hooks/use-projects";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { Invoice } from "@/lib/types";
import { requiredSelect, requiredDate, percent, optionalText, endNotBeforeStart, LIMITS } from "@/lib/validation";
import { localIsoDate } from "@/lib/dates";

const NO_PROJECT = "none";

const schema = z.object({
  clientId: requiredSelect("a client"),
  projectId: z.string(),
  issueDate: requiredDate("Issue date"),
  dueDate: requiredDate("Due date"),
  taxPercent: percent("Tax"),
  notes: optionalText(LIMITS.text).optional(),
  lineItems: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Describe the item").max(500, "Keep it under 500 characters"),
        quantity: z.number({ error: "Required" }).refine((n) => !Number.isNaN(n), "Required").refine((n) => n > 0, "Must be more than 0").refine((n) => n <= 100000, "Too large"),
        rate: z.number({ error: "Required" }).refine((n) => !Number.isNaN(n), "Required").refine((n) => n >= 0, "Can't be negative").refine((n) => n <= LIMITS.money, "Too large"),
      }),
    )
    .min(1, "Add at least one line item")
    .max(100, "An invoice can have at most 100 line items"),
}).superRefine(endNotBeforeStart("issueDate", "dueDate", "Due date can't be before the issue date"));
type FormValues = z.infer<typeof schema>;

export function InvoiceDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: clientsResult } = useClients({ limit: 100 });
  const { data: projectsResult } = useProjects({ limit: 100 });
  const createInvoice = useCreateInvoice();
  const updateInvoice = useUpdateInvoice();
  const isEdit = !!invoice;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { taxPercent: 0, lineItems: [{ description: "", quantity: 1, rate: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const watchedItems = useWatch({ control, name: "lineItems" }) ?? [];
  const watchedTax = useWatch({ control, name: "taxPercent" }) ?? 0;

  useEffect(() => {
    if (!open) return;
    reset({
      clientId: invoice?.clientId ?? "",
      projectId: invoice?.projectId ?? NO_PROJECT,
      issueDate: invoice?.issueDate.slice(0, 10) ?? localIsoDate(),
      dueDate: invoice?.dueDate.slice(0, 10) ?? "",
      taxPercent: invoice?.taxPercent ?? 0,
      notes: invoice?.notes ?? "",
      lineItems: invoice?.lineItems.length
        ? invoice.lineItems.map((li) => ({ description: li.description, quantity: li.quantity, rate: li.rate }))
        : [{ description: "", quantity: 1, rate: 0 }],
    });
  }, [open, invoice, reset]);

  const subtotal = watchedItems.reduce((sum, it) => sum + (Number(it?.quantity) || 0) * (Number(it?.rate) || 0), 0);
  const taxAmount = subtotal * (Number(watchedTax) || 0) / 100;
  const total = subtotal + taxAmount;

  const onSubmit = (values: FormValues) => {
    const input = {
      clientId: values.clientId,
      projectId: values.projectId === NO_PROJECT ? undefined : values.projectId,
      issueDate: values.issueDate,
      dueDate: values.dueDate,
      taxPercent: values.taxPercent,
      notes: values.notes || undefined,
      lineItems: values.lineItems,
    };
    if (isEdit) {
      updateInvoice.mutate(
        { id: invoice.id, input },
        {
          onSuccess: () => {
            toast.success(`${invoice.invoiceNumber} updated`);
            onOpenChange(false);
          },
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update invoice"),
        },
      );
    } else {
      createInvoice.mutate(input, {
        onSuccess: (inv) => {
          toast.success(`${inv.invoiceNumber} created as draft`);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create invoice"),
      });
    }
  };

  const isPending = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${invoice.invoiceNumber}` : "New Invoice"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Draft invoices can be freely edited until sent." : "Creates a draft — nothing is sent to the client yet."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Client</Label>
              <Controller
                control={control}
                name="clientId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {(clientsResult?.clients ?? []).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.companyName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.clientId && <p className="text-sm text-destructive">{errors.clientId.message}</p>}
            </div>
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
              <Label htmlFor="inv-issue">Issue date</Label>
              <Input id="inv-issue" type="date" {...register("issueDate")} />
              {errors.issueDate && <p className="text-sm text-destructive">{errors.issueDate.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-due">Due date</Label>
              <Input id="inv-due" type="date" {...register("dueDate")} />
              {errors.dueDate && <p className="text-sm text-destructive">{errors.dueDate.message}</p>}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Line items</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: "", quantity: 1, rate: 0 })}
              >
                <Plus className="size-3.5" />
                Add item
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2 border-b pb-2 last:border-0 sm:grid-cols-[1fr_70px_100px_auto] sm:border-0 sm:pb-0">
                  <Input placeholder="Description" aria-label={`Item ${index + 1} description`} maxLength={300} className="col-span-3 sm:col-span-1" aria-invalid={!!errors.lineItems?.[index]?.description} {...register(`lineItems.${index}.description`)} />
                  <Input type="number" step="0.01" placeholder="Qty" aria-label={`Item ${index + 1} quantity`} aria-invalid={!!errors.lineItems?.[index]?.quantity} {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })} />
                  <Input type="number" step="0.01" placeholder="Rate" aria-label={`Item ${index + 1} rate`} aria-invalid={!!errors.lineItems?.[index]?.rate} {...register(`lineItems.${index}.rate`, { valueAsNumber: true })} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove item ${index + 1}`}
                    disabled={fields.length <= 1}
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              {errors.lineItems?.message && <p className="text-sm text-destructive">{errors.lineItems.message}</p>}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="inv-tax">Tax %</Label>
              <Input id="inv-tax" type="number" step="0.01" max={100} {...register("taxPercent", { valueAsNumber: true })} />
            </div>
            <div className="flex flex-col justify-end gap-1 rounded-lg border bg-muted/30 p-2.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatInrFull(subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Tax</span>
                <span>{formatInrFull(taxAmount)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatInrFull(total)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="inv-notes">Notes (optional)</Label>
            <Textarea id="inv-notes" {...register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Draft"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
