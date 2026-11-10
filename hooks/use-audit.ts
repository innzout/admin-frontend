"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/lib/types";

export interface AuditLogFilters {
  actorId?: string;
  method?: string;
  role?: string;
  search?: string;
  /** YYYY-MM-DD, inclusive, IST. */
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogListResult {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: () => fetchAuditLogs(filters),
    placeholderData: (prev) => prev,
  });
}

export function fetchAuditLogs(filters: AuditLogFilters): Promise<AuditLogListResult> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => v !== undefined && v !== "" && params.set(k, String(v)));
  return api<AuditLogListResult>(`/api/v1/audit-logs?${params.toString()}`);
}
