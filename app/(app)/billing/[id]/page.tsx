"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Download, Pencil, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/common/status-badge";
import { InvoiceDialog } from "@/components/billing/invoice-dialog";
import { RecordPaymentDialog } from "@/components/billing/record-payment-dialog";
import { downloadInvoicePdf, useInvoice, useSendInvoice } from "@/hooks/use-invoices";
import { invoiceStatusTone } from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import { useConfirm } from "@/components/common/use-confirm";
import { RecordLoadError } from "@/components/common/query-error";

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: invoice, isLoading, isError, error, refetch } = useInvoice(params.id);
  const sendInvoice = useSendInvoice();
  const { confirm, confirmDialog } = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (isError && !invoice) {
    return <RecordLoadError error={error} what="invoice" backHref="/billing" backLabel="Back to billing" onRetry={() => refetch()} />;
  }

  if (isLoading || !invoice) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const doSend = () =>
    confirm({
      title: `Send ${invoice.invoiceNumber}?`,
      description: "The invoice is marked as sent and its line items are locked. Check the amounts first.",
      confirmLabel: "Send invoice",
      onConfirm: () =>
        sendInvoice.mutate(invoice.id, {
          onSuccess: () => toast.success(`${invoice.invoiceNumber} sent — line items are now locked`),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not send invoice"),
        }),
    });

  const doDownload = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf(invoice.id, `${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download invoice");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/billing" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Billing
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{invoice.invoiceNumber}</h1>
            <StatusBadge tone={invoiceStatusTone[invoice.status]}>{invoice.status}</StatusBadge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {invoice.clientName}
            {invoice.projectName ? ` · ${invoice.projectName}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Issued {invoice.issueDate.slice(0, 10)}</span>
            <span>Due {invoice.dueDate.slice(0, 10)}</span>
          </div>
          {invoice.notes && <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{invoice.notes}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {invoice.status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Edit
              </Button>
              <Button size="sm" disabled={sendInvoice.isPending} onClick={doSend}>
                <Send className="size-4" />
                Send
              </Button>
            </>
          )}
          {(invoice.status === "sent" || invoice.status === "overdue") && (
            <Button size="sm" onClick={() => setPaymentOpen(true)}>
              Record Payment
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={downloading} onClick={doDownload}>
            <Download className="size-4" />
            PDF
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Total</p>
          <p className="mt-1 text-xl font-semibold">{formatInrFull(invoice.total)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Paid</p>
          <p className="mt-1 text-xl font-semibold">{formatInrFull(invoice.amountPaid)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">Balance Due</p>
          <p className="mt-1 text-xl font-semibold">{formatInrFull(invoice.balanceDue)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="border-b p-4">
          <p className="font-medium">Line Items</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.lineItems.map((li) => (
              <TableRow key={li.id}>
                <TableCell>{li.description}</TableCell>
                <TableCell>{li.quantity}</TableCell>
                <TableCell>{formatInrFull(li.rate)}</TableCell>
                <TableCell className="font-medium">{formatInrFull(li.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col items-end gap-1 border-t p-4 text-sm">
          <div className="flex w-48 justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatInrFull(invoice.subtotal)}</span>
          </div>
          <div className="flex w-48 justify-between text-muted-foreground">
            <span>Tax ({invoice.taxPercent}%)</span>
            <span>{formatInrFull(invoice.taxAmount)}</span>
          </div>
          <div className="flex w-48 justify-between font-medium">
            <span>Total</span>
            <span>{formatInrFull(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.payments.length > 0 && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="border-b p-4">
            <p className="font-medium">Payments</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.paidOn.slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{formatInrFull(p.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.method ?? "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.reference ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <InvoiceDialog invoice={invoice} open={editOpen} onOpenChange={setEditOpen} />
      <RecordPaymentDialog invoice={invoice} open={paymentOpen} onOpenChange={setPaymentOpen} />
      {confirmDialog}
    </div>
  );
}
