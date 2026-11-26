"use client";

import { useState } from "react";
import { DoorOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatBlock, type BlockTone } from "@/components/common/stat-block";
import { StatusBadge } from "@/components/common/status-badge";
import { DecisionDialog } from "@/components/common/decision-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ApplyLeaveDialog } from "@/components/leave/apply-leave-dialog";
import { useCancelLeave, useDecideLeave, useLeaveBalances, useLeaveRequests } from "@/hooks/use-leave";
import { useMe } from "@/hooks/use-auth";
import { leaveRequestStatusTone } from "@/lib/status";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LeaveRequest } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { RequestDetails } from "@/components/common/request-details";
import { QueryError } from "@/components/common/query-error";

const balanceTones: BlockTone[] = ["blue", "green", "purple", "orange", "yellow"];

export default function LeaveManagementPage() {
  const { data: me } = useMe();
  const { data: balances, isLoading: balancesLoading } = useLeaveBalances(!!me?.employeeId);
  const { data: requests, isLoading: requestsLoading, isError: requestsFailed, refetch: requestsRetry, isFetching: requestsRetrying } = useLeaveRequests();
  const decideLeave = useDecideLeave();
  const cancelLeave = useCancelLeave();

  const [applyOpen, setApplyOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LeaveRequest | null>(null);

  if (!me) return null;

  const isPrivileged = me.role === "admin" || me.role === "hr";
  const pendingCount = (requests ?? []).filter((r) => r.status === "pending").length;

  const canDecide = (r: LeaveRequest) => r.status === "pending" && (isPrivileged || r.employeeId !== me.employeeId);
  const canCancel = (r: LeaveRequest) =>
    (r.status === "pending" || r.status === "approved") &&
    (isPrivileged || r.employeeId === me.employeeId);

  const approve = (r: LeaveRequest) => {
    decideLeave.mutate(
      { id: r.id, decision: "approve" },
      {
        onSuccess: () => toast.success("Leave request approved"),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not approve request"),
      },
    );
  };

  const reject = (note?: string) => {
    if (!rejectTarget) return;
    decideLeave.mutate(
      { id: rejectTarget.id, decision: "reject", note },
      {
        onSuccess: () => {
          toast.success("Leave request rejected");
          setRejectTarget(null);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not reject request"),
      },
    );
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelLeave.mutate(cancelTarget.id, {
      onSuccess: () => {
        toast.success("Leave request cancelled");
        setCancelTarget(null);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not cancel request");
        setCancelTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Leave Management"
        subtitle={isPrivileged ? "Review and approve leave requests." : "Track your leave balance and requests."}
        action={
          <Button className="rounded-full" onClick={() => setApplyOpen(true)}>
            <Plus className="size-4" />
            Apply Leave
          </Button>
        }
      />

      <div className={cn("grid grid-cols-2 gap-3 lg:grid-cols-4", !balancesLoading && !balances?.length && "hidden")}>
        {balancesLoading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          : (balances ?? []).map((b, i) => (
              <StatBlock
                key={b.leaveTypeId}
                tone={balanceTones[i % balanceTones.length]}
                label={b.leaveTypeName}
                value={
                  <>
                    {b.remaining}
                    <span className="text-sm font-normal text-muted-foreground"> / {b.allocated} remaining</span>
                  </>
                }
                progress={b.allocated > 0 ? (b.remaining / b.allocated) * 100 : 0}
              />
            ))}
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <p className="font-medium">Leave Requests {isPrivileged || pendingCount > 0 ? `(${pendingCount} pending)` : ""}</p>
        </div>
        <div className="flex flex-col divide-y">
          {requestsFailed && !requests && <QueryError what="leave requests" onRetry={() => requestsRetry()} retrying={requestsRetrying} />}
          {requestsLoading && <div className="p-4 text-sm text-muted-foreground">Loading…</div>}
          {requests && requests.length === 0 && (
            <EmptyState className="py-8" title="No leave requests yet" hint="Use Apply Leave to request time off. Requests waiting for approval appear here." />
          )}
          {(requests ?? []).map((r) => (
            <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <DoorOpen className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{r.employeeName}</p>
                    <StatusBadge tone="info">{r.leaveTypeName}</StatusBadge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {r.fromDate.slice(0, 10)} → {r.toDate.slice(0, 10)} · {r.days} day{r.days === 1 ? "" : "s"}
                  </p>
                  <RequestDetails reasonLabel="Reason" reason={r.reason} status={r.status} approverName={r.approverName} decisionNote={r.decisionNote} />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canDecide(r) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400"
                      disabled={decideLeave.isPending}
                      onClick={() => approve(r)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                      onClick={() => setRejectTarget(r)}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {!canDecide(r) && (
                  <StatusBadge tone={leaveRequestStatusTone[r.status]}>{r.status}</StatusBadge>
                )}
                {canCancel(r) && (
                  <Button size="sm" variant="ghost" disabled={cancelLeave.isPending} onClick={() => setCancelTarget(r)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} callerRole={me.role} />

      <DecisionDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject Leave Request"
        description={rejectTarget ? `Reject ${rejectTarget.employeeName}'s ${rejectTarget.leaveTypeName} request?` : ""}
        confirmLabel="Reject"
        destructive
        noteRequired
        isPending={decideLeave.isPending}
        onConfirm={reject}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel leave request?"
        description={
          cancelTarget
            ? `${cancelTarget.employeeName}'s ${cancelTarget.leaveTypeName} request will be cancelled${cancelTarget.status === "approved" ? " and the leave balance restored" : ""}.`
            : ""
        }
        confirmLabel="Cancel Request"
        isPending={cancelLeave.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
