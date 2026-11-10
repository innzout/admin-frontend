"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, API } from "@/lib/api";
import { getAccessToken } from "@/lib/session";
import type { CreateSalaryStructureInput, PayrollRun, Payslip, SalaryStructure } from "@/lib/types";

function invalidatePayroll(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["payroll"] });
}

export function useSalaryStructures(employeeId?: string) {
  const params = new URLSearchParams();
  if (employeeId) params.set("employeeId", employeeId);
  return useQuery({
    queryKey: ["payroll", "structures", employeeId ?? "all"],
    queryFn: () =>
      api<{ structures: SalaryStructure[] }>(`/api/v1/payroll/salary-structures?${params.toString()}`).then(
        (r) => r.structures,
      ),
  });
}

export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSalaryStructureInput) =>
      api<{ structure: SalaryStructure }>("/api/v1/payroll/salary-structures", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.structure),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function usePayrollRuns() {
  return useQuery({
    queryKey: ["payroll", "runs"],
    queryFn: () => api<{ runs: PayrollRun[] }>("/api/v1/payroll/runs").then((r) => r.runs),
  });
}

export function useGenerateRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { month: number; year: number }) =>
      api<{ run: PayrollRun }>("/api/v1/payroll/runs", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.run),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useProcessRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ run: PayrollRun }>(`/api/v1/payroll/runs/${id}/process`, { method: "POST" }).then((r) => r.run),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export function useMarkRunPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ run: PayrollRun }>(`/api/v1/payroll/runs/${id}/mark-paid`, { method: "POST" }).then((r) => r.run),
    onSuccess: () => invalidatePayroll(queryClient),
  });
}

export interface PayslipFilters {
  employeeId?: string;
  payrollRunId?: string;
}

export function usePayslips(filters: PayslipFilters = {}) {
  const params = new URLSearchParams();
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.payrollRunId) params.set("payrollRunId", filters.payrollRunId);
  return useQuery({
    queryKey: ["payroll", "payslips", filters],
    queryFn: () => api<{ payslips: Payslip[] }>(`/api/v1/payroll/payslips?${params.toString()}`).then((r) => r.payslips),
  });
}

/** Payslip PDF download is a plain authenticated file fetch, not JSON — bypasses the api() wrapper. */
export async function downloadPayslipPdf(payslipId: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${API}/api/v1/payroll/payslips/${payslipId}/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Could not download payslip");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
