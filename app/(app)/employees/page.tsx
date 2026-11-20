"use client";

import { useState } from "react";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/common/page-header";
import { EmployeeTable } from "@/components/employees/employee-table";
import { AddEmployeeDialog } from "@/components/employees/add-employee-dialog";
import { ManageDepartmentsSheet } from "@/components/departments/manage-departments-sheet";
import { useEmployees } from "@/hooks/use-employees";
import { useDepartments } from "@/hooks/use-departments";

const PAGE_SIZE = 20;

export default function EmployeesPage() {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [page, setPage] = useState(1);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, 300);

  const { data: departments } = useDepartments();
  const { data, isLoading, isPlaceholderData } = useEmployees({
    search: search || undefined,
    departmentId: departmentId || undefined,
    status: status || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Employees"
        subtitle={data ? `${data.total} total` : "Loading…"}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <ManageDepartmentsSheet />
            <AddEmployeeDialog />
          </div>
        }
      />

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
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
          </div>

          <div className={isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <EmployeeTable employees={data?.employees ?? []} loading={isLoading} />
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
