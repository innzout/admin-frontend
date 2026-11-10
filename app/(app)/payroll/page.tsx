"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/page-header";
import { StatusBadge } from "@/components/common/status-badge";
import { SalaryStructureSheet } from "@/components/payroll/salary-structure-sheet";
import { GenerateRunDialog } from "@/components/payroll/generate-run-dialog";
import { useMe } from "@/hooks/use-auth";
import { downloadPayslipPdf, useMarkRunPaid, usePayrollRuns, usePayslips, useProcessRun } from "@/hooks/use-payroll";
import { formatInrFull } from "@/lib/format";
import { ApiError } from "@/lib/api";
import type { PayrollRun, PayrollRunStatus } from "@/lib/types";
import { useConfirm } from "@/components/common/use-confirm";

const MONTHS = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const runStatusTone: Record<PayrollRunStatus, "warning" | "info" | "success"> = {
  draft: "warning",
  processed: "info",
  paid: "success",
};

export default function PayrollPage() {
  const { data: me } = useMe();
  const isPrivileged = me?.role === "admin" || me?.role === "hr";

  const { data: runs, isLoading: runsLoading } = usePayrollRuns();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const { data: runPayslips, isLoading: runPayslipsLoading } = usePayslips({ payrollRunId: selectedRunId ?? undefined });
  const { data: myPayslips, isLoading: myPayslipsLoading } = usePayslips();

  const processRun = useProcessRun();
  const markPaid = useMarkRunPaid();
  const { confirm, confirmDialog } = useConfirm();

  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!me) return null;

  const doProcess = (run: PayrollRun) =>
    confirm({
      title: "Process this payroll run?",
      description: "Payslips will be generated for every employee in the run and can no longer be edited.",
      confirmLabel: "Process run",
      onConfirm: () =>
        processRun.mutate(run.id, {
          onSuccess: () => toast.success("Payroll run processed"),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not process run"),
        }),
    });

  const doMarkPaid = (run: PayrollRun) =>
    confirm({
      title: "Mark payroll as paid?",
      description: "Only do this after the salaries have actually been transferred. This can't be undone.",
      confirmLabel: "Mark as paid",
      onConfirm: () =>
        markPaid.mutate(run.id, {
          onSuccess: () => toast.success("Payroll run marked as paid"),
          onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not mark run as paid"),
        }),
    });

  const doDownload = async (payslipId: string, month: number, year: number) => {
    setDownloadingId(payslipId);
    try {
      await downloadPayslipPdf(payslipId, `payslip-${String(month).padStart(2, "0")}-${year}.pdf`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not download payslip");
    } finally {
      setDownloadingId(null);
    }
  };

  if (!isPrivileged) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader title="Payroll" subtitle="Your payslip history." />
        <div className="overflow-x-auto rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {myPayslipsLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!myPayslipsLoading && (myPayslips ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No payslips yet.
                  </TableCell>
                </TableRow>
              )}
              {(myPayslips ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {MONTHS[p.month]} {p.year}
                  </TableCell>
                  <TableCell>{formatInrFull(p.gross)}</TableCell>
                  <TableCell>{formatInrFull(p.pfDeduction + p.taxDeduction + p.otherDeductions)}</TableCell>
                  <TableCell className="font-medium">{formatInrFull(p.netSalary)}</TableCell>
                  <TableCell>
                    <StatusBadge tone={runStatusTone[p.runStatus]}>{p.runStatus}</StatusBadge>
                  </TableCell>
                  <TableCell>
                    {p.runStatus !== "draft" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingId === p.id}
                        onClick={() => doDownload(p.id, p.month, p.year)}
                      >
                        <Download className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payroll"
        subtitle="Run monthly payroll and manage salary structures."
        action={
          <div className="flex gap-2">
            <SalaryStructureSheet />
            <GenerateRunDialog />
          </div>
        }
      />

      <div className="overflow-x-auto rounded-xl border bg-card">
        <div className="border-b p-4">
          <p className="font-medium">Payroll Runs</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payslips</TableHead>
              <TableHead>Total Net</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {runsLoading && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
              </TableRow>
            )}
            {!runsLoading && (runs ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No payroll runs yet — generate one to get started.
                </TableCell>
              </TableRow>
            )}
            {(runs ?? []).map((run) => (
              <TableRow key={run.id} className={selectedRunId === run.id ? "bg-muted/50" : ""}>
                <TableCell className="font-medium">
                  {MONTHS[run.month]} {run.year}
                </TableCell>
                <TableCell>
                  <StatusBadge tone={runStatusTone[run.status]}>{run.status}</StatusBadge>
                </TableCell>
                <TableCell>{run.payslipCount}</TableCell>
                <TableCell>{formatInrFull(run.totalNet)}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedRunId(run.id)}>
                      View
                    </Button>
                    {run.status === "draft" && (
                      <Button size="sm" variant="outline" disabled={processRun.isPending} onClick={() => doProcess(run)}>
                        Process
                      </Button>
                    )}
                    {run.status === "processed" && (
                      <Button size="sm" variant="outline" disabled={markPaid.isPending} onClick={() => doMarkPaid(run)}>
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedRunId && (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="border-b p-4">
            <p className="font-medium">Payslips</p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Basic</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {runPayslipsLoading && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {!runPayslipsLoading && (runPayslips ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No payslips for this run.
                  </TableCell>
                </TableRow>
              )}
              {(runPayslips ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.employeeName}</TableCell>
                  <TableCell>{formatInrFull(p.basic)}</TableCell>
                  <TableCell>{formatInrFull(p.gross)}</TableCell>
                  <TableCell>{formatInrFull(p.pfDeduction + p.taxDeduction + p.otherDeductions)}</TableCell>
                  <TableCell className="font-medium">{formatInrFull(p.netSalary)}</TableCell>
                  <TableCell>
                    {p.runStatus !== "draft" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={downloadingId === p.id}
                        onClick={() => doDownload(p.id, p.month, p.year)}
                      >
                        <Download className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {confirmDialog}
    </div>
  );
}
