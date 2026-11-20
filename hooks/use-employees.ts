"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CreateEmployeeInput, Employee, EmployeeListResult, UpdateEmployeeInput } from "@/lib/types";

export interface EmployeeFilters {
  departmentId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function toQuery(filters: EmployeeFilters): string {
  const params = new URLSearchParams();
  if (filters.departmentId) params.set("departmentId", filters.departmentId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));
  return params.toString();
}

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: ["employees", filters],
    queryFn: () => api<EmployeeListResult>(`/api/v1/employees?${toQuery(filters)}`),
    placeholderData: (prev) => prev,
  });
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ["employees", "detail", id],
    queryFn: () => api<{ employee: Employee }>(`/api/v1/employees/${id}`).then((r) => r.employee),
    enabled: !!id,
  });
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEmployeeInput) =>
      api<{ employee: Employee; tempPassword?: string; warning?: string }>("/api/v1/employees", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEmployeeInput }) =>
      api<{ employee: Employee }>(`/api/v1/employees/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}

// Admin-mediated password reset — the app has no email infra to send a
// self-service reset link, so an admin/hr user generates a new temp
// password on the employee's behalf instead (mirrors the temp-password
// shown once at login-creation time).
export function useResetEmployeePassword() {
  return useMutation({
    mutationFn: (id: string) =>
      api<{ tempPassword: string }>(`/api/v1/employees/${id}/reset-password`, { method: "POST" }),
  });
}

/** Gives an existing employee a portal login; returns the one-time password. */
export function useCreateEmployeeLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<{ tempPassword: string }>(`/api/v1/employees/${id}/login`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["logins"] });
    },
  });
}

// Deactivate is a one-way HR status change (never a hard delete — see
// ARCHITECTURE.md §6.2) that also revokes the employee's portal login
// server-side.
export function useDeactivateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ employee: Employee }>(`/api/v1/employees/${id}/deactivate`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
    },
  });
}
