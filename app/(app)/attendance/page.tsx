"use client";

import { Suspense, useEffect, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { DecisionDialog } from "@/components/common/decision-dialog";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ApplyOdDialog } from "@/components/od/apply-od-dialog";
import { AttendanceHistory } from "@/components/attendance/attendance-history";
import { CorrectionsPanel } from "@/components/attendance/corrections-panel";
import { useDayActions } from "@/hooks/use-day-actions";
import { attendanceStatusLabel, attendanceStatusTone, leaveRequestStatusTone } from "@/lib/status";
import { useMe } from "@/hooks/use-auth";
import {
  useAttendanceList,
  useEndBreak,
  useStartBreak,
  useTodayAttendance,
} from "@/hooks/use-attendance";
import { useCancelOd, useDecideOd, useOdRequests } from "@/hooks/use-od";
import { ApiError } from "@/lib/api";
import type { OdRequest } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { localIsoDate } from "@/lib/dates";
import { formatClock } from "@/lib/format";
import { RequestDetails } from "@/components/common/request-details";

/** Today's list shows the whole company on one page (the API maximum). */
const TODAY_LIMIT = 200;


export default function AttendancePage() {
  const { data: me } = useMe();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayIso = localIsoDate(now);
  const { data: today, isLoading: todayLoading } = useTodayAttendance();
  // Totals come from the server, so they stay right however many people there are.
  const { data: teamTodayResult, isLoading: teamLoading } = useAttendanceList({ date: todayIso, limit: TODAY_LIMIT });
  const teamToday = teamTodayResult?.records ?? [];
  const todaySummary = teamTodayResult?.summary;
  const { data: odRequests } = useOdRequests();

  const { doCheckIn, requestCheckOut, checkInPending, checkOutPending, confirmDialog } = useDayActions();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const decideOd = useDecideOd();
  const cancelOd = useCancelOd();

  const [applyOdOpen, setApplyOdOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<OdRequest | null>(null);
  const [cancelTarget, setCancelTarget] = useState<OdRequest | null>(null);

  if (!me) return null;

  const isPrivileged = me.role === "admin" || me.role === "hr";
  const onBreak = !!today?.breakStartedAt;
  const canCheckIn = !today || !today.checkInAt;
  const canCheckOut = today?.checkInAt && !today.checkOutAt;

  const doStartBreak = () =>
    startBreak.mutate(undefined, {
      onSuccess: () => toast.success("Break started"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not start break"),
    });
  const doEndBreak = () =>
    endBreak.mutate(undefined, {
      onSuccess: () => toast.success("Break ended"),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not end break"),
    });

  const canDecideOd = (r: OdRequest) => r.status === "pending" && (isPrivileged || r.employeeId !== me.employeeId);
  const canCancelOd = (r: OdRequest) =>
    (r.status === "pending" || r.status === "approved") && (isPrivileged || r.employeeId === me.employeeId);

  const approveOd = (r: OdRequest) => {
    decideOd.mutate(
      { id: r.id, decision: "approve" },
      {
        onSuccess: () => toast.success("On-duty request approved"),
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not approve request"),
      },
    );
  };

  const rejectOd = (note?: string) => {
    if (!rejectTarget) return;
    decideOd.mutate(
      { id: rejectTarget.id, decision: "reject", note },
      {
        onSuccess: () => {
          toast.success("On-duty request rejected");
          setRejectTarget(null);
        },
        onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not reject request"),
      },
    );
  };

  const confirmCancelOd = () => {
    if (!cancelTarget) return;
    cancelOd.mutate(cancelTarget.id, {
      onSuccess: () => setCancelTarget(null),
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not cancel on-duty request");
        setCancelTarget(null);
      },
    });
  };


  const pendingOd = (odRequests ?? []).filter((r) => r.status === "pending");

  return (
    <div className="flex flex-col gap-6">
      {confirmDialog}
      <PageHeader title="Attendance" subtitle="Track daily check-in, breaks, and on-duty requests." />

      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-500 p-6 text-white">
        <p className="text-sm text-white/80">
          {now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="mt-1 text-4xl font-semibold tabular-nums" suppressHydrationWarning>
          {now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: true })}
        </p>
        <p className="mt-1 text-sm text-white/80">
          {todayLoading
            ? "Loading…"
            : today?.checkOutAt
              ? `Checked out at ${formatClock(today.checkOutAt)}.`
              : today?.checkInAt
                ? `Checked in at ${formatClock(today.checkInAt)}${onBreak ? " · on break" : ""}.`
                : "You have not checked in yet today."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canCheckIn && (
            <Button
              className="rounded-full bg-white text-green-700 hover:bg-white/90"
              disabled={checkInPending}
              onClick={doCheckIn}
            >
              Check In
            </Button>
          )}
          {canCheckOut && !onBreak && (
            <Button
              className="rounded-full bg-white text-green-700 hover:bg-white/90"
              disabled={checkOutPending}
              onClick={requestCheckOut}
            >
              Check Out
            </Button>
          )}
          {canCheckOut && !onBreak && (
            <Button
              variant="outline"
              className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
              disabled={startBreak.isPending}
              onClick={doStartBreak}
            >
              Start Break
            </Button>
          )}
          {canCheckOut && onBreak && (
            <Button
              variant="outline"
              className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
              disabled={endBreak.isPending}
              onClick={doEndBreak}
            >
              End Break
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <p className="font-medium">On-Duty Requests {pendingOd.length > 0 ? `(${pendingOd.length} pending)` : ""}</p>
          <Button size="sm" className="rounded-full" onClick={() => setApplyOdOpen(true)}>
            <Plus className="size-4" />
            Apply On Duty
          </Button>
        </div>
        <div className="flex flex-col divide-y">
          {(odRequests ?? []).length === 0 && (
            <EmptyState className="py-8" title="No on-duty requests yet" hint="Requests to work off-site for a day appear here for approval." />
          )}
          {(odRequests ?? []).map((r) => (
            <div key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Briefcase className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{r.employeeName}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {r.fromDate.slice(0, 10)} → {r.toDate.slice(0, 10)}
                    {r.location ? ` · ${r.location}` : ""}
                  </p>
                  <RequestDetails reasonLabel="Purpose" reason={r.purpose} status={r.status} approverName={r.approverName} decisionNote={r.decisionNote} />
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {canDecideOd(r) && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-500/30 dark:text-green-400"
                      disabled={decideOd.isPending}
                      onClick={() => approveOd(r)}
                    >
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400" onClick={() => setRejectTarget(r)}>
                      Reject
                    </Button>
                  </>
                )}
                {!canDecideOd(r) && <StatusBadge tone={leaveRequestStatusTone[r.status]}>{r.status}</StatusBadge>}
                {canCancelOd(r) && (
                  <Button size="sm" variant="ghost" disabled={cancelOd.isPending} onClick={() => setCancelTarget(r)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <p className="font-medium">
            Today&apos;s Attendance — {now.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground">
            Present: {todaySummary?.present ?? 0} · Remote: {todaySummary?.remote ?? 0} · On Duty: {todaySummary?.onDuty ?? 0} · On Leave:{" "}
            {todaySummary?.onLeave ?? 0} · Half Day: {todaySummary?.halfDay ?? 0}
          </p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Check In</TableHead>
              <TableHead>Check Out</TableHead>
              <TableHead className="hidden sm:table-cell">Hours</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!teamLoading && teamToday.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No attendance recorded yet today.
                </TableCell>
              </TableRow>
            )}
            {teamToday.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.employeeName}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatClock(a.checkInAt)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatClock(a.checkOutAt)}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {a.workMinutes != null ? `${Math.floor(a.workMinutes / 60)}h ${a.workMinutes % 60}m` : "–"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge tone={attendanceStatusTone[a.status]}>{attendanceStatusLabel[a.status]}</StatusBadge>
                    {a.isLate && <StatusBadge tone="warning">Late</StatusBadge>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* useSearchParams needs a Suspense boundary in the app router. */}
      <Suspense fallback={null}>
        <AttendanceHistory me={me} />
      </Suspense>

      <CorrectionsPanel meEmployeeId={me.employeeId} />

      <ApplyOdDialog open={applyOdOpen} onOpenChange={setApplyOdOpen} callerRole={me.role} />

      <DecisionDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title="Reject On-Duty Request"
        description={rejectTarget ? `Reject ${rejectTarget.employeeName}'s on-duty request?` : ""}
        confirmLabel="Reject"
        destructive
        noteRequired
        isPending={decideOd.isPending}
        onConfirm={rejectOd}
      />

      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel on-duty request?"
        description={cancelTarget ? `${cancelTarget.employeeName}'s on-duty request will be cancelled.` : ""}
        confirmLabel="Cancel Request"
        isPending={cancelOd.isPending}
        onConfirm={confirmCancelOd}
      />
    </div>
  );
}
