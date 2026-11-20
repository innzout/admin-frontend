"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, Mail, Pencil, Phone, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { StatusBadge } from "@/components/common/status-badge";
import { PanelCard } from "@/components/common/panel-card";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EditEmployeeDialog } from "@/components/employees/edit-employee-dialog";
import { useCreateEmployeeLogin, useDeactivateEmployee, useEmployee, useResetEmployeePassword } from "@/hooks/use-employees";
import { TempPasswordDialog, type TempCredentials } from "@/components/employees/temp-password-dialog";
import { useMe } from "@/hooks/use-auth";
import { useAttendanceList } from "@/hooks/use-attendance";
import { useLeaveRequests } from "@/hooks/use-leave";
import { useOdRequests } from "@/hooks/use-od";
import { useTasks } from "@/hooks/use-tasks";
import { usePayslips, useSalaryStructures } from "@/hooks/use-payroll";
import {
  attendanceStatusLabel,
  attendanceStatusTone,
  employeeStatusLabel,
  employeeStatusTone,
  leaveRequestStatusTone,
  taskPriorityTone,
  taskStatusLabel,
  taskStatusTone,
} from "@/lib/status";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";

const MONTHS = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function EmployeeDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: me } = useMe();
  const { data: employee, isLoading } = useEmployee(params.id);

  const { data: attendance } = useAttendanceList({ employeeId: params.id });
  const { data: leaveRequests } = useLeaveRequests({ employeeId: params.id });
  const { data: odRequests } = useOdRequests({ employeeId: params.id });
  const { data: taskResult } = useTasks({ assigneeId: params.id, limit: 10 });
  const { data: payslips } = usePayslips({ employeeId: params.id });
  const { data: salaryStructures } = useSalaryStructures(params.id);

  const deactivate = useDeactivateEmployee();
  const resetPassword = useResetEmployeePassword();
  const [editOpen, setEditOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const [deactivateConfirm, setDeactivateConfirm] = useState(false);
  const createLogin = useCreateEmployeeLogin();
  const [loginConfirm, setLoginConfirm] = useState(false);
  const [credentials, setCredentials] = useState<TempCredentials | null>(null);

  const isPrivileged = me?.role === "admin" || me?.role === "hr";

  if (me && !isPrivileged) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <p className="font-medium">You don&apos;t have access to this page.</p>
        <Button variant="outline" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </div>
    );
  }

  if (isLoading || !employee) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const confirmDeactivate = () => {
    deactivate.mutate(employee.id, {
      onSuccess: () => {
        toast.success(`${employee.fullName} has been deactivated`);
        setDeactivateConfirm(false);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not deactivate employee");
        setDeactivateConfirm(false);
      },
    });
  };

  const confirmResetPassword = () => {
    resetPassword.mutate(employee.id, {
      onSuccess: (res) => {
        setCredentials({ name: employee.fullName, username: employee.employeeCode.toLowerCase(), password: res.tempPassword });
        setResetConfirm(false);
      },
      onError: (err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not reset password");
        setResetConfirm(false);
      },
    });
  };

  const confirmCreateLogin = () => {
    createLogin.mutate(employee.id, {
      onSuccess: (res) => setCredentials({ name: employee.fullName, username: employee.employeeCode.toLowerCase(), password: res.tempPassword }),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not create the login"),
      onSettled: () => setLoginConfirm(false),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Link href="/employees" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Employees
      </Link>

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <AvatarInitials name={employee.fullName} className="size-14 text-lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold">{employee.fullName}</h1>
              <StatusBadge tone={employeeStatusTone[employee.status]}>{employeeStatusLabel[employee.status]}</StatusBadge>
            </div>
            <p className="text-sm text-muted-foreground">
              {employee.employeeCode} · {employee.designation} · {employee.departmentName ?? "No department"}
            </p>
            <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="size-3" /> {employee.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" /> {employee.phone}
                </span>
              )}
              {employee.reportingManagerName && <span>Reports to {employee.reportingManagerName}</span>}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit
          </Button>
          {employee.hasLogin && (
            <Button variant="outline" size="sm" onClick={() => setResetConfirm(true)}>
              <KeyRound className="size-4" />
              Reset Password
            </Button>
          )}
          {!employee.hasLogin && employee.status !== "exited" && (
            <Button variant="outline" size="sm" onClick={() => setLoginConfirm(true)}>
              <KeyRound className="size-4" />
              Give Portal Login
            </Button>
          )}
          {employee.status !== "exited" && (
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400"
              onClick={() => setDeactivateConfirm(true)}
            >
              <UserX className="size-4" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PanelCard title="Recent Attendance" contentClassName="flex flex-col gap-2">
          {(attendance ?? []).length === 0 && <p className="text-sm text-muted-foreground">No attendance recorded yet.</p>}
          {(attendance ?? []).slice(0, 8).map((a) => (
            <div key={a.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{a.date.slice(0, 10)}</span>
              <div className="flex items-center gap-1.5">
                {a.isLate && <StatusBadge tone="warning">Late</StatusBadge>}
                <StatusBadge tone={attendanceStatusTone[a.status]}>{attendanceStatusLabel[a.status]}</StatusBadge>
              </div>
            </div>
          ))}
        </PanelCard>

        <PanelCard title="Tasks Assigned" viewAllHref="/tasks" contentClassName="flex flex-col gap-2">
          {(taskResult?.tasks ?? []).length === 0 && <p className="text-sm text-muted-foreground">No tasks assigned.</p>}
          {(taskResult?.tasks ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">{t.title}</p>
                <p className="truncate text-xs text-muted-foreground">{t.projectName}</p>
              </div>
              <StatusBadge tone={taskPriorityTone[t.priority]} className="hidden sm:inline-flex">
                {t.priority}
              </StatusBadge>
              <StatusBadge tone={taskStatusTone[t.status]}>{taskStatusLabel[t.status]}</StatusBadge>
            </div>
          ))}
        </PanelCard>

        <PanelCard title="Leave Requests" viewAllHref="/leave" contentClassName="flex flex-col gap-2">
          {(leaveRequests ?? []).length === 0 && <p className="text-sm text-muted-foreground">No leave requests yet.</p>}
          {(leaveRequests ?? []).slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {r.leaveTypeName} · {r.fromDate} → {r.toDate}
                </p>
              </div>
              <StatusBadge tone={leaveRequestStatusTone[r.status]}>{r.status}</StatusBadge>
            </div>
          ))}
        </PanelCard>

        <PanelCard title="On-Duty Requests" viewAllHref="/attendance" contentClassName="flex flex-col gap-2">
          {(odRequests ?? []).length === 0 && <p className="text-sm text-muted-foreground">No on-duty requests yet.</p>}
          {(odRequests ?? []).slice(0, 8).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {r.fromDate} → {r.toDate}
                  {r.location ? ` · ${r.location}` : ""}
                </p>
              </div>
              <StatusBadge tone={leaveRequestStatusTone[r.status === "cancelled" ? "cancelled" : r.status]}>{r.status}</StatusBadge>
            </div>
          ))}
        </PanelCard>

        <PanelCard title="Payslips" viewAllHref="/payroll" contentClassName="flex flex-col gap-2">
          {(payslips ?? []).length === 0 && <p className="text-sm text-muted-foreground">No payslips yet.</p>}
          {(payslips ?? []).slice(0, 6).map((p) => (
            <div key={p.id} className="flex items-center justify-between text-sm">
              <span>
                {MONTHS[p.month]} {p.year}
              </span>
              <span className="font-medium">{formatInrFull(p.netSalary)}</span>
            </div>
          ))}
        </PanelCard>

        <PanelCard title="Salary Structure History" contentClassName="flex flex-col gap-2">
          {(salaryStructures ?? []).length === 0 && <p className="text-sm text-muted-foreground">No salary structure recorded yet.</p>}
          {(salaryStructures ?? []).map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Effective {s.effectiveFrom.slice(0, 10)}</span>
              <span className="font-medium">
                {formatInrFull(s.basic + s.hra + s.allowances.conveyance + s.allowances.medical + s.allowances.special)}/mo
              </span>
            </div>
          ))}
        </PanelCard>
      </div>

      <EditEmployeeDialog employee={employee} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={deactivateConfirm}
        onOpenChange={setDeactivateConfirm}
        title={`Deactivate ${employee.fullName}?`}
        description="This sets their status to exited and immediately revokes their portal login, if they have one."
        confirmLabel="Deactivate"
        isPending={deactivate.isPending}
        onConfirm={confirmDeactivate}
      />

      <ConfirmDialog
        open={resetConfirm}
        onOpenChange={setResetConfirm}
        title={`Reset ${employee.fullName}'s password?`}
        description="A new temporary password will be generated and they'll be required to set a new one at next login. There's no self-service reset flow yet, so this is the recovery path for a locked-out employee."
        confirmLabel="Reset Password"
        destructive={false}
        isPending={resetPassword.isPending}
        onConfirm={confirmResetPassword}
      />

      <ConfirmDialog
        open={loginConfirm}
        onOpenChange={setLoginConfirm}
        title={`Give ${employee.fullName} a portal login?`}
        description={`They sign in with username ${employee.employeeCode.toLowerCase()} and a one-time password shown next. They start as ${employee.employmentType === "intern" ? "Intern" : "Employee"}; an admin can change the role under Roles & Access.`}
        confirmLabel="Create login"
        destructive={false}
        isPending={createLogin.isPending}
        onConfirm={confirmCreateLogin}
      />

      <TempPasswordDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </div>
  );
}
