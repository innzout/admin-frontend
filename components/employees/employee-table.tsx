"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, MoreVertical, Pencil, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AvatarInitials } from "@/components/common/avatar-initials";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { EditEmployeeDialog } from "./edit-employee-dialog";
import { useDeactivateEmployee } from "@/hooks/use-employees";
import { employeeStatusLabel, employeeStatusTone } from "@/lib/status";
import { ApiError } from "@/lib/api";
import type { Employee } from "@/lib/types";
import { EmptyState } from "@/components/common/empty-state";
import { ChangeRoleDialog, type RoleTarget } from "@/components/access/change-role-dialog";
import { useMe } from "@/hooks/use-auth";
import { roleLabel } from "@/lib/access";

const employmentTypeLabel: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  intern: "Intern",
};

export function EmployeeTable({ employees, loading }: { employees: Employee[]; loading: boolean }) {
  const deactivate = useDeactivateEmployee();
  const [confirming, setConfirming] = useState<Employee | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [roleTarget, setRoleTarget] = useState<RoleTarget | null>(null);
  const { data: me } = useMe();
  // Only admins may change roles (the API enforces it), and never their own.
  const canChangeRole = (e: Employee) => me?.role === "admin" && !!e.loginUserId && !!e.loginRole && e.loginUserId !== me.id && e.status !== "exited";

  const confirmDeactivate = () => {
    if (!confirming) return;
    deactivate.mutate(confirming.id, {
      onSuccess: () => toast.success(`${confirming.fullName} has been deactivated`),
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not deactivate employee"),
      onSettled: () => setConfirming(null),
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (employees.length === 0) {
    return <EmptyState title="No employees found" hint="Try a different search or filter, or add your first employee." />;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead className="hidden md:table-cell">Department</TableHead>
            <TableHead className="hidden sm:table-cell">Designation</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead className="hidden xl:table-cell">Reports to</TableHead>
            <TableHead className="hidden lg:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Joined</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map((e) => (
            <TableRow key={e.id}>
              <TableCell>
                <Link href={`/employees/${e.id}`} className="group flex items-center gap-3">
                  <AvatarInitials name={e.fullName} />
                  {/* Capped on phones so a long email cannot push Status off-screen. */}
                  <div className="max-w-40 min-w-0 sm:max-w-none">
                    <p className="truncate text-sm font-medium group-hover:underline">{e.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.employeeCode} · {e.email}
                    </p>
                  </div>
                </Link>
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{e.departmentName ?? "—"}</TableCell>
              <TableCell className="hidden text-sm sm:table-cell">{e.designation}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {e.loginRole ? (
                  <StatusBadge tone={e.loginRole === "admin" ? "accent" : e.loginRole === "employee" || e.loginRole === "intern" ? "neutral" : "info"}>
                    {roleLabel(e.loginRole)}
                  </StatusBadge>
                ) : (
                  <span className="text-xs text-muted-foreground">No login</span>
                )}
              </TableCell>
              <TableCell className="hidden max-w-40 truncate text-sm text-muted-foreground xl:table-cell">{e.reportingManagerName ?? "—"}</TableCell>
              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {employmentTypeLabel[e.employmentType] ?? e.employmentType}
              </TableCell>
              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {new Date(e.joinDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
              </TableCell>
              <TableCell>
                <StatusBadge tone={employeeStatusTone[e.status]}>{employeeStatusLabel[e.status]}</StatusBadge>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="size-7 text-muted-foreground" />}>
                    <MoreVertical className="size-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditing(e)}>
                      <Pencil className="size-4" />
                      Edit
                    </DropdownMenuItem>
                    {canChangeRole(e) && (
                      <DropdownMenuItem onClick={() => setRoleTarget({ userId: e.loginUserId!, name: e.fullName, role: e.loginRole! })}>
                        <KeyRound className="size-4" />
                        Change role
                      </DropdownMenuItem>
                    )}
                    {e.status !== "exited" && (
                      <DropdownMenuItem variant="destructive" onClick={() => setConfirming(e)}>
                        <UserX className="size-4" />
                        Deactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ConfirmDialog
        open={!!confirming}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Deactivate ${confirming?.fullName}?`}
        description="This sets their status to exited and immediately revokes their portal login, if they have one. This cannot be undone from here."
        confirmLabel="Deactivate"
        isPending={deactivate.isPending}
        onConfirm={confirmDeactivate}
      />

      <ChangeRoleDialog target={roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)} />

      <EditEmployeeDialog employee={editing} open={!!editing} onOpenChange={(open) => !open && setEditing(null)} />
    </>
  );
}
