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
import { DecisionDialog } from "@/components/common/decision-dialog";
import { ExpenseDialog } from "@/components/expenses/expense-dialog";
import { useDecideExpense, useExpenses, useReimburseExpense } from "@/hooks/use-expenses";
import { useMe } from "@/hooks/use-auth";
import { expenseStatusTone } from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { Expense, User } from "@/lib/types";
import { useConfirm } from "@/components/common/use-confirm";
import { EmptyState } from "@/components/common/empty-state";

const PAGE_SIZE = 15;

/**
 * Mirrors the API rule: admin/HR or the payer's manager decide, and nobody
 * decides their own expense except an admin. The API checks again.
 */
function canDecide(me: User, e: Expense) {
  if (e.status !== "pending") return false;
  if (e.paidByEmployeeId === me.employeeId) return me.role === "admin";
  return true; // the list only holds own and direct reports' expenses for non-admin/HR
}

export default function ExpensesPage() {
  const { data: me } = useMe();
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useExpenses({ page, limit: PAGE_SIZE });
  const decideExpense = useDecideExpense();
  const reimburseExpense = useReimburseExpense();
  const { confirm, confirmDialog } = useConfirm();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Expense | null>(null);

  const expenses = data?.expenses ?? [];
  const summary = data?.summary;
  const isPrivileged = me?.role === "admin" || me?.role === "hr";

  const decideNow = (e: Expense, decision: "approve" | "reject", note?: string) => {
    decideExpense.mutate(
      { id: e.id, decision, note },
      {
        onSuccess: (res) => {
          toast.success(`Expense ${decision === "approve" ? "approved" : "rejected"}`);
          if (res.warning) toast.warning(res.warning, { duration: 10000 });
          setRejectTarget(null);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update expense"),
      },
    );
  };

  const approve = (e: Expense) =>
    confirm({
      title: "Approve this expense?",
      description: `${e.title} (${formatInrFull(e.amount)}). The decision can't be changed afterwards.`,
      confirmLabel: "Approve",
      onConfirm: () => decideNow(e, "approve"),
    });

  const reimburse = (e: Expense) =>
    confirm({
      title: "Mark as reimbursed?",
      description: `Confirm you have paid back ${e.title}. This can't be undone.`,
      confirmLabel: "Mark reimbursed",
      onConfirm: () =>
        reimburseExpense.mutate(e.id, {
          onSuccess: () => toast.success(`${e.title} marked reimbursed`),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not mark reimbursed"),
        }),
    });

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

      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatBlock tone="blue" value={formatInrFull(summary.total)} label="All claims" />
          <StatBlock tone="orange" value={formatInrFull(summary.pending)} label="Pending review" />
          <StatBlock tone="green" value={formatInrFull(summary.approved)} label="Approved, to pay" />
          <StatBlock tone="purple" value={formatInrFull(summary.reimbursed)} label="Reimbursed" />
        </div>
      )}

      {isLoading && <Skeleton className="h-64 w-full rounded-xl" />}

      {isError && !data && (
        <div className="flex flex-col items-center gap-3 rounded-xl border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load expenses.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      )}

      {data && (
        <div className="flex flex-col divide-y rounded-xl border bg-card">
          {expenses.length === 0 && <EmptyState title="No expenses yet" hint="Submitted expense claims appear here for approval and reimbursement." />}
          {expenses.map((e) => (
            <div key={e.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
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
              <p className="shrink-0 text-sm font-medium tabular-nums">{formatInrFull(e.amount)}</p>
              <div className="flex shrink-0 items-center gap-2">
                {canDecide(me, e) ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400"
                      disabled={decideExpense.isPending}
                      onClick={() => approve(e)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                      disabled={decideExpense.isPending}
                      onClick={() => setRejectTarget(e)}
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
          ))}
        </div>
      )}

      {data && data.total > data.limit && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} callerRole={me.role} />
      <DecisionDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject Expense"
        description={rejectTarget ? `Reject ${rejectTarget.title} (${formatInrFull(rejectTarget.amount)}) from ${rejectTarget.paidByEmployeeName}?` : ""}
        confirmLabel="Reject"
        destructive
        noteRequired
        isPending={decideExpense.isPending}
        onConfirm={(note) => rejectTarget && decideNow(rejectTarget, "reject", note)}
      />
      {confirmDialog}
    </div>
  );
}
