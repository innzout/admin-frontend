"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Company, UpdateCompanyInput } from "@/lib/types";

export function useCompany() {
  return useQuery({
    queryKey: ["settings", "company"],
    queryFn: () => api<{ company: Company }>("/api/v1/settings/company").then((r) => r.company),
    staleTime: 5 * 60_000,
  });
}

/**
 * The company name, everywhere it's displayed (sidebar, topbar, dashboard
 * greeting, analytics). Single source of truth — editing it in Settings
 * updates every one of those via query cache invalidation, nothing reads a
 * build-time env var or falls back to the logged-in user's own name.
 */
export function useCompanyName(): string {
  const { data } = useCompany();
  return data?.name ?? "";
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) =>
      api<{ company: Company }>("/api/v1/settings/company", {
        method: "PATCH",
        body: JSON.stringify(input),
      }).then((r) => r.company),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "company"] });
    },
  });
}
