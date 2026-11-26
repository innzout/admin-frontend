"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DecisionDialog } from "@/components/common/decision-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { RequestDetails } from "@/components/common/request-details";
import { StatusBadge, type StatusTone } from "@/components/common/status-badge";
import { useConfirm } from "@/components/common/use-confirm";
import { CorrectionDialog } from "@/components/attendance/correction-dialog";
import { useCorrectionAction, useCorrections } from "@/hooks/use-attendance";
import { ApiError } from "@/lib/api";
import { formatClock } from "@/lib/format";
import type { AttendanceCorrection, CorrectionStatus } from "@/lib/types";

const PAGE_SIZE = 10;
const tone: Record<CorrectionStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger", cancelled: "neutral" };
const fmtDay = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

/** Missed-punch corrections: approvers decide, employees track and cancel their own. */
export function CorrectionsPanel({ meEmployeeId }: { meEmployeeId?: string }) {
  const [page, setPage] = useState(1);
  const [asking, setAsking] = useState(false);
  const [rejecting, setRejecting] = useState<AttendanceCorrection | null>(null);
  const { data, isLoading, isError, refetch } = useCorrections({ page, limit: PAGE_SIZE });
  const act = useCorrectionAction();
  const { confirm, confirmDialog } = useConfirm();
  const list = data?.corrections ?? [];

  const run = (x: AttendanceCorrection, action: "approve" | "reject" | "cancel", done: string, note?: string) =>
    act.mutate(
      { id: x.id, action, note },
      {
        onSuccess: () => {
          toast.success(done);
          setRejecting(null);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not update the request"),
      },
    );

  return (
    <section className="flex flex-col gap-3">
      {confirmDialog}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-heading text-lg font-semibold">Attendance Corrections</h2>
          <p className="text-sm text-muted-foreground">Forgot to check in or out? Ask for a fix; your manager approves it.</p>
        </div>
        {meEmployeeId && (
          <Button variant="outline" onClick={() => setAsking(true)}>
            <Plus className="size-4" />
            Request correction
          </Button>
        )}
      </div>
      <div className="divide-y overflow-hidden rounded-xl border bg-card">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load corrections.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <Skeleton className="m-4 h-16" />
        ) : list.length === 0 ? (
          <EmptyState className="py-8" title="No correction requests" hint="Requests to fix a missed check-in or check-out appear here." />
        ) : (
          list.map((x) => (
            <div key={x.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{x.employeeName}</p>
                  <StatusBadge tone={tone[x.status]}>{x.status}</StatusBadge>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {fmtDay(x.date)}
                  {x.checkInAt && ` · in ${formatClock(x.checkInAt)}`}
                  {x.checkOutAt && ` · out ${formatClock(x.checkOutAt)}`}
                </p>
                <RequestDetails reasonLabel="Reason" reason={x.reason} status={x.status} approverName={x.approverName} decisionNote={x.decisionNote} />
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {x.canDecide && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400"
                      disabled={act.isPending}
                      onClick={() =>
                        confirm({
                          title: `Approve ${x.employeeName}'s correction?`,
                          description: "Their attendance for this day is updated, and hours and lateness are recalculated.",
                          confirmLabel: "Approve",
                          onConfirm: () => run(x, "approve", "Correction approved"),
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
                      onClick={() => setRejecting(x)}
                    >
                      Reject
                    </Button>
                  </>
                )}
                {x.status === "pending" && x.employeeId === meEmployeeId && (
                  <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => run(x, "cancel", "Request cancelled")}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      {data && data.total > PAGE_SIZE && <Pagination page={page} limit={PAGE_SIZE} total={data.total} onPageChange={setPage} />}

      <CorrectionDialog open={asking} onOpenChange={setAsking} />
      <DecisionDialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title="Reject correction"
        description={rejecting ? `Reject ${rejecting.employeeName}'s correction for ${fmtDay(rejecting.date)}?` : ""}
        confirmLabel="Reject"
        destructive
        noteRequired
        isPending={act.isPending}
        onConfirm={(note) => rejecting && run(rejecting, "reject", "Correction rejected", note)}
      />
    </section>
  );
}
