import type { Role } from "@/lib/types";

// Tokens live only in httpOnly cookies set by the API, out of reach of page
// scripts. What is kept here is the non-secret profile used to render the UI;
// it says nothing about whether the cookies are still valid (the API decides).
const KEYS = {
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

/** Token keys from before the cookie switch; removed so no copy lingers. */
const LEGACY_TOKEN_KEYS = ["innzout_access_token", "innzout_refresh_token"];

export function setSession(params: {
  userId: string;
  name: string;
  username: string;
  email: string;
  role: string;
}) {
  localStorage.setItem(KEYS.userId, params.userId);
  localStorage.setItem(KEYS.name, params.name);
  localStorage.setItem(KEYS.username, params.username);
  localStorage.setItem(KEYS.email, params.email);
  localStorage.setItem(KEYS.role, params.role);
}

export function clearSession() {
  [...Object.values(KEYS), ...LEGACY_TOKEN_KEYS].forEach((k) => localStorage.removeItem(k));
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
  if (typeof window === "undefined") return false;
  LEGACY_TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
  return !!localStorage.getItem(KEYS.userId);
}
