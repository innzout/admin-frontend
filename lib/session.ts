import type { Role } from "@/lib/types";

const KEYS = {
  access: "innzout_access_token",
  refresh: "innzout_refresh_token",
  name: "innzout_name",
  username: "innzout_username",
  email: "innzout_email",
  role: "innzout_role",
  userId: "innzout_user_id",
} as const;

export interface Session {
  userId: string;
  name: string;
  username: string;
  email: string;
  role: Role | "";
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.access);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEYS.refresh);
}

export function setSession(params: {
  accessToken: string;
  refreshToken: string;
  userId: string;
  name: string;
  username: string;
  email: string;
  role: string;
}) {
  localStorage.setItem(KEYS.access, params.accessToken);
  localStorage.setItem(KEYS.refresh, params.refreshToken);
  localStorage.setItem(KEYS.userId, params.userId);
  localStorage.setItem(KEYS.name, params.name);
  localStorage.setItem(KEYS.username, params.username);
  localStorage.setItem(KEYS.email, params.email);
  localStorage.setItem(KEYS.role, params.role);
}

/** Updates just the access token — used after a silent refresh. */
export function setAccessToken(token: string) {
  localStorage.setItem(KEYS.access, token);
}

export function clearSession() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

export function readSession(): Session {
  if (typeof window === "undefined") {
    return { userId: "", name: "", username: "", email: "", role: "" };
  }
  return {
    userId: localStorage.getItem(KEYS.userId) ?? "",
    name: localStorage.getItem(KEYS.name) ?? "",
    username: localStorage.getItem(KEYS.username) ?? "",
    email: localStorage.getItem(KEYS.email) ?? "",
    role: (localStorage.getItem(KEYS.role) as Role | null) ?? "",
  };
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}
