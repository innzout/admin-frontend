"use client";

import { useState } from "react";
import { Plus, Receipt } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatBlock } from "@/components/common/stat-block";
import { StatusBadge } from "@/components/common/status-badge";
import { Pagination } from "@/components/common/pagination";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { useDecideExpense, useExpenses, useReimburseExpense } from "@/hooks/use-expenses";
import { useMe } from "@/hooks/use-auth";
import { expenseStatusTone } from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { Expense } from "@/lib/types";
import { useConfirm } from "@/components/common/use-confirm";
import { EmptyState } from "@/components/common/empty-state";

const PAGE_SIZE = 15;

export default function ExpensesPage() {
  const { data: me } = useMe();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useExpenses({ page, limit: PAGE_SIZE });
  const decideExpense = useDecideExpense();
  const reimburseExpense = useReimburseExpense();
  const { confirm, confirmDialog } = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);

  const expenses = data?.expenses ?? [];
  const isPrivileged = me?.role === "admin" || me?.role === "hr";

  const totalThisPage = expenses.reduce((sum, e) => sum + e.amount, 0);
  const approved = expenses.filter((e) => e.status === "approved" || e.status === "reimbursed").reduce((sum, e) => sum + e.amount, 0);
  const pendingReview = expenses.filter((e) => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);

  const decide = (e: Expense, decision: "approve" | "reject") =>
    confirm({
      title: decision === "approve" ? "Approve this expense?" : "Reject this expense?",
      description: `${e.title} (${formatInrFull(e.amount)}). The decision can't be changed afterwards.`,
      confirmLabel: decision === "approve" ? "Approve" : "Reject",
      destructive: decision === "reject",
      onConfirm: () => decideNow(e, decision),
    });

  const decideNow = (e: Expense, decision: "approve" | "reject") => {
    decideExpense.mutate(
      { id: e.id, decision },
      {
        onSuccess: (res) => {
          toast.success(`Expense ${decision === "approve" ? "approved" : "rejected"}`);
          if (res.warning) toast.warning(res.warning, { duration: 10000 });
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update expense"),
      },
    );
  };

  const reimburse = (e: Expense) =>
    confirm({
      title: "Mark as reimbursed?",
      description: `Confirm you have paid back ${e.title}. This can't be undone.`,
      confirmLabel: "Mark reimbursed",
      onConfirm: () => reimburseNow(e),
    });

  const reimburseNow = (e: Expense) => {
    reimburseExpense.mutate(e.id, {
      onSuccess: () => toast.success(`${e.title} marked reimbursed`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not mark reimbursed"),
    });
  };

  if (!me) return null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Expenses"
        subtitle="Track and approve company expenses."
        action={
          <Button className="rounded-full" onClick={() => setDialogOpen(true)}>
            <Plus className="size-4" />
            Add Expense
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatBlock tone="green" value={formatInrFull(totalThisPage)} label="Total (this page)" />
        <StatBlock tone="green" value={formatInrFull(approved)} label="Approved" />
        <StatBlock tone="orange" value={formatInrFull(pendingReview)} label="Pending Review" />
      </div>

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {!isLoading && (
        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {expenses.length === 0 && <EmptyState title="No expenses yet" hint="Submitted expense claims appear here for approval and reimbursement." />}
          {expenses.map((e) => {
            const canDecide = e.status === "pending" && (isPrivileged || e.paidByEmployeeId !== me.employeeId);
            return (
              <div key={e.id} className="flex items-center gap-3 p-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Receipt className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.categoryName} · {e.paidByEmployeeName} · {e.expenseDate.slice(0, 10)}
                    {e.projectName ? ` · ${e.projectName}` : ""}
                  </p>
                  {e.decisionNote && <p className="mt-0.5 truncate text-xs text-muted-foreground">Note: {e.decisionNote}</p>}
                </div>
                <p className="shrink-0 text-sm font-medium">{formatInrFull(e.amount)}</p>
                <div className="flex shrink-0 items-center gap-2">
                  {canDecide ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400"
                        disabled={decideExpense.isPending}
                        onClick={() => decide(e, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                        disabled={decideExpense.isPending}
                        onClick={() => decide(e, "reject")}
                      >
                        Reject
                      </Button>
                    </>
                  ) : (
                    <StatusBadge tone={expenseStatusTone[e.status]}>{e.status}</StatusBadge>
                  )}
                  {isPrivileged && e.status === "approved" && (
                    <Button size="sm" variant="outline" disabled={reimburseExpense.isPending} onClick={() => reimburse(e)}>
                      Mark Reimbursed
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} callerRole={me.role} />
      {confirmDialog}
    </div>
  );
}
