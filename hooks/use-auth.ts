"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearSession, isLoggedIn, setSession } from "@/lib/session";
import type { AuthResponse, User } from "@/lib/types";

export function useLogin() {
  const router = useRouter();
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      api<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        userId: data.user.id,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
      });
      router.replace(data.user.role === "employee" || data.user.role === "intern" ? "/my-tasks" : "/dashboard");
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: User }>("/api/v1/me").then((r) => r.user),
    enabled: isLoggedIn(),
    staleTime: 5 * 60_000,
    retry: false,
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      api("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      // Clear the flag in the cache immediately (not just invalidate-and-wait)
      // so the forced-reset gate in the (app) layout doesn't race a redirect
      // back here before the refetch lands.
      queryClient.setQueryData<User>(["me"], (old) => (old ? { ...old, mustResetPassword: false } : old));
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api("/api/v1/auth/logout", { method: "POST" }),
    onSettled: () => {
      clearSession();
      queryClient.clear();
      router.replace("/login");
    },
  });
}
