"use client";

import { useState } from "react";
import { Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { StatusBadge } from "@/components/common/status-badge";
import { Pagination } from "@/components/common/pagination";
import { NativeSelect } from "@/components/company/native-select";
import { fetchAuditLogs, useAuditLogs, type AuditLogFilters } from "@/hooks/use-audit";
import { useMe } from "@/hooks/use-auth";
import { auditCsv, describeAction, formatAuditTime } from "@/lib/audit";
import type { StatusTone } from "@/components/common/status-badge";
import type { AuditLogEntry } from "@/lib/types";

const PAGE_SIZE = 25;
/** The API caps one page at 200 rows; export walks pages up to this many rows. */
const EXPORT_PAGE_SIZE = 200;
const EXPORT_MAX_ROWS = 5000;
const ROLES = ["admin", "hr", "manager", "employee", "intern"];

function statusTone(code: number): StatusTone {
  if (code >= 500) return "danger";
  if (code >= 400) return "warning";
  return "success";
}

export default function AuditLogPage() {
  const { data: me } = useMe();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const [exporting, setExporting] = useState(false);
  const { data, isLoading, isError, refetch } = useAuditLogs({ ...filters, page, limit: PAGE_SIZE });

  if (!me) return null;
  if (me.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border bg-card py-24 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="font-medium">Admins only</p>
        <p className="max-w-sm text-sm text-muted-foreground">The activity log records every account&apos;s changes and is restricted to admins.</p>
      </div>
    );
  }

  const set = (patch: AuditLogFilters) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const dateError = filters.from && filters.to && filters.to < filters.from ? "“To” can't be before “From”" : undefined;
  const entries = data?.entries ?? [];
  const filtered = Object.values(filters).some(Boolean);

  const exportCsv = async () => {
    if (dateError || exporting) return;
    setExporting(true);
    try {
      const all: AuditLogEntry[] = [];
      for (let p = 1; all.length < EXPORT_MAX_ROWS; p++) {
        const res = await fetchAuditLogs({ ...filters, page: p, limit: EXPORT_PAGE_SIZE });
        all.push(...res.entries);
        if (all.length >= res.total || res.entries.length === 0) break;
      }
      const url = URL.createObjectURL(new Blob([auditCsv(all)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `innzout-activity-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${all.length} row${all.length === 1 ? "" : "s"}${all.length >= EXPORT_MAX_ROWS ? ` (first ${EXPORT_MAX_ROWS})` : ""}`);
    } catch {
      toast.error("Could not export the activity log");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Activity Log"
        subtitle="Every change made in the admin panel — who, what and when. Times are in IST."
        action={
          <Button variant="outline" onClick={exportCsv} disabled={exporting || !!dateError || data?.total === 0}>
            <Download className="size-4" /> {exporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      <div className="flex flex-wrap items-end gap-2">
        <SearchInput value={filters.search ?? ""} onChange={(v) => set({ search: v })} placeholder="Search person or record…" className="w-full sm:w-64" />
        <NativeSelect aria-label="Role" className="w-full sm:w-36" value={filters.role ?? ""} onChange={(e) => set({ role: e.target.value || undefined })}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r} className="capitalize">
              {r}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect aria-label="Change type" className="w-full sm:w-36" value={filters.method ?? ""} onChange={(e) => set({ method: e.target.value || undefined })}>
          <option value="">All changes</option>
          <option value="POST">Created / actions</option>
          <option value="PATCH">Updated</option>
          <option value="PUT">Replaced</option>
          <option value="DELETE">Deleted</option>
        </NativeSelect>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          From
          <Input type="date" className="w-40" value={filters.from ?? ""} max={filters.to} onChange={(e) => set({ from: e.target.value || undefined })} />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          To
          <Input type="date" className="w-40" value={filters.to ?? ""} min={filters.from} aria-invalid={!!dateError || undefined} onChange={(e) => set({ to: e.target.value || undefined })} />
        </label>
        {filtered && (
          <Button variant="ghost" onClick={() => set({ search: undefined, role: undefined, method: undefined, from: undefined, to: undefined })}>
            Clear
          </Button>
        )}
      </div>
      {dateError && (
        <p className="text-sm text-destructive" role="alert">
          {dateError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border bg-card">
        {isError ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load the activity log.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>What they did</TableHead>
                <TableHead className="hidden lg:table-cell">Record</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 5 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading && entries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                    {filtered || dateError ? "No activity matches these filters." : "No activity recorded yet."}
                  </TableCell>
                </TableRow>
              )}
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-sm whitespace-nowrap text-muted-foreground">{formatAuditTime(e.createdAt)}</TableCell>
                  <TableCell>
                    <p className="text-sm font-medium">{e.actorName ?? "System"}</p>
                    <p className="text-xs text-muted-foreground capitalize">{e.actorRole ?? "—"}</p>
                  </TableCell>
                  <TableCell className="text-sm">{describeAction(e.method, e.path)}</TableCell>
                  <TableCell className="hidden max-w-xs truncate font-mono text-xs text-muted-foreground lg:table-cell" title={e.path}>
                    {e.path.replace(/^\/api\/v1/, "")}
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={statusTone(e.statusCode)}>{e.statusCode < 400 ? "Done" : e.statusCode < 500 ? "Refused" : "Failed"}</StatusBadge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {data && <Pagination page={data.page} limit={data.limit} total={data.total} onPageChange={setPage} />}
    </div>
  );
}
