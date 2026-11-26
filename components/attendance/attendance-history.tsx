"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/company/native-select";
import { EmptyState } from "@/components/common/empty-state";
import { Pagination } from "@/components/common/pagination";
import { StatBlock } from "@/components/common/stat-block";
import { StatusBadge } from "@/components/common/status-badge";
import { ALL_PEOPLE, HistoryEmployeePicker } from "@/components/attendance/history-employee-picker";
import { CorrectionDialog, oldestCorrectableDay } from "@/components/attendance/correction-dialog";
import { useAttendanceList, type AttendanceFilters } from "@/hooks/use-attendance";
import { localIsoDate, monthStartIso } from "@/lib/dates";
import { formatClock, formatMinutes } from "@/lib/format";
import { attendanceStatusLabel, attendanceStatusTone } from "@/lib/status";
import type { AttendanceRecord, AttendanceStatus, User } from "@/lib/types";

const PAGE_SIZE = 31;
/** Matches the API's limit on one request. */
const MAX_RANGE_DAYS = 366;
const STATUSES: (AttendanceStatus | "late")[] = ["present", "remote", "half_day", "on_duty", "on_leave", "absent", "late"];
const DAY_MS = 86_400_000;

/** Why the chosen range can't be used, or null when it can. */
function rangeError(from: string, to: string): string | null {
  if (!from || !to) return "Choose both dates";
  if (to < from) return "End date can't be before the start date";
  if ((Date.parse(to) - Date.parse(from)) / DAY_MS >= MAX_RANGE_DAYS) return "Choose a range of one year or less";
  return null;
}

/**
 * Attendance history with totals for the chosen range. Who appears is decided
 * by the API: admin/HR everyone, others themselves and their direct reports.
 */
export function AttendanceHistory({ me }: { me: User }) {
  const privileged = me.role === "admin" || me.role === "hr";
  const params = useSearchParams();
  const [employeeId, setEmployeeId] = useState(params.get("employeeId") ?? ALL_PEOPLE);
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(localIsoDate());
  const [status, setStatus] = useState<AttendanceFilters["status"]>(undefined);
  const [page, setPage] = useState(1);
  const [fixing, setFixing] = useState<AttendanceRecord | null>(null);
  // Own days within the correction window can be fixed (system leave/on-duty days can't).
  const oldestFixable = oldestCorrectableDay();
  const canFix = (a: AttendanceRecord) =>
    a.employeeId === me.employeeId &&
    a.date.slice(0, 10) >= oldestFixable &&
    !(a.source === "system" && (a.status === "on_leave" || a.status === "on_duty" || a.status === "half_day"));

  const error = rangeError(from, to);
  const { data, isLoading, isError, refetch } = useAttendanceList(
    { employeeId: employeeId || undefined, from, to, status, page, limit: PAGE_SIZE },
    { enabled: !error },
  );
  const showName = employeeId === ALL_PEOPLE;
  const records = data?.records ?? [];
  const s = data?.summary;

  // Any filter change starts again from the first page.
  const change = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <section id="history" className="flex scroll-mt-20 flex-col gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">Attendance History</h2>
        <p className="text-sm text-muted-foreground">Check-in times, hours and status for any period up to a year.</p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:flex-wrap lg:items-end">
        <HistoryEmployeePicker privileged={privileged} meEmployeeId={me.employeeId} value={employeeId} onChange={change(setEmployeeId)} />
        <div className="grid grid-cols-2 gap-3 sm:flex sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hist-from">From</Label>
            <Input id="hist-from" type="date" value={from} max={to || undefined} onChange={(e) => change(setFrom)(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hist-to">To</Label>
            <Input id="hist-to" type="date" value={to} min={from || undefined} onChange={(e) => change(setTo)(e.target.value)} />
          </div>
        </div>
        <NativeSelect
          aria-label="Status"
          className="w-full sm:w-44"
          value={status ?? ""}
          onChange={(e) => change(setStatus)((e.target.value || undefined) as AttendanceFilters["status"])}
        >
          <option value="">All statuses</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {st === "late" ? "Late arrivals" : attendanceStatusLabel[st]}
            </option>
          ))}
        </NativeSelect>
        {error && <p className="text-sm text-destructive lg:basis-full">{error}</p>}
      </div>

      {s && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <StatBlock tone="blue" value={s.days} label="Days recorded" />
          <StatBlock tone="green" value={s.present + s.remote} label="Present" />
          <StatBlock tone="yellow" value={s.late} label="Late" />
          <StatBlock tone="purple" value={s.onDuty} label="On duty" />
          <StatBlock tone="orange" value={s.onLeave + s.halfDay} label="Leave / half day" />
          <StatBlock tone="red" value={s.absent} label="Absent" />
          <StatBlock tone="red" value={s.missedCheckout} label="Missed check-out" />
          <StatBlock tone="green" value={formatMinutes(s.workMinutes)} label="Hours worked" />
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {error ? null : isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load attendance history.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col gap-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState title="No attendance in this period" hint="Try a wider date range or another status." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {showName && <TableHead>Employee</TableHead>}
                  <TableHead>Check in</TableHead>
                  <TableHead>Check out</TableHead>
                  <TableHead className="hidden md:table-cell">Break</TableHead>
                  <TableHead className="hidden sm:table-cell">Worked</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((a) => {
                  const day = a.date.slice(0, 10);
                  const missedCheckout = !!a.checkInAt && !a.checkOutAt && day < localIsoDate();
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}
                      </TableCell>
                      {showName && <TableCell className="max-w-40 truncate font-medium">{a.employeeName}</TableCell>}
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatClock(a.checkInAt)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {missedCheckout ? <span className="text-destructive">Missed</span> : formatClock(a.checkOutAt)}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{formatMinutes(a.breakMinutes)}</TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{formatMinutes(a.workMinutes)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <StatusBadge tone={attendanceStatusTone[a.status]}>{attendanceStatusLabel[a.status]}</StatusBadge>
                          {a.isLate && <StatusBadge tone="warning">Late</StatusBadge>}
                          {a.corrected && <StatusBadge tone="info">Corrected</StatusBadge>}
                          {canFix(a) && (
                            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setFixing(a)} aria-label={`Correct ${day}`}>
                              Fix
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {data && !error && data.total > PAGE_SIZE && <Pagination page={page} limit={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
      <CorrectionDialog open={!!fixing} onOpenChange={(o) => !o && setFixing(null)} record={fixing} />
    </section>
  );
}
