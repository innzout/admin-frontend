"use client";

import Link from "next/link";
import { CalendarCheck, CheckCircle2, Circle, Clock, DoorOpen, ListChecks, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanelCard } from "@/components/common/panel-card";
import { StatBlock, type BlockTone } from "@/components/common/stat-block";
import { StatusBadge } from "@/components/common/status-badge";
import { useTodayAttendance } from "@/hooks/use-attendance";
import { useDayActions } from "@/hooks/use-day-actions";
import { useLeaveBalances } from "@/hooks/use-leave";
import { useTasks } from "@/hooks/use-tasks";
import { usePayslips } from "@/hooks/use-payroll";
import { taskPriorityTone, taskStatusLabel, taskStatusTone } from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import type { Session } from "@/lib/session";

const balanceTones: BlockTone[] = ["blue", "green", "purple", "orange", "yellow"];

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * A distinct "my day" landing view for the employee role — check in, see
 * your own leave balance/tasks/latest payslip — instead of reusing the
 * admin's company-wide analytics dashboard with buttons hidden.
 */
export function EmployeeDashboard({ session, employeeId }: { session: Session; employeeId?: string }) {
  const { data: today } = useTodayAttendance();
  const { data: balances } = useLeaveBalances();
  const { data: taskResult } = useTasks({ assigneeId: employeeId, limit: 5 });
  const { data: payslips } = usePayslips();
  const { doCheckIn, requestCheckOut, checkInPending, checkOutPending, confirmDialog } = useDayActions();

  const canCheckIn = !today || !today.checkInAt;
  const canCheckOut = today?.checkInAt && !today.checkOutAt;
  const latestPayslip = payslips?.[0];
  const openTasks = (taskResult?.tasks ?? []).filter((t) => t.status !== "completed" && t.status !== "cancelled");

  return (
    <div className="flex flex-col gap-6">
      {confirmDialog}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {greeting()}
          {session.name ? `, ${session.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-sm text-muted-foreground">Here&apos;s your day at a glance.</p>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-green-600 to-green-500 p-6 text-white">
        <p className="text-sm text-white/80">
          {new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <p className="mt-1 text-sm text-white/90">
          {today?.checkOutAt
            ? "You've checked out for today."
            : today?.checkInAt
              ? "You're checked in."
              : "You haven't checked in yet today."}
        </p>
        <div className="mt-4 flex gap-2">
          {canCheckIn && (
            <Button className="rounded-full bg-white text-green-700 hover:bg-white/90" disabled={checkInPending} onClick={doCheckIn}>
              Check In
            </Button>
          )}
          {canCheckOut && (
            <Button className="rounded-full bg-white text-green-700 hover:bg-white/90" disabled={checkOutPending} onClick={requestCheckOut}>
              Check Out
            </Button>
          )}
          <Button render={<Link href="/attendance" />} variant="outline" className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10">
            <CalendarCheck className="size-4" />
            View Attendance
          </Button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="font-medium">My Leave Balance</p>
          <Link href="/leave" className="text-sm text-primary hover:underline">
            Apply leave
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(balances ?? []).map((b, i) => (
            <StatBlock
              key={b.leaveTypeId}
              tone={balanceTones[i % balanceTones.length]}
              label={b.leaveTypeName}
              value={
                <>
                  {b.remaining}
                  <span className="text-sm font-normal text-muted-foreground"> / {b.allocated}</span>
                </>
              }
              progress={b.allocated > 0 ? (b.remaining / b.allocated) * 100 : 0}
            />
          ))}
          {(!balances || balances.length === 0) && (
            <p className="col-span-full text-sm text-muted-foreground">No leave balances yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="My Tasks" viewAllHref="/tasks" contentClassName="flex flex-col gap-1">
          {openTasks.length === 0 && <p className="p-2 text-sm text-muted-foreground">No open tasks assigned to you.</p>}
          {openTasks.map((t) => (
            <div key={t.id} className="flex items-center gap-3 py-2">
              {t.status === "completed" ? (
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
              ) : (
                <Circle className="size-4 shrink-0 text-muted-foreground/40" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.projectName}</p>
              </div>
              <StatusBadge tone={taskPriorityTone[t.priority]} className="hidden sm:inline-flex">
                {t.priority}
              </StatusBadge>
              <StatusBadge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</StatusBadge>
            </div>
          ))}
        </PanelCard>

        <PanelCard title="Latest Payslip" viewAllHref="/payroll">
          {latestPayslip ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Wallet className="size-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {new Date(latestPayslip.year, latestPayslip.month - 1).toLocaleDateString(undefined, {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">{latestPayslip.runStatus}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Net salary</span>
                <span className="font-semibold">{formatInrFull(latestPayslip.netSalary)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No payslips yet.</p>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Button render={<Link href="/leave" />} variant="outline" className="h-auto justify-start gap-3 rounded-xl p-4">
          <DoorOpen className="size-5 text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium">Leave Management</p>
            <p className="text-xs text-muted-foreground">Balances &amp; requests</p>
          </div>
        </Button>
        <Button render={<Link href="/my-tasks" />} variant="outline" className="h-auto justify-start gap-3 rounded-xl p-4">
          <ListChecks className="size-5 text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium">Tasks</p>
            <p className="text-xs text-muted-foreground">Everything assigned to you</p>
          </div>
        </Button>
        <Button render={<Link href="/attendance" />} variant="outline" className="h-auto justify-start gap-3 rounded-xl p-4">
          <Clock className="size-5 text-primary" />
          <div className="text-left">
            <p className="text-sm font-medium">Attendance</p>
            <p className="text-xs text-muted-foreground">Check-in history</p>
          </div>
        </Button>
      </div>
    </div>
  );
}
