"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import Link from "next/link";
import { Building2, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeTable } from "@/components/employees/employee-table";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { useEmployees } from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";
import { QueryError } from "@/components/common/query-error";
import { ROLES } from "@/lib/access";

/** Roles that lead people; offered in the "Reports to" filter. */
const LEAD_ROLES = new Set(["admin", "hr", "manager", "team_lead"]);
const ALL = "all";

const PAGE_SIZE = 20;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [reportsTo, setReportsTo] = useState<string>("");
  const [page, setPage] = useState(1);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const { data: departments } = useDepartments();
  const { data: everyone } = useEmployees({ limit: 100 });
  const leads = (everyone?.employees ?? []).filter((e) => e.loginRole && LEAD_ROLES.has(e.loginRole) && e.status !== "exited");
  const leadName = leads.find((l) => l.id === reportsTo)?.fullName;
  const { data, isLoading, isPlaceholderData, isError, refetch, isFetching } = useEmployees({
    search: search || undefined,
    departmentId: departmentId || undefined,
    status: status || undefined,
    role: role || undefined,
    reportingManagerId: reportsTo || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employees"
        subtitle={!data ? "Loading…" : leadName ? `${data.total} reporting to ${leadName}` : `${data.total} total`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button render={<Link href="/departments" />} variant="outline">
              <Building2 className="size-4" />
              Departments
            </Button>
            <AddEmployeeDialog />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <div className="relative flex-1 sm:min-w-56">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or code…"
                className="pl-8"
                onChange={(e) => debouncedSetSearch(e.target.value)}
              />
            </div>
            <Select
              value={departmentId || "all"}
              onValueChange={(v) => {
                setDepartmentId(!v || v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={status || "all"}
              onValueChange={(v) => {
                setStatus(!v || v === "all" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_notice">On notice</SelectItem>
                <SelectItem value="exited">Exited</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={role || ALL}
              onValueChange={(v) => {
                setRole(!v || v === ALL ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-40" aria-label="Filter by role">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.role} value={r.role}>
                    {r.label}
                  </SelectItem>
                ))}
                <SelectItem value="none">No login</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={reportsTo || ALL}
              onValueChange={(v) => {
                setReportsTo(!v || v === ALL ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52" aria-label="Filter by team">
                <SelectValue placeholder="Any team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any team</SelectItem>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    Team of {l.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {isError && !data ? (
              <QueryError what="employees" onRetry={() => refetch()} retrying={isFetching} />
            ) : (
              <EmployeeTable employees={data?.employees ?? []} loading={isLoading} />
            )}
          </div>

          {data && totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
