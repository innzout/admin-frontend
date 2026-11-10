"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApplyLeaveInput, LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";

export function useLeaveTypes() {
  return useQuery({
    queryKey: ["leave", "types"],
    queryFn: () => api<{ leaveTypes: LeaveType[] }>("/api/v1/leave/types").then((r) => r.leaveTypes),
    staleTime: 5 * 60_000,
  });
}

export function useLeaveBalances() {
  return useQuery({
    queryKey: ["leave", "balances"],
    queryFn: () => api<{ balances: LeaveBalance[] }>("/api/v1/leave/balances").then((r) => r.balances),
  });
}

export interface LeaveRequestFilters {
  employeeId?: string;
  status?: string;
}

function invalidateLeave(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["leave"] });
}

export function useLeaveRequests(filters: LeaveRequestFilters = {}) {
  const params = new URLSearchParams();
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.status) params.set("status", filters.status);
  return useQuery({
    queryKey: ["leave", "requests", filters],
    queryFn: () => api<{ requests: LeaveRequest[] }>(`/api/v1/leave/requests?${params.toString()}`).then((r) => r.requests),
  });
}

export function useApplyLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyLeaveInput) =>
      api<{ request: LeaveRequest }>("/api/v1/leave/requests", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.request),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useDecideLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) =>
      api<{ request: LeaveRequest }>(`/api/v1/leave/requests/${id}/${decision}`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      }).then((r) => r.request),
    onSuccess: () => invalidateLeave(queryClient),
  });
}

export function useCancelLeave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ request: LeaveRequest }>(`/api/v1/leave/requests/${id}/cancel`, { method: "PATCH" }).then((r) => r.request),
    onSuccess: () => invalidateLeave(queryClient),
  });
}
