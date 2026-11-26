import { clearSession } from "@/lib/session";
import type { ApiErrorBody } from "@/lib/types";

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
const LOGIN_PATH = "/api/v1/auth/login";

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

/**
 * Fetch against the Go API with the session cookies. The header is the API's
 * CSRF check: a cross-site page cannot send it without failing CORS.
 */
export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "X-Requested-With": "fetch", ...init?.headers },
  });
}

// A refresh is in flight at most once at a time — concurrent 401s from a
// batch of parallel requests all await the same promise instead of each
// firing their own /auth/refresh call (which would race token rotation).
let refreshInFlight: Promise<boolean> | null = null;

/** Asks the API to rotate the session cookies; true when the session lives on. */
function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = apiFetch("/api/v1/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

/** Authenticated JSON fetch against the Go API, with one silent-refresh retry on 401. */
export async function api<T>(path: string, init?: RequestInit, _retried = false): Promise<T> {
  const res = await apiFetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  // Login itself answers 401 for a wrong password; that is not a lost session.
  if (res.status === 401 && !_retried && path !== LOGIN_PATH) {
    if (await refreshSession()) {
      return api<T>(path, init, true);
    }
    if (typeof window !== "undefined") {
      clearSession();
      // A full page load on purpose (not router.push): it also drops every
      // cached query, so nothing from the lost session stays in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    }
    throw new ApiError(401, "unauthorized", "Session expired");
  }

  if (!res.ok) {
    let body: Partial<ApiErrorBody> = {};
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body — fall through with defaults
    }
    throw new ApiError(res.status, body.error ?? "unknown_error", body.message ?? res.statusText, body.fields);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
