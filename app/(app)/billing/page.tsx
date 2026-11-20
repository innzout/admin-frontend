"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Plus, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatBlock } from "@/components/common/stat-block";
import { StatusBadge } from "@/components/common/status-badge";
import { Pagination } from "@/components/common/pagination";
import { InvoiceDialog } from "@/components/billing/invoice-dialog";
import { downloadInvoicePdf, useInvoices, useSendInvoice } from "@/hooks/use-invoices";
import { cn } from "@/lib/utils";
import { invoiceStatusTone } from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { useConfirm } from "@/components/common/use-confirm";

const filters: { key: InvoiceStatus | "all"; label: string }[] = [
  { key: "all", label: "All Invoices" },
  { key: "draft", label: "Draft" },
  { key: "sent", label: "Sent" },
  { key: "paid", label: "Paid" },
  { key: "overdue", label: "Overdue" },
];
const PAGE_SIZE = 10;

export default function BillingPage() {
  const [filter, setFilter] = useState<InvoiceStatus | "all">("all");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useInvoices({ status: filter === "all" ? undefined : filter, page, limit: PAGE_SIZE });
  const sendInvoice = useSendInvoice();
  const { confirm, confirmDialog } = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const invoices = data?.invoices ?? [];

  const changeFilter = (f: InvoiceStatus | "all") => {
    setFilter(f);
    setPage(1);
  };

  const doSend = (inv: Invoice) =>
    confirm({
      title: `Send ${inv.invoiceNumber}?`,
      description: "The invoice is marked as sent and its line items are locked. Check the amounts first.",
      confirmLabel: "Send invoice",
      onConfirm: () =>
        sendInvoice.mutate(inv.id, {
          onSuccess: () => toast.success(`${inv.invoiceNumber} sent — line items are now locked`),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not send invoice"),
        }),
    });

  const doDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      await downloadInvoicePdf(inv.id, `${inv.invoiceNumber}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download invoice");
    } finally {
      setDownloadingId(null);
    }
  };

  const totals = invoices.reduce(
    (acc, i) => {
      acc.billed += i.total;
      if (i.status === "paid") acc.paid += i.total;
      if (i.status === "sent") acc.pendingSent += i.balanceDue;
      if (i.status === "overdue") acc.overdue += i.balanceDue;
      return acc;
    },
    { billed: 0, paid: 0, pendingSent: 0, overdue: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Billing & Invoices"
        subtitle="Create, edit, send and track all invoices."
        action={
          <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            New Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatBlock tone="green" value={formatInrFull(totals.billed)} label="Total Billed (this page)" />
        <StatBlock tone="green" value={formatInrFull(totals.paid)} label="Paid" />
        <StatBlock tone="blue" value={formatInrFull(totals.pendingSent)} label="Pending / Sent" />
        <StatBlock tone="red" value={formatInrFull(totals.overdue)} label="Overdue" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => changeFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">{data?.total ?? 0} invoices</p>
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead className="hidden sm:table-cell">Client</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="hidden md:table-cell">Balance</TableHead>
                <TableHead className="hidden lg:table-cell">Issue Date</TableHead>
                <TableHead className="hidden md:table-cell">Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              )}
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell>
                    <Link href={`/billing/${inv.id}`} className="font-medium hover:underline">
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{inv.clientName}</TableCell>
                  <TableCell className="text-sm font-medium">{formatInrFull(inv.total)}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{formatInrFull(inv.balanceDue)}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">{inv.issueDate.slice(0, 10)}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{inv.dueDate.slice(0, 10)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={invoiceStatusTone[inv.status]}>{inv.status}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-0.5">
                      {inv.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground"
                          disabled={sendInvoice.isPending}
                          onClick={() => doSend(inv)}
                          aria-label="Send invoice"
                        >
                          <Send className="size-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground"
                        disabled={downloadingId === inv.id}
                        onClick={() => doDownload(inv)}
                        aria-label="Download PDF"
                      >
                        <Download className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}

      <InvoiceDialog invoice={null} open={dialogOpen} onOpenChange={setDialogOpen} />
      {confirmDialog}
    </div>
  );
}
