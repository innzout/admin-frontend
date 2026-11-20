"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { useRecordPayment } from "@/hooks/use-invoices";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { Invoice } from "@/lib/types";
import { amount, requiredDate, optionalText } from "@/lib/validation";

const schema = z.object({
  amount: amount("Payment amount"),
  paidOn: requiredDate("Payment date").refine((v) => v <= new Date().toISOString().slice(0, 10), "Payment date can't be in the future"),
  method: optionalText(50).optional(),
  reference: optionalText(100).optional(),
});
type FormValues = z.infer<typeof schema>;

export function RecordPaymentDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const recordPayment = useRecordPayment();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!open || !invoice) return;
    reset({ amount: invoice.balanceDue, paidOn: new Date().toISOString().slice(0, 10), method: "", reference: "" });
  }, [open, invoice, reset]);

  if (!invoice) return null;

  const onSubmit = (values: FormValues) => {
    recordPayment.mutate(
      {
        id: invoice.id,
        input: { amount: values.amount, paidOn: values.paidOn, method: values.method || undefined, reference: values.reference || undefined },
      },
      {
        onSuccess: (inv) => {
          toast.success(inv.status === "paid" ? `${inv.invoiceNumber} fully paid` : "Payment recorded");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not record payment"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {invoice.invoiceNumber} — balance due {formatInrFull(invoice.balanceDue)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-amount">Amount</Label>
            <Input id="pay-amount" type="number" step="0.01" {...register("amount", { valueAsNumber: true })} />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pay-date">Paid on</Label>
            <Input id="pay-date" type="date" {...register("paidOn")} />
            {errors.paidOn && <p className="text-sm text-destructive">{errors.paidOn.message}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Input id="pay-method" placeholder="Bank transfer, UPI…" {...register("method")} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pay-ref">Reference</Label>
              <Input id="pay-ref" placeholder="Txn ID" {...register("reference")} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={recordPayment.isPending}>
              {recordPayment.isPending ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
