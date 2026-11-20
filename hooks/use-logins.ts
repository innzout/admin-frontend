"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Login, Role } from "@/lib/types";

const LOGINS_KEY = ["logins"];

/** Every portal login, for the admin Roles & Access screen. */
export function useLogins() {
  return useQuery({
    queryKey: LOGINS_KEY,
    queryFn: () => api<{ users: Login[] }>("/api/v1/users").then((r) => r.users),
  });
}

export function useSetLoginRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api<{ id: string; role: Role }>(`/api/v1/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LOGINS_KEY }),
  });
}
