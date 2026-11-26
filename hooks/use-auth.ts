"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearSession, isLoggedIn, setSession } from "@/lib/session";
import type { AuthResponse, User } from "@/lib/types";

/**
 * Where to go after login: the page the session expired on (?next=), when it
 * is a path on this site. Anything else (another origin, "//host", a
 * backslash trick, the login page itself) falls back to the role home, so the
 * parameter can't send people to another site.
 */
export function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\") || /[\u0000-\u001f]/.test(raw)) return null;
  if (raw === "/login" || raw.startsWith("/login?") || raw.startsWith("/login/")) return null;
  return raw;
}

export function useLogin() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { username: string; password: string }) =>
      api<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      setSession({
        userId: data.user.id,
        name: data.user.name,
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
      });
      // A previous login in this tab may have left its data in the cache.
      queryClient.clear();
      const home = data.user.role === "employee" || data.user.role === "intern" ? "/my-tasks" : "/dashboard";
      // The (app) layout still bounces a page this role may not open.
      router.replace(safeNextPath(new URLSearchParams(window.location.search).get("next")) ?? home);
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
