"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApplyOdInput, OdRequest } from "@/lib/types";

// Approving or cancelling on-duty rewrites attendance days, so both refresh.
function invalidateOd(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["od"] });
  queryClient.invalidateQueries({ queryKey: ["attendance"] });
}

export interface OdRequestFilters {
  employeeId?: string;
  status?: string;
}

export function useOdRequests(filters: OdRequestFilters = {}) {
  const params = new URLSearchParams();
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.status) params.set("status", filters.status);
  return useQuery({
    queryKey: ["od", "requests", filters],
    queryFn: () => api<{ requests: OdRequest[] }>(`/api/v1/od/requests?${params.toString()}`).then((r) => r.requests),
  });
}

export function useApplyOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyOdInput) =>
      api<{ request: OdRequest }>("/api/v1/od/requests", {
        method: "POST",
        body: JSON.stringify(input),
      }).then((r) => r.request),
    onSuccess: () => invalidateOd(queryClient),
  });
}

export function useDecideOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: "approve" | "reject"; note?: string }) =>
      api<{ request: OdRequest }>(`/api/v1/od/requests/${id}/${decision}`, {
        method: "PATCH",
        body: JSON.stringify({ note }),
      }).then((r) => r.request),
    onSuccess: () => invalidateOd(queryClient),
  });
}

export function useCancelOd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api<{ request: OdRequest }>(`/api/v1/od/requests/${id}/cancel`, { method: "PATCH" }).then((r) => r.request),
    onSuccess: () => invalidateOd(queryClient),
  });
}
