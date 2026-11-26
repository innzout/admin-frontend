"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AttendanceCorrection,
  AttendanceListResult,
  AttendanceRecord,
  AttendanceStatus,
  CorrectionInput,
  CorrectionStatus,
} from "@/lib/types";

function invalidateAttendance(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["attendance"] });
}

export function useTodayAttendance() {
  return useQuery({
    queryKey: ["attendance", "today"],
    queryFn: () => api<{ attendance: AttendanceRecord | null }>("/api/v1/attendance/today").then((r) => r.attendance),
  });
}

export interface AttendanceFilters {
  employeeId?: string;
  date?: string;
  from?: string;
  to?: string;
  status?: AttendanceStatus | "late";
  page?: number;
  limit?: number;
}

/** One page of attendance plus totals for the whole filtered range. */
export function useAttendanceList(filters: AttendanceFilters = {}, { enabled = true }: { enabled?: boolean } = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v !== undefined && v !== "") params.set(k, String(v));
  return useQuery({
    queryKey: ["attendance", "list", filters],
    queryFn: () => api<AttendanceListResult>(`/api/v1/attendance?${params.toString()}`),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (remote: boolean) =>
      api<{ attendance: AttendanceRecord }>("/api/v1/attendance/check-in", {
        method: "POST",
        body: JSON.stringify({ remote }),
      }).then((r) => r.attendance),
    onSuccess: () => invalidateAttendance(queryClient),
  });
}

export function useCheckOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ attendance: AttendanceRecord }>("/api/v1/attendance/check-out", { method: "POST" }).then((r) => r.attendance),
    onSuccess: () => invalidateAttendance(queryClient),
  });
}

export function useStartBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ attendance: AttendanceRecord }>("/api/v1/attendance/break/start", { method: "POST" }).then((r) => r.attendance),
    onSuccess: () => invalidateAttendance(queryClient),
  });
}

export function useEndBreak() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ attendance: AttendanceRecord }>("/api/v1/attendance/break/end", { method: "POST" }).then((r) => r.attendance),
    onSuccess: () => invalidateAttendance(queryClient),
  });
}

export function useCloseDay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date?: string) =>
      api<{ message: string; markedAbsent: number }>(`/api/v1/attendance/close-day${date ? `?date=${date}` : ""}`, {
        method: "POST",
      }),
    onSuccess: () => invalidateAttendance(queryClient),
  });
}

/* ---------- Missed-punch corrections ---------- */

export interface CorrectionList {
  corrections: AttendanceCorrection[];
  total: number;
  page: number;
  limit: number;
}

export function useCorrections(f: { status?: CorrectionStatus; page?: number; limit?: number } = {}) {
  const p = new URLSearchParams();
  Object.entries(f).forEach(([k, v]) => v !== undefined && p.set(k, String(v)));
  return useQuery({
    queryKey: ["attendance", "corrections", f],
    queryFn: () => api<CorrectionList>(`/api/v1/attendance/corrections?${p.toString()}`),
    placeholderData: (prev) => prev,
  });
}

export function useRequestCorrection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CorrectionInput) =>
      api<{ correction: AttendanceCorrection }>("/api/v1/attendance/corrections", { method: "POST", body: JSON.stringify(input) }),
    onSuccess: () => invalidateAttendance(queryClient),
  });
}

/** Approve, reject (note required) or cancel (own pending request). */
export function useCorrectionAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: "approve" | "reject" | "cancel"; note?: string }) =>
      api<{ correction: AttendanceCorrection }>(`/api/v1/attendance/corrections/${id}/${action}`, {
        method: "PATCH",
        body: note === undefined ? undefined : JSON.stringify({ note }),
      }),
    // Approval changes the attendance day itself.
    onSuccess: () => invalidateAttendance(queryClient),
  });
}
