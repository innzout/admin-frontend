"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AttendanceRecord } from "@/lib/types";

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
}

export function useAttendanceList(filters: AttendanceFilters = {}) {
  const params = new URLSearchParams();
  if (filters.employeeId) params.set("employeeId", filters.employeeId);
  if (filters.date) params.set("date", filters.date);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return useQuery({
    queryKey: ["attendance", "list", filters],
    queryFn: () => api<{ records: AttendanceRecord[] }>(`/api/v1/attendance?${params.toString()}`).then((r) => r.records),
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
